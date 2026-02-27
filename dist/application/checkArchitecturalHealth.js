/**
 * Caso de uso V3: check_architectural_health.
 * Obtiene macro y resúmenes recientes, detecta paradojas con Gemini y las persiste; devuelve resumen.
 */
import { randomUUID } from "node:crypto";
import { toolErrorResult } from "../domain/errors.js";
const RECENT_SESSIONS_FOR_HEALTH = 10;
export async function checkArchitecturalHealth(ports) {
    try {
        const [macro, recentSessions] = await Promise.all([
            ports.storage.getMacro(),
            ports.storage.getRecentSessions(RECENT_SESSIONS_FOR_HEALTH),
        ]);
        const summaries = recentSessions.map((s) => s.summary);
        const paradoxCandidates = await ports.gemini.detectParadoxes(macro, summaries);
        const sessionIds = recentSessions.map((s) => s.id).join(",");
        for (const p of paradoxCandidates) {
            await ports.storage.insertParadox({
                id: randomUUID(),
                description: p.description,
                analysis: p.analysis,
                relatedSessionIds: sessionIds,
            });
        }
        const openParadoxes = await ports.storage.getOpenParadoxes();
        const summary = paradoxCandidates.length === 0
            ? "Sin paradojas detectadas. Salud arquitectónica OK."
            : `Se detectaron ${paradoxCandidates.length} paradoja(s). Total abiertas: ${openParadoxes.length}. Usa resolve_architectural_paradox(paradox_id) para ver el análisis.`;
        return {
            content: [{ type: "text", text: summary }],
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return toolErrorResult(`check_architectural_health falló: ${msg}`);
    }
}
//# sourceMappingURL=checkArchitecturalHealth.js.map