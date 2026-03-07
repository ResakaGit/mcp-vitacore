/**
 * Lógica pura de agenda/bitácora: filtrado y agrupación por día.
 * Sin I/O; recibe datos ya cargados del storage.
 */
import type { StoragePort } from "../ports/storage.js";

export type AgentFilter = "all" | "with_agent" | "without_agent";

export type AgendaStep = {
  action: string;
  implications: string;
  created_at: string;
  agent_key: string;
};

export type AgendaSession = {
  id: string;
  summary: string;
  steps: AgendaStep[];
};

export type AgendaDay = {
  date: string;
  sessions: AgendaSession[];
};

export type AgendaResponse = { days: AgendaDay[] };

const ISO_DATE_LEN = 10;

function trimAgentKey(key: string | undefined): string {
  return (key ?? "").trim();
}

/** Filtra steps según agent_filter. Pura. */
export function filterStepsByAgent(
  steps: Array<{ action: string; implications: string; created_at: string; agent_key?: string }>,
  filter: AgentFilter
): AgendaStep[] {
  if (filter === "all") {
    return steps.map((st) => ({
      action: st.action,
      implications: st.implications,
      created_at: st.created_at,
      agent_key: trimAgentKey(st.agent_key),
    }));
  }
  const hasAgent = filter === "with_agent";
  return steps
    .filter((st) => (trimAgentKey(st.agent_key) !== "") === hasAgent)
    .map((st) => ({
      action: st.action,
      implications: st.implications,
      created_at: st.created_at,
      agent_key: trimAgentKey(st.agent_key),
    }));
}

const DEFAULT_AGENDA_DAYS = 30;

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rango por defecto: último mes (hoy - 30 días hasta hoy). Pura. */
export function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const to = toYYYYMMDD(now);
  const from = new Date(now);
  from.setDate(from.getDate() - DEFAULT_AGENDA_DAYS);
  return { from: toYYYYMMDD(from), to };
}

/** Normaliza una fecha a YYYY-MM-DD. Pura. */
function normalizeDatePart(s: string | undefined): string | null {
  if (!s || !s.trim()) return null;
  const t = s.trim();
  if (t.includes("/")) {
    const parts = t.split("/").map((p) => p.trim());
    if (parts.length >= 3) return [parts[2], parts[1], parts[0]].join("-");
  }
  return t;
}

/** Parsea date_from y date_to; si faltan, usa último mes. Pura. */
export function parseDateRange(
  dateFrom: string | undefined,
  dateTo: string | undefined
): { from: string; to: string } {
  const from = normalizeDatePart(dateFrom);
  const to = normalizeDatePart(dateTo);
  if (from && to) return { from, to };
  return getDefaultDateRange();
}

/** Agrupa sesiones por día dentro del rango [dateFrom, dateTo]. Pura. */
export function groupSessionsByDay(
  sessionsWithSteps: Array<{ id: string; summary: string; created_at: string; steps: AgendaStep[] }>,
  dateFrom: string,
  dateTo: string
): AgendaDay[] {
  const byDay = new Map<string, AgendaSession[]>();

  for (const s of sessionsWithSteps) {
    const day = s.created_at.slice(0, ISO_DATE_LEN);
    if (day < dateFrom || day > dateTo) continue;

    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({
      id: s.id,
      summary: s.summary,
      steps: s.steps,
    });
  }

  return Array.from(byDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, sessions]) => ({ date, sessions }));
}

const AGENDA_SESSIONS_LIMIT = 200;

/**
 * Obtiene datos de agenda desde storage y aplica filtros/agrupación.
 * date_from/date_to opcionales; por defecto último mes.
 */
export async function buildAgendaResponse(
  storage: StoragePort,
  agentFilter: AgentFilter,
  dateFrom: string | undefined,
  dateTo: string | undefined
): Promise<AgendaResponse> {
  const sessions = await storage.getRecentSessions(AGENDA_SESSIONS_LIMIT);
  const { from, to } = parseDateRange(dateFrom, dateTo);

  const sessionsWithSteps: Array<{
    id: string;
    summary: string;
    created_at: string;
    steps: AgendaStep[];
  }> = [];

  for (const s of sessions) {
    const day = s.created_at.slice(0, ISO_DATE_LEN);
    if (day < from || day > to) continue;

    const steps = await storage.getStepsBySession(s.id);
    const filtered = filterStepsByAgent(steps, agentFilter);
    sessionsWithSteps.push({
      id: s.id,
      summary: s.summary,
      created_at: s.created_at,
      steps: filtered,
    });
  }

  const days = groupSessionsByDay(sessionsWithSteps, from, to);
  return { days };
}
