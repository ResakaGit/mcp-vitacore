/**
 * Punto de entrada: valida env y dependencias (Gemini, SQLite) y arranca el servidor MCP.
 * Emite mensajes accionables en stderr para que un LLM pueda sugerir la corrección.
 */

import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.js";
import { createStorageAdapter } from "./adapters/sqlite/storageAdapter.js";
import { createGeminiAdapter } from "./adapters/gemini/geminiAdapter.js";
import { startServer } from "./adapters/mcp/server.js";

const MCP_NAME = "mcp-vitacore";

function failValidation(title: string, cause: string, steps: string[]): never {
  const lines = [
    `[MCP: ${MCP_NAME}] Validación fallida: ${title}`,
    `Causa: ${cause}`,
    "Para corregir:",
    ...steps.map((s) => `  - ${s}`),
  ];
  console.error(lines.join("\n"));
  process.exit(1);
}

async function main(): Promise<void> {
  const { GEMINI_API_KEY, VITACORE_DB_PATH, GEMINI_MODEL, GEMINI_TIMEOUT_MS } = getConfig();

  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === "") {
    failValidation(
      "GEMINI_API_KEY no definida.",
      "Variable de entorno obligatoria para la API de Gemini.",
      [
        "Exporta la variable: export GEMINI_API_KEY=tu_api_key",
        "O añádela a .env y cárgala antes de iniciar (ej. en .cursor/mcp.json env).",
        "En Docker: pasa -e GEMINI_API_KEY=... o env en docker-compose.",
      ]
    );
  }

  if (VITACORE_DB_PATH !== ":memory:") {
    const dbDir = path.dirname(VITACORE_DB_PATH);
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failValidation(
        "No se pudo crear el directorio de la base de datos.",
        msg,
        [
          `Verifica que la ruta sea válida y tengas permisos de escritura: ${dbDir}`,
          "O usa :memory: para DB en memoria: VITACORE_DB_PATH=:memory:",
        ]
      );
    }
  }

  let storage: ReturnType<typeof createStorageAdapter>;
  try {
    storage = createStorageAdapter(VITACORE_DB_PATH);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failValidation(
      "No se pudo inicializar SQLite (better-sqlite3).",
      msg,
      [
        "Instala dependencias: cd mcp-vitacore && npm install (better-sqlite3 requiere compilación nativa).",
        "En Docker: usa la imagen del proyecto (Dockerfile multi-stage ya incluye las deps).",
        "Si falta node-gyp/build tools en tu sistema, instálalos (ej. build-essential en Linux, Xcode CLI en macOS).",
      ]
    );
  }

  const gemini = createGeminiAdapter(GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT_MS);
  try {
    await gemini.generateSessionSummary([]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failValidation(
      "Gemini no responde (health check falló).",
      msg,
      [
        "Comprueba GEMINI_API_KEY y que la API de Google AI esté accesible.",
        "Verifica conectividad de red y que GEMINI_MODEL sea un modelo válido (ej. gemini-2.0-flash).",
        "Si usas proxy/VPN, asegúrate de que las peticiones a la API no estén bloqueadas.",
      ]
    );
  }

  await startServer({ storage, gemini });
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[MCP: ${MCP_NAME}]`, msg);
  process.exit(1);
});
