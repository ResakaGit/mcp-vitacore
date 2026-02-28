(function () {
  const NODE_R = { macro: 36, session: 22, step: 14, paradox: 18, refactor: 18, debate: 16 };
  const SVG_SIZE = 640;
  const CENTER = SVG_SIZE / 2;
  const POLL_INTERVAL_MS = 8000;

  /** Fetch grafo desde la API. Rechaza si hay error HTTP o body con .error */
  function fetchGraph() {
    return fetch("/api/graph")
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

  /** Fingerprint para evitar re-render cuando la estructura no cambió */
  function graphFingerprint(data) {
    const ids = (data.nodes || []).map((n) => n.id).sort();
    const edgeCount = (data.edges || []).length;
    return JSON.stringify({ ids, edgeCount });
  }

  /** Estado de zoom/pan en closure para reaplicar tras cada re-render */
  const viewState = { zoomLevel: 1, panX: 0, panY: 0 };
  let lastGraphFingerprint = "";
  let fullGraphData = null;
  const filterState = { types: [], dates: [], epics: [], text: "", connectedSubgraphOnly: false };

  /** Extrae términos de búsqueda (OR): split por coma o espacios, trim, sin vacíos. */
  function parseSearchTerms(text) {
    if (!text || typeof text !== "string") return [];
    return text
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Devuelve { nodes, edges } del subgrafo conexo que contiene los seedIds (BFS por edges). */
  function extractConnectedSubgraph(nodes, edges, seedIds) {
    if (!seedIds.size) return { nodes: [], edges: [] };
    const idToNode = new Map(nodes.map((n) => [n.id, n]));
    const adj = new Map();
    for (const e of edges) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from).push(e.to);
      if (!adj.has(e.to)) adj.set(e.to, []);
      adj.get(e.to).push(e.from);
    }
    const reachable = new Set(seedIds);
    const queue = [...seedIds];
    while (queue.length) {
      const id = queue.shift();
      for (const to of adj.get(id) || []) {
        if (!reachable.has(to)) {
          reachable.add(to);
          queue.push(to);
        }
      }
    }
    const outNodes = nodes.filter((n) => reachable.has(n.id));
    const outEdges = edges.filter((e) => reachable.has(e.from) && reachable.has(e.to));
    return { nodes: outNodes, edges: outEdges };
  }

  /** Analiza nodos y extrae índices para filtros y relaciones (fechas, épicas, tipos). */
  function analyzeGraph(data) {
    const nodes = data.nodes || [];
    const dates = new Set();
    const epics = new Set();
    const typeCounts = {};
    nodes.forEach((n) => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
      const id = n.id || "";
      const label = n.label || "";
      if (n.type === "session") {
        const sid = id.replace(/^session:/, "") || label;
        const dateMatch = sid.match(/^\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) dates.add(dateMatch[0]);
        const epicMatch = sid.match(/^([a-z]+-[a-z]+)/);
        if (epicMatch) epics.add(epicMatch[1]);
      }
      if (n.type === "step" && n.sessionId) {
        const dateMatch = n.sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) dates.add(dateMatch[0]);
        const epicMatch = n.sessionId.match(/^([a-z]+-[a-z]+)/);
        if (epicMatch) epics.add(epicMatch[1]);
      }
      if (n.type === "refactor" && n.sessionId) {
        const dateMatch = n.sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch) dates.add(dateMatch[0]);
      }
    });
    return {
      dates: Array.from(dates).sort(),
      epics: Array.from(epics).sort(),
      types: Object.keys(typeCounts).sort(),
      typeCounts,
    };
  }

  function nodeMatchesFilter(node, state) {
    if (state.types.length && !state.types.includes(node.type)) return false;
    const id = node.id || "";
    const label = (node.label || "").toLowerCase();
    const sessionId = node.sessionId || (node.type === "session" ? id.replace(/^session:/, "") : "");
    if (state.dates.length) {
      const dateMatch = sessionId.match(/^\d{2}\/\d{2}\/\d{4}/);
      if (!dateMatch || !state.dates.includes(dateMatch[0])) return false;
    }
    if (state.epics.length) {
      const epicMatch = sessionId.match(/^([a-z]+-[a-z]+)/);
      if (!epicMatch || !state.epics.includes(epicMatch[1])) return false;
    }
    const terms = parseSearchTerms(state.text);
    if (terms.length) {
      const idL = id.toLowerCase();
      const labelL = label;
      const summaryL = (node.summary || "").toLowerCase();
      const matchesAny = terms.some(
        (q) => idL.includes(q) || labelL.includes(q) || summaryL.includes(q)
      );
      if (!matchesAny) return false;
    }
    return true;
  }

  function applyFilters(data, state) {
    if (!data || !data.nodes) return data;
    let nodes = data.nodes.filter((n) => nodeMatchesFilter(n, state));
    let edges = (data.edges || []).filter((e) => {
      const fromOk = nodes.some((n) => n.id === e.from);
      const toOk = nodes.some((n) => n.id === e.to);
      return fromOk && toOk;
    });

    if (state.connectedSubgraphOnly && parseSearchTerms(state.text).length > 0) {
      const terms = parseSearchTerms(state.text);
      const seedIds = new Set(
        nodes.filter((n) => {
          const idL = (n.id || "").toLowerCase();
          const labelL = (n.label || "").toLowerCase();
          const summaryL = (n.summary || "").toLowerCase();
          return terms.some((q) => idL.includes(q) || labelL.includes(q) || summaryL.includes(q));
        }).map((n) => n.id)
      );
      const sub = extractConnectedSubgraph(data.nodes, data.edges || [], seedIds);
      nodes = sub.nodes;
      edges = sub.edges;
    }

    return { nodes, edges };
  }

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

  function renderGraph(container, data, state) {
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

    const nodesForD3 = nodes.map((n) => {
      const p = byId.get(n.id);
      return { ...n, x: p.x, y: p.y };
    });

    function nucleusKeys(node) {
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
      if (label && (node.type === "paradox" || node.type === "debate")) {
        const prefix = label.slice(0, 20).replace(/\s.*$/, "");
        if (prefix.length >= 3) keys.push("topic:" + prefix);
      }
      return keys;
    }

    const linkKey = (a, b) => (a.id < b.id ? a.id + "\0" + b.id : b.id + "\0" + a.id);
    const seenLinks = new Set();
    const links = edges
      .map((e) => {
        const src = nodesForD3.find((n) => n.id === e.from);
        const tgt = nodesForD3.find((n) => n.id === e.to);
        if (!src || !tgt) return null;
        const key = linkKey(src, tgt);
        if (seenLinks.has(key)) return null;
        seenLinks.add(key);
        return { source: src, target: tgt };
      })
      .filter(Boolean);

    const nucleusToNodes = new Map();
    nodesForD3.forEach((node) => {
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
          links.push({ source: a, target: b });
        }
      }
    });

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");

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
    const filterEdgeGlow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filterEdgeGlow.setAttribute("id", "edge-glow");
    filterEdgeGlow.setAttribute("x", "-20%");
    filterEdgeGlow.setAttribute("y", "-20%");
    filterEdgeGlow.setAttribute("width", "140%");
    filterEdgeGlow.setAttribute("height", "140%");
    const feGaussianEdge = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianEdge.setAttribute("in", "SourceGraphic");
    feGaussianEdge.setAttribute("stdDeviation", "1");
    feGaussianEdge.setAttribute("result", "blur");
    const feMergeEdge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const feMergeEdge1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeEdge1.setAttribute("in", "blur");
    const feMergeEdge2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeEdge2.setAttribute("in", "SourceGraphic");
    feMergeEdge.appendChild(feMergeEdge1);
    feMergeEdge.appendChild(feMergeEdge2);
    filterEdgeGlow.appendChild(feGaussianEdge);
    filterEdgeGlow.appendChild(feMergeEdge);
    defs.appendChild(filterEdgeGlow);
    svg.appendChild(defs);

    const panZoomLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    panZoomLayer.setAttribute("class", "graph-pan-zoom-layer");

    const panBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    panBackground.setAttribute("class", "graph-pan-background");
    panBackground.setAttribute("width", width);
    panBackground.setAttribute("height", height);
    panBackground.setAttribute("x", 0);
    panBackground.setAttribute("y", 0);
    panBackground.setAttribute("fill", "transparent");
    panBackground.setAttribute("pointer-events", "all");
    panZoomLayer.appendChild(panBackground);

    const gEdges = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gEdges.setAttribute("class", "graph-edges");
    gEdges.setAttribute("filter", "url(#edge-glow)");
    const linkElements = [];
    links.forEach((link) => {
      const s = link.source;
      const t = link.target;
      const rTo = getNodeRadius(t.type);
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const x2 = t.x - ux * rTo;
      const y2 = t.y - uy * rTo;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "edge" + (s.id === "macro" ? " from-nucleus" : ""));
      line.setAttribute("x1", s.x);
      line.setAttribute("y1", s.y);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
      line.setAttribute("data-from", s.id);
      line.setAttribute("data-to", t.id);
      gEdges.appendChild(line);
      linkElements.push({ line, link });
    });
    panZoomLayer.appendChild(gEdges);

    const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodeElMap = new Map();
    nodesForD3.forEach((node) => {
      const r = getNodeRadius(node.type);
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "node");
      g.setAttribute("data-type", node.type);
      g.setAttribute("data-id", node.id);

      const points = [node.x + "," + (node.y - r), (node.x + r) + "," + node.y, node.x + "," + (node.y + r), (node.x - r) + "," + node.y].join(" ");
      const shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      shape.setAttribute("class", "node-shape");
      if (node.type === "macro") shape.setAttribute("filter", "url(#nucleus-glow)");
      shape.setAttribute("points", points);
      g.appendChild(shape);

      const label = (node.label || node.id).slice(0, 14);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "node-text");
      text.setAttribute("x", node.x);
      text.setAttribute("y", node.y);
      text.setAttribute("dy", "0.35em");
      text.textContent = label;
      g.appendChild(text);

      const titleStr = [node.label, node.summary].filter(Boolean).join(" — ");
      if (titleStr) {
        const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titleEl.textContent = titleStr;
        g.appendChild(titleEl);
      }

      gNodes.appendChild(g);
      nodeElMap.set(node.id, { g, shape, text, node });
    });
    panZoomLayer.appendChild(gNodes);
    svg.appendChild(panZoomLayer);

    const BOUND_MARGIN = Math.min(width, height) * 0.12;
    const xMin = BOUND_MARGIN;
    const xMax = width - BOUND_MARGIN;
    const yMin = BOUND_MARGIN;
    const yMax = height - BOUND_MARGIN;

    function tick() {
      nodesForD3.forEach((node) => {
        if (node.x < xMin) { node.x = xMin; node.vx = 0; }
        else if (node.x > xMax) { node.x = xMax; node.vx = 0; }
        if (node.y < yMin) { node.y = yMin; node.vy = 0; }
        else if (node.y > yMax) { node.y = yMax; node.vy = 0; }
      });
      linkElements.forEach(({ line, link }) => {
        const s = link.source;
        const t = link.target;
        const rTo = getNodeRadius(t.type);
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        line.setAttribute("x1", s.x);
        line.setAttribute("y1", s.y);
        line.setAttribute("x2", t.x - ux * rTo);
        line.setAttribute("y2", t.y - uy * rTo);
      });
      nodeElMap.forEach((el) => {
        const n = el.node;
        const r = getNodeRadius(n.type);
        const points = [n.x + "," + (n.y - r), (n.x + r) + "," + n.y, n.x + "," + (n.y + r), (n.x - r) + "," + n.y].join(" ");
        el.shape.setAttribute("points", points);
        el.text.setAttribute("x", n.x);
        el.text.setAttribute("y", n.y);
      });
    }

    const simulation = d3
      .forceSimulation(nodesForD3)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(55))
      .force("charge", d3.forceManyBody().strength(-70))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.04))
      .force("collide", d3.forceCollide().radius((d) => getNodeRadius(d.type) + 4))
      .on("tick", tick);

    const drag = d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
        tick();
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    d3.select(gNodes).selectAll(".node").data(nodesForD3).call(drag);

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

    const ZOOM_MIN = 0.2;
    const ZOOM_MAX = 2;
    const ZOOM_STEP = 0.25;
    const viewBoxCenterX = width / 2;
    const viewBoxCenterY = height / 2;
    let zoomLevel = state ? state.zoomLevel : 1;
    let panX = state ? state.panX : 0;
    let panY = state ? state.panY : 0;
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

    /* Pan/zoom en coordenadas viewBox sobre el grupo; así el contenido siempre coincide con el wrap y los botones escalan bien. */
    function applyTransform() {
      const tx =
        "translate(" + panX + "," + panY + ") translate(" + viewBoxCenterX + "," + viewBoxCenterY + ") scale(" + zoomLevel + ") translate(" + (-viewBoxCenterX) + "," + (-viewBoxCenterY) + ")";
      panZoomLayer.setAttribute("transform", tx);
      if (state) {
        state.zoomLevel = zoomLevel;
        state.panX = panX;
        state.panY = panY;
      }
    }
    applyTransform();

    function onPanMove(e) {
      const w = wrap.clientWidth || 1;
      const h = wrap.clientHeight || 1;
      panX = dragStartPanX + (e.clientX - dragStartX) * (width / w);
      panY = dragStartPanY + (e.clientY - dragStartY) * (height / h);
      applyTransform();
    }
    function onPanEnd() {
      document.removeEventListener("mousemove", onPanMove);
      document.removeEventListener("mouseup", onPanEnd);
      wrap.classList.remove("graph-zoom-dragging");
      isDragging = false;
    }
    wrap.addEventListener("mousedown", function (e) {
      if (e.target.closest && (e.target.closest(".node") || e.target.closest(".graph-toolbar"))) return;
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

    const toolbar = document.createElement("div");
    toolbar.className = "graph-toolbar";
    toolbar.setAttribute("aria-label", "Zoom del mapa");
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
    toolbar.appendChild(btnOut);
    toolbar.appendChild(btnIn);

    wrap.appendChild(view);
    container.innerHTML = "";
    container.appendChild(wrap);
    container.appendChild(toolbar);
  }

  const statusEl = document.getElementById("status");
  const graphEl = document.getElementById("graph");

  statusEl.textContent = "Cargando…";
  statusEl.className = "loading";

  function getDataToRender() {
    if (!fullGraphData) return fullGraphData;
    return applyFilters(fullGraphData, filterState);
  }

  function onGraphLoaded(data) {
    statusEl.textContent = "";
    statusEl.className = "";
    fullGraphData = data;
    lastGraphFingerprint = graphFingerprint(data);
    renderGraph(graphEl, getDataToRender(), viewState);
  }

  function poll() {
    fetchGraph()
      .then((data) => {
        if (graphFingerprint(data) === lastGraphFingerprint) return;
        lastGraphFingerprint = graphFingerprint(data);
        fullGraphData = data;
        renderGraph(graphEl, getDataToRender(), viewState);
      })
      .catch(() => { /* silencioso en poll */ });
  }

  function openFilterModal() {
    if (!fullGraphData) return;
    const analysis = analyzeGraph(fullGraphData);
    const dialog = document.getElementById("filter-dialog");
    const form = document.getElementById("filter-form");
    const logsEl = document.getElementById("filter-logs");
    form.innerHTML = "";

    const section = (title, key, options) => {
      const fieldset = document.createElement("fieldset");
      fieldset.innerHTML = "<legend>" + title + "</legend>";
      options.forEach((opt) => {
        const label = document.createElement("label");
        const checked = filterState[key].indexOf(opt) !== -1;
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
      (filterState.text || "").replace(/"/g, "&quot;") +
      '"></label>';
    form.appendChild(textWrap);
    const connectedWrap = document.createElement("div");
    connectedWrap.innerHTML =
      '<label><input type="checkbox" name="connectedSubgraph" ' +
      (filterState.connectedSubgraphOnly ? " checked" : "") +
      '> Solo subgrafo conectado al texto (árbol alrededor de los matches)</label>';
    connectedWrap.title = "Si hay búsqueda por texto, muestra solo el subgrafo conexo que contiene esos nodos.";
    form.appendChild(connectedWrap);

    if (logsEl) {
      logsEl.innerHTML = "<p>Cargando logs…</p>";
      fetch("/api/analytics")
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
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
    filterState.types = Array.from(form.querySelectorAll('input[name="types"]:checked')).map((e) => e.value);
    filterState.dates = Array.from(form.querySelectorAll('input[name="dates"]:checked')).map((e) => e.value);
    filterState.epics = Array.from(form.querySelectorAll('input[name="epics"]:checked')).map((e) => e.value);
    filterState.text = (form.querySelector('input[name="text"]') || {}).value || "";
    filterState.connectedSubgraphOnly = !!form.querySelector('input[name="connectedSubgraph"]:checked');
    document.getElementById("filter-dialog").close();
    renderGraph(graphEl, getDataToRender(), viewState);
  }

  function clearFilters() {
    filterState.types = [];
    filterState.dates = [];
    filterState.epics = [];
    filterState.text = "";
    filterState.connectedSubgraphOnly = false;
    const form = document.getElementById("filter-form");
    if (form) {
      form.querySelectorAll("input[type=checkbox]").forEach((c) => { c.checked = false; });
      const t = form.querySelector('input[name="text"]');
      if (t) t.value = "";
    }
    document.getElementById("filter-dialog").close();
    renderGraph(graphEl, getDataToRender(), viewState);
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

  fetchGraph()
    .then((data) => {
      onGraphLoaded(data);
      setInterval(poll, POLL_INTERVAL_MS);
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
