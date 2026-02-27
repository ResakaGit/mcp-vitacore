(function () {
  const NODE_R = { macro: 36, session: 22, step: 14, paradox: 18, refactor: 18, debate: 16 };
  const SVG_SIZE = 640;
  const CENTER = SVG_SIZE / 2;

  function getNodeRadius(type) {
    return NODE_R[type] ?? 14;
  }

  /** Polar a cartesian (origen en centro del SVG). */
  function polarToXY(radius, angleRad) {
    return { x: CENTER + radius * Math.cos(angleRad), y: CENTER + radius * Math.sin(angleRad) };
  }

  /**
   * Layout tipo cerebro: núcleo en el centro (Macro); anillos concéntricos para
   * sesiones, steps, paradojas/refactors/debates. Todo conectado al núcleo o a su sesión.
   */
  function computeLayout(nodes, edges) {
    const byId = new Map(nodes.map((n) => [n.id, { ...n, x: 0, y: 0 }]));

    const macro = nodes.find((n) => n.type === "macro");
    const sessions = nodes.filter((n) => n.type === "session");
    const stepsBySession = new Map();
    for (const n of nodes.filter((n) => n.type === "step")) {
      if (!n.sessionId) continue;
      if (!stepsBySession.has(n.sessionId)) stepsBySession.set(n.sessionId, []);
      stepsBySession.get(n.sessionId).push(n);
    }
    const paradoxes = nodes.filter((n) => n.type === "paradox");
    const refactors = nodes.filter((n) => n.type === "refactor");
    const debates = nodes.filter((n) => n.type === "debate");

    const radiusNucleus = 0;
    const radiusSessions = 120;
    const radiusSteps = 200;
    const radiusOuter = 260;

    if (macro) {
      const m = byId.get("macro");
      m.x = CENTER;
      m.y = CENTER;
    }

    const nSession = sessions.length;
    sessions.forEach((s, i) => {
      const angle = (i / Math.max(nSession, 1)) * 2 * Math.PI - Math.PI / 2;
      const p = polarToXY(radiusSessions, angle);
      const node = byId.get(s.id);
      node.x = p.x;
      node.y = p.y;
    });

    let angleOffset = 0;
    sessions.forEach((s) => {
      const steps = stepsBySession.get(s.id) || [];
      const sessionNode = byId.get(s.id);
      const baseAngle = Math.atan2(sessionNode.y - CENTER, sessionNode.x - CENTER);
      const stepSpan = Math.min(0.8, (steps.length * 0.12));
      steps.forEach((st, i) => {
        const node = byId.get(st.id);
        if (!node) return;
        const t = steps.length === 1 ? 0 : i / Math.max(steps.length - 1, 1);
        const angle = baseAngle + (t - 0.5) * stepSpan;
        const p = polarToXY(radiusSteps, angle);
        node.x = p.x;
        node.y = p.y;
      });
    });

    const outer = [...paradoxes, ...refactors, ...debates];
    const nOuter = outer.length;
    outer.forEach((o, i) => {
      const node = byId.get(o.id);
      if (!node) return;
      const angle = (i / Math.max(nOuter, 1)) * 2 * Math.PI - Math.PI / 2 + 0.4;
      const p = polarToXY(radiusOuter, angle);
      node.x = p.x;
      node.y = p.y;
    });

    return { byId, width: SVG_SIZE, height: SVG_SIZE };
  }

  function renderGraph(container, data) {
    const { nodes, edges } = data;
    if (!nodes.length) {
      container.innerHTML =
        '<div class="empty-state">' +
        "<h2>Sin datos en el mapa</h2>" +
        "<p>El mapa se llena cuando usás las tools de Vitacore desde Cursor (log_step, close_session, check_architectural_health, submit_for_background_review).</p>" +
        '<p><a href="https://github.com/modelcontextprotocol/specification" target="_blank" rel="noopener">Usar Vitacore desde Cursor</a> — ejecutá un flujo que registre sesiones y pasos para ver nodos conectados aquí.</p>' +
        "</div>";
      return;
    }

    const { byId, width, height } = computeLayout(nodes, edges);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filterGlow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filterGlow.setAttribute("id", "nucleus-glow");
    filterGlow.setAttribute("x", "-50%");
    filterGlow.setAttribute("y", "-50%");
    filterGlow.setAttribute("width", "200%");
    filterGlow.setAttribute("height", "200%");
    const feGaussian = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussian.setAttribute("in", "SourceGraphic");
    feGaussian.setAttribute("stdDeviation", "4");
    feGaussian.setAttribute("result", "blur");
    const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode1.setAttribute("in", "blur");
    const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filterGlow.appendChild(feGaussian);
    filterGlow.appendChild(feMerge);
    defs.appendChild(filterGlow);
    svg.appendChild(defs);

    const gEdges = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const e of edges) {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      if (!from || !to) continue;
      const rTo = getNodeRadius(to.type);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const x2 = to.x - ux * rTo;
      const y2 = to.y - uy * rTo;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "edge" + (e.from === "macro" ? " from-nucleus" : ""));
      line.setAttribute("x1", from.x);
      line.setAttribute("y1", from.y);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("data-from", e.from);
      line.setAttribute("data-to", e.to);
      gEdges.appendChild(line);
    }
    svg.appendChild(gEdges);

    const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const n of nodes) {
      const pos = byId.get(n.id);
      if (!pos) continue;
      const r = getNodeRadius(n.type);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "node");
      g.setAttribute("data-type", n.type);
      g.setAttribute("data-id", n.id);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("class", "node-circle");
      if (n.type === "macro") circle.setAttribute("filter", "url(#nucleus-glow)");
      circle.setAttribute("cx", pos.x);
      circle.setAttribute("cy", pos.y);
      circle.setAttribute("r", r);
      g.appendChild(circle);

      const label = (n.label || n.id).slice(0, 14);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "node-text");
      text.setAttribute("x", pos.x);
      text.setAttribute("y", pos.y);
      text.setAttribute("dy", "0.35em");
      text.textContent = label;
      g.appendChild(text);

      const title = [n.label, n.summary].filter(Boolean).join(" — ");
      if (title) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = title;
        g.appendChild(t);
      }

      gNodes.appendChild(g);
    }
    svg.appendChild(gNodes);

    function highlightNeighbors(nodeId) {
      const ids = new Set([nodeId]);
      for (const e of edges) {
        if (e.from === nodeId || e.to === nodeId) {
          ids.add(e.from);
          ids.add(e.to);
        }
      }
      gNodes.querySelectorAll(".node").forEach((el) => {
        el.classList.toggle("highlight", ids.has(el.getAttribute("data-id")));
      });
      gEdges.querySelectorAll(".edge").forEach((el) => {
        const from = el.getAttribute("data-from");
        const to = el.getAttribute("data-to");
        el.style.opacity = ids.has(from) && ids.has(to) ? "1" : "0.25";
      });
    }

    function clearHighlight() {
      gNodes.querySelectorAll(".node").forEach((el) => el.classList.remove("highlight"));
      gEdges.querySelectorAll(".edge").forEach((el) => { el.style.opacity = ""; });
    }

    gNodes.querySelectorAll(".node").forEach((el) => {
      el.addEventListener("click", function () {
        const id = this.getAttribute("data-id");
        if (this.classList.contains("highlight")) {
          clearHighlight();
        } else {
          highlightNeighbors(id);
        }
      });
    });

    const ZOOM_MIN = 0.5;
    const ZOOM_MAX = 2;
    const ZOOM_STEP = 0.25;
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPanX = 0;
    let dragStartPanY = 0;

    const wrap = document.createElement("div");
    wrap.className = "graph-zoom-wrap";

    const view = document.createElement("div");
    view.className = "graph-zoom-view";
    view.appendChild(svg);

    function applyTransform() {
      view.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoomLevel + ")";
    }
    applyTransform();

    function onPanMove(e) {
      panX = dragStartPanX + (e.clientX - dragStartX);
      panY = dragStartPanY + (e.clientY - dragStartY);
      applyTransform();
    }
    function onPanEnd() {
      document.removeEventListener("mousemove", onPanMove);
      document.removeEventListener("mouseup", onPanEnd);
      wrap.classList.remove("graph-zoom-dragging");
      isDragging = false;
    }
    wrap.addEventListener("mousedown", function (e) {
      if (e.target.closest && (e.target.closest(".node") || e.target.closest(".graph-zoom-controls"))) return;
      if (e.button !== 0) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartPanX = panX;
      dragStartPanY = panY;
      wrap.classList.add("graph-zoom-dragging");
      document.addEventListener("mousemove", onPanMove);
      document.addEventListener("mouseup", onPanEnd);
    });

    const controls = document.createElement("div");
    controls.className = "graph-zoom-controls";
    controls.setAttribute("aria-label", "Zoom del mapa");
    const btnOut = document.createElement("button");
    btnOut.type = "button";
    btnOut.className = "graph-zoom-btn";
    btnOut.textContent = "−";
    btnOut.setAttribute("aria-label", "Alejarse");
    btnOut.addEventListener("click", function (e) {
      e.stopPropagation();
      zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
      applyTransform();
    });
    const btnIn = document.createElement("button");
    btnIn.type = "button";
    btnIn.className = "graph-zoom-btn";
    btnIn.textContent = "+";
    btnIn.setAttribute("aria-label", "Acercar");
    btnIn.addEventListener("click", function (e) {
      e.stopPropagation();
      zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
      applyTransform();
    });
    controls.appendChild(btnOut);
    controls.appendChild(btnIn);

    wrap.appendChild(view);
    wrap.appendChild(controls);
    container.innerHTML = "";
    container.appendChild(wrap);
  }

  const statusEl = document.getElementById("status");
  const graphEl = document.getElementById("graph");

  statusEl.textContent = "Cargando…";
  statusEl.className = "loading";

  fetch("/api/graph")
    .then((r) => {
      if (!r.ok) throw new Error(r.status + " " + r.statusText);
      return r.json();
    })
    .then((data) => {
      statusEl.textContent = "";
      statusEl.className = "";
      renderGraph(graphEl, data);
    })
    .catch((err) => {
      const msg = err.message || String(err);
      statusEl.textContent =
        msg.includes("500") || msg.includes("Failed to fetch")
          ? "No se pudo cargar el grafo. Comprobá que el servidor esté en marcha (npm run serve:ui) y que la base de datos exista."
          : "Error: " + msg;
      statusEl.className = "error";
    });
})();
