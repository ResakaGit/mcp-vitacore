/**
 * Servidor HTTP mínimo para la UI de mapas Vitacore.
 * Sirve estáticos desde ui/ y expone GET /api/graph con { nodes, edges } desde SQLite.
 * Uso: npm run serve:ui (desde la raíz del paquete mcp-vitacore).
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getConfig } from "./config.js";
import { createStorageAdapter } from "./adapters/sqlite/storageAdapter.js";
import type { StoragePort } from "./ports/storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const UI_ROOT = path.join(PROJECT_ROOT, "ui");

type GraphNode = {
  id: string;
  type: "macro" | "session" | "step" | "paradox" | "refactor" | "debate";
  label: string;
  summary?: string;
  sessionId?: string;
  relatedSessionIds?: string[];
};

type GraphEdge = { from: string; to: string };

async function buildGraph(storage: StoragePort): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const [macro, sessions, paradoxes, refactors, debates] = await Promise.all([
    storage.getMacro(),
    storage.getRecentSessions(50),
    storage.getOpenParadoxes(),
    storage.getPendingRefactorPlans(),
    storage.getOpenDebates(),
  ]);

  if (macro) {
    nodes.push({
      id: "macro",
      type: "macro",
      label: "Macro",
      summary: macro.slice(0, 200) + (macro.length > 200 ? "…" : ""),
    });
  }

  for (const s of sessions) {
    const sessionNodeId = `session:${s.id}`;
    nodes.push({
      id: sessionNodeId,
      type: "session",
      label: s.id,
      summary: s.summary,
    });
    if (macro) edges.push({ from: "macro", to: sessionNodeId });

    const steps = await storage.getStepsBySession(s.id);
    steps.forEach((step, i) => {
      const stepNodeId = `step:${s.id}:${i}`;
      nodes.push({
        id: stepNodeId,
        type: "step",
        label: step.action.slice(0, 40) + (step.action.length > 40 ? "…" : ""),
        summary: step.implications,
        sessionId: s.id,
      });
      edges.push({ from: sessionNodeId, to: stepNodeId });
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
      label: p.description.slice(0, 50) + (p.description.length > 50 ? "…" : ""),
      summary: p.analysis ?? undefined,
      relatedSessionIds: relatedIds,
    });
    for (const sid of relatedIds) {
      const targetId = `session:${sid}`;
      if (sessions.some((s) => s.id === sid)) edges.push({ from: paradoxNodeId, to: targetId });
    }
  }

  for (const r of refactors) {
    const refactorNodeId = `refactor:${r.id}`;
    const sessionNodeId = `session:${r.session_id}`;
    const refLabel = r.module_name
      ? `${r.module_name}${r.plan_text ? ": " + r.plan_text.slice(0, 25) + "…" : ""}`
      : (r.plan_text || r.id).slice(0, 35) + ((r.plan_text || r.id).length > 35 ? "…" : "");
    nodes.push({
      id: refactorNodeId,
      type: "refactor",
      label: refLabel,
      summary: r.plan_text,
      sessionId: r.session_id,
    });
    edges.push({ from: refactorNodeId, to: sessionNodeId });
  }

  for (const d of debates) {
    nodes.push({
      id: `debate:${d.id}`,
      type: "debate",
      label: d.title,
      summary: d.content ?? undefined,
    });
  }

  return { nodes, edges };
}

function createApp(storage: StoragePort) {
  const app = new Hono();

  app.get("/api/graph", async (c) => {
    try {
      const graph = await buildGraph(storage);
      return c.json(graph);
    } catch (err) {
      console.error("GET /api/graph error:", err);
      return c.json({ error: String(err) }, 500);
    }
  });

  app.get("/", (c) => c.redirect("/index.html"));
  app.use("*", serveStatic({ root: UI_ROOT }));

  return app;
}

/**
 * Misma DB que el MCP: Cursor usa ./data/vitacore.sqlite desde la raíz del workspace.
 * Sin VITACORE_DB_PATH, usamos workspace/data/vitacore.sqlite para que UI y MCP compartan datos.
 */
function resolveDbPath(): string {
  if (process.env.VITACORE_DB_PATH) {
    const raw = process.env.VITACORE_DB_PATH;
    if (path.isAbsolute(raw) || raw === ":memory:") return raw;
    return path.resolve(process.cwd(), raw);
  }
  return path.resolve(PROJECT_ROOT, "..", "..", "data", "vitacore.sqlite");
}

function main() {
  const config = getConfig();
  const dbPath = resolveDbPath();
  if (dbPath !== ":memory:") {
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const storage = createStorageAdapter(dbPath);
  const app = createApp(storage);

  const port = Number(process.env.UI_PORT ?? "3780");
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Vitacore UI: http://localhost:${info.port}`);
    console.log(`DB: ${dbPath}`);
  });
}

main();
