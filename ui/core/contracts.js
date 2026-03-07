/**
 * Contratos (tipos) para el grafo Vitacore.
 * Solo documentación JSDoc; sin dependencias de runtime.
 *
 * @typedef {'macro'|'session'|'step'|'paradox'|'refactor'} GraphNodeType
 *
 * @typedef {Object} GraphNode
 * @property {string} id
 * @property {GraphNodeType} type
 * @property {string} label
 * @property {string} [summary]
 * @property {string} [sessionId]
 * @property {string[]} [relatedSessionIds]
 *
 * @typedef {Object} GraphEdge
 * @property {string} from
 * @property {string} to
 *
 * @typedef {Object} GraphData
 * @property {GraphNode[]} nodes
 * @property {GraphEdge[]} edges
 *
 * @typedef {Object} FilterState
 * @property {string[]} types
 * @property {string[]} dates
 * @property {string[]} epics
 * @property {string} text
 * @property {boolean} connectedSubgraphOnly
 *
 * @typedef {Object} ViewState
 * @property {number} zoomLevel
 * @property {number} panX
 * @property {number} panY
 *
 * @typedef {GraphNode & { x: number, y: number }} NodeWithPosition
 *
 * @typedef {Object} LayoutResult
 * @property {Map<string, NodeWithPosition>} byId
 * @property {number} width
 * @property {number} height
 */

/**
 * Valida que data tenga la forma mínima de GraphData (nodes array).
 * @param {unknown} data
 * @returns {data is GraphData}
 */
export function isValidGraphData(data) {
  return (
    data != null &&
    typeof data === "object" &&
    Array.isArray(/** @type {GraphData} */ (data).nodes)
  );
}
