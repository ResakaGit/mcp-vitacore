/**
 * Servidor HTTP mínimo para la UI Vitacore.
 * Sirve estáticos desde ui/ y expone API (graph, agenda, analytics).
 * Uso: npm run serve:ui (desde la raíz del paquete mcp-vitacore).
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getConfig, getDbSources, type DbSource } from "./config.js";
import { createStorageAdapter } from "./adapters/sqlite/storageAdapter.js";
import type { StoragePort } from "./ports/storage.js";
import { API, PAGES } from "./serve-ui/routes.js";
import { buildAgendaResponse, type AgentFilter } from "./serve-ui/agenda.js";
import { truncate } from "./serve-ui/truncate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_ROOT = path.join(path.resolve(__dirname, ".."), "ui");

type GraphNode = {
  id: string;
  type: "macro" | "session" | "step" | "paradox" | "refactor";
  label: string;
  summary?: string;
  sessionId?: string;
  relatedSessionIds?: string[];
};
type GraphEdge = { from: string; to: string };

async function buildGraph(storage: StoragePort): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const [macro, sessions, paradoxes, refactors] = await Promise.all([
    storage.getMacro(),
    storage.getRecentSessions(50),
    storage.getOpenParadoxes(),
    storage.getPendingRefactorPlans(),
  ]);

  if (macro) {
    nodes.push({
      id: "macro",
      type: "macro",
      label: "Macro",
      summary: truncate(macro, 200),
    });
  }

  for (const s of sessions) {
    const sessionNodeId = `session:${s.id}`;
    nodes.push({ id: sessionNodeId, type: "session", label: s.id, summary: s.summary });
    if (macro) edges.push({ from: "macro", to: sessionNodeId });

    const steps = await storage.getStepsBySession(s.id);
    steps.forEach((step, i) => {
      nodes.push({
        id: `step:${s.id}:${i}`,
        type: "step",
        label: truncate(step.action, 40),
        summary: step.implications,
        sessionId: s.id,
      });
      edges.push({ from: sessionNodeId, to: `step:${s.id}:${i}` });
    });
  }

  for (const p of paradoxes) {
    const paradoxNodeId = `paradox:${p.id}`;
    const relatedIds = p.related_session_ids
      ? p.related_session_ids.split(",").map((id) => id.trim()).filter(Boolean)
      : [];
    nodes.push({
      id: paradoxNodeId,
      type: "paradox",
      label: truncate(p.description, 50),
      summary: p.analysis ?? undefined,
      relatedSessionIds: relatedIds,
    });
    for (const sid of relatedIds) {
      if (sessions.some((s) => s.id === sid)) edges.push({ from: paradoxNodeId, to: `session:${sid}` });
    }
  }

  for (const r of refactors) {
    const refLabel = r.module_name
      ? `${r.module_name}${r.plan_text ? ": " + truncate(r.plan_text, 25) : ""}`
      : truncate(r.plan_text || r.id, 35);
    nodes.push({
      id: `refactor:${r.id}`,
      type: "refactor",
      label: refLabel,
      summary: r.plan_text,
      sessionId: r.session_id,
    });
    edges.push({ from: `refactor:${r.id}`, to: `session:${r.session_id}` });
  }

  return { nodes, edges };
}

const VALID_AGENT_FILTERS: AgentFilter[] = ["all", "with_agent", "without_agent"];
function parseAgentFilter(q: string | undefined): AgentFilter {
  if (q && VALID_AGENT_FILTERS.includes(q as AgentFilter)) return q as AgentFilter;
  return "all";
}

const DIAGNOSTIC_SESSIONS_LIMIT = 5000;
const DIAGNOSTIC_STEPS_LIMIT = 10000;

function resolveDbId(dbId: string | undefined, sources: DbSource[]): string {
  const id = (dbId ?? "").trim();
  if (id && sources.some((s) => s.id === id)) return id;
  return sources[0]?.id ?? "mcp";
}

function createApp(
  getStorage: (dbId: string) => StoragePort,
  sources: DbSource[]
) {
  const app = new Hono();

  app.onError((err, c) => {
    console.error(c.req.method, c.req.path, err);
    return c.json({ error: "Internal server error" }, 500);
  });

  app.get(API.DB_SOURCES, (c) => c.json({ sources }));

  app.get(API.DIAGNOSTIC, async (c) => {
    const dbId = resolveDbId(c.req.query("db"), sources);
    const storage = getStorage(dbId);
    const [sessions, steps] = await Promise.all([
      storage.getRecentSessions(DIAGNOSTIC_SESSIONS_LIMIT),
      storage.getStepsForOracle(DIAGNOSTIC_STEPS_LIMIT),
    ]);
    const source = sources.find((s) => s.id === dbId)!;
    return c.json({
      connected: true,
      dbId,
      dbPath: source.path,
      sessionsCount: sessions.length,
      stepsCount: steps.length,
    });
  });

  app.get(API.GRAPH, async (c) => {
    const dbId = resolveDbId(c.req.query("db"), sources);
    const graph = await buildGraph(getStorage(dbId));
    return c.json(graph);
  });

  app.get(API.AGENDA, async (c) => {
    const dbId = resolveDbId(c.req.query("db"), sources);
    const agentFilter = parseAgentFilter(c.req.query("agent_filter"));
    const dateFrom = c.req.query("date_from");
    const dateTo = c.req.query("date_to");
    const body = await buildAgendaResponse(getStorage(dbId), agentFilter, dateFrom, dateTo);
    return c.json(body);
  });

  app.get(API.ANALYTICS, async (c) => {
    const dbId = resolveDbId(c.req.query("db"), sources);
    const storage = getStorage(dbId);
    const [sessions, stepsForOracle] = await Promise.all([
      storage.getRecentSessions(30),
      storage.getStepsForOracle(80),
    ]);
    const dates = new Set<string>();
    const epics = new Set<string>();
    for (const s of sessions) {
      const dateMatch = s.id.match(/^\d{2}\/\d{2}\/\d{4}/);
      if (dateMatch) dates.add(dateMatch[0]);
      const epicMatch = s.id.match(/^([a-z]+-[a-z]+)/);
      if (epicMatch) epics.add(epicMatch[1]);
    }
    return c.json({
      dates: Array.from(dates).sort(),
      epics: Array.from(epics).sort(),
      sessions: sessions.map((s) => ({ id: s.id, summary: truncate(s.summary ?? "", 100) })),
      recentSteps: stepsForOracle.map((row) => ({
        session_id: row.session_id,
        action: row.action,
        implications: truncate(row.implications ?? "", 120),
        created_at: row.created_at,
      })),
    });
  });

  app.get(PAGES.ROOT, (c) => c.redirect(PAGES.INDEX));
  app.use("*", serveStatic({ root: UI_ROOT }));

  return app;
}

function main() {
  const sources = getDbSources();
  const storageCache = new Map<string, StoragePort>();

  function getStorage(dbId: string): StoragePort {
    const source = sources.find((s) => s.id === dbId) ?? sources[0]!;
    let storage = storageCache.get(source.path);
    if (!storage) {
      if (source.path !== ":memory:") {
        fs.mkdirSync(path.dirname(source.path), { recursive: true });
      }
      storage = createStorageAdapter(source.path);
      storageCache.set(source.path, storage);
    }
    return storage;
  }

  const app = createApp(getStorage, sources);
  const port = Number(process.env.UI_PORT ?? "3780");
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Vitacore UI: http://localhost:${info.port}`);
    console.log("DBs:", sources.map((s) => s.id).join(", "));
  });
}

main();
