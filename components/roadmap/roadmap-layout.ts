import type {
  Roadmap,
  RoadmapNode,
  RoadmapEdge,
  LaneId,
  LayoutNode,
  LayoutResult,
  ColumnSpec,
  Horizon,
} from './roadmap-types';
import { HORIZONS } from './roadmap-types';
import { getLunarPhasesInWindow } from './roadmap-calendar';

// ─── Constants ────────────────────────────────────────────────────────────────
export const COL_WIDTH = 300;           // standard (collapsed) horizon column
export const PHASE_COL_WIDTH = 150;     // lunar phase sub-column
export const UNSCHEDULED_COL_WIDTH = 200; // unscheduled sub-column
export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 64;
export const NODE_GAP = 12;
export const LANE_PADDING = 16;
export const LABEL_WIDTH = 140;
export const COL_HEADER_HEIGHT = 48;
export const SVG_PAD = 16;

const LANE_ORDER: LaneId[] = ['header', 'demo', 'kg', 'security', 'capital', 'swarm', 'footer'];

// ─── Tag → Lane ───────────────────────────────────────────────────────────────
const TAG_TO_LANE: Record<string, LaneId> = {
  demo: 'demo', operations: 'demo', sprint: 'demo', interop: 'demo',
  foundation: 'demo', deployment: 'demo', testing: 'demo', infrastructure: 'demo',
  visualization: 'demo', web: 'demo', auth: 'demo', llm: 'demo', tooling: 'demo',
  chat: 'kg', evaluation: 'kg', roadmap: 'kg', sensing: 'kg', watershed: 'kg', data: 'kg',
  governance: 'security', policy: 'security', security: 'security', federation: 'security',
  protocol: 'security', architecture: 'security',
  finance: 'capital', tbff: 'capital', integration: 'capital', evidence: 'capital',
  commitment: 'capital',
  swarm: 'swarm', a2a: 'swarm', bounty: 'swarm',
};

// ─── Initiative ID → Lane ─────────────────────────────────────────────────────
const INITIATIVE_TO_LANE: Record<string, LaneId> = {
  'initiative.build-day-sprint-mar5':           'demo',
  'initiative.part-a-foundation':               'demo',
  'initiative.part-b-kg-chat':                  'kg',
  'initiative.part-b-security-addendum':        'security',
  'initiative.commitment-pooling-integration':  'capital',
  'initiative.tbff-knowledge-flow-pilot':       'capital',
  'initiative.regen-claims-engine-integration': 'capital',
  'initiative.regen-federation-deepening':      'security',
  'initiative.commodity-ecology-integration':   'kg',
  'initiative.owocki-swarm-foundation':         'swarm',
  'initiative.owocki-sensing-layer':            'swarm',
  'initiative.owocki-financing-facility':       'swarm',
  'initiative.owocki-multiregion-expansion':    'swarm',
  'initiative.nou-a2a-coordination':            'swarm',
  'initiative.watershed-sensing':               'kg',
};

// ─── Lane Assignment (4-tier cascade) ────────────────────────────────────────
function assignLane(
  node: RoadmapNode,
  nodeMap: Map<string, RoadmapNode>,
  edgesByFrom: Map<string, RoadmapEdge[]>,
  visited: Set<string>,
): LaneId {
  if (visited.has(node.id)) return 'demo';
  visited.add(node.id);

  // Tier 1 — Node tags
  if (node.tags) {
    for (const tag of node.tags) {
      const lane = TAG_TO_LANE[tag];
      if (lane) return lane;
    }
  }

  const outgoing = edgesByFrom.get(node.id) ?? [];

  // Tier 2 — Initiative ancestry (walk `delivers` to a known initiative)
  for (const edge of outgoing) {
    if (edge.type === 'delivers') {
      const target = nodeMap.get(edge.to);
      if (target?.kind === 'initiative') {
        const lane = INITIATIVE_TO_LANE[target.id];
        if (lane) return lane;
      }
    }
  }

  // Tier 3 — Outcome ancestry (walk `delivers` to an outcome, resolve outcome lane)
  for (const edge of outgoing) {
    if (edge.type === 'delivers') {
      const target = nodeMap.get(edge.to);
      if (target?.kind === 'outcome') {
        const outcomeLane = assignLane(target, nodeMap, edgesByFrom, new Set(visited));
        if (outcomeLane && outcomeLane !== 'header') return outcomeLane;
      }
    }
  }

  // Tier 4 — Kind hard fallback
  if (node.kind === 'outcome' || node.kind === 'milestone') return 'header';

  if (node.kind === 'decision') {
    // Try informs → initiative as a hint
    for (const edge of outgoing) {
      if (edge.type === 'informs') {
        const target = nodeMap.get(edge.to);
        if (target?.kind === 'initiative') {
          const lane = INITIATIVE_TO_LANE[target.id];
          if (lane) return lane;
        }
      }
    }
    return 'security';
  }

  if (node.kind === 'risk') {
    // "risk → lane of the node it mitigates; else Security"
    // Risks are mitigated BY others, they don't mitigate — fallback to security
    return 'security';
  }

  if (node.kind === 'metric') {
    for (const edge of outgoing) {
      if (edge.type === 'measures') {
        const target = nodeMap.get(edge.to);
        if (target) {
          return assignLane(target, nodeMap, edgesByFrom, new Set(visited));
        }
      }
    }
    return 'demo';
  }

  // work_item with no tag and no edge ancestry — unexpected
  if (node.kind === 'work_item') {
    console.warn(`[roadmap-layout] Unexpected Tier 4 hit for work_item: ${node.id}`);
    return 'demo';
  }

  return 'demo';
}

// ─── Horizon date-range offsets (in days from as_of) ─────────────────────────
const HORIZON_OFFSETS: Record<Exclude<Horizon, 'historical'>, { start: number; end: number }> = {
  '0-30d':    { start: 0,   end: 30 },
  '30-90d':   { start: 30,  end: 90 },
  '90-180d':  { start: 90,  end: 180 },
  '180-365d': { start: 180, end: 365 },
};

// ─── Historical weekly sub-columns (Feb 8 – Feb 28 2026 foundation period) ──
const HISTORICAL_WEEKS: Array<{ label: string; start: string; end: string }> = [
  { label: 'Feb 8–14',  start: '2026-02-08', end: '2026-02-15' },
  { label: 'Feb 15–21', start: '2026-02-15', end: '2026-02-22' },
  { label: 'Feb 22–28', start: '2026-02-22', end: '2026-03-01' },
];

// ─── Build column specs ───────────────────────────────────────────────────────
function buildColumnSpecs(asOfStr: string, expandedHorizons: Set<Horizon>): ColumnSpec[] {
  const asOf = new Date(asOfStr + 'T00:00:00Z');
  const specs: ColumnSpec[] = [];

  for (const h of HORIZONS) {
    // ── Historical horizon: weekly sub-columns instead of lunar phases ──
    if (h === 'historical') {
      if (expandedHorizons.has(h)) {
        // Weekly sub-columns
        for (const week of HISTORICAL_WEEKS) {
          specs.push({
            id: `${h}:${week.label.toLowerCase().replace(/[– ]/g, '-')}`,
            horizon: h,
            label: week.label,
            width: PHASE_COL_WIDTH,
            dateRange: {
              start: new Date(week.start + 'T00:00:00Z'),
              end: new Date(week.end + 'T00:00:00Z'),
            },
          });
        }

        // Unscheduled catch-all last (rightmost within expanded horizon)
        specs.push({
          id: `${h}:unscheduled`,
          horizon: h,
          label: 'unscheduled',
          width: UNSCHEDULED_COL_WIDTH,
          isUnscheduled: true,
        });
      } else {
        specs.push({
          id: h,
          horizon: h,
          label: h,
          width: COL_WIDTH,
        });
      }
      continue;
    }

    // ── Standard horizons: lunar phase sub-columns ──
    if (expandedHorizons.has(h)) {
      const { start: startOffset, end: endOffset } = HORIZON_OFFSETS[h];
      const horizonStart = new Date(asOf.getTime() + startOffset * 86400000);
      const horizonEnd = new Date(asOf.getTime() + endOffset * 86400000);
      const phases = getLunarPhasesInWindow(horizonStart, horizonEnd);

      // One column per phase, dateRange = [phase.date, nextPhase.date)
      for (let pi = 0; pi < phases.length; pi++) {
        const phase = phases[pi];
        const nextDate = pi + 1 < phases.length ? phases[pi + 1].date : horizonEnd;
        specs.push({
          id: `${h}:${phase.name.toLowerCase().replace(/ /g, '-')}`,
          horizon: h,
          label: phase.moonName ?? phase.name,
          emoji: phase.moonEmoji ?? phase.emoji,
          moonName: phase.moonName,
          moonEmoji: phase.moonEmoji,
          moonTagline: phase.moonTagline,
          width: PHASE_COL_WIDTH,
          dateRange: { start: phase.date, end: nextDate },
        });
      }

      // Unscheduled catch-all last (rightmost within expanded horizon)
      specs.push({
        id: `${h}:unscheduled`,
        horizon: h,
        label: 'unscheduled',
        width: UNSCHEDULED_COL_WIDTH,
        isUnscheduled: true,
      });
    } else {
      specs.push({
        id: h,
        horizon: h,
        label: h,
        width: COL_WIDTH,
      });
    }
  }

  return specs;
}

// ─── Graph-based date inference for undated nodes ────────────────────────────
function inferDateFromGraph(
  node: RoadmapNode,
  nodeMap: Map<string, RoadmapNode>,
  edgesByFrom: Map<string, RoadmapEdge[]>,
  edgesByTo: Map<string, RoadmapEdge[]>,
  isHistorical: boolean,
): string | null {
  const getDate = (n: RoadmapNode) => isHistorical ? n.completed_date : n.due_date;

  // Collect date hints from direct edges (1-hop)
  const hints = collectDateHints(node, nodeMap, edgesByFrom, edgesByTo, getDate);

  // If no 1-hop hints, try 2-hop
  if (hints.length === 0) {
    const neighbors = new Set<string>();
    for (const e of edgesByFrom.get(node.id) ?? []) neighbors.add(e.to);
    for (const e of edgesByTo.get(node.id) ?? []) neighbors.add(e.from);

    for (const nid of neighbors) {
      const neighbor = nodeMap.get(nid);
      if (!neighbor) continue;
      const hop2 = collectDateHints(neighbor, nodeMap, edgesByFrom, edgesByTo, getDate);
      hints.push(...hop2);
    }
  }

  if (hints.length === 0) return null;

  // Pick best hint: prefer "deadline" (delivers→milestone), then "after" (depends_on)
  // For deadline hints, use the earliest; for after hints, use the latest
  const deadlines = hints.filter((h) => h.kind === 'deadline').map((h) => h.date);
  const afters = hints.filter((h) => h.kind === 'after').map((h) => h.date);
  const peers = hints.filter((h) => h.kind === 'peer').map((h) => h.date);

  if (deadlines.length > 0) {
    // Place slightly before the earliest deadline (3 days)
    const earliest = deadlines.sort()[0];
    const d = new Date(earliest + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 3);
    return d.toISOString().slice(0, 10);
  }

  if (afters.length > 0) {
    // Place slightly after the latest dependency (1 day)
    const latest = afters.sort().pop()!;
    const d = new Date(latest + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // Peer date — same phase
  if (peers.length > 0) return peers.sort()[0];

  return null;
}

type DateHint = { date: string; kind: 'deadline' | 'after' | 'peer' };

function collectDateHints(
  node: RoadmapNode,
  nodeMap: Map<string, RoadmapNode>,
  edgesByFrom: Map<string, RoadmapEdge[]>,
  edgesByTo: Map<string, RoadmapEdge[]>,
  getDate: (n: RoadmapNode) => string | undefined,
): DateHint[] {
  const hints: DateHint[] = [];

  // Outgoing edges from this node
  for (const e of edgesByFrom.get(node.id) ?? []) {
    const target = nodeMap.get(e.to);
    const tDate = target && getDate(target);
    if (!tDate) continue;

    if (e.type === 'delivers') {
      // This node delivers to a milestone/initiative — should be done before it
      hints.push({ date: tDate, kind: 'deadline' });
    } else if (e.type === 'depends_on') {
      // This node depends on target — must come after target
      hints.push({ date: tDate, kind: 'after' });
    } else if (e.type === 'measures' || e.type === 'mitigates' || e.type === 'informs') {
      // Related — place near the same time
      hints.push({ date: tDate, kind: 'peer' });
    }
  }

  // Incoming edges to this node
  for (const e of edgesByTo.get(node.id) ?? []) {
    const source = nodeMap.get(e.from);
    const sDate = source && getDate(source);
    if (!sDate) continue;

    if (e.type === 'delivers') {
      // Something delivers TO this node — this node is a target, place at/after source
      hints.push({ date: sDate, kind: 'after' });
    } else if (e.type === 'depends_on') {
      // Something depends on this node — this node should come before it
      hints.push({ date: sDate, kind: 'deadline' });
    } else if (e.type === 'measures' || e.type === 'mitigates' || e.type === 'informs') {
      hints.push({ date: sDate, kind: 'peer' });
    }
  }

  return hints;
}

// ─── Node → column index ──────────────────────────────────────────────────────
function findColumnIndex(
  node: RoadmapNode,
  columnSpecs: ColumnSpec[],
  expandedHorizons: Set<Horizon>,
  nodeMap?: Map<string, RoadmapNode>,
  edgesByFrom?: Map<string, RoadmapEdge[]>,
  edgesByTo?: Map<string, RoadmapEdge[]>,
): number {
  const h = node.horizon as Horizon;

  if (!expandedHorizons.has(h)) {
    // Simple: find the single collapsed column for this horizon
    const idx = columnSpecs.findIndex((s) => s.id === h);
    return idx >= 0 ? idx : 0;
  }

  const isHistorical = h === 'historical';

  // Horizon is expanded — place by date or fallback to unscheduled
  // Historical nodes use completed_date; future horizons use due_date
  let dateStr = isHistorical ? node.completed_date : node.due_date;

  // If no explicit date, infer from graph connections
  if (!dateStr && nodeMap && edgesByFrom && edgesByTo) {
    dateStr = inferDateFromGraph(node, nodeMap, edgesByFrom, edgesByTo, isHistorical) ?? undefined;
  }

  if (!dateStr) {
    const idx = columnSpecs.findIndex((s) => s.horizon === h && s.isUnscheduled);
    return idx >= 0 ? idx : 0;
  }

  // Parse date as noon UTC so day comparisons are timezone-safe
  const dueDate = new Date(
    dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00Z',
  );

  // Collect phase columns for this horizon in order
  const phaseEntries: Array<{ idx: number; dayStart: Date; dayEnd: Date }> = [];
  for (let i = 0; i < columnSpecs.length; i++) {
    const s = columnSpecs[i];
    if (s.horizon === h && s.dateRange && !s.isUnscheduled) {
      // Truncate to start-of-day UTC so a YYYY-MM-DD due_date matches the
      // same calendar day regardless of the exact astronomical phase time
      const dayStart = new Date(s.dateRange.start);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(s.dateRange.end);
      dayEnd.setUTCHours(0, 0, 0, 0);
      phaseEntries.push({ idx: i, dayStart, dayEnd });
    }
  }

  for (const { idx, dayStart, dayEnd } of phaseEntries) {
    if (dueDate >= dayStart && dueDate < dayEnd) return idx;
  }

  // due_date set but outside the phase windows: snap to nearest phase rather
  // than dropping to unscheduled (keeps arrows readable in the timeline)
  if (phaseEntries.length > 0) {
    if (dueDate < phaseEntries[0].dayStart) return phaseEntries[0].idx;
    return phaseEntries[phaseEntries.length - 1].idx;
  }

  // Fallback: unscheduled column for this horizon
  const fallback = columnSpecs.findIndex((s) => s.horizon === h && s.isUnscheduled);
  return fallback >= 0 ? fallback : 0;
}

// ─── Main layout function ─────────────────────────────────────────────────────
export function computeLayout(
  roadmap: Roadmap,
  opts?: { expandedHorizons?: Set<Horizon>; hiddenNodeIds?: Set<string> },
): LayoutResult {
  const expandedHorizons = opts?.expandedHorizons ?? new Set<Horizon>();
  const hiddenNodeIds = opts?.hiddenNodeIds ?? new Set<string>();

  const nodeMap = new Map(roadmap.nodes.map((n) => [n.id, n]));
  const edgesByFrom = new Map<string, RoadmapEdge[]>();
  const edgesByTo = new Map<string, RoadmapEdge[]>();
  for (const edge of roadmap.edges) {
    if (!edgesByFrom.has(edge.from)) edgesByFrom.set(edge.from, []);
    edgesByFrom.get(edge.from)!.push(edge);
    if (!edgesByTo.has(edge.to)) edgesByTo.set(edge.to, []);
    edgesByTo.get(edge.to)!.push(edge);
  }

  // ── Build column specs + cumulative x-offsets ────────────────────────────
  const columnSpecs = buildColumnSpecs(roadmap.as_of, expandedHorizons);
  const colXOffsets: number[] = [];
  let xAcc = 0;
  for (const spec of columnSpecs) {
    colXOffsets.push(xAcc);
    xAcc += spec.width;
  }

  // ── 1. Assign lanes and columns ──────────────────────────────────────────
  type Placement = { lane: LaneId; col: number };
  const placements = new Map<string, Placement>();
  const cellSlots = new Map<string, RoadmapNode[]>(); // "lane:col" → [node, …]

  for (const node of roadmap.nodes) {
    if (hiddenNodeIds.has(node.id)) continue; // skip clustered members
    const lane = assignLane(node, nodeMap, edgesByFrom, new Set<string>());
    const col = findColumnIndex(node, columnSpecs, expandedHorizons, nodeMap, edgesByFrom, edgesByTo);
    placements.set(node.id, { lane, col });
    const key = `${lane}:${col}`;
    if (!cellSlots.has(key)) cellSlots.set(key, []);
    cellSlots.get(key)!.push(node);
  }

  // ── 2. Compute per-lane heights ──────────────────────────────────────────
  const laneHeight: Record<LaneId, number> = {} as Record<LaneId, number>;
  for (const laneId of LANE_ORDER) {
    let maxNodes = 0;
    for (let c = 0; c < columnSpecs.length; c++) {
      const count = cellSlots.get(`${laneId}:${c}`)?.length ?? 0;
      if (count > maxNodes) maxNodes = count;
    }
    laneHeight[laneId] = Math.max(
      160,
      maxNodes * (NODE_HEIGHT + NODE_GAP) - (maxNodes > 0 ? NODE_GAP : 0) + 2 * LANE_PADDING,
    );
  }

  // ── 3. Compute cumulative lane Y positions ───────────────────────────────
  const laneY: Record<LaneId, number> = {} as Record<LaneId, number>;
  let curY = COL_HEADER_HEIGHT;
  for (const laneId of LANE_ORDER) {
    laneY[laneId] = curY;
    curY += laneHeight[laneId];
  }

  const totalWidth = SVG_PAD + LABEL_WIDTH + xAcc + SVG_PAD;
  const totalHeight = curY + SVG_PAD;

  // ── 4. Compute node x/y positions ────────────────────────────────────────
  const layoutNodes: LayoutNode[] = [];
  const cellIndex = new Map<string, number>();

  for (const node of roadmap.nodes) {
    if (hiddenNodeIds.has(node.id)) continue;
    const { lane, col } = placements.get(node.id)!;
    const key = `${lane}:${col}`;
    const idx = cellIndex.get(key) ?? 0;
    cellIndex.set(key, idx + 1);

    const colSpec = columnSpecs[col];
    // Fit node within column width (minimum 20px total horizontal padding)
    const nodeWidth = Math.min(NODE_WIDTH, colSpec.width - 20);
    const nodeX = SVG_PAD + LABEL_WIDTH + colXOffsets[col] + (colSpec.width - nodeWidth) / 2;
    const nodeY = laneY[lane] + LANE_PADDING + idx * (NODE_HEIGHT + NODE_GAP);

    layoutNodes.push({
      ...node,
      lane,
      col,
      x: nodeX,
      y: nodeY,
      width: nodeWidth,
      height: NODE_HEIGHT,
    });
  }

  return {
    nodes: layoutNodes,
    edges: roadmap.edges,
    laneY,
    laneHeight,
    totalHeight,
    totalWidth,
    colWidth: COL_WIDTH,
    labelWidth: LABEL_WIDTH,
    headerRowHeight: COL_HEADER_HEIGHT,
    columnSpecs,
  };
}
