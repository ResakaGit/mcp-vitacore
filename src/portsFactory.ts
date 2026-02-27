/**
 * Factory de puertos para uso standalone o por el orquestador.
 * Crea storage y gemini, hace health check; lanza si falla.
 */
import fs from "node:fs";
import path from "node:path";
import { createStorageAdapter } from "./adapters/sqlite/storageAdapter.js";
import { createGeminiAdapter } from "./adapters/gemini/geminiAdapter.js";
import type { ServerPorts } from "./adapters/mcp/server.js";

export type { ServerPorts };

export interface VitacorePortsConfig {
  GEMINI_API_KEY: string;
  VITACORE_DB_PATH: string;
  GEMINI_MODEL: string;
  GEMINI_TIMEOUT_MS: number;
}

export async function createVitacorePorts(config: VitacorePortsConfig): Promise<ServerPorts> {
  const gemini = createGeminiAdapter(
    config.GEMINI_API_KEY,
    config.GEMINI_MODEL,
    config.GEMINI_TIMEOUT_MS
  );
  await gemini.generateSessionSummary([]);
  if (config.VITACORE_DB_PATH !== ":memory:") {
    const dbDir = path.dirname(config.VITACORE_DB_PATH);
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const storage = createStorageAdapter(config.VITACORE_DB_PATH);
  return { storage, gemini };
}
