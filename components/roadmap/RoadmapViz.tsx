'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import type { Roadmap, RoadmapNode, LayoutNode, LaneId, Horizon, ClusterState } from './roadmap-types';
import { LANE_CONFIGS } from './roadmap-types';
import { computeLayout, LABEL_WIDTH, COL_HEADER_HEIGHT, SVG_PAD } from './roadmap-layout';
import { computeClusters, deriveHiddenNodeIds, deriveEdgeProxy } from './roadmap-clustering';
import { RoadmapNodeComponent } from './RoadmapNode';
import { RoadmapEdgeComponent, EdgeMarkerDefs } from './RoadmapEdge';
import { DetailPanel } from './DetailPanel';
import { RoadmapFilters, defaultFilters, type FilterState } from './RoadmapFilters';
import { RoadmapLegend } from './RoadmapLegend';

interface Props {
  roadmap: Roadmap;
}

export function RoadmapViz({ roadmap }: Props) {
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showLegend, setShowLegend] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expandedHorizons, setExpandedHorizons] = useState(new Set<Horizon>());
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [clusterState, setClusterState] = useState<ClusterState>(new Map());
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const toggleHorizon = useCallback((h: Horizon) => {
    setExpandedHorizons((prev) => {
      const s = new Set(prev);
      s.has(h) ? s.delete(h) : s.add(h);
      return s;
    });
  }, []);

  // ── Clustering ─────────────────────────────────────────────────────────────
  const clusterMap = useMemo(() => computeClusters(roadmap), [roadmap]);
  const hiddenNodeIds = useMemo(
    () => deriveHiddenNodeIds(clusterMap, clusterState),
    [clusterMap, clusterState],
  );
  const edgeProxy = useMemo(
    () => deriveEdgeProxy(clusterMap, clusterState),
    [clusterMap, clusterState],
  );

  const toggleCluster = useCallback((clusterId: string) => {
    setClusterState((prev) => {
      const next = new Map(prev);
      next.set(clusterId, !(prev.get(clusterId) ?? false));
      return next;
    });
  }, []);

  const setAllClusters = useCallback((expanded: boolean) => {
    setClusterState((prev) => {
      const next = new Map(prev);
      for (const id of clusterMap.keys()) next.set(id, expanded);
      return next;
    });
  }, [clusterMap]);

  // ── Layout ──────────────────────────────────────────────────────────────────
  const layout = useMemo(
    () => computeLayout(roadmap, { expandedHorizons, hiddenNodeIds }),
    [roadmap, expandedHorizons, hiddenNodeIds],
  );

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((n) => [n.id, n])),
    [layout.nodes],
  );

  // Full node map including clustered/hidden nodes — used by DetailPanel
  // so edge peers always show titles (even when their parent cluster is collapsed)
  const fullNodeMap = useMemo(
    () => new Map(roadmap.nodes.map((n) => [n.id, n])),
    [roadmap.nodes],
  );

  // ── Filtering ───────────────────────────────────────────────────────────────
  const visibleNodes = useMemo(
    () =>
      layout.nodes.filter(
        (n) =>
          filters.horizons.has(n.horizon) &&
          filters.statuses.has(n.status) &&
          filters.priorities.has(n.priority) &&
          filters.lanes.has(n.lane) &&
          filters.kinds.has(n.kind),
      ),
    [layout.nodes, filters],
  );

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () =>
      layout.edges.filter((e) => {
        // Resolve through proxy so edges from hidden cluster members still show
        const from = edgeProxy.get(e.from) ?? e.from;
        const to = edgeProxy.get(e.to) ?? e.to;
        return (
          visibleNodeIds.has(from) &&
          visibleNodeIds.has(to) &&
          filters.edgeTypes.has(e.type as typeof filters.edgeTypes extends Set<infer T> ? T : never)
        );
      }),
    [layout.edges, visibleNodeIds, filters.edgeTypes, edgeProxy],
  );

  // Active node for edge visibility (hovered takes priority, then selected)
  const activeId = hoveredNodeId ?? selectedNode?.id ?? null;

  // Connected node ids for highlighting
  const connectedIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of layout.edges) {
      const from = edgeProxy.get(e.from) ?? e.from;
      const to = edgeProxy.get(e.to) ?? e.to;
      if (from === activeId) ids.add(to);
      if (to === activeId) ids.add(from);
    }
    return ids;
  }, [activeId, layout.edges, edgeProxy]);

  // ── Pan interaction ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('[data-interactive]')) return;
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const { totalWidth, totalHeight, laneY, laneHeight, headerRowHeight } = layout;

  // ── SVG Grid ──────────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines = [];
    let x = SVG_PAD + LABEL_WIDTH;
    for (const spec of layout.columnSpecs) {
      lines.push(<line key={`pre-${spec.id}`} x1={x} y1={0} x2={x} y2={totalHeight} stroke="#1e293b" strokeWidth={1} />);
      x += spec.width;
    }
    lines.push(<line key="final" x1={x} y1={0} x2={x} y2={totalHeight} stroke="#1e293b" strokeWidth={1} />);
    return lines;
  }, [layout.columnSpecs, totalHeight]);

  const laneIds = ['header', 'demo', 'kg', 'security', 'capital', 'swarm', 'footer'] as LaneId[];

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* ── Header bar ── */}
      <div className="border-b border-gray-800/50 bg-gray-900/60 backdrop-blur-xl sticky top-0 z-20 px-6 py-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold text-white">{roadmap.program}</h1>
            <div className="text-[10px] text-gray-500 font-mono">
              v{roadmap.version} · {roadmap.as_of} · {visibleNodes.length}/{layout.nodes.length} nodes visible
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowAllEdges((v) => !v)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                showAllEdges
                  ? 'border-blue-500/50 text-blue-400 bg-blue-600/20'
                  : 'border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              Edges: {showAllEdges ? 'All' : 'On Hover'}
            </button>
            {clusterMap.size > 0 && (
              <>
                <button
                  onClick={() => setAllClusters(false)}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                >
                  Collapse All
                </button>
                <button
                  onClick={() => setAllClusters(true)}
                  className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                >
                  Expand All
                </button>
              </>
            )}
            <button
              onClick={() => setShowLegend((v) => !v)}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              {showLegend ? 'Hide Legend' : 'Legend'}
            </button>
            <button
              onClick={() => setPan({ x: 0, y: 0 })}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              Reset Pan
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <RoadmapFilters filters={filters} onChange={setFilters} />

      {/* ── Legend (collapsible) ── */}
      {showLegend && (
        <div className="px-6 py-3 border-b border-gray-800/30">
          <RoadmapLegend />
        </div>
      )}

      {/* ── SVG Canvas ── */}
      <div
        className="flex-1 overflow-auto"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: '0 0',
            display: 'inline-block',
          }}
        >
          <svg
            width={totalWidth}
            height={totalHeight}
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            style={{ display: 'block' }}
          >
            <EdgeMarkerDefs />

            {/* ── Column header ── */}
            <rect x={0} y={0} width={totalWidth} height={headerRowHeight} fill="#0a0f1a" />
            <rect x={SVG_PAD} y={8} width={LABEL_WIDTH - 8} height={headerRowHeight - 16} rx={4} fill="#0f172a" />
            <text x={SVG_PAD + 8} y={headerRowHeight / 2 + 4} fontSize={10} fill="#475569" fontFamily="monospace">
              lane / horizon
            </text>
            {(() => {
              let xOff = 0;
              return layout.columnSpecs.map((col) => {
                const x = SVG_PAD + LABEL_WIDTH + xOff;
                const cx = x + col.width / 2;
                xOff += col.width;
                const isExpanded = expandedHorizons.has(col.horizon);

                if (col.isUnscheduled) {
                  return (
                    <text key={col.id} x={cx} y={headerRowHeight / 2 + 4} fontSize={10} fill="#475569" textAnchor="middle" fontFamily="monospace">
                      📅 unscheduled
                    </text>
                  );
                }
                if (col.dateRange) {
                  // Phase sub-column
                  const dateStr = col.dateRange.start.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                  const subLabel = col.moonTagline ? `${col.moonTagline} · ${dateStr}` : dateStr;
                  return (
                    <g key={col.id}>
                      <text x={cx} y={headerRowHeight / 2 - 1} fontSize={11} fill="#64748b" textAnchor="middle" fontFamily="monospace">
                        {col.emoji} {col.label}
                      </text>
                      <text x={cx} y={headerRowHeight / 2 + 13} fontSize={9} fill="#475569" textAnchor="middle" fontFamily="monospace">
                        {subLabel}
                      </text>
                    </g>
                  );
                }
                // Top-level horizon — clickable toggle
                return (
                  <g key={col.id} onClick={() => toggleHorizon(col.horizon)} style={{ cursor: 'pointer' }} data-interactive="">
                    <rect x={x + 4} y={8} width={col.width - 8} height={headerRowHeight - 16} rx={4} fill={isExpanded ? '#1e3a5f' : '#0f172a'} />
                    <text x={cx} y={headerRowHeight / 2 + 4} fontSize={11} fontWeight={600} fill={isExpanded ? '#60a5fa' : '#64748b'} textAnchor="middle" fontFamily="monospace">
                      {col.label} {isExpanded ? '▾' : '▸'}
                    </text>
                  </g>
                );
              });
            })()}

            {/* ── Vertical grid lines ── */}
            {gridLines}

            {/* ── Lane backgrounds + labels ── */}
            {laneIds.map((laneId) => {
              const cfg = LANE_CONFIGS.find((l) => l.id === laneId)!;
              const ly = laneY[laneId];
              const lh = laneHeight[laneId];
              if (!ly && ly !== 0) return null;
              return (
                <g key={laneId}>
                  {/* Full-width tinted background */}
                  <rect x={0} y={ly} width={totalWidth} height={lh} fill={cfg.bg} />
                  {/* Lane separator */}
                  <line x1={0} y1={ly} x2={totalWidth} y2={ly} stroke="#1e293b" strokeWidth={1} />
                  {/* Accent side bar */}
                  <rect x={0} y={ly} width={3} height={lh} fill={cfg.accent} opacity={0.6} />
                  {/* Label */}
                  <g transform={`translate(${SVG_PAD + 8}, ${ly + lh / 2})`}>
                    <text
                      transform="rotate(-90)"
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight={600}
                      fill={cfg.accent}
                      fontFamily="ui-sans-serif, system-ui, sans-serif"
                      letterSpacing={1}
                    >
                      {cfg.label.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* ── Edges (below nodes) ── */}
            <g>
              {(() => {
                // Deduplicate edges after proxy resolution
                const seen = new Set<string>();
                return visibleEdges.map((edge, i) => {
                  const resolvedFrom = edgeProxy.get(edge.from) ?? edge.from;
                  const resolvedTo = edgeProxy.get(edge.to) ?? edge.to;
                  if (resolvedFrom === resolvedTo) return null;
                  const dedupKey = `${resolvedFrom}:${resolvedTo}:${edge.type}`;
                  if (seen.has(dedupKey)) return null;
                  seen.add(dedupKey);

                  // Edge declutter: if not showAllEdges, only show edges connected to activeId
                  const connectedToActive = activeId != null && (
                    resolvedFrom === activeId || resolvedTo === activeId
                  );
                  if (!showAllEdges && !connectedToActive) return null;

                  const isHighlighted = showAllEdges
                    ? (!activeId || connectedToActive)
                    : true; // on-hover edges are always full opacity
                  return (
                    <RoadmapEdgeComponent
                      key={i}
                      edge={edge}
                      nodeMap={nodeMap}
                      isVisible={true}
                      isHighlighted={isHighlighted}
                      edgeProxy={edgeProxy}
                    />
                  );
                });
              })()}
            </g>

            {/* ── Nodes ── */}
            <g data-interactive>
              {visibleNodes.map((node) => {
                const cluster = clusterMap.get(node.id);
                return (
                  <RoadmapNodeComponent
                    key={node.id}
                    node={node}
                    isSelected={selectedNode?.id === node.id}
                    isHighlighted={connectedIds.has(node.id)}
                    onClick={(n) => setSelectedNode((prev) => (prev?.id === n.id ? null : n))}
                    onHover={setHoveredNodeId}
                    cluster={cluster ? { id: cluster.id, label: cluster.label, memberCount: cluster.memberIds.length } : undefined}
                    isClusterExpanded={cluster ? (clusterState.get(cluster.id) ?? false) : undefined}
                    onToggleCluster={cluster ? toggleCluster : undefined}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <DetailPanel
        node={selectedNode}
        edges={layout.edges}
        nodeMap={nodeMap}
        fullNodeMap={fullNodeMap}
        onClose={() => setSelectedNode(null)}
        onSelectNode={setSelectedNode}
      />
    </div>
  );
}
