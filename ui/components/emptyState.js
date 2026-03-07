/**
 * Estado vacío del mapa: mensaje cuando no hay nodos.
 * Stateless: solo recibe container.
 *
 * @param {HTMLElement} container
 */
export function renderEmptyState(container) {
  container.innerHTML =
    '<div class="empty-state">' +
    "<h2>Sin datos en el mapa</h2>" +
    "<p>El mapa se llena cuando usás las tools de Vitacore desde Cursor (log_step, close_session, check_architectural_health, submit_for_background_review).</p>" +
    '<p><a href="https://github.com/modelcontextprotocol/specification" target="_blank" rel="noopener">Usar Vitacore desde Cursor</a> — ejecutá un flujo que registre sesiones y pasos para ver nodos conectados aquí.</p>' +
    "</div>";
}
