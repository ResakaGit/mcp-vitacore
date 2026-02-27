/**
 * Caso de uso V3: check_architectural_health.
 * Obtiene macro y resúmenes recientes, detecta paradojas con Gemini y las persiste; devuelve resumen.
 */
import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { type ToolResult } from "../domain/errors.js";
export type Ports = {
    storage: StoragePort;
    gemini: GeminiPort;
};
export declare function checkArchitecturalHealth(ports: Ports): Promise<ToolResult>;
//# sourceMappingURL=checkArchitecturalHealth.d.ts.map