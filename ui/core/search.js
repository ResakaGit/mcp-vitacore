/**
 * Extracción de términos de búsqueda (OR): split por coma o espacios, trim, sin vacíos.
 * Puro: sin side effects.
 *
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function parseSearchTerms(text) {
  if (text == null || typeof text !== "string") return [];
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
