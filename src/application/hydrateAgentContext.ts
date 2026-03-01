import type { StoragePort } from "../ports/storage.js";
import type { ToolResult } from "../domain/errors.js";

const RECENT_STEPS_LIMIT = 10;

export async function hydrateAgentContext(
  storage: StoragePort,
  agentKey: string
): Promise<ToolResult> {
  const [macro, sessions, debates, steps] = await Promise.all([
    storage.getMacro(),
    storage.getRecentSessions(3),
    storage.getOpenDebates(agentKey),
    storage.getRecentStepsByAgentKey(agentKey, RECENT_STEPS_LIMIT),
  ]);
  const parts: string[] = [];
  if (macro) parts.push(`## Macro\n${macro}`);
  if (sessions.length > 0) {
    parts.push(
      "## Sesiones recientes\n" +
        sessions.map((s) => `- [${s.id}] ${s.summary}`).join("\n")
    );
  }
  if (steps.length > 0) {
    parts.push(
      "## Steps recientes (agent_key)\n" +
        steps
          .map(
            (st) =>
              `- ${st.created_at} [${st.agent_key}] ${st.action}${st.implications ? `: ${st.implications}` : ""}`
          )
          .join("\n")
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
