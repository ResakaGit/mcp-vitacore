import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StoragePort } from "../../ports/storage.js";
import type { GeminiPort } from "../../ports/gemini.js";
export interface ServerPorts {
    storage: StoragePort;
    gemini: GeminiPort;
}
/**
 * Registra las tools de mcp-vitacore en un McpServer existente.
 * Usado por el orquestador o por startServer (standalone).
 */
export declare function registerVitacoreTools(server: McpServer, ports: ServerPorts): void;
/** Descriptor del módulo para el orquestador. */
export declare const vitacoreMcpModule: {
    name: string;
    version: string;
    register: typeof registerVitacoreTools;
};
export declare function startServer(ports: ServerPorts): Promise<void>;
//# sourceMappingURL=server.d.ts.map