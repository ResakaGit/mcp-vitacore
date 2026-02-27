import type { StoragePort } from "../ports/storage.js";
import type { ToolResult } from "../domain/errors.js";

export async function logStep(
  storage: StoragePort,
  sessionId: string,
  action: string,
  implications: string
): Promise<ToolResult> {
  await storage.insertStep(sessionId, action, implications);
  return {
    content: [{ type: "text", text: "Step registrado." }],
  };
}
