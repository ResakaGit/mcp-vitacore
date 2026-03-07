/**
 * Bitácora Vitacore: vista agenda por días.
 * Rutas centralizadas; funciones puras para URL y formato; event delegation para expansión.
 */
(function () {
  const ROUTES = {
    DB_SOURCES: "/api/db-sources",
    API_AGENDA: "/api/agenda",
    PAGE_INDEX: "index.html",
  };

  const SELECTORS = {
    STATUS: "#agenda-status",
    DAYS: "#agenda-days",
    DATE_FROM: "#agenda-date-from",
    DATE_TO: "#agenda-date-to",
    DB_SOURCE: "#agenda-db-source",
    AGENT_FILTER: 'input[name="agent_filter"]',
  };

  const CLASS = { LOADING: "loading", ERROR: "error" };

  function getEl(selector) {
    return document.querySelector(selector);
  }

  function setStatus(text, className) {
    const el = getEl(SELECTORS.STATUS);
    if (!el) return;
    el.textContent = text;
    el.className = className || "";
  }

  /** Construye URL de agenda. Pura. Sin date_from/date_to = backend usa último mes. */
  function buildAgendaUrl(agentFilter, dateFrom, dateTo, dbId) {
    const params = new URLSearchParams({ agent_filter: agentFilter });
    if (dateFrom && dateFrom.trim()) params.set("date_from", dateFrom.trim());
    if (dateTo && dateTo.trim()) params.set("date_to", dateTo.trim());
    if (dbId && dbId.trim()) params.set("db", dbId.trim());
    return ROUTES.API_AGENDA + "?" + params.toString();
  }

  function setDefaultDateRange() {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    const fromEl = getEl(SELECTORS.DATE_FROM);
    const toEl = getEl(SELECTORS.DATE_TO);
    if (fromEl && !fromEl.value) fromEl.value = fmt(from);
    if (toEl && !toEl.value) toEl.value = fmt(to);
  }

  function formatDayLabel(dateStr) {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /** Devuelve HTML de un día (header + body). Pura. */
  function buildDayHtml(day) {
    const sessionCount = day.sessions.length;
    const stepCount = day.sessions.reduce((acc, s) => acc + (s.steps?.length ?? 0), 0);
    const dayLabel = formatDayLabel(day.date);
    const dayId = "day-" + day.date.replace(/-/g, "");

    let body = "";
    for (const session of day.sessions) {
      body += '<div class="agenda-session">';
      body += '<div class="agenda-session-id">' + escapeHtml(session.id) + "</div>";
      if (session.summary) {
        body += '<div class="agenda-session-summary">' + escapeHtml(session.summary) + "</div>";
      }
      if (session.steps && session.steps.length > 0) {
        for (const step of session.steps) {
          const badge =
            step.agent_key && step.agent_key.trim()
              ? '<span class="agenda-agent-badge">' + escapeHtml(step.agent_key) + "</span>"
              : '<span class="agenda-agent-badge empty">—</span>';
          body +=
            '<div class="agenda-step">' +
            '<div class="agenda-step-meta">' +
            formatTime(step.created_at) +
            badge +
            "</div>" +
            '<div class="agenda-step-action">' +
            escapeHtml(step.action) +
            "</div>";
          if (step.implications) {
            body += '<div class="agenda-step-implications">' + escapeHtml(step.implications) + "</div>";
          }
          body += "</div>";
        }
      }
      body += "</div>";
    }

    return (
      '<div class="agenda-day">' +
      '<div class="agenda-day-header" role="button" tabindex="0" aria-expanded="false" aria-controls="' +
      dayId +
      '" data-day-id="' +
      dayId +
      '">' +
      "<h2>" +
      dayLabel +
      "</h2>" +
      '<span class="agenda-day-badge">' +
      sessionCount +
      " sesión(es), " +
      stepCount +
      " paso(s)</span>" +
      "</div>" +
      '<div class="agenda-day-body" id="' +
      dayId +
      '" hidden>' +
      body +
      "</div></div>"
    );
  }

  /** Devuelve HTML de todos los días. Pura. */
  function buildDaysHtml(days) {
    if (!days || days.length === 0) {
      return "<p class='empty-state'>No hay sesiones en la bitácora para los filtros elegidos.</p>";
    }
    return days.map(buildDayHtml).join("");
  }

  function toggleDayBody(header) {
    const dayId = header.getAttribute("data-day-id");
    const body = dayId ? document.getElementById(dayId) : null;
    if (!body) return;
    const expanded = !body.hidden;
    body.hidden = expanded;
    header.setAttribute("aria-expanded", String(!expanded));
  }

  function load() {
    const agentFilter =
      document.querySelector(SELECTORS.AGENT_FILTER + ":checked")?.value ?? "all";
    const dateFrom = getEl(SELECTORS.DATE_FROM)?.value ?? "";
    const dateTo = getEl(SELECTORS.DATE_TO)?.value ?? "";
    const dbId = getEl(SELECTORS.DB_SOURCE)?.value ?? "";

    setStatus("Cargando…", CLASS.LOADING);

    fetch(buildAgendaUrl(agentFilter, dateFrom, dateTo, dbId))
      .then((r) => {
        if (!r.ok) throw new Error(r.status + " " + r.statusText);
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStatus("");
        const container = getEl(SELECTORS.DAYS);
        if (!container) return;
        container.innerHTML = buildDaysHtml(data.days || []);
      })
      .catch((err) => {
        const msg = err.message || String(err);
        setStatus(
          msg.includes("500") || msg.includes("Failed to fetch")
            ? "No se pudo cargar la bitácora. ¿Servidor en marcha (npm run serve:ui)?"
            : "Error: " + msg,
          CLASS.ERROR
        );
        const container = getEl(SELECTORS.DAYS);
        if (container) container.innerHTML = "";
      });
  }

  function initDbSource() {
    const sel = getEl(SELECTORS.DB_SOURCE);
    if (!sel) return Promise.resolve();
    return fetch(ROUTES.DB_SOURCES)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((data) => {
        const sources = data.sources || [];
        sel.innerHTML = sources.map((s) => "<option value=\"" + s.id + "\">" + (s.label || s.id) + "</option>").join("");
        if (sources.length) sel.value = sources[0].id;
      })
      .catch(() => { sel.innerHTML = "<option value=\"mcp\">MCP (paquete)</option>"; });
  }

  const container = getEl(SELECTORS.DAYS);
  if (container) {
    container.addEventListener("click", (e) => {
      const header = e.target.closest(".agenda-day-header");
      if (header) toggleDayBody(header);
    });
    container.addEventListener("keydown", (e) => {
      const header = e.target.closest(".agenda-day-header");
      if (header && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        toggleDayBody(header);
      }
    });
  }

  document.querySelectorAll(SELECTORS.AGENT_FILTER).forEach((radio) => {
    radio.addEventListener("change", load);
  });
  const dateFromEl = getEl(SELECTORS.DATE_FROM);
  const dateToEl = getEl(SELECTORS.DATE_TO);
  if (dateFromEl) dateFromEl.addEventListener("change", load);
  if (dateToEl) dateToEl.addEventListener("change", load);
  const dbSourceEl = getEl(SELECTORS.DB_SOURCE);
  if (dbSourceEl) dbSourceEl.addEventListener("change", load);

  initDbSource().then(() => {
    setDefaultDateRange();
    load();
  });
})();
