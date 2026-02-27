import type { StoragePort } from "../ports/storage.js";
import type { ToolResult } from "../domain/errors.js";

export async function hydrateAgentContext(
  storage: StoragePort,
  role: string
): Promise<ToolResult> {
  const [macro, sessions, debates] = await Promise.all([
    storage.getMacro(),
    storage.getRecentSessions(3),
    storage.getOpenDebates(role),
  ]);
  const parts: string[] = [];
  if (macro) parts.push(`## Macro\n${macro}`);
  if (sessions.length > 0) {
    parts.push(
      "## Sesiones recientes\n" +
        sessions.map((s) => `- [${s.id}] ${s.summary}`).join("\n")
    );
  }
  if (debates.length > 0) {
    parts.push(
      "## Debates abiertos\n" +
        debates.map((d) => `- [${d.id}] ${d.title} (${d.role})${d.content ? `: ${d.content}` : ""}`).join("\n")
    );
  }
  const text = parts.length > 0 ? parts.join("\n\n") : "Sin contexto persistido (macro, sesiones ni debates).";
  return { content: [{ type: "text", text }] };
}
