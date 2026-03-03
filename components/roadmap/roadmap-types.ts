export type NodeKind =
  | 'outcome'
  | 'initiative'
  | 'work_item'
  | 'decision'
  | 'risk'
  | 'milestone'
  | 'metric';

export type NodeStatus = 'planned' | 'in_progress' | 'done';
export type NodePriority = 'P0' | 'P1' | 'P2';
export type Horizon = 'historical' | '0-30d' | '30-90d' | '90-180d' | '180-365d';
export type EdgeType =
  | 'delivers'
  | 'depends_on'
  | 'mitigates'
  | 'measures'
  | 'informs'
  | 'blocks'
  | 'references';
export type LaneId = 'header' | 'demo' | 'kg' | 'security' | 'capital' | 'swarm' | 'footer';

export interface RoadmapNode {
  id: string;
  kind: NodeKind;
  title: string;
  summary: string;
  status: NodeStatus;
  priority: NodePriority;
  horizon: Horizon;
  owner: string;
  tags?: string[];
  source_docs?: string[];
  due_date?: string;
  completed_date?: string;
  github_url?: string;
  bounty_url?: string;
  metadata?: Record<string, unknown>;
}

export interface RoadmapEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface RoadmapOwner {
  id: string;
  name: string;
  role: string;
}

export interface Roadmap {
  roadmap_id: string;
  program: string;
  version: string;
  as_of: string;
  owners: RoadmapOwner[];
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

export interface LayoutNode extends RoadmapNode {
  lane: LaneId;
  col: number; // index into LayoutResult.columnSpecs
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ColumnSpec {
  id: string;                            // e.g. "0-30d", "0-30d:new-moon", "0-30d:unscheduled"
  horizon: Horizon;                      // parent horizon bucket
  label: string;                         // display text
  emoji?: string;                        // moon emoji for phase columns
  moonName?: string;
  moonEmoji?: string;
  moonTagline?: string;
  width: number;                         // pixel width
  dateRange?: { start: Date; end: Date }; // for phase columns: [phaseStart, nextPhaseStart)
  isUnscheduled?: boolean;               // catch-all sub-column within an expanded horizon
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: RoadmapEdge[];
  laneY: Record<LaneId, number>;
  laneHeight: Record<LaneId, number>;
  totalHeight: number;
  totalWidth: number;
  colWidth: number;      // width of a standard (non-expanded) horizon column
  labelWidth: number;
  headerRowHeight: number;
  columnSpecs: ColumnSpec[];
}

export interface LaneConfig {
  id: LaneId;
  label: string;
  accent: string;
  bg: string;
  nodeFill: string;
}

export const LANE_CONFIGS: LaneConfig[] = [
  { id: 'header',   label: 'Outcomes & Milestones', accent: '#64748b', bg: '#0f172a', nodeFill: '#1e293b' },
  { id: 'demo',     label: 'Demo & Operations',     accent: '#f59e0b', bg: '#1c0a00', nodeFill: '#78350f' },
  { id: 'kg',       label: 'Knowledge Plane',        accent: '#10b981', bg: '#022c22', nodeFill: '#064e3b' },
  { id: 'security', label: 'Trust & Governance',    accent: '#3b82f6', bg: '#0c1a3d', nodeFill: '#1e3a8a' },
  { id: 'capital',  label: 'Capital Loop',          accent: '#a855f7', bg: '#1a0a3d', nodeFill: '#4c1d95' },
  { id: 'swarm',    label: 'Swarm Coordination',    accent: '#06b6d4', bg: '#001a1f', nodeFill: '#083344' },
  { id: 'footer',   label: 'Planning',              accent: '#6b7280', bg: '#111827', nodeFill: '#1f2937' },
];

export const LANE_CONFIG_MAP: Record<LaneId, LaneConfig> = Object.fromEntries(
  LANE_CONFIGS.map((l) => [l.id, l])
) as Record<LaneId, LaneConfig>;

export const HORIZONS: Horizon[] = ['historical', '0-30d', '30-90d', '90-180d', '180-365d'];

export const STATUS_COLORS: Record<NodeStatus, string> = {
  done:        '#22c55e',
  in_progress: '#f59e0b',
  planned:     '#6b7280',
};

export const PRIORITY_COLORS: Record<string, string> = {
  P0: '#ef4444',
  P1: '#f97316',
  P2: '#eab308',
};

export interface EdgeStyle {
  color: string;
  width: number;
  dashArray: string;
  markerId: string;
  label: string;
}

// ─── Clustering types ─────────────────────────────────────────────────────────
export interface NodeCluster {
  id: string;            // = initiative id
  label: string;         // initiative.title
  memberIds: string[];   // work_item ids hidden when collapsed
  anchorId: string;      // initiative node id
  horizon: Horizon;
}
export type ClusterMap = Map<string, NodeCluster>;       // clusterId → cluster
export type ClusterState = Map<string, boolean>;         // clusterId → isExpanded (false = collapsed)

export const EDGE_STYLES: Record<EdgeType, EdgeStyle> = {
  delivers:    { color: '#6b7280', width: 1.5, dashArray: 'none',    markerId: 'arrow-default',   label: 'delivers' },
  depends_on:  { color: '#60a5fa', width: 1.5, dashArray: '6 4',     markerId: 'arrow-blue',      label: 'depends on' },
  mitigates:   { color: '#f87171', width: 1.5, dashArray: '2 4',     markerId: 'arrow-red-light', label: 'mitigates' },
  measures:    { color: '#9ca3af', width: 1,   dashArray: '2 6',     markerId: 'arrow-gray',      label: 'measures' },
  informs:     { color: '#93c5fd', width: 1,   dashArray: '8 4',     markerId: 'arrow-blue-light',label: 'informs' },
  blocks:      { color: '#ef4444', width: 2.5, dashArray: 'none',    markerId: 'arrow-red-heavy', label: 'blocks' },
  references:  { color: '#374151', width: 1,   dashArray: '2 8',     markerId: 'none',            label: 'references' },
};
