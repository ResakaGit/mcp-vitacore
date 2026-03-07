import type { StoragePort } from "../ports/storage.js";
import { toolSuccessResult, type ToolResult } from "../domain/errors.js";

export async function logStep(
  storage: StoragePort,
  sessionId: string,
  action: string,
  implications: string,
  agentKey?: string
): Promise<ToolResult> {
  await storage.insertStep(sessionId, action, implications, agentKey);
  return toolSuccessResult("Step registrado.");
}
