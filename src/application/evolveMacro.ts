import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { toolErrorResult, toolSuccessResult, messageFromUnknown, type ToolResult } from "../domain/errors.js";

const RECENT_SESSIONS_LIMIT = 10;

export type Ports = { storage: StoragePort; gemini: GeminiPort };

export function evolveMacroOrchestrator(ports: Ports): () => Promise<ToolResult> {
  return async (): Promise<ToolResult> => {
    const [currentMacro, recentSessions] = await Promise.all([
      ports.storage.getMacro(),
      ports.storage.getRecentSessions(RECENT_SESSIONS_LIMIT),
    ]);
    const summaries = recentSessions.map((s) => s.summary);
    const newContent = await ports.gemini.evolveMacro(currentMacro, summaries);
    try {
      await ports.storage.setMacro(newContent);
    } catch (err) {
      console.error("mcp-vitacore: setMacro failed:", messageFromUnknown(err));
      return toolErrorResult("Error al guardar el Macro.");
    }
    return toolSuccessResult("Macro evolucionado y guardado.");
  };
}
