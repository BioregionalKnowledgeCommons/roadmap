'use client';

import type { NodeKind, NodeStatus, NodePriority, EdgeType, Horizon, LaneId } from './roadmap-types';
import { HORIZONS, LANE_CONFIGS } from './roadmap-types';

export interface FilterState {
  horizons: Set<Horizon>;
  kinds: Set<NodeKind>;
  statuses: Set<NodeStatus>;
  priorities: Set<NodePriority>;
  edgeTypes: Set<EdgeType>;
  lanes: Set<LaneId>;
}

export function defaultFilters(): FilterState {
  return {
    horizons:  new Set(HORIZONS),
    kinds:     new Set(['outcome', 'initiative', 'work_item', 'decision', 'risk', 'milestone', 'metric'] as NodeKind[]),
    statuses:  new Set(['planned', 'in_progress', 'done'] as NodeStatus[]),
    priorities: new Set(['P0', 'P1', 'P2'] as NodePriority[]),
    edgeTypes: new Set(['delivers', 'depends_on', 'mitigates', 'measures', 'informs', 'blocks', 'references'] as EdgeType[]),
    lanes:     new Set(LANE_CONFIGS.map((l) => l.id)),
  };
}

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

function toggle<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set);
  if (next.has(val)) next.delete(val);
  else next.add(val);
  return next;
}

const STATUS_COLORS: Record<string, string> = {
  planned: '#6b7280',
  in_progress: '#f59e0b',
  done: '#22c55e',
};

export function RoadmapFilters({ filters, onChange }: Props) {
  const chip = (
    label: string,
    active: boolean,
    color: string,
    onClick: () => void,
  ) => (
    <button
      key={label}
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
      style={{
        borderColor: active ? color : `${color}40`,
        color: active ? color : `${color}80`,
        backgroundColor: active ? `${color}15` : 'transparent',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-2 border-b border-gray-800/30 text-xs text-gray-400">
      {/* Horizons */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 mr-1">Horizon</span>
        {HORIZONS.map((h) =>
          chip(h, filters.horizons.has(h), '#818cf8', () =>
            onChange({ ...filters, horizons: toggle(filters.horizons, h) })
          )
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 mr-1">Status</span>
        {(['planned', 'in_progress', 'done'] as NodeStatus[]).map((s) =>
          chip(s.replace('_', ' '), filters.statuses.has(s), STATUS_COLORS[s], () =>
            onChange({ ...filters, statuses: toggle(filters.statuses, s) })
          )
        )}
      </div>

      {/* Priority */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 mr-1">Priority</span>
        {(['P0', 'P1', 'P2'] as NodePriority[]).map((p) =>
          chip(p, filters.priorities.has(p), p === 'P0' ? '#ef4444' : p === 'P1' ? '#f97316' : '#eab308', () =>
            onChange({ ...filters, priorities: toggle(filters.priorities, p) })
          )
        )}
      </div>

      {/* Lanes */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 mr-1">Lane</span>
        {LANE_CONFIGS.map((l) =>
          chip(l.label.split(' ')[0], filters.lanes.has(l.id), l.accent, () =>
            onChange({ ...filters, lanes: toggle(filters.lanes, l.id) })
          )
        )}
      </div>
    </div>
  );
}
