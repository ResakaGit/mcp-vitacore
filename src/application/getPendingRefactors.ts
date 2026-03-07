/**
 * Caso de uso V3: get_pending_refactors.
 * Lista planes de refactor pendientes, opcionalmente filtrados por module_name.
 */

import type { StoragePort } from "../ports/storage.js";
import { toolErrorResult, toolSuccessResult, messageFromUnknown, type ToolResult } from "../domain/errors.js";

export type Ports = { storage: StoragePort };

export async function getPendingRefactors(ports: Ports, moduleName?: string): Promise<ToolResult> {
  try {
    const plans = await ports.storage.getPendingRefactorPlans(moduleName?.trim() || undefined);
    if (plans.length === 0) return toolSuccessResult("No hay planes de refactor pendientes.");
    const text = plans
      .map(
        (p) =>
          `## [${p.id}] Sesión: ${p.session_id}${p.module_name ? ` | Módulo: ${p.module_name}` : ""}\n${p.plan_text}`
      )
      .join("\n\n---\n\n");
    return toolSuccessResult(text);
  } catch (err) {
    return toolErrorResult(`get_pending_refactors falló: ${messageFromUnknown(err)}`);
  }
}
