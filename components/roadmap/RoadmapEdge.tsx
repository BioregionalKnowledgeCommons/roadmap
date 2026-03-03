'use client';

import type { RoadmapEdge, LayoutNode, EdgeType } from './roadmap-types';
import { EDGE_STYLES } from './roadmap-types';

interface Props {
  edge: RoadmapEdge;
  nodeMap: Map<string, LayoutNode>;
  isVisible: boolean;
  isHighlighted: boolean;
  edgeProxy?: Map<string, string>;
}

function edgePath(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx;
  // Control point offset: generous for short edges, proportional for long
  const cpOffset = Math.max(Math.abs(dx) * 0.45, 80);
  return `M ${sx} ${sy} C ${sx + cpOffset} ${sy}, ${tx - cpOffset} ${ty}, ${tx} ${ty}`;
}

export function RoadmapEdgeComponent({ edge, nodeMap, isVisible, isHighlighted, edgeProxy }: Props) {
  if (!isVisible) return null;

  // Resolve through edge proxy (collapsed cluster rerouting)
  const fromId = edgeProxy?.get(edge.from) ?? edge.from;
  const toId = edgeProxy?.get(edge.to) ?? edge.to;
  // Skip internal edges where both endpoints resolve to same cluster anchor
  if (fromId === toId) return null;

  const src = nodeMap.get(fromId);
  const tgt = nodeMap.get(toId);
  if (!src || !tgt) return null;

  const style = EDGE_STYLES[edge.type as EdgeType] ?? EDGE_STYLES.delivers;

  // Ensure arrows always flow left-to-right (swap visual src/tgt if needed)
  const srcIsRightOf = src.col !== tgt.col && src.x > tgt.x;
  const [visualSrc, visualTgt] = srcIsRightOf ? [tgt, src] : [src, tgt];
  const sx = visualSrc.x + visualSrc.width;
  const sy = visualSrc.y + visualSrc.height / 2;
  const tx = visualTgt.x;
  const ty = visualTgt.y + visualTgt.height / 2;

  const d = edgePath(sx, sy, tx, ty);
  const opacity = isHighlighted ? 1 : 0.45;
  const strokeWidth = isHighlighted ? style.width * 1.5 : style.width;
  const dashArray = style.dashArray === 'none' ? undefined : style.dashArray;
  const markerEnd = style.markerId !== 'none' ? `url(#${style.markerId})` : undefined;

  return (
    <path
      d={d}
      stroke={style.color}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      fill="none"
      markerEnd={markerEnd}
      opacity={opacity}
      strokeLinecap="round"
    />
  );
}

/** SVG <defs> containing all arrowhead markers — render once in the SVG root */
export function EdgeMarkerDefs() {
  const markers: Array<{ id: string; color: string; size?: number }> = [
    { id: 'arrow-default',    color: '#6b7280' },
    { id: 'arrow-blue',       color: '#60a5fa' },
    { id: 'arrow-blue-light', color: '#93c5fd' },
    { id: 'arrow-gray',       color: '#9ca3af' },
    { id: 'arrow-red-light',  color: '#f87171' },
    { id: 'arrow-red-heavy',  color: '#ef4444', size: 8 },
  ];

  return (
    <defs>
      {markers.map(({ id, color, size = 6 }) => (
        <marker
          key={id}
          id={id}
          markerWidth={size}
          markerHeight={size}
          refX={size - 1}
          refY={size / 2}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={`M 0 0 L ${size} ${size / 2} L 0 ${size} z`}
            fill={color}
          />
        </marker>
      ))}
    </defs>
  );
}
