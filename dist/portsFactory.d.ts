import type { ServerPorts } from "./adapters/mcp/server.js";
export type { ServerPorts };
export interface VitacorePortsConfig {
    GEMINI_API_KEY: string;
    VITACORE_DB_PATH: string;
    GEMINI_MODEL: string;
    GEMINI_TIMEOUT_MS: number;
}
export declare function createVitacorePorts(config: VitacorePortsConfig): Promise<ServerPorts>;
//# sourceMappingURL=portsFactory.d.ts.map