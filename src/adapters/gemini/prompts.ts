/**
 * Textos de prompts para el adaptador Gemini (Tech Lead 3 viñetas, evolución de Macro).
 * Centralizados para facilitar cambios y tests.
 */

export const SESSION_SUMMARY_SYSTEM = `Eres un Tech Lead. Sintetiza la bitácora de pasos de una sesión de trabajo en exactamente 3 viñetas cortas (bullet points), en español. Cada viñeta debe capturar acción e implicación. Sin preámbulos ni títulos, solo las 3 líneas.`;

export function sessionSummaryUser(steps: Array<{ action: string; implications: string }>): string {
  if (steps.length === 0) return "No hay pasos en esta sesión. Responde: Sesión sin pasos registrados.";
  return steps
    .map((s, i) => `[${i + 1}] Acción: ${s.action}\nImplicaciones: ${s.implications}`)
    .join("\n\n");
}

export const EVOLVE_MACRO_SYSTEM = `Eres un arquitecto de software. Dado el estado actual del Macro (documento de arquitectura/contexto) y los resúmenes de sesiones recientes, produce una versión evolucionada del Macro que integre aprendizajes y decisiones sin perder claridad. Responde únicamente con el nuevo texto del Macro, sin explicaciones meta.`;

export function evolveMacroUser(currentMacro: string | null, recentSessionSummaries: string[]): string {
  const macroBlock = currentMacro
    ? `Macro actual:\n${currentMacro}`
    : "No hay Macro previo (primera vez).";
  const sessionsBlock =
    recentSessionSummaries.length > 0
      ? `Resúmenes de sesiones recientes:\n${recentSessionSummaries.join("\n---\n")}`
      : "No hay resúmenes de sesiones.";
  return `${macroBlock}\n\n${sessionsBlock}\n\nEvoluciona el Macro y responde solo con el nuevo contenido.`;
}

// --- V3: Oráculo de síntesis ---

export const ORACLE_SYSTEM = `Eres el Arquitecto Principal. Recibes registros pasados del proyecto (acciones e implicaciones). Tu tarea es revisar esos registros, descartar malas prácticas, corregir errores de seguridad y redactar una directiva técnica clara para el desarrollador actual.
Responde únicamente con una directiva de exactamente 3 pasos numerados, en español. Sin preámbulos ni títulos. Máximo 150 palabras.`;

export function oracleUser(question: string, contextRecords: Array<{ action: string; implications: string; sessionId?: string }>): string {
  const contextBlock =
    contextRecords.length > 0
      ? contextRecords
          .map((r, i) => `[${i + 1}] Acción: ${r.action}\nImplicaciones: ${r.implications}${r.sessionId ? ` (sesión: ${r.sessionId})` : ""}`)
          .join("\n\n")
      : "No hay registros de contexto.";
  return `Contexto del proyecto:\n${contextBlock}\n\nPregunta del desarrollador: ${question}\n\nResponde con una directiva técnica de 3 pasos.`;
}

// --- V3: Detección de paradojas ---

export const PARADOX_SYSTEM = `Eres un auditor de arquitectura. Comparas el documento Macro (reglas/estándares del proyecto) con los resúmenes de sesiones recientes. Si detectas contradicciones (ej. "Macro dice UTC, una sesión usó hora local"), listas cada paradoja.
Responde ÚNICAMENTE con un JSON válido: un array de objetos con exactamente dos claves: "description" (string, descripción breve de la paradoja) y "analysis" (string, análisis del conflicto). Si no hay paradojas, responde: []. Sin texto antes ni después del JSON.`;

export function paradoxUser(macro: string | null, sessionSummaries: string[]): string {
  const macroBlock = macro ? `Macro:\n${macro}` : "No hay Macro definido.";
  const sessionsBlock =
    sessionSummaries.length > 0
      ? `Resúmenes de sesiones:\n${sessionSummaries.join("\n---\n")}`
      : "No hay resúmenes.";
  return `${macroBlock}\n\n${sessionsBlock}\n\nLista paradojas como JSON array de { "description", "analysis" }. Si no hay ninguna: [].`;
}

// --- V3: Plan de refactor ---

export const REFACTOR_PLAN_SYSTEM = `Eres el Tech Lead. A partir de la bitácora de una sesión (acciones e implicaciones) y del Macro del proyecto, identificas deuda técnica y propones un plan de refactorización concreto.
Responde únicamente con 3 a 5 viñetas (bullet points), en español. Cada viñeta debe ser accionable (ej. "Extraer validación de email a un middleware"). Sin títulos ni preámbulos. Máximo 200 palabras.`;

export function refactorPlanUser(
  sessionSteps: Array<{ action: string; implications: string }>,
  macro: string | null
): string {
  const stepsBlock =
    sessionSteps.length > 0
      ? sessionSteps.map((s, i) => `[${i + 1}] ${s.action}\n${s.implications}`).join("\n\n")
      : "No hay pasos en la sesión.";
  const macroBlock = macro ? `Macro:\n${macro}` : "No hay Macro.";
  return `Bitácora de la sesión:\n${stepsBlock}\n\n${macroBlock}\n\nGenera un plan de refactorización (3 a 5 viñetas accionables).`;
}
