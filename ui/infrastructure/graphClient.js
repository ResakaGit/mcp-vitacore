/**
 * Capa de infraestructura: acceso a la API del grafo y fuentes de datos.
 * Responsabilidad única: HTTP y lectura de parámetros desde el DOM (getDbParam).
 * Inyectable para tests y DIP.
 */

export const API = {
  DB_SOURCES: "/api/db-sources",
  GRAPH: "/api/graph",
  ANALYTICS: "/api/analytics",
};

/**
 * Obtiene el query string ?db=id desde el selector #db-source del DOM.
 * @returns {string}
 */
export function defaultGetDbParam() {
  const sel = document.getElementById("db-source");
  const id = sel && sel.value ? sel.value : "";
  return id ? "?db=" + encodeURIComponent(id) : "";
}

/**
 * Fetch del grafo; valida que la respuesta tenga data.nodes (array).
 * @param {() => string} getDbParam
 * @returns {Promise<import('../core/contracts.js').GraphData>}
 */
export function defaultFetchGraph(getDbParam) {
  return fetch(API.GRAPH + getDbParam())
    .then((r) => {
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      return r.json();
    })
    .then((data) => {
      if (data && data.error) throw new Error(data.error);
      if (!data || !Array.isArray(data.nodes)) throw new Error("Formato de grafo inválido");
      return data;
    });
}

/**
 * Fetch de fuentes de DB para el selector.
 * @param {() => string} getDbParam
 * @returns {Promise<{ sources: { id: string, label?: string }[] }>}
 */
export function fetchDbSources(getDbParam) {
  return fetch(API.DB_SOURCES + getDbParam())
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))));
}

/**
 * Fetch de analytics (recent steps) para el modal de filtros.
 * @param {() => string} getDbParam
 * @returns {Promise<{ recentSteps?: { session_id: string, action?: string, implications?: string }[] }>}
 */
export function fetchAnalytics(getDbParam) {
  return fetch(API.ANALYTICS + getDbParam())
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))));
}
