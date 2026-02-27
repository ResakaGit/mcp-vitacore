import { toolErrorResult } from "../domain/errors.js";
const RECENT_SESSIONS_LIMIT = 10;
export function evolveMacroOrchestrator(ports) {
    return async () => {
        const [currentMacro, recentSessions] = await Promise.all([
            ports.storage.getMacro(),
            ports.storage.getRecentSessions(RECENT_SESSIONS_LIMIT),
        ]);
        const summaries = recentSessions.map((s) => s.summary);
        const newContent = await ports.gemini.evolveMacro(currentMacro, summaries);
        try {
            await ports.storage.setMacro(newContent);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("mcp-vitacore: setMacro failed:", msg);
            return toolErrorResult("Error al guardar el Macro.");
        }
        return {
            content: [{ type: "text", text: "Macro evolucionado y guardado." }],
        };
    };
}
//# sourceMappingURL=evolveMacro.js.map