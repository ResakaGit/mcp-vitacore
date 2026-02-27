import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { toolErrorResult, type ToolResult } from "../domain/errors.js";

export type Ports = { storage: StoragePort; gemini: GeminiPort };

export function closeSessionOrchestrator(ports: Ports): (sessionId: string) => Promise<ToolResult> {
  return async (sessionId: string): Promise<ToolResult> => {
    const alreadyClosed = await ports.storage.hasSession(sessionId);
    if (alreadyClosed) return toolErrorResult("Sesión ya cerrada.");
    const steps = await ports.storage.getStepsBySession(sessionId);
    if (steps.length === 0) return toolErrorResult("Sesión sin steps");
    const summary = await ports.gemini.generateSessionSummary(steps);
    try {
      await ports.storage.insertSession(sessionId, summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("mcp-vitacore: insertSession failed:", msg);
      return toolErrorResult("Error al guardar la sesión.");
    }
    return {
      content: [{ type: "text", text: "Sesión cerrada, bitácora procesada." }],
    };
  };
}
