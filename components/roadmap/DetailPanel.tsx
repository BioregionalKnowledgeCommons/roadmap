'use client';

import { useEffect } from 'react';
import type { RoadmapNode, LayoutNode, RoadmapEdge } from './roadmap-types';
import { LANE_CONFIG_MAP, STATUS_COLORS, PRIORITY_COLORS, EDGE_STYLES } from './roadmap-types';

interface Props {
  node: LayoutNode | null;
  edges: RoadmapEdge[];
  nodeMap: Map<string, LayoutNode>;
  fullNodeMap: Map<string, RoadmapNode>;
  onClose: () => void;
  onSelectNode: (n: LayoutNode) => void;
}

export function DetailPanel({ node, edges, nodeMap, fullNodeMap, onClose, onSelectNode }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!node) return null;

  const laneConfig = LANE_CONFIG_MAP[node.lane];
  const statusColor = STATUS_COLORS[node.status];
  const priorityColor = PRIORITY_COLORS[node.priority] ?? '#6b7280';

  const inEdges = edges.filter((e) => e.to === node.id);
  const outEdges = edges.filter((e) => e.from === node.id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[360px] bg-gray-900 border-l border-gray-700/60 z-40 overflow-y-auto shadow-2xl"
        style={{ borderLeftColor: `${laneConfig.accent}40` }}
      >
        {/* Header */}
        <div
          className="p-5 border-b border-gray-700/40"
          style={{ borderBottomColor: `${laneConfig.accent}30` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    color: laneConfig.accent,
                    backgroundColor: `${laneConfig.accent}15`,
                    border: `1px solid ${laneConfig.accent}30`,
                  }}
                >
                  {node.kind.replace('_', ' ')}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: priorityColor, backgroundColor: `${priorityColor}15`, border: `1px solid ${priorityColor}30` }}
                >
                  {node.priority}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ color: statusColor, backgroundColor: `${statusColor}15`, border: `1px solid ${statusColor}30` }}
                >
                  {node.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white leading-snug">{node.title}</h2>
              <div className="text-[10px] text-gray-500 mt-1 font-mono">{node.id}</div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors mt-0.5 flex-shrink-0"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Summary */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Summary</div>
            <p className="text-sm text-gray-300 leading-relaxed">{node.summary}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <Meta label="Horizon" value={node.horizon} />
            <Meta label="Lane" value={laneConfig.label} color={laneConfig.accent} />
            {node.due_date && <Meta label="Due" value={node.due_date} />}
            {node.owner && <Meta label="Owner" value={node.owner.replace('owner.', '')} />}
          </div>

          {/* GitHub link */}
          {node.github_url && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">GitHub</div>
              <a
                href={node.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                {(() => {
                  const m = node.github_url.match(/\/issues\/(\d+)$/);
                  return m ? `Issue #${m[1]}` : 'View on GitHub';
                })()}
              </a>
            </div>
          )}

          {/* Bounty link */}
          {node.bounty_url && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Bounty</div>
              <a
                href={node.bounty_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors break-all"
              >
                {node.bounty_url}
              </a>
            </div>
          )}

          {/* Tags */}
          {node.tags && node.tags.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {node.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metric metadata */}
          {node.metadata && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Target</div>
              <div className="text-sm font-mono text-gray-300">
                {String(node.metadata.target ?? '')}
                <span className="text-gray-600 ml-2">({String(node.metadata.type ?? '')})</span>
              </div>
            </div>
          )}

          {/* Outgoing edges */}
          {outEdges.length > 0 && (
            <EdgeList title="Outgoing" edges={outEdges} nodeMap={nodeMap} fullNodeMap={fullNodeMap} direction="to" onSelectNode={onSelectNode} />
          )}

          {/* Incoming edges */}
          {inEdges.length > 0 && (
            <EdgeList title="Incoming" edges={inEdges} nodeMap={nodeMap} fullNodeMap={fullNodeMap} direction="from" onSelectNode={onSelectNode} />
          )}

          {/* Source docs */}
          {node.source_docs && node.source_docs.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Source Docs</div>
              <div className="space-y-1">
                {node.source_docs.map((doc) => (
                  <div key={doc} className="text-[10px] font-mono text-gray-500 break-all">{doc}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Meta({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-600">{label}</div>
      <div className="text-xs mt-0.5 font-medium" style={{ color: color ?? '#cbd5e1' }}>
        {value}
      </div>
    </div>
  );
}

function EdgeList({
  title,
  edges,
  nodeMap,
  fullNodeMap,
  direction,
  onSelectNode,
}: {
  title: string;
  edges: RoadmapEdge[];
  nodeMap: Map<string, LayoutNode>;
  fullNodeMap: Map<string, RoadmapNode>;
  direction: 'from' | 'to';
  onSelectNode: (n: LayoutNode) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{title}</div>
      <div className="space-y-1.5">
        {edges.map((e, i) => {
          const peerId = direction === 'to' ? e.to : e.from;
          const layoutPeer = nodeMap.get(peerId);
          const rawPeer = fullNodeMap.get(peerId);
          const style = EDGE_STYLES[e.type];
          const peerTitle = layoutPeer?.title ?? rawPeer?.title ?? peerId;
          return (
            <div key={i} className="flex items-start gap-2">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5"
                style={{ color: style.color, backgroundColor: `${style.color}15`, border: `1px solid ${style.color}25` }}
              >
                {style.label}
              </span>
              {layoutPeer ? (
                <button
                  className="text-[11px] text-blue-400 hover:text-blue-300 leading-tight text-left underline underline-offset-2 transition-colors"
                  onClick={() => onSelectNode(layoutPeer)}
                >
                  {peerTitle}
                </button>
              ) : (
                <span className="text-[11px] text-gray-300 leading-tight">{peerTitle}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
