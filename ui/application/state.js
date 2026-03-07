/**
 * Capa de aplicación: estado de la UI (una sola fuente de verdad).
 * Responsabilidad: crear y tipar AppState; restauración de viewport desde storage.
 * Depende de core (viewport) y del host (localStorage) para persistencia.
 */

import {
  deserializeViewport,
  viewportStorageKey,
} from "../core/viewport.js";

/**
 * @typedef {Object} AppState
 * @property {import('../core/contracts.js').GraphData | null} fullGraphData
 * @property {import('../core/contracts.js').FilterState} filterState
 * @property {{ zoomLevel: number, panX: number, panY: number }} viewState
 * @property {string | null} selectedNodeId
 * @property {string} lastGraphFingerprint
 */

const DEFAULT_VIEW = { zoomLevel: 1, panX: 0, panY: 0 };

/**
 * Crea el estado inicial. Restaura viewport desde localStorage si está disponible.
 * @param {{ getItem: (key: string) => string | null } | undefined} [storage] - Si no se pasa, usa global localStorage.
 * @returns {AppState}
 */
export function createInitialState(storage) {
  const store = storage ?? (typeof localStorage !== "undefined" ? localStorage : null);
  const viewState = store
    ? deserializeViewport(store.getItem(viewportStorageKey))
    : { ...DEFAULT_VIEW };
  return {
    fullGraphData: null,
    filterState: {
      types: [],
      dates: [],
      epics: [],
      text: "",
      connectedSubgraphOnly: false,
    },
    viewState,
    selectedNodeId: null,
    lastGraphFingerprint: "",
  };
}
