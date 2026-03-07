/**
 * Adapter: GraphData (Vitacore) → nodos/edges en formato React Flow.
 * Puro, sin side effects; reutilizable desde app.js y tests.
 */

import { computeLayout, getNodeRadius, nucleusKeys } from "./layout.js";

const MAX_LABEL_SESSION = 28;
const MAX_LABEL_STEP = 26;
const MAX_LABEL_BADGE = 18;

const VALID_TYPES = new Set(["macro", "session", "step", "paradox", "refactor"]);

/**
 * Tipo válido para el grafo. Si el nodo no trae type o es inválido, se infiere del id.
 * @param {import('./contracts.js').GraphNode} n
 * @returns {import('./contracts.js').GraphNodeType}
 */
function resolveType(n) {
  if (n.type && VALID_TYPES.has(n.type)) return n.type;
  const id = (n.id || "").trim();
  if (id === "macro") return "macro";
  if (id.startsWith("session:")) return "session";
  if (id.startsWith("step:")) return "step";
  if (id.startsWith("paradox:")) return "paradox";
  if (id.startsWith("refactor:")) return "refactor";
  return "step";
}

/**
 * Etiqueta corta para sesión: épica + fecha si el id sigue epic-xxx-YYYY-MM-DD.
 * @param {string} id - ej. "session:epic-migrar_iniciativa-2026-03-02"
 * @param {string} [label]
 * @returns {string}
 */
function sessionLabelDisplay(id, label) {
  const raw = (id || "").replace(/^session:/, "") || label || "";
  const dateMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : "";
  const epicPart = date ? raw.slice(0, raw.indexOf(date)).replace(/-$/, "") : raw;
  const epicShort = epicPart.length > 20 ? epicPart.slice(0, 17) + "…" : epicPart;
  if (epicShort && date) return epicShort + " • " + date;
  return raw.length > MAX_LABEL_SESSION ? raw.slice(0, MAX_LABEL_SESSION - 1) + "…" : raw;
}

/**
 * @param {string} label
 * @param {number} max
 * @returns {string}
 */
function truncateLabel(label, max) {
  const s = (label || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

/**
 * @param {import('./contracts.js').GraphData} graphData
 * @returns {{ nodes: Array<{ id: string, position: { x: number, y: number }, data: import('./contracts.js').GraphNode & { radius: number }, type: string }>, edges: Array<{ id: string, source: string, target: string }> }}
 */
export function graphDataToReactFlow(graphData) {
  const { nodes, edges } = graphData;
  if (!nodes.length) {
    return { nodes: [], edges: [] };
  }

  const normalizedNodes = nodes.map((n) => ({ ...n, type: resolveType(n) }));
  const { byId } = computeLayout(normalizedNodes, edges);
  const nodesWithPosition = normalizedNodes.map((n) => {
    const p = byId.get(n.id);
    return { ...n, x: p ? p.x : 0, y: p ? p.y : 0 };
  });

  const linkKey = (a, b) => (a.id < b.id ? a.id + "\0" + b.id : b.id + "\0" + a.id);
  const seenLinks = new Set();

  /** @type {Array<{ source: string, target: string }>} */
  const linkPairs = [];

  for (const e of edges) {
    const src = nodesWithPosition.find((n) => n.id === e.from);
    const tgt = nodesWithPosition.find((n) => n.id === e.to);
    if (!src || !tgt) continue;
    const key = linkKey(src, tgt);
    if (seenLinks.has(key)) continue;
    seenLinks.add(key);
    linkPairs.push({ source: e.from, target: e.to });
  }

  const nucleusToNodes = new Map();
  nodesWithPosition.forEach((node) => {
    nucleusKeys(node).forEach((k) => {
      if (!nucleusToNodes.has(k)) nucleusToNodes.set(k, []);
      nucleusToNodes.get(k).push(node);
    });
  });
  nucleusToNodes.forEach((nodeList) => {
    for (let i = 0; i < nodeList.length; i++) {
      for (let j = i + 1; j < nodeList.length; j++) {
        const a = nodeList[i];
        const b = nodeList[j];
        const key = linkKey(a, b);
        if (seenLinks.has(key)) continue;
        seenLinks.add(key);
        linkPairs.push({ source: a.id, target: b.id });
      }
    }
  });

  const rfNodes = nodesWithPosition.map((n) => {
    const type = n.type;
    let labelDisplay = (n.label || n.id || "").trim();
    if (type === "macro") labelDisplay = "Macro";
    else if (type === "session") labelDisplay = sessionLabelDisplay(n.id, n.label);
    else if (type === "step") labelDisplay = truncateLabel(n.label || n.id, MAX_LABEL_STEP);
    else if (type === "paradox" || type === "refactor") labelDisplay = truncateLabel(n.label || n.id, MAX_LABEL_BADGE);
    if (!labelDisplay) labelDisplay = n.id ? truncateLabel(n.id, MAX_LABEL_STEP) : "?";
    return {
      id: n.id,
      position: { x: n.x, y: n.y },
      data: {
        id: n.id,
        type,
        label: n.label,
        labelDisplay,
        summary: n.summary,
        sessionId: n.sessionId,
        relatedSessionIds: n.relatedSessionIds,
        radius: getNodeRadius(type),
      },
      type: "vitacoreNode",
    };
  });

  const rfEdges = linkPairs.map(({ source, target }, i) => ({
    id: `e-${source}-${target}-${i}`,
    source,
    target,
  }));

  return { nodes: rfNodes, edges: rfEdges };
}
