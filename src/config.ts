/**
 * Configuración desde variables de entorno.
 * Validación básica en index; aquí solo lectura tipada.
 */

export function getConfig(): {
  GEMINI_API_KEY: string;
  VITACORE_DB_PATH: string;
  GEMINI_MODEL: string;
  GEMINI_TIMEOUT_MS: number;
} {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
  const VITACORE_DB_PATH = process.env.VITACORE_DB_PATH ?? "./data/vitacore.sqlite";
  const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? "60000") || 60000;
  return { GEMINI_API_KEY, VITACORE_DB_PATH, GEMINI_MODEL, GEMINI_TIMEOUT_MS };
}
