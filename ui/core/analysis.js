/**
 * Extrae fecha DD/MM/YYYY desde id o sessionId de un nodo.
 * @param {import('./contracts.js').GraphNode} n
 * @returns {string | null}
 */
function extractDateFromNode(n) {
  if (n.type === "session") {
    const sid = (n.id || "").replace(/^session:/, "") || n.label || "";
    const m = sid.match(/^\d{2}\/\d{2}\/\d{4}/);
    return m ? m[0] : null;
  }
  if ((n.type === "step" || n.type === "refactor") && n.sessionId) {
    const m = n.sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
    return m ? m[0] : null;
  }
  return null;
}

/**
 * Análisis de nodos: extrae índices para filtros (fechas, épicas, tipos) y conteos por fecha.
 * Puro: sin side effects.
 *
 * @param {import('./contracts.js').GraphData} data
 * @returns {{ dates: string[], epics: string[], types: string[], typeCounts: Record<string, number>, sessionCountByDate: Record<string, number>, stepCountByDate: Record<string, number> }}
 */
export function analyzeGraph(data) {
  const nodes = data?.nodes ?? [];
  const dates = new Set();
  const epics = new Set();
  /** @type {Record<string, number>} */
  const typeCounts = {};
  /** @type {Record<string, number>} */
  const sessionCountByDate = {};
  /** @type {Record<string, number>} */
  const stepCountByDate = {};

  for (const n of nodes) {
    typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    const id = n.id || "";
    const label = n.label || "";

    if (n.type === "session") {
      const sid = id.replace(/^session:/, "") || label;
      const dateMatch = sid.match(/^\d{2}\/\d{2}\/\d{4}/);
      if (dateMatch) {
        const d = dateMatch[0];
        dates.add(d);
        sessionCountByDate[d] = (sessionCountByDate[d] || 0) + 1;
      }
      const epicMatch = sid.match(/^([a-z]+-[a-z]+)/);
      if (epicMatch) epics.add(epicMatch[1]);
    }
    if (n.type === "step" && n.sessionId) {
      const dateMatch = n.sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
      if (dateMatch) {
        const d = dateMatch[0];
        dates.add(d);
        stepCountByDate[d] = (stepCountByDate[d] || 0) + 1;
      }
      const epicMatch = n.sessionId.match(/^([a-z]+-[a-z]+)/);
      if (epicMatch) epics.add(epicMatch[1]);
    }
    if (n.type === "refactor" && n.sessionId) {
      const dateMatch = n.sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
      if (dateMatch) dates.add(dateMatch[0]);
    }
  }

  return {
    dates: Array.from(dates).sort(),
    epics: Array.from(epics).sort(),
    types: Object.keys(typeCounts).sort(),
    typeCounts,
    sessionCountByDate,
    stepCountByDate,
  };
}

export { extractDateFromNode };
