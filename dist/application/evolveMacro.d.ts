import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { type ToolResult } from "../domain/errors.js";
export type Ports = {
    storage: StoragePort;
    gemini: GeminiPort;
};
export declare function evolveMacroOrchestrator(ports: Ports): () => Promise<ToolResult>;
//# sourceMappingURL=evolveMacro.d.ts.map