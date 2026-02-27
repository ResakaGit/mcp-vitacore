/**
 * Caso de uso V3: resolve_architectural_paradox.
 * Lee la paradoja por id, opcionalmente sugiere resolución y marca como resuelta; devuelve contenido al agente.
 */
import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { type ToolResult } from "../domain/errors.js";
export type Ports = {
    storage: StoragePort;
    gemini: GeminiPort;
};
export declare function resolveArchitecturalParadox(ports: Ports, paradoxId: string): Promise<ToolResult>;
//# sourceMappingURL=resolveArchitecturalParadox.d.ts.map