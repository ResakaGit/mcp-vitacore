# V3 Contracts — Subconsciente Activo

## Decisión de búsqueda Oráculo

- **v1:** Últimos N steps entre sesiones (ordenados por `created_at` descendente). Sin FTS5. Permite escalar después a FTS5 o embeddings sin cambiar la interfaz del port.

## StoragePort — métodos nuevos

- `getStepsForOracle(limit: number): Promise<StepRowForOracle[]>` — Steps recientes cross-session para contexto del oráculo. `StepRowForOracle = { session_id: string; action: string; implications: string; created_at: string }`.
- `insertParadox(params: InsertParadoxParams): Promise<void>`
- `getOpenParadoxes(): Promise<ParadoxRow[]>`
- `getParadox(id: string): Promise<ParadoxRow | null>`
- `resolveParadox(id: string, resolutionSuggestion?: string): Promise<void>`
- `insertRefactorPlan(params: InsertRefactorPlanParams): Promise<void>`
- `getPendingRefactorPlans(moduleName?: string): Promise<RefactorPlanRow[]>`

Tipos: `ParadoxRow`, `RefactorPlanRow`, `InsertParadoxParams`, `InsertRefactorPlanParams` (ver ports/storage.ts).

## GeminiPort — métodos nuevos

- `answerFromContext(question: string, contextRecords: ContextRecord[]): Promise<string>` — Directiva técnica curada. `ContextRecord = { action: string; implications: string; sessionId?: string }`.
- `detectParadoxes(macro: string | null, sessionSummaries: string[]): Promise<ParadoxCandidate[]>` — `ParadoxCandidate = { description: string; analysis: string }`.
- `generateRefactorPlan(sessionSteps: StepForSummary[], macro: string | null): Promise<string>` — Plan en texto (viñetas).

## SQL — tablas nuevas

### paradoxes

```sql
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
```

### refactor_plans

```sql
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
```
