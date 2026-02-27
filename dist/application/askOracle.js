/**
 * Caso de uso V3: ask_the_oracle.
 * Obtiene contexto reciente (últimos N steps), consulta a Gemini y devuelve directiva técnica curada.
 */
import { toolErrorResult } from "../domain/errors.js";
const ORACLE_STEPS_LIMIT = 20;
export async function askOracle(ports, technicalDoubt) {
    if (typeof technicalDoubt !== "string" || technicalDoubt.trim() === "") {
        return toolErrorResult("technical_doubt es requerido y no puede estar vacío.");
    }
    try {
        const steps = await ports.storage.getStepsForOracle(ORACLE_STEPS_LIMIT);
        const contextRecords = steps.map((s) => ({
            action: s.action,
            implications: s.implications,
            sessionId: s.session_id,
        }));
        const answer = await ports.gemini.answerFromContext(technicalDoubt.trim(), contextRecords);
        return {
            content: [{ type: "text", text: answer }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return toolErrorResult(`Oráculo falló: ${msg}`);
    }
}
//# sourceMappingURL=askOracle.js.map