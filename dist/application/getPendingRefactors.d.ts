/**
 * Caso de uso V3: get_pending_refactors.
 * Lista planes de refactor pendientes, opcionalmente filtrados por module_name.
 */
import type { StoragePort } from "../ports/storage.js";
import { type ToolResult } from "../domain/errors.js";
export type Ports = {
    storage: StoragePort;
};
export declare function getPendingRefactors(ports: Ports, moduleName?: string): Promise<ToolResult>;
//# sourceMappingURL=getPendingRefactors.d.ts.map