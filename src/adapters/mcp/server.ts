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

  server.registerTool(
    "log_step",
    {
      description:
        "Registra un paso en la sesión para trazabilidad y recuperación posterior. Parámetros: session_id (ej. epic-xyz-YYYY-MM-DD), action (descripción breve), implications (resumen en 1–2 frases). Usar al finalizar cada subagente en flujos orquestados.",
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

  server.registerTool(
    "close_session",
    {
      description:
        "Cierra la sesión: agrega los steps, genera un resumen con Gemini y lo persiste en el macro. Parámetro: session_id. Usar al cierre del flujo para consolidar memoria de largo plazo.",
      inputSchema: schemas.closeSessionSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.closeSessionSchema, args);
      if (!parsed.ok) return parsed.error;
      return closeSession(parsed.data.session_id);
    })
  );

  server.registerTool(
    "hydrate_agent_context",
    {
      description:
        "Devuelve contexto de alta densidad para recuperar memoria del flujo: macro, sesiones recientes y debates abiertos. Parámetro opcional: role (filtrar por rol). Usar al iniciar un subagente para continuar con los últimos pasos. No usar al cierre del flujo; para cierre usar log_step o close_session.",
      inputSchema: schemas.hydrateAgentContextSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.hydrateAgentContextSchema, args);
      if (!parsed.ok) return parsed.error;
      return hydrateApp.hydrateAgentContext(storage, parsed.data.role);
    })
  );

  server.registerTool(
    "trigger_macro_evolution",
    {
      description:
        "Evoluciona el documento Macro integrando las últimas sesiones cerradas y genera un nuevo resumen con Gemini; persiste el resultado. Sin parámetros. Usar para refrescar la visión de alto nivel del proyecto.",
      inputSchema: schemas.triggerMacroEvolutionSchema,
    },
    wrapToolHandler(() => evolveMacro())
  );

  server.registerTool(
    "ask_the_oracle",
    {
      description:
        "Consulta una duda técnica al oráculo: el MCP combina contexto reciente (macro/sesiones) y Gemini devuelve una directiva técnica curada en 3 pasos. Parámetro: technical_doubt (texto de la duda).",
      inputSchema: schemas.askOracleSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.askOracleSchema, args);
      if (!parsed.ok) return parsed.error;
      return askOracleApp.askOracle({ storage, gemini }, parsed.data.technical_doubt);
    })
  );

  server.registerTool(
    "check_architectural_health",
    {
      description:
        "Analiza consistencia entre el Macro y las sesiones recientes; detecta paradojas arquitectónicas con Gemini, las persiste y devuelve un resumen. Sin parámetros. Usar en revisiones de salud del sistema.",
      inputSchema: schemas.checkArchitecturalHealthSchema,
    },
    wrapToolHandler(async () => checkHealthApp.checkArchitecturalHealth({ storage, gemini }))
  );

  server.registerTool(
    "resolve_architectural_paradox",
    {
      description:
        "Lee una paradoja arquitectónica por id. Parámetro: paradox_id (requerido). El MCP genera una sugerencia de resolución con Gemini y marca la paradoja como resuelta. Complementa check_architectural_health.",
      inputSchema: schemas.resolveArchitecturalParadoxSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.resolveArchitecturalParadoxSchema, args);
      if (!parsed.ok) return parsed.error;
      return resolveParadoxApp.resolveArchitecturalParadox({ storage, gemini }, parsed.data.paradox_id);
    })
  );

  server.registerTool(
    "submit_for_background_review",
    {
      description:
        "Solicita una revisión en background de una sesión: Gemini genera un plan de refactor a partir de la bitácora y se persiste. Parámetro: session_id. Usar para consolidar deuda técnica detectada en el flujo.",
      inputSchema: schemas.submitForBackgroundReviewSchema,
    },
    wrapToolHandler(async (args: unknown) => {
      const parsed = parseArgs(schemas.submitForBackgroundReviewSchema, args);
      if (!parsed.ok) return parsed.error;
      return submitReviewApp.submitForBackgroundReview({ storage, gemini }, parsed.data.session_id);
    })
  );

  server.registerTool(
    "get_pending_refactors",
    {
      description:
        "Lista los planes de refactor pendientes generados por submit_for_background_review. Parámetro opcional: module_name (filtrar por módulo). Usar para priorizar trabajo de consolidación.",
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
