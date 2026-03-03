'use client';

import { LANE_CONFIGS, EDGE_STYLES, STATUS_COLORS } from './roadmap-types';
import type { EdgeType, NodeStatus } from './roadmap-types';

export function RoadmapLegend() {
  const edgeTypes = Object.entries(EDGE_STYLES) as [EdgeType, typeof EDGE_STYLES[EdgeType]][];
  const statuses = Object.entries(STATUS_COLORS) as [NodeStatus, string][];

  return (
    <div className="bg-gray-900/80 border border-gray-700/50 rounded-xl p-4 text-xs text-gray-300 flex flex-wrap gap-6">
      {/* Lanes */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Swimlanes</div>
        <div className="space-y-1">
          {LANE_CONFIGS.map((lane) => (
            <div key={lane.id} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: lane.nodeFill, border: `1px solid ${lane.accent}40` }}
              />
              <span style={{ color: lane.accent }}>{lane.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edges */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Edge Types</div>
        <div className="space-y-1.5">
          {edgeTypes.map(([type, style]) => (
            <div key={type} className="flex items-center gap-2">
              <svg width={40} height={10}>
                <line
                  x1={0}
                  y1={5}
                  x2={36}
                  y2={5}
                  stroke={style.color}
                  strokeWidth={style.width}
                  strokeDasharray={style.dashArray === 'none' ? undefined : style.dashArray}
                />
                <polygon
                  points="34,2 40,5 34,8"
                  fill={style.color}
                  opacity={style.markerId === 'none' ? 0 : 1}
                />
              </svg>
              <span style={{ color: style.color }}>{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Status</div>
        <div className="space-y-1">
          {statuses.map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="inline-block w-1 h-4 rounded"
                style={{ backgroundColor: color }}
              />
              <span style={{ color }}>{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kinds */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Node Kinds</div>
        <div className="space-y-1 font-mono">
          {[
            ['◉', 'outcome'],
            ['◈', 'initiative'],
            ['□', 'work item'],
            ['◇', 'decision'],
            ['⚠', 'risk'],
            ['★', 'milestone'],
            ['◎', 'metric'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-gray-400">{icon}</span>
              <span className="text-gray-300">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
