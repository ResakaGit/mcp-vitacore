/**
 * Capa de aplicación: selectores (datos derivados del estado).
 * Funciones puras: state → datos para la vista. Sin side effects.
 */

import { applyFilters } from "../core/filter.js";

/**
 * Grafo filtrado listo para render (nodos + edges). Null si no hay fullGraphData.
 * @param {import('./state.js').AppState} state
 * @returns {import('../core/contracts.js').GraphData | null}
 */
export function getDataToRender(state) {
  if (!state.fullGraphData) return null;
  return applyFilters(state.fullGraphData, state.filterState);
}

/**
 * Nodo seleccionado a partir del estado, o null.
 * @param {import('./state.js').AppState} state
 * @returns {import('../core/contracts.js').GraphNode | null}
 */
export function getSelectedNode(state) {
  const data = getDataToRender(state);
  if (!data || !state.selectedNodeId) return null;
  return data.nodes.find((n) => n.id === state.selectedNodeId) ?? null;
}

/**
 * Datos para el panel de detalle: nodo, edges, steps de la sesión (si nodo es sesión), nodo sesión (si nodo es step).
 * @param {import('./state.js').AppState} state
 * @returns {{ node: import('../core/contracts.js').GraphNode | null, edges: import('../core/contracts.js').GraphEdge[], stepsForSession: import('../core/contracts.js').GraphNode[], sessionNode: import('../core/contracts.js').GraphNode | null }}
 */
export function getDataForDetailPanel(state) {
  const data = getDataToRender(state);
  const node = getSelectedNode(state);
  const nodes = data ? data.nodes : [];
  let stepsForSession = [];
  let sessionNode = null;
  if (node && data) {
    if (node.type === "session") {
      const rawId = node.id.replace(/^session:/, "");
      stepsForSession = nodes.filter((n) => n.type === "step" && (n.sessionId === rawId || n.sessionId === node.id));
    }
    if (node.type === "step" && node.sessionId) {
      sessionNode = nodes.find((n) => n.id === "session:" + node.sessionId) ?? null;
    }
  }
  return {
    node,
    edges: data ? data.edges : [],
    stepsForSession,
    sessionNode,
  };
}
