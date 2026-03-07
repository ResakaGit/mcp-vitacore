/**
 * Geometría y layout "cerebro": núcleo (macro), anillos sesiones/steps/paradox/refactor.
 * Puro: sin side effects; byId es un Map con nodos extendidos con x, y.
 */

import { SVG_SIZE, CENTER, NODE_R } from "./constants.js";

/**
 * @param {string} type
 * @returns {number}
 */
export function getNodeRadius(type) {
  return NODE_R[type] ?? 14;
}

/**
 * Polar a cartesian (origen en centro del SVG).
 *
 * @param {number} radius
 * @param {number} angleRad
 * @returns {{ x: number, y: number }}
 */
export function polarToXY(radius, angleRad) {
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

/**
 * Claves de "núcleo" para agrupar nodos y generar links implícitos (mismo session/date/epic/topic).
 *
 * @param {import('./contracts.js').GraphNode} node
 * @returns {string[]}
 */
export function nucleusKeys(node) {
  const keys = [];
  const id = node.id || "";
  const label = node.label || "";

  if (node.type === "session") {
    const sessionId = id.replace(/^session:/, "") || label;
    keys.push("session:" + sessionId);
    const dateMatch = sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
    if (dateMatch) keys.push("date:" + dateMatch[0]);
    const epicMatch = sessionId.match(/^([a-z]+-[a-z]+)/);
    if (epicMatch) keys.push("epic:" + epicMatch[1]);
  }
  if (node.type === "step" && node.sessionId) {
    keys.push("session:" + node.sessionId);
    const dateMatch = node.sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
    if (dateMatch) keys.push("date:" + dateMatch[0]);
  }
  if (node.type === "refactor" && node.sessionId) {
    keys.push("session:" + node.sessionId);
  }
  if (label && node.type === "paradox") {
    const prefix = label.slice(0, 20).replace(/\s.*$/, "");
    if (prefix.length >= 3) keys.push("topic:" + prefix);
  }
  return keys;
}

/**
 * Layout tipo cerebro: macro en centro; sesiones en anillo; steps alrededor de su sesión; paradox/refactor en anillo exterior.
 *
 * @param {import('./contracts.js').GraphNode[]} nodes
 * @param {import('./contracts.js').GraphEdge[]} edges
 * @returns {import('./contracts.js').LayoutResult}
 */
export function computeLayout(nodes, edges) {
  /** @type {Map<string, import('./contracts.js').NodeWithPosition>} */
  const byId = new Map(
    nodes.map((n) => [n.id, { ...n, x: 0, y: 0 }])
  );

  const macro = nodes.find((n) => n.type === "macro");
  const sessions = nodes.filter((n) => n.type === "session");
  const stepsBySession = new Map();
  for (const n of nodes.filter((n) => n.type === "step")) {
    if (!n.sessionId) continue;
    if (!stepsBySession.has(n.sessionId))
      stepsBySession.set(n.sessionId, []);
    stepsBySession.get(n.sessionId).push(n);
  }
  const paradoxes = nodes.filter((n) => n.type === "paradox");
  const refactors = nodes.filter((n) => n.type === "refactor");

  const radiusSessions = 120;
  const radiusSteps = 200;
  const radiusOuter = 260;

  if (macro) {
    const m = byId.get("macro");
    if (m) {
      m.x = CENTER;
      m.y = CENTER;
    }
  }

  const nSession = sessions.length;
  sessions.forEach((s, i) => {
    const angle =
      (i / Math.max(nSession, 1)) * 2 * Math.PI - Math.PI / 2;
    const p = polarToXY(radiusSessions, angle);
    const node = byId.get(s.id);
    if (node) {
      node.x = p.x;
      node.y = p.y;
    }
  });

  sessions.forEach((s) => {
    const rawSessionId = s.id.replace(/^session:/, "") || s.id;
    const steps = stepsBySession.get(rawSessionId) || [];
    const sessionNode = byId.get(s.id);
    if (!sessionNode) return;
    const baseAngle = Math.atan2(
      sessionNode.y - CENTER,
      sessionNode.x - CENTER
    );
    const stepSpan = Math.min(0.8, steps.length * 0.12);
    steps.forEach((st, i) => {
      const node = byId.get(st.id);
      if (!node) return;
      const t =
        steps.length === 1 ? 0 : i / Math.max(steps.length - 1, 1);
      const angle = baseAngle + (t - 0.5) * stepSpan;
      const p = polarToXY(radiusSteps, angle);
      node.x = p.x;
      node.y = p.y;
    });
  });

  const outer = [...paradoxes, ...refactors];
  const nOuter = outer.length;
  outer.forEach((o, i) => {
    const node = byId.get(o.id);
    if (!node) return;
    const angle =
      (i / Math.max(nOuter, 1)) * 2 * Math.PI - Math.PI / 2 + 0.4;
    const p = polarToXY(radiusOuter, angle);
    node.x = p.x;
    node.y = p.y;
  });

  const radiusFallback = 320;
  const stillAtOrigin = [...byId.values()].filter((node) => node.x === 0 && node.y === 0);
  stillAtOrigin.forEach((node, i) => {
    const angle = (i / Math.max(stillAtOrigin.length, 1)) * 2 * Math.PI - Math.PI / 2;
    const p = polarToXY(radiusFallback, angle);
    node.x = p.x;
    node.y = p.y;
  });

  return { byId, width: SVG_SIZE, height: SVG_SIZE };
}
