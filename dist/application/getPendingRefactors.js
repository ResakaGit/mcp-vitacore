/**
 * Caso de uso V3: get_pending_refactors.
 * Lista planes de refactor pendientes, opcionalmente filtrados por module_name.
 */
import { toolErrorResult } from "../domain/errors.js";
export async function getPendingRefactors(ports, moduleName) {
    try {
        const plans = await ports.storage.getPendingRefactorPlans(moduleName?.trim() || undefined);
        if (plans.length === 0) {
            return {
                content: [{ type: "text", text: "No hay planes de refactor pendientes." }],
            };
        }
        const text = plans
            .map((p) => `## [${p.id}] Sesión: ${p.session_id}${p.module_name ? ` | Módulo: ${p.module_name}` : ""}\n${p.plan_text}`)
            .join("\n\n---\n\n");
        return {
            content: [{ type: "text", text }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return toolErrorResult(`get_pending_refactors falló: ${msg}`);
    }
}
//# sourceMappingURL=getPendingRefactors.js.map