/**
 * Puerto cognitivo: resumen de sesión, evolución del Macro, oráculo, paradojas y planes de refactor.
 * Los use cases dependen solo de esta interfaz; el texto de prompts vive en adapters.
 */

export type StepForSummary = { action: string; implications: string };

/** Registro de contexto para el oráculo (action + implications + opcional sessionId). */
export type ContextRecord = { action: string; implications: string; sessionId?: string };

/** Paradoja detectada por el modelo (description + analysis). */
export type ParadoxCandidate = { description: string; analysis: string };

export interface GeminiPort {
  generateSessionSummary(steps: StepForSummary[]): Promise<string>;
  evolveMacro(currentMacro: string | null, recentSessionSummaries: string[]): Promise<string>;
  answerFromContext(question: string, contextRecords: ContextRecord[]): Promise<string>;
  detectParadoxes(macro: string | null, sessionSummaries: string[]): Promise<ParadoxCandidate[]>;
  generateRefactorPlan(sessionSteps: StepForSummary[], macro: string | null): Promise<string>;
}
