/**
 * Tira de fechas para el Mapa Vitacore: navegación por día.
 * Muestra un chip por cada fecha presente en el grafo (sesiones/pasos).
 * Click en fecha = filtrar mapa a ese día; "Ver todos" = quitar filtro de fecha.
 * Stateless; recibe análisis y callbacks.
 *
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {string[]} options.dates - Fechas DD/MM/YYYY ordenadas
 * @param {Record<string, number>} options.sessionCountByDate
 * @param {Record<string, number>} options.stepCountByDate
 * @param {string[]} options.selectedDates - Fechas actualmente seleccionadas (filterState.dates)
 * @param {(date: string) => void} options.onSelectDate
 * @param {() => void} options.onClearDates
 */
export function renderDateStrip(container, options) {
  const {
    dates = [],
    sessionCountByDate = {},
    stepCountByDate = {},
    selectedDates = [],
    onSelectDate,
    onClearDates,
  } = options ?? {};

  const stripId = "map-date-strip";
  let strip = document.getElementById(stripId);
  if (!strip) {
    strip = document.createElement("div");
    strip.id = stripId;
    strip.className = "map-date-strip";
    strip.setAttribute("aria-label", "Navegación por fecha");
    container.appendChild(strip);
  }

  strip.innerHTML = "";

  function formatDateLabel(ddMMyyyy) {
    const [d, m, y] = ddMMyyyy.split("/");
    if (!d || !m || !y) return ddMMyyyy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (dates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "map-date-strip-empty";
    empty.textContent = "No hay fechas en el grafo.";
    strip.appendChild(empty);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "map-date-strip-wrap";

  const allSelected = selectedDates.length === 0;
  const todosBtn = document.createElement("button");
  todosBtn.type = "button";
  todosBtn.className = "map-date-chip" + (allSelected ? " map-date-chip--active" : "");
  todosBtn.textContent = "Ver todos";
  todosBtn.setAttribute("aria-pressed", allSelected ? "true" : "false");
  todosBtn.addEventListener("click", () => onClearDates?.());
  wrap.appendChild(todosBtn);

  for (const date of dates) {
    const sessions = sessionCountByDate[date] ?? 0;
    const steps = stepCountByDate[date] ?? 0;
    const isActive = selectedDates.length === 1 && selectedDates[0] === date;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "map-date-chip" + (isActive ? " map-date-chip--active" : "");
    chip.setAttribute("aria-pressed", isActive ? "true" : "false");
    chip.dataset.date = date;
    const label = formatDateLabel(date);
    chip.innerHTML =
      "<span class=\"map-date-chip-label\">" +
      escapeHtml(label) +
      "</span>" +
      "<span class=\"map-date-chip-counts\">" +
      sessions +
      " sesión(es), " +
      steps +
      " paso(s)</span>";
    chip.addEventListener("click", () => onSelectDate?.(date));
    wrap.appendChild(chip);
  }

  strip.appendChild(wrap);
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
