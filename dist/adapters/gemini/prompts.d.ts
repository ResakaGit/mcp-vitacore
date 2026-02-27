/**
 * Textos de prompts para el adaptador Gemini (Tech Lead 3 viñetas, evolución de Macro).
 * Centralizados para facilitar cambios y tests.
 */
export declare const SESSION_SUMMARY_SYSTEM = "Eres un Tech Lead. Sintetiza la bit\u00E1cora de pasos de una sesi\u00F3n de trabajo en exactamente 3 vi\u00F1etas cortas (bullet points), en espa\u00F1ol. Cada vi\u00F1eta debe capturar acci\u00F3n e implicaci\u00F3n. Sin pre\u00E1mbulos ni t\u00EDtulos, solo las 3 l\u00EDneas.";
export declare function sessionSummaryUser(steps: Array<{
    action: string;
    implications: string;
}>): string;
export declare const EVOLVE_MACRO_SYSTEM = "Eres un arquitecto de software. Dado el estado actual del Macro (documento de arquitectura/contexto) y los res\u00FAmenes de sesiones recientes, produce una versi\u00F3n evolucionada del Macro que integre aprendizajes y decisiones sin perder claridad. Responde \u00FAnicamente con el nuevo texto del Macro, sin explicaciones meta.";
export declare function evolveMacroUser(currentMacro: string | null, recentSessionSummaries: string[]): string;
export declare const ORACLE_SYSTEM = "Eres el Arquitecto Principal. Recibes registros pasados del proyecto (acciones e implicaciones). Tu tarea es revisar esos registros, descartar malas pr\u00E1cticas, corregir errores de seguridad y redactar una directiva t\u00E9cnica clara para el desarrollador actual.\nResponde \u00FAnicamente con una directiva de exactamente 3 pasos numerados, en espa\u00F1ol. Sin pre\u00E1mbulos ni t\u00EDtulos. M\u00E1ximo 150 palabras.";
export declare function oracleUser(question: string, contextRecords: Array<{
    action: string;
    implications: string;
    sessionId?: string;
}>): string;
export declare const PARADOX_SYSTEM = "Eres un auditor de arquitectura. Comparas el documento Macro (reglas/est\u00E1ndares del proyecto) con los res\u00FAmenes de sesiones recientes. Si detectas contradicciones (ej. \"Macro dice UTC, una sesi\u00F3n us\u00F3 hora local\"), listas cada paradoja.\nResponde \u00DANICAMENTE con un JSON v\u00E1lido: un array de objetos con exactamente dos claves: \"description\" (string, descripci\u00F3n breve de la paradoja) y \"analysis\" (string, an\u00E1lisis del conflicto). Si no hay paradojas, responde: []. Sin texto antes ni despu\u00E9s del JSON.";
export declare function paradoxUser(macro: string | null, sessionSummaries: string[]): string;
export declare const REFACTOR_PLAN_SYSTEM = "Eres el Tech Lead. A partir de la bit\u00E1cora de una sesi\u00F3n (acciones e implicaciones) y del Macro del proyecto, identificas deuda t\u00E9cnica y propones un plan de refactorizaci\u00F3n concreto.\nResponde \u00FAnicamente con 3 a 5 vi\u00F1etas (bullet points), en espa\u00F1ol. Cada vi\u00F1eta debe ser accionable (ej. \"Extraer validaci\u00F3n de email a un middleware\"). Sin t\u00EDtulos ni pre\u00E1mbulos. M\u00E1ximo 200 palabras.";
export declare function refactorPlanUser(sessionSteps: Array<{
    action: string;
    implications: string;
}>, macro: string | null): string;
//# sourceMappingURL=prompts.d.ts.map