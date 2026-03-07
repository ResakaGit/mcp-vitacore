/**
 * Fingerprint del grafo para evitar re-renders cuando la estructura no cambió.
 * Puro: mismos inputs → mismo string.
 *
 * @param {import('./contracts.js').GraphData} data
 * @returns {string}
 */
export function graphFingerprint(data) {
  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];
  const ids = nodes.map((n) => n.id).sort();
  const edgeCount = edges.length;
  return JSON.stringify({ ids, edgeCount });
}
