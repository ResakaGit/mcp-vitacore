/**
 * Configuración desde variables de entorno.
 * Default de DB: dentro del paquete (mcp-vitacore/data) para una sola fuente de verdad.
 * resolveDbPath es pura: recibe inputs explícitos (testeable).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");

const DEFAULT_DB_DIR = "data";
const DEFAULT_DB_FILE = "vitacore.sqlite";

/**
 * Resuelve la ruta de la DB. Pura: sin side effects.
 * @param rawEnv - valor de process.env.VITACORE_DB_PATH
 * @param packageRoot - raíz del paquete (mcp-vitacore)
 * @param cwd - process.cwd() para rutas relativas
 */
export function resolveDbPath(
  rawEnv: string | undefined,
  packageRoot: string,
  cwd: string
): string {
  const raw = (rawEnv ?? "").trim();
  if (raw === "") {
    return path.join(packageRoot, DEFAULT_DB_DIR, DEFAULT_DB_FILE);
  }
  if (path.isAbsolute(raw) || raw === ":memory:") return raw;
  return path.resolve(cwd, raw);
}

export type DbSource = { id: string; label: string; path: string };

/** Fuentes de DB disponibles para la UI (MCP + workspace). */
export function getDbSources(): DbSource[] {
  const mcpPath = path.join(PACKAGE_ROOT, DEFAULT_DB_DIR, DEFAULT_DB_FILE);
  const workspacePath = path.resolve(PACKAGE_ROOT, "..", "..", DEFAULT_DB_DIR, DEFAULT_DB_FILE);
  return [
    { id: "mcp", label: "MCP (paquete)", path: mcpPath },
    { id: "workspace", label: "Workspace", path: workspacePath },
  ];
}

export function getConfig(): {
  GEMINI_API_KEY: string;
  VITACORE_DB_PATH: string;
  GEMINI_MODEL: string;
  GEMINI_TIMEOUT_MS: number;
} {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
  const VITACORE_DB_PATH = resolveDbPath(
    process.env.VITACORE_DB_PATH,
    PACKAGE_ROOT,
    process.cwd()
  );
  const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? "60000") || 60000;
  return { GEMINI_API_KEY, VITACORE_DB_PATH, GEMINI_MODEL, GEMINI_TIMEOUT_MS };
}
