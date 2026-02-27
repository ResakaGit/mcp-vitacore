/**
 * Caso de uso V3: resolve_architectural_paradox.
 * Lee la paradoja por id, opcionalmente sugiere resolución y marca como resuelta; devuelve contenido al agente.
 */
import { toolErrorResult } from "../domain/errors.js";
export async function resolveArchitecturalParadox(ports, paradoxId) {
    if (typeof paradoxId !== "string" || paradoxId.trim() === "") {
        return toolErrorResult("paradox_id es requerido.");
    }
    try {
        const paradox = await ports.storage.getParadox(paradoxId.trim());
        if (!paradox) {
            return toolErrorResult(`Paradoja no encontrada: ${paradoxId}`);
        }
        if (paradox.status === "open" && paradox.analysis) {
            const resolutionSuggestion = await ports.gemini.answerFromContext(`Sugiere en 2-3 oraciones cómo resolver esta paradoja arquitectónica: ${paradox.description}. Análisis: ${paradox.analysis}`, [{ action: paradox.description, implications: paradox.analysis }]);
            await ports.storage.resolveParadox(paradoxId.trim(), resolutionSuggestion);
        }
        else if (paradox.status === "open") {
            await ports.storage.resolveParadox(paradoxId.trim());
        }
        const updated = await ports.storage.getParadox(paradoxId.trim());
        const row = updated ?? paradox;
        const text = [
            `# Paradoja: ${row.description}`,
            row.analysis ? `## Análisis\n${row.analysis}` : "",
            row.resolution_suggestion ? `## Sugerencia de resolución\n${row.resolution_suggestion}` : "",
        ]
            .filter(Boolean)
            .join("\n\n");
        return {
            content: [{ type: "text", text }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return toolErrorResult(`resolve_architectural_paradox falló: ${msg}`);
    }
}
//# sourceMappingURL=resolveArchitecturalParadox.js.map