import type { Roadmap, NodeCluster, ClusterMap, ClusterState } from './roadmap-types';

/**
 * Identify collapsible clusters: each initiative that has same-horizon
 * `delivers` work_items becomes a cluster.
 */
export function computeClusters(roadmap: Roadmap): ClusterMap {
  const nodeById = new Map(roadmap.nodes.map((n) => [n.id, n]));
  const clusters: ClusterMap = new Map();

  for (const node of roadmap.nodes) {
    if (node.kind !== 'initiative') continue;

    // Find work_items that deliver to this initiative AND share same horizon
    const memberIds: string[] = [];
    for (const edge of roadmap.edges) {
      if (edge.type === 'delivers' && edge.to === node.id) {
        const source = nodeById.get(edge.from);
        if (source && source.kind === 'work_item' && source.horizon === node.horizon) {
          memberIds.push(source.id);
        }
      }
    }

    if (memberIds.length > 0) {
      clusters.set(node.id, {
        id: node.id,
        label: node.title,
        memberIds,
        anchorId: node.id,
        horizon: node.horizon,
      });
    }
  }

  return clusters;
}

/**
 * Return set of node IDs that should be hidden (members of collapsed clusters).
 */
export function deriveHiddenNodeIds(
  clusterMap: ClusterMap,
  clusterState: ClusterState,
): Set<string> {
  const hidden = new Set<string>();
  for (const [clusterId, cluster] of clusterMap) {
    const isExpanded = clusterState.get(clusterId) ?? false;
    if (!isExpanded) {
      for (const memberId of cluster.memberIds) {
        hidden.add(memberId);
      }
    }
  }
  return hidden;
}

/**
 * Build a proxy map: hidden member IDs → their cluster anchor ID.
 * Used to reroute edges from hidden nodes to the cluster anchor.
 */
export function deriveEdgeProxy(
  clusterMap: ClusterMap,
  clusterState: ClusterState,
): Map<string, string> {
  const proxy = new Map<string, string>();
  for (const [clusterId, cluster] of clusterMap) {
    const isExpanded = clusterState.get(clusterId) ?? false;
    if (!isExpanded) {
      for (const memberId of cluster.memberIds) {
        proxy.set(memberId, cluster.anchorId);
      }
    }
  }
  return proxy;
}
