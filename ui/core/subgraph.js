/**
 * Subgrafo conexo que contiene los seedIds (BFS por edges).
 * Puro: sin side effects.
 *
 * @param {import('./contracts.js').GraphNode[]} nodes
 * @param {import('./contracts.js').GraphEdge[]} edges
 * @param {Set<string>} seedIds
 * @returns {{ nodes: import('./contracts.js').GraphNode[], edges: import('./contracts.js').GraphEdge[] }}
 */
export function extractConnectedSubgraph(nodes, edges, seedIds) {
  if (!seedIds.size) return { nodes: [], edges: [] };

  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.to).push(e.from);
  }

  const reachable = new Set(seedIds);
  const queue = [...seedIds];
  while (queue.length) {
    const id = queue.shift();
    for (const to of adj.get(id) || []) {
      if (!reachable.has(to)) {
        reachable.add(to);
        queue.push(to);
      }
    }
  }

  const outNodes = nodes.filter((n) => reachable.has(n.id));
  const outEdges = edges.filter(
    (e) => reachable.has(e.from) && reachable.has(e.to)
  );
  return { nodes: outNodes, edges: outEdges };
}
