import { toolErrorResult } from "../domain/errors.js";
export function closeSessionOrchestrator(ports) {
    return async (sessionId) => {
        const alreadyClosed = await ports.storage.hasSession(sessionId);
        if (alreadyClosed)
            return toolErrorResult("Sesión ya cerrada.");
        const steps = await ports.storage.getStepsBySession(sessionId);
        if (steps.length === 0)
            return toolErrorResult("Sesión sin steps");
        const summary = await ports.gemini.generateSessionSummary(steps);
        try {
            await ports.storage.insertSession(sessionId, summary);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("mcp-vitacore: insertSession failed:", msg);
            return toolErrorResult("Error al guardar la sesión.");
        }
        return {
            content: [{ type: "text", text: "Sesión cerrada, bitácora procesada." }],
        };
    };
}
//# sourceMappingURL=closeSession.js.map