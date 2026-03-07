// Capa core: lógica pura
import { graphFingerprint } from "./core/graphFingerprint.js";
import { analyzeGraph } from "./core/analysis.js";
import { graphDataToReactFlow } from "./core/reactFlowAdapter.js";
import { POLL_INTERVAL_MS } from "./core/constants.js";
import { serializeViewport, viewportStorageKey } from "./core/viewport.js";

// Capa infrastructure: API y lectura DOM
import {
  defaultGetDbParam,
  defaultFetchGraph,
  fetchDbSources,
  fetchAnalytics,
} from "./infrastructure/graphClient.js";

// Capa application: estado y selectores
import { createInitialState } from "./application/state.js";
import {
  getDataToRender,
  getDataForDetailPanel,
} from "./application/selectors.js";

// Capa presentation: componentes
import { renderEmptyState } from "./components/emptyState.js";
import { renderNodeDetailPanel } from "./components/nodeDetailPanel.js";
import { renderDateStrip } from "./components/dateStrip.js";

/** @type {HTMLElement | null} */
let nodeDetailPanelContainer = null;
/** @type {HTMLElement | null} */
let dateStripContainer = null;

function renderGraph(container, data, viewState, callbacks) {
  const { nodes, edges } = data;
  if (!nodes.length) {
    renderEmptyState(container);
    if (nodeDetailPanelContainer) renderNodeDetailPanel(nodeDetailPanelContainer, { node: null, edges: [] });
    return;
  }

  const { nodes: rfNodes, edges: rfEdges } = graphDataToReactFlow(data);
  const mount = typeof window !== "undefined" && window.mountVitacoreGraph;
  if (!mount) {
    renderEmptyState(container);
    return;
  }
  mount(container, {
    nodes: rfNodes,
    edges: rfEdges,
    viewState,
    selectedNodeId: callbacks?.selectedNodeId ?? null,
    onNodeClick: callbacks?.onNodeClick,
    onViewportChange: callbacks?.onViewportChange,
    onMount: callbacks?.onMount,
  });
}

export function init(options = {}) {
  const state = createInitialState();
  const getDbParam = options.getDbParam ?? defaultGetDbParam;
  const fetchGraphFn = options.fetchGraph ?? (() => defaultFetchGraph(getDbParam));

  const statusEl = document.getElementById("status");
  const graphEl = document.getElementById("graph");

  if (!nodeDetailPanelContainer && graphEl && graphEl.parentNode) {
    nodeDetailPanelContainer = document.createElement("div");
    nodeDetailPanelContainer.id = "node-detail-wrapper";
    graphEl.parentNode.insertBefore(nodeDetailPanelContainer, graphEl.nextSibling);
  }

  if (!dateStripContainer && graphEl && graphEl.parentNode) {
    dateStripContainer = document.createElement("div");
    dateStripContainer.id = "map-date-strip-container";
    graphEl.parentNode.insertBefore(dateStripContainer, graphEl);
  }

  statusEl.textContent = "Cargando…";
  statusEl.className = "loading";

  function dataForGraph() {
    return getDataToRender(state) ?? { nodes: [], edges: [] };
  }

  function updateNodeDetailPanel() {
    const detail = getDataForDetailPanel(state);
    if (nodeDetailPanelContainer) {
      renderNodeDetailPanel(nodeDetailPanelContainer, {
        ...detail,
        onSelectNode: (nodeId) => {
          state.selectedNodeId = nodeId;
          updateNodeDetailPanel();
          renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
        },
        onCenterOnNode: fitToNode ? () => fitToNode(state.selectedNodeId) : undefined,
      });
    }
  }

  let fitToNode = () => {};

  function updateDateStrip() {
    if (!dateStripContainer || !state.fullGraphData) return;
    const analysis = analyzeGraph(state.fullGraphData);
    renderDateStrip(dateStripContainer, {
      dates: analysis.dates,
      sessionCountByDate: analysis.sessionCountByDate || {},
      stepCountByDate: analysis.stepCountByDate || {},
      selectedDates: state.filterState.dates,
      onSelectDate: (date) => {
        state.filterState.dates = [date];
        renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
        updateNodeDetailPanel();
        updateDateStrip();
      },
      onClearDates: () => {
        state.filterState.dates = [];
        renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
        updateNodeDetailPanel();
        updateDateStrip();
      },
    });
  }

  function graphCallbacksWithSelection() {
    return { ...graphCallbacks, selectedNodeId: state.selectedNodeId };
  }

  function openFilterModal() {
    if (!state.fullGraphData) return;
    const analysis = analyzeGraph(state.fullGraphData);
    const dialog = document.getElementById("filter-dialog");
    const form = document.getElementById("filter-form");
    const logsEl = document.getElementById("filter-logs");
    form.innerHTML = "";

    const section = (title, key, options) => {
      const fieldset = document.createElement("fieldset");
      fieldset.innerHTML = "<legend>" + title + "</legend>";
      options.forEach((opt) => {
        const label = document.createElement("label");
        const checked = state.filterState[key].indexOf(opt) !== -1;
        label.innerHTML = '<input type="checkbox" name="' + key + '" value="' + opt + '"' + (checked ? " checked" : "") + "> " + opt;
        fieldset.appendChild(label);
      });
      form.appendChild(fieldset);
    };
    section("Tipo de nodo", "types", analysis.types);
    if (analysis.dates.length) section("Fecha (sesión)", "dates", analysis.dates);
    if (analysis.epics.length) section("Épica", "epics", analysis.epics);
    const textWrap = document.createElement("div");
    textWrap.innerHTML =
      '<label>Buscar en id/label/resumen (varios términos con coma o espacio = OR)<br><input type="text" name="text" placeholder="ej. auth, billing, limits" value="' +
      (state.filterState.text || "").replace(/"/g, "&quot;") +
      '"></label>';
    form.appendChild(textWrap);
    const connectedWrap = document.createElement("div");
    connectedWrap.innerHTML =
      '<label><input type="checkbox" name="connectedSubgraph" ' +
      (state.filterState.connectedSubgraphOnly ? " checked" : "") +
      '> Solo subgrafo conectado al texto (árbol alrededor de los matches)</label>';
    connectedWrap.title = "Si hay búsqueda por texto, muestra solo el subgrafo conexo que contiene esos nodos.";
    form.appendChild(connectedWrap);

    if (logsEl) {
      logsEl.innerHTML = "<p>Cargando logs…</p>";
      fetchAnalytics(getDbParam)
        .then((data) => {
          const steps = (data.recentSteps || []).slice(0, 25);
          if (!steps.length) {
            logsEl.innerHTML = "<p>No hay pasos recientes.</p>";
            return;
          }
          const bySession = {};
          steps.forEach((s) => {
            if (!bySession[s.session_id]) bySession[s.session_id] = [];
            bySession[s.session_id].push(s);
          });
          let html = "<p><strong>Últimos pasos (por sesión)</strong></p><ul class=\"filter-logs-list\">";
          Object.keys(bySession).forEach((sid) => {
            html += "<li><strong>" + sid + "</strong><ul>";
            bySession[sid].forEach((st) => {
              html += "<li>" + (st.action || "").slice(0, 50) + (st.implications ? " — " + st.implications.slice(0, 40) + "…" : "") + "</li>";
            });
            html += "</ul></li>";
          });
          html += "</ul>";
          logsEl.innerHTML = html;
        })
        .catch(() => { logsEl.innerHTML = "<p>No se pudieron cargar los logs.</p>"; });
    }
    dialog.showModal();
  }

  function applyFiltersFromModal() {
    const form = document.getElementById("filter-form");
    if (!form) return;
    state.filterState.types = Array.from(form.querySelectorAll('input[name="types"]:checked')).map((e) => e.value);
    state.filterState.dates = Array.from(form.querySelectorAll('input[name="dates"]:checked')).map((e) => e.value);
    state.filterState.epics = Array.from(form.querySelectorAll('input[name="epics"]:checked')).map((e) => e.value);
    state.filterState.text = (form.querySelector('input[name="text"]') || {}).value || "";
    state.filterState.connectedSubgraphOnly = !!form.querySelector('input[name="connectedSubgraph"]:checked');
    document.getElementById("filter-dialog").close();
    updateDateStrip();
    renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
    updateNodeDetailPanel();
  }

  function clearFilters() {
    state.filterState.types = [];
    state.filterState.dates = [];
    state.filterState.epics = [];
    state.filterState.text = "";
    state.filterState.connectedSubgraphOnly = false;
    const form = document.getElementById("filter-form");
    if (form) {
      form.querySelectorAll("input[type=checkbox]").forEach((c) => { c.checked = false; });
      const t = form.querySelector('input[name="text"]');
      if (t) t.value = "";
    }
    document.getElementById("filter-dialog").close();
    updateDateStrip();
    renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
    updateNodeDetailPanel();
  }

  const graphCallbacks = {
    selectedNodeId: state.selectedNodeId,
    onNodeClick: (id) => {
      state.selectedNodeId = id === state.selectedNodeId ? null : id;
      updateNodeDetailPanel();
      renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
    },
    onMount: (instance) => {
      fitToNode = (nodeId) => {
        if (nodeId && instance.fitView) instance.fitView({ nodes: [{ id: nodeId }], duration: 300, padding: 0.3 });
      };
    },
    onViewportChange: (v) => {
      if (state.viewState) {
        state.viewState.zoomLevel = v.zoomLevel;
        state.viewState.panX = v.panX;
        state.viewState.panY = v.panY;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(viewportStorageKey, serializeViewport(state.viewState));
      }
    },
  };

  function onGraphLoaded(data) {
    statusEl.textContent = "";
    statusEl.className = "";
    state.fullGraphData = data;
    state.lastGraphFingerprint = graphFingerprint(data);
    updateDateStrip();
    renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
    updateNodeDetailPanel();
  }

  function poll() {
    fetchGraphFn()
      .then((data) => {
        if (graphFingerprint(data) === state.lastGraphFingerprint) return;
        state.lastGraphFingerprint = graphFingerprint(data);
        state.fullGraphData = data;
        renderGraph(graphEl, dataForGraph(), state.viewState, graphCallbacksWithSelection());
        updateNodeDetailPanel();
      })
      .catch(() => { /* silencioso en poll */ });
  }

  const filterBar = document.createElement("div");
  filterBar.className = "graph-filter-bar";
  const filterBtn = document.createElement("button");
  filterBtn.type = "button";
  filterBtn.className = "graph-filter-btn";
  filterBtn.textContent = "Filtros";
  filterBtn.setAttribute("aria-label", "Abrir filtros del mapa");
  filterBtn.addEventListener("click", openFilterModal);
  filterBar.appendChild(filterBtn);
  graphEl.parentNode.insertBefore(filterBar, graphEl);

  const dialog = document.createElement("dialog");
  dialog.id = "filter-dialog";
  dialog.className = "filter-dialog";
  dialog.setAttribute("aria-label", "Filtros del mapa");
  dialog.innerHTML =
    '<form id="filter-form" class="filter-form"></form>' +
    '<div id="filter-logs" class="filter-logs" aria-label="Resumen de actividad reciente"></div>' +
    '<div class="filter-dialog-actions">' +
    '<button type="button" class="filter-apply" id="filter-apply">Aplicar</button>' +
    '<button type="button" class="filter-clear">Limpiar</button>' +
    '<button type="button" class="filter-cancel">Cerrar</button>' +
    "</div>";
  document.body.appendChild(dialog);
  dialog.querySelector(".filter-apply").addEventListener("click", applyFiltersFromModal);
  dialog.querySelector(".filter-clear").addEventListener("click", clearFilters);
  dialog.querySelector(".filter-cancel").addEventListener("click", () => dialog.close());

  function initDbSource() {
    const sel = document.getElementById("db-source");
    if (!sel) return Promise.resolve();
    return fetchDbSources(getDbParam)
      .then((data) => {
        const sources = data.sources || [];
        sel.innerHTML = sources.map((s) => "<option value=\"" + s.id + "\">" + (s.label || s.id) + "</option>").join("");
        if (sources.length) sel.value = sources[0].id;
      })
      .catch(() => { sel.innerHTML = "<option value=\"mcp\">MCP (paquete)</option>"; });
  }

  function loadGraph() {
    return fetchGraphFn().then((data) => {
      onGraphLoaded(data);
      return data;
    });
  }

  initDbSource().then(() => {
    loadGraph()
      .then(() => setInterval(poll, POLL_INTERVAL_MS))
      .catch((err) => {
        const msg = err.message || String(err);
        statusEl.textContent =
          msg.includes("500") || msg.includes("Failed to fetch")
            ? "No se pudo cargar el grafo. Comprobá que el servidor esté en marcha (npm run serve:ui) y que la base de datos exista."
            : "Error: " + msg;
        statusEl.className = "error";
      });
  });

  const dbSourceEl = document.getElementById("db-source");
  if (dbSourceEl) dbSourceEl.addEventListener("change", () => loadGraph().catch(() => {}));
}

init();
