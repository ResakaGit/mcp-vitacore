/**
 * Caso de uso V3: submit_for_background_review.
 * Obtiene steps de la sesión y macro, genera plan de refactor con Gemini y lo persiste.
 */
import { randomUUID } from "node:crypto";
import { toolErrorResult } from "../domain/errors.js";
export async function submitForBackgroundReview(ports, sessionId) {
    if (typeof sessionId !== "string" || sessionId.trim() === "") {
        return toolErrorResult("session_id es requerido.");
    }
    try {
        const [steps, macro] = await Promise.all([
            ports.storage.getStepsBySession(sessionId.trim()),
            ports.storage.getMacro(),
        ]);
        if (steps.length === 0) {
            return toolErrorResult("Sesión sin steps; no hay bitácora para revisar.");
        }
        const planText = await ports.gemini.generateRefactorPlan(steps.map((s) => ({ action: s.action, implications: s.implications })), macro);
        const planId = randomUUID();
        await ports.storage.insertRefactorPlan({
            id: planId,
            sessionId: sessionId.trim(),
            moduleName: null,
            planText,
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Revisión solicitada. Plan de refactor guardado (id: ${planId}). Usa get_pending_refactors para listar.`,
                },
            ],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return toolErrorResult(`submit_for_background_review falló: ${msg}`);
    }
}
//# sourceMappingURL=submitForBackgroundReview.js.map