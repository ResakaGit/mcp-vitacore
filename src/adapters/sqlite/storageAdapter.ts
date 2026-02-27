/**
 * Adaptador SQLite para StoragePort (better-sqlite3).
 * Crea DB y tablas si no existen; exporta factory createStorageAdapter(dbPath).
 */

import Database from "better-sqlite3";
import type {
  StoragePort,
  StepRow,
  SessionRow,
  DebateRow,
  StepRowForOracle,
  ParadoxRow,
  RefactorPlanRow,
  InsertParadoxParams,
  InsertRefactorPlanParams,
} from "../../ports/storage.js";

function toISO(ms?: number): string {
  return new Date(ms ?? Date.now()).toISOString();
}

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      action TEXT NOT NULL,
      implications TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_steps_session_id ON steps(session_id);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS macro (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT OR IGNORE INTO macro (id, content, updated_at) VALUES (1, '', '1970-01-01T00:00:00.000Z');

    CREATE TABLE IF NOT EXISTS debates (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      content TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paradoxes (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      analysis TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      related_session_ids TEXT,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      resolution_suggestion TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_paradoxes_status ON paradoxes(status);

    CREATE TABLE IF NOT EXISTS refactor_plans (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      module_name TEXT,
      plan_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_refactor_plans_status ON refactor_plans(status);
    CREATE INDEX IF NOT EXISTS idx_refactor_plans_module ON refactor_plans(module_name);
  `);
  db.pragma("journal_mode = WAL");
}

export function createStorageAdapter(dbPath: string): StoragePort {
  const db = new Database(dbPath);
  initSchema(db);

  return {
    async insertStep(sessionId: string, action: string, implications: string): Promise<void> {
      const stmt = db.prepare(
        "INSERT INTO steps (session_id, action, implications, created_at) VALUES (?, ?, ?, ?)"
      );
      stmt.run(sessionId, action, implications, toISO());
    },

    async getStepsBySession(sessionId: string): Promise<StepRow[]> {
      const stmt = db.prepare(
        "SELECT action, implications, created_at FROM steps WHERE session_id = ? ORDER BY created_at ASC"
      );
      const rows = stmt.all(sessionId) as Array<{ action: string; implications: string; created_at: string }>;
      return rows;
    },

    async getStepsForOracle(limit: number): Promise<StepRowForOracle[]> {
      const stmt = db.prepare(
        "SELECT session_id, action, implications, created_at FROM steps ORDER BY created_at DESC LIMIT ?"
      );
      const rows = stmt.all(limit) as Array<{
        session_id: string;
        action: string;
        implications: string;
        created_at: string;
      }>;
      return rows;
    },

    async hasSession(sessionId: string): Promise<boolean> {
      const row = db.prepare("SELECT 1 FROM sessions WHERE id = ?").get(sessionId);
      return row != null;
    },

    async insertSession(sessionId: string, summary: string): Promise<void> {
      const now = toISO();
      const stmt = db.prepare(
        "INSERT INTO sessions (id, summary, created_at, closed_at) VALUES (?, ?, ?, ?)"
      );
      stmt.run(sessionId, summary, now, now);
    },

    async getRecentSessions(limit: number): Promise<SessionRow[]> {
      const stmt = db.prepare(
        "SELECT id, summary, closed_at FROM sessions ORDER BY closed_at DESC LIMIT ?"
      );
      const rows = stmt.all(limit) as Array<{ id: string; summary: string; closed_at: string | null }>;
      return rows;
    },

    async getMacro(): Promise<string | null> {
      const row = db.prepare("SELECT content FROM macro WHERE id = 1").get() as { content: string } | undefined;
      if (!row) return null;
      return row.content === "" ? null : row.content;
    },

    async setMacro(content: string): Promise<void> {
      const stmt = db.prepare("UPDATE macro SET content = ?, updated_at = ? WHERE id = 1");
      stmt.run(content, toISO());
    },

    async getOpenDebates(role?: string): Promise<DebateRow[]> {
      let sql = "SELECT id, role, title, content FROM debates WHERE status = 'open'";
      const params: string[] = [];
      if (role !== undefined && role !== "") {
        sql += " AND role = ?";
        params.push(role);
      }
      sql += " ORDER BY created_at ASC";
      const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      const rows = stmt.all() as Array<{ id: string; role: string; title: string; content: string | null }>;
      return rows;
    },

    async closeDebate(id: string): Promise<void> {
      db.prepare("UPDATE debates SET status = 'closed' WHERE id = ?").run(id);
    },

    async insertParadox(params: InsertParadoxParams): Promise<void> {
      const now = toISO();
      db.prepare(
        `INSERT INTO paradoxes (id, description, analysis, status, related_session_ids, created_at)
         VALUES (?, ?, ?, 'open', ?, ?)`
      ).run(params.id, params.description, params.analysis ?? null, params.relatedSessionIds, now);
    },

    async getOpenParadoxes(): Promise<ParadoxRow[]> {
      const stmt = db.prepare(
        "SELECT id, description, analysis, status, related_session_ids, created_at, resolved_at, resolution_suggestion FROM paradoxes WHERE status = 'open' ORDER BY created_at DESC"
      );
      const rows = stmt.all() as Array<{
        id: string;
        description: string;
        analysis: string | null;
        status: string;
        related_session_ids: string | null;
        created_at: string;
        resolved_at: string | null;
        resolution_suggestion: string | null;
      }>;
      return rows.map((r) => ({
        ...r,
        analysis: r.analysis ?? null,
        related_session_ids: r.related_session_ids ?? null,
        resolved_at: r.resolved_at ?? null,
        resolution_suggestion: r.resolution_suggestion ?? null,
      }));
    },

    async getParadox(id: string): Promise<ParadoxRow | null> {
      const row = db.prepare(
        "SELECT id, description, analysis, status, related_session_ids, created_at, resolved_at, resolution_suggestion FROM paradoxes WHERE id = ?"
      ).get(id) as ParadoxRow | undefined;
      if (!row) return null;
      return {
        ...row,
        analysis: row.analysis ?? null,
        related_session_ids: row.related_session_ids ?? null,
        resolved_at: row.resolved_at ?? null,
        resolution_suggestion: row.resolution_suggestion ?? null,
      };
    },

    async resolveParadox(id: string, resolutionSuggestion?: string): Promise<void> {
      const now = toISO();
      db.prepare(
        "UPDATE paradoxes SET status = 'resolved', resolved_at = ?, resolution_suggestion = ? WHERE id = ?"
      ).run(now, resolutionSuggestion ?? null, id);
    },

    async insertRefactorPlan(params: InsertRefactorPlanParams): Promise<void> {
      const now = toISO();
      db.prepare(
        `INSERT INTO refactor_plans (id, session_id, module_name, plan_text, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      ).run(params.id, params.sessionId, params.moduleName ?? null, params.planText, now);
    },

    async getPendingRefactorPlans(moduleName?: string): Promise<RefactorPlanRow[]> {
      let sql =
        "SELECT id, session_id, module_name, plan_text, status, created_at FROM refactor_plans WHERE status = 'pending'";
      const params: string[] = [];
      if (moduleName !== undefined && moduleName !== "") {
        sql += " AND (module_name IS NULL OR module_name = ?)";
        params.push(moduleName);
      }
      sql += " ORDER BY created_at DESC";
      const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
      const rows = stmt.all() as Array<{
        id: string;
        session_id: string;
        module_name: string | null;
        plan_text: string;
        status: string;
        created_at: string;
      }>;
      return rows;
    },
  };
}
