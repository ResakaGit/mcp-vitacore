/**
 * Match de nodo contra FilterState y aplicación de filtros al grafo.
 * Puro: sin side effects.
 */

import { parseSearchTerms } from "./search.js";
import { extractConnectedSubgraph } from "./subgraph.js";

/**
 * @param {import('./contracts.js').GraphNode} node
 * @param {import('./contracts.js').FilterState} state
 * @returns {boolean}
 */
export function nodeMatchesFilter(node, state) {
  if (state.types.length && !state.types.includes(node.type)) return false;

  const id = node.id || "";
  const label = (node.label || "").toLowerCase();
  const sessionId =
    node.sessionId ||
    (node.type === "session" ? id.replace(/^session:/, "") : "");

  if (state.dates.length) {
    const dateMatch = sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
    if (!dateMatch || !state.dates.includes(dateMatch[0])) return false;
  }
  if (state.epics.length) {
    const epicMatch = sessionId.match(/^([a-z]+-[a-z]+)/);
    if (!epicMatch || !state.epics.includes(epicMatch[1])) return false;
  }

  const terms = parseSearchTerms(state.text);
  if (terms.length) {
    const idL = id.toLowerCase();
    const summaryL = (node.summary || "").toLowerCase();
    const matchesAny = terms.some(
      (q) => idL.includes(q) || label.includes(q) || summaryL.includes(q)
    );
    if (!matchesAny) return false;
  }
  return true;
}

/**
 * Aplica filtros al grafo; si connectedSubgraphOnly y hay texto, devuelve solo subgrafo conexo.
 *
 * @param {import('./contracts.js').GraphData} data
 * @param {import('./contracts.js').FilterState} state
 * @returns {import('./contracts.js').GraphData}
 */
export function applyFilters(data, state) {
  if (!data?.nodes) return data;

  let nodes = data.nodes.filter((n) => nodeMatchesFilter(n, state));
  let edges = (data.edges || []).filter((e) => {
    const fromOk = nodes.some((n) => n.id === e.from);
    const toOk = nodes.some((n) => n.id === e.to);
    return fromOk && toOk;
  });

  if (
    state.connectedSubgraphOnly &&
    parseSearchTerms(state.text).length > 0
  ) {
    const terms = parseSearchTerms(state.text);
    const seedIds = new Set(
      nodes
        .filter((n) => {
          const idL = (n.id || "").toLowerCase();
          const labelL = (n.label || "").toLowerCase();
          const summaryL = (n.summary || "").toLowerCase();
          return terms.some(
            (q) =>
              idL.includes(q) || labelL.includes(q) || summaryL.includes(q)
          );
        })
        .map((n) => n.id)
    );
    const sub = extractConnectedSubgraph(
      data.nodes,
      data.edges || [],
      seedIds
    );
    nodes = sub.nodes;
    edges = sub.edges;
  }

  return { nodes, edges };
}
