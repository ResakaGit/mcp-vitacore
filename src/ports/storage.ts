/**
 * Puerto de persistencia: steps, sessions, macro, paradoxes, refactor_plans.
 * Los use cases dependen solo de esta interfaz.
 */

export type StepRow = {
  action: string;
  implications: string;
  created_at: string;
  agent_key: string;
};

export type SessionRow = {
  id: string;
  summary: string;
  closed_at: string | null;
  created_at: string;
};

/** Step con session_id para contexto oráculo (últimos N cross-session). */
export type StepRowForOracle = {
  session_id: string;
  action: string;
  implications: string;
  created_at: string;
  agent_key?: string;
};

export type ParadoxRow = {
  id: string;
  description: string;
  analysis: string | null;
  status: string;
  related_session_ids: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_suggestion: string | null;
};

export type RefactorPlanRow = {
  id: string;
  session_id: string;
  module_name: string | null;
  plan_text: string;
  status: string;
  created_at: string;
};

export type InsertParadoxParams = {
  id: string;
  description: string;
  analysis: string | null;
  relatedSessionIds: string;
};

export type InsertRefactorPlanParams = {
  id: string;
  sessionId: string;
  moduleName: string | null;
  planText: string;
};

export interface StoragePort {
  insertStep(sessionId: string, action: string, implications: string, agentKey?: string): Promise<void>;
  getStepsBySession(sessionId: string): Promise<StepRow[]>;
  getRecentStepsByAgentKey(agentKey: string, limit: number): Promise<StepRow[]>;
  getStepsForOracle(limit: number): Promise<StepRowForOracle[]>;
  hasSession(sessionId: string): Promise<boolean>;
  insertSession(sessionId: string, summary: string): Promise<void>;
  getRecentSessions(limit: number): Promise<SessionRow[]>;
  getMacro(): Promise<string | null>;
  setMacro(content: string): Promise<void>;
  insertParadox(params: InsertParadoxParams): Promise<void>;
  getOpenParadoxes(): Promise<ParadoxRow[]>;
  getParadox(id: string): Promise<ParadoxRow | null>;
  resolveParadox(id: string, resolutionSuggestion?: string): Promise<void>;
  insertRefactorPlan(params: InsertRefactorPlanParams): Promise<void>;
  getPendingRefactorPlans(moduleName?: string): Promise<RefactorPlanRow[]>;
}
