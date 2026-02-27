/**
 * Caso de uso V3: ask_the_oracle.
 * Obtiene contexto reciente (últimos N steps), consulta a Gemini y devuelve directiva técnica curada.
 */
import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { type ToolResult } from "../domain/errors.js";
export type Ports = {
    storage: StoragePort;
    gemini: GeminiPort;
};
export declare function askOracle(ports: Ports, technicalDoubt: string): Promise<ToolResult>;
//# sourceMappingURL=askOracle.d.ts.map