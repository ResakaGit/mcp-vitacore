import { extractDateFromNode } from "../core/analysis.js";

/**
 * Panel de detalle del nodo: label, summary, fecha (si aplica), lista de steps (si es sesión), "Parte de" (si es step), Centrar en mapa.
 * Stateless: recibe container, datos y callbacks.
 *
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {import('../core/contracts.js').GraphNode | null} options.node
 * @param {import('../core/contracts.js').GraphEdge[]} options.edges
 * @param {import('../core/contracts.js').GraphNode[]} options.stepsForSession
 * @param {import('../core/contracts.js').GraphNode | null} options.sessionNode
 * @param {(nodeId: string) => void} [options.onSelectNode]
 * @param {() => void} [options.onCenterOnNode]
 */
export function renderNodeDetailPanel(container, options) {
  const opts = options ?? {};
  const { node, edges = [], stepsForSession = [], sessionNode, onSelectNode, onCenterOnNode } = opts;
  const panelId = "node-detail-panel";
  let panel = document.getElementById(panelId);
  if (!panel) {
    panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "node-detail-panel";
    panel.setAttribute("aria-live", "polite");
    container.appendChild(panel);
  }

  if (!node) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }

  panel.hidden = false;
  panel.innerHTML = "";

  const title = document.createElement("h3");
  title.className = "node-detail-title";
  title.textContent = node.label || node.id;
  panel.appendChild(title);

  const typeLine = document.createElement("p");
  typeLine.className = "node-detail-type";
  typeLine.innerHTML = "<strong>Tipo:</strong> " + escapeHtml(node.type);
  panel.appendChild(typeLine);

  const dateStr = extractDateFromNode(node);
  if (dateStr) {
    const dateLine = document.createElement("p");
    dateLine.className = "node-detail-date";
    dateLine.innerHTML = "<strong>Fecha:</strong> " + escapeHtml(formatDateLabel(dateStr));
    panel.appendChild(dateLine);
  }

  if (node.summary) {
    const summary = document.createElement("p");
    summary.className = "node-detail-summary";
    summary.textContent = node.summary;
    panel.appendChild(summary);
  }

  if (node.type === "session" && stepsForSession.length > 0) {
    const stepsHeading = document.createElement("p");
    stepsHeading.className = "node-detail-steps-heading";
    stepsHeading.innerHTML = "<strong>Pasos (" + stepsForSession.length + "):</strong>";
    panel.appendChild(stepsHeading);
    const list = document.createElement("ul");
    list.className = "node-detail-steps-list";
    stepsForSession.forEach((step) => {
      const li = document.createElement("li");
      const link = document.createElement("button");
      link.type = "button";
      link.className = "node-detail-step-link";
      link.textContent = (step.label || step.id).slice(0, 50) + (step.label && step.label.length > 50 ? "…" : "");
      link.title = step.summary || step.label || "";
      link.addEventListener("click", () => onSelectNode?.(step.id));
      li.appendChild(link);
      list.appendChild(li);
    });
    panel.appendChild(list);
  }

  if (node.type === "step" && sessionNode) {
    const partOf = document.createElement("p");
    partOf.className = "node-detail-session";
    const sessionBtn = document.createElement("button");
    sessionBtn.type = "button";
    sessionBtn.className = "node-detail-session-link";
    sessionBtn.textContent = sessionNode.label || sessionNode.id;
    sessionBtn.addEventListener("click", () => onSelectNode?.(sessionNode.id));
    partOf.appendChild(document.createTextNode("Parte de: "));
    partOf.appendChild(sessionBtn);
    panel.appendChild(partOf);
  } else if (node.sessionId) {
    const sessionLine = document.createElement("p");
    sessionLine.className = "node-detail-session";
    sessionLine.innerHTML = "<strong>Sesión:</strong> " + escapeHtml(node.sessionId);
    panel.appendChild(sessionLine);
  }

  const connected = edges.filter((e) => e.from === node.id || e.to === node.id);
  if (connected.length) {
    const edgesLine = document.createElement("p");
    edgesLine.className = "node-detail-edges";
    edgesLine.textContent = "Conectado a: " + connected.length + " enlace(s)";
    panel.appendChild(edgesLine);
  }

  if (onCenterOnNode) {
    const centerBtn = document.createElement("button");
    centerBtn.type = "button";
    centerBtn.className = "node-detail-center-btn";
    centerBtn.textContent = "Centrar en mapa";
    centerBtn.addEventListener("click", onCenterOnNode);
    panel.appendChild(centerBtn);
  }
}

function formatDateLabel(ddMMyyyy) {
  const [d, m, y] = (ddMMyyyy || "").split("/");
  if (!d || !m || !y) return ddMMyyyy;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}
