/**
 * Viewport: fit view (zoom/pan to contain nodes) y persistencia (serialize/deserialize).
 * Puro: sin side effects; sin dependencias de browser.
 */

const DEFAULT_VIEW = { zoomLevel: 1, panX: 0, panY: 0 };
const STORAGE_KEY = "vitacore_viewport";

/**
 * Calcula ViewState para que todos los nodos (con posición) quepan en width x height con padding.
 *
 * @param {{ x: number, y: number }[]} nodesWithPosition
 * @param {number} width
 * @param {number} height
 * @param {number} [padding]
 * @returns {{ zoomLevel: number, panX: number, panY: number }}
 */
export function computeFitView(nodesWithPosition, width, height, padding = 48) {
  if (!nodesWithPosition.length) return { ...DEFAULT_VIEW };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodesWithPosition) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }

  const contentW = maxX - minX || 1;
  const contentH = maxY - minY || 1;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const scaleX = (width - padding * 2) / contentW;
  const scaleY = (height - padding * 2) / contentH;
  const zoomLevel = Math.min(scaleX, scaleY, 2);
  const panX = width / 2 - centerX * zoomLevel;
  const panY = height / 2 - centerY * zoomLevel;

  return { zoomLevel, panX, panY };
}

/**
 * Serializa ViewState a string para localStorage.
 *
 * @param {{ zoomLevel: number, panX: number, panY: number }} state
 * @returns {string}
 */
export function serializeViewport(state) {
  return JSON.stringify({
    zoomLevel: state.zoomLevel,
    panX: state.panX,
    panY: state.panY,
  });
}

/**
 * Deserializa string a ViewState; si falla o es inválido, devuelve DEFAULT_VIEW.
 *
 * @param {string} [str]
 * @returns {{ zoomLevel: number, panX: number, panY: number }}
 */
export function deserializeViewport(str) {
  if (str == null || typeof str !== "string") return { ...DEFAULT_VIEW };
  try {
    const o = JSON.parse(str);
    if (o == null || typeof o !== "object") return { ...DEFAULT_VIEW };
    const zoomLevel = Number(o.zoomLevel);
    const panX = Number(o.panX);
    const panY = Number(o.panY);
    if (!Number.isFinite(zoomLevel) || !Number.isFinite(panX) || !Number.isFinite(panY))
      return { ...DEFAULT_VIEW };
    return {
      zoomLevel: Math.max(0.2, Math.min(3, zoomLevel)),
      panX,
      panY,
    };
  } catch {
    return { ...DEFAULT_VIEW };
  }
}

/**
 * Clave usada para localStorage (para que el consumidor pueda persistir).
 * @type {string}
 */
export const viewportStorageKey = STORAGE_KEY;
