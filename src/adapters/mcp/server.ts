import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { errorToToolResult, toolErrorResult, type ToolErrorResult, type ToolResult } from "../../domain/errors.js";
import type { StoragePort } from "../../ports/storage.js";
import type { GeminiPort } from "../../ports/gemini.js";
import * as logStepApp from "../../application/logStep.js";
import { closeSessionOrchestrator } from "../../application/closeSession.js";
import * as hydrateApp from "../../application/hydrateAgentContext.js";
import { evolveMacroOrchestrator } from "../../application/evolveMacro.js";
import * as askOracleApp from "../../application/askOracle.js";
import * as checkHealthApp from "../../application/checkArchitecturalHealth.js";
import * as resolveParadoxApp from "../../application/resolveArchitecturalParadox.js";
import * as submitReviewApp from "../../application/submitForBackgroundReview.js";
import * as getRefactorsApp from "../../application/getPendingRefactors.js";
import * as schemas from "./schemas.js";

function zodErrorToOneLine(error: z.ZodError): string {
  const messages = error.issues.map((i) => i.message).filter(Boolean);
  return messages.length > 0 ? messages.join("; ") : error.message;
}

function parseArgs<T>(schema: z.ZodType<T>, args: unknown): { ok: true; data: T } | { ok: false; error: ToolErrorResult } {
  const parsed = schema.safeParse(args);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, error: toolErrorResult(zodErrorToOneLine(parsed.error)) };
}

const DESCRIPTION_DOC = "TOOL_DESCRIPTION_CONVENTION.md";

function requireToolDescription(
  name: string,
  config: { description?: string; inputSchema: unknown }
): void {
  if (typeof config.description !== "string" || !config.description.trim()) {
    throw new Error(`Tool ${name}: description is required (${DESCRIPTION_DOC}).`);
  }
}

function wrapToolHandler<TArgs, TResult extends ToolResult>(
  handler: (args: TArgs) => TResult | Promise<TResult>
) {
  return async (args: TArgs): Promise<TResult> => {
    try {
      return await handler(args);
    } catch (error) {
      return errorToToolResult(error) as unknown as TResult;
    }
  };
}

export interface ServerPorts {
  storage: StoragePort;
  gemini: GeminiPort;
}

/**
 * Registra las tools de mcp-vitacore en un McpServer existente.
 * Usado por el orquestador o por startServer (standalone).
 */
export function registerVitacoreTools(server: McpServer, ports: ServerPorts): void {
  const { storage, gemini } = ports;
  const closeSession = closeSessionOrchestrator({ storage, gemini });
  const evolveMacro = evolveMacroOrchestrator({ storage, gemini });

  function reg(name: string, config: { description: string; inputSchema: unknown }, handler: (args: unknown) => Promise<ToolResult>): void {
    requireToolDescription(name, config);
    server.registerTool(name, config as Parameters<McpServer["registerTool"]>[1], handler);
  }
  reg(
    "log_step",
    {
      description:
        "Logs a step in the session for traceability and later recovery. Args: session_id (e.g. epic-xyz-YYYY-MM-DD), action (short label), implications (1–2 sentence summary). Use when each subagent finishes in orchestrated flows.",
      inputSchema: schemas.logStepSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.logStepSchema, args);
      if (!parsed.ok) return parsed.error;
      return logStepApp.logStep(
        storage,
        parsed.data.session_id,
        parsed.data.action,
        parsed.data.implications
      );
    })
  );

  reg(
    "close_session",
    {
      description:
        "Closes the session: aggregates steps, generates a summary with Gemini and persists it to the macro. Args: session_id (required). Use at flow end to consolidate long-term memory. Do not use for per-step logging; use log_step instead.",
      inputSchema: schemas.closeSessionSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.closeSessionSchema, args);
      if (!parsed.ok) return parsed.error;
      return closeSession(parsed.data.session_id);
    })
  );

  reg(
    "hydrate_agent_context",
    {
      description:
        "Returns high-density context to recover flow memory: macro, recent sessions, open debates. Args: role (optional, filter by role). Use when starting a subagent to continue from the last steps. Do not use at flow end; use log_step or close_session for closure.",
      inputSchema: schemas.hydrateAgentContextSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.hydrateAgentContextSchema, args);
      if (!parsed.ok) return parsed.error;
      return hydrateApp.hydrateAgentContext(storage, parsed.data.role);
    })
  );

  reg(
    "trigger_macro_evolution",
    {
      description:
        "Evolves the Macro document by merging the latest closed sessions and generates a new summary with Gemini; persists the result. No args. Use to refresh the project's high-level view.",
      inputSchema: schemas.triggerMacroEvolutionSchema,
    },
    wrapToolHandler(() => evolveMacro())
  );

  reg(
    "ask_the_oracle",
    {
      description:
        "Asks the oracle a technical question. MCP merges recent context (macro/sessions) and Gemini returns a curated 3-step directive. Args: technical_doubt (required, string).",
      inputSchema: schemas.askOracleSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.askOracleSchema, args);
      if (!parsed.ok) return parsed.error;
      return askOracleApp.askOracle({ storage, gemini }, parsed.data.technical_doubt);
    })
  );

  reg(
    "check_architectural_health",
    {
      description:
        "Checks consistency between the Macro and recent sessions; detects architectural paradoxes with Gemini, persists them and returns a summary. No args. Use for system health reviews.",
      inputSchema: schemas.checkArchitecturalHealthSchema,
    },
    wrapToolHandler(async () => checkHealthApp.checkArchitecturalHealth({ storage, gemini }))
  );

  reg(
    "resolve_architectural_paradox",
    {
      description:
        "Reads an architectural paradox by id; MCP generates a resolution suggestion with Gemini and marks it resolved. Args: paradox_id (required). Use after check_architectural_health to resolve reported paradoxes.",
      inputSchema: schemas.resolveArchitecturalParadoxSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.resolveArchitecturalParadoxSchema, args);
      if (!parsed.ok) return parsed.error;
      return resolveParadoxApp.resolveArchitecturalParadox({ storage, gemini }, parsed.data.paradox_id);
    })
  );

  reg(
    "submit_for_background_review",
    {
      description:
        "Submits a session for background review: Gemini produces a refactor plan from the log and it is persisted. Args: session_id (required). Use to consolidate technical debt detected in the flow.",
      inputSchema: schemas.submitForBackgroundReviewSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.submitForBackgroundReviewSchema, args);
      if (!parsed.ok) return parsed.error;
      return submitReviewApp.submitForBackgroundReview({ storage, gemini }, parsed.data.session_id);
    })
  );

  reg(
    "get_pending_refactors",
    {
      description:
        "Lists pending refactor plans from submit_for_background_review. Args: module_name (optional, filter by module). Use to prioritize consolidation work.",
      inputSchema: schemas.getPendingRefactorsSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.getPendingRefactorsSchema, args);
      if (!parsed.ok) return parsed.error;
      return getRefactorsApp.getPendingRefactors({ storage }, parsed.data.module_name);
    })
  );
}

const VITACORE_MCP_VERSION = "1.0.0";

/** Descriptor del módulo para el orquestador. */
export const vitacoreMcpModule = {
  name: "mcp-vitacore",
  version: VITACORE_MCP_VERSION,
  register: registerVitacoreTools,
};

export async function startServer(ports: ServerPorts): Promise<void> {
  const server = new McpServer(
    { name: vitacoreMcpModule.name, version: vitacoreMcpModule.version },
    { capabilities: { tools: { listChanged: false } } }
  );
  registerVitacoreTools(server, ports);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
