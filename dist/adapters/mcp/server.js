import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { errorToToolResult, toolErrorResult } from "../../domain/errors.js";
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
function zodErrorToOneLine(error) {
    const messages = error.issues.map((i) => i.message).filter(Boolean);
    return messages.length > 0 ? messages.join("; ") : error.message;
}
function parseArgs(schema, args) {
    const parsed = schema.safeParse(args);
    if (parsed.success)
        return { ok: true, data: parsed.data };
    return { ok: false, error: toolErrorResult(zodErrorToOneLine(parsed.error)) };
}
function wrapToolHandler(handler) {
    return async (args) => {
        try {
            return await handler(args);
        }
        catch (error) {
            return errorToToolResult(error);
        }
    };
}
/**
 * Registra las tools de mcp-vitacore en un McpServer existente.
 * Usado por el orquestador o por startServer (standalone).
 */
export function registerVitacoreTools(server, ports) {
    const { storage, gemini } = ports;
    const closeSession = closeSessionOrchestrator({ storage, gemini });
    const evolveMacro = evolveMacroOrchestrator({ storage, gemini });
    server.registerTool("log_step", {
        description: "Registra un paso (acción e implicaciones) en la sesión indicada.",
        inputSchema: schemas.logStepSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.logStepSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return logStepApp.logStep(storage, parsed.data.session_id, parsed.data.action, parsed.data.implications);
    }));
    server.registerTool("close_session", {
        description: "Cierra la sesión: obtiene steps, genera resumen con Gemini y lo persiste.",
        inputSchema: schemas.closeSessionSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.closeSessionSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return closeSession(parsed.data.session_id);
    }));
    server.registerTool("hydrate_agent_context", {
        description: "Devuelve contexto de alta densidad: macro, sesiones recientes y debates abiertos (opcionalmente filtrado por role).",
        inputSchema: schemas.hydrateAgentContextSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.hydrateAgentContextSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return hydrateApp.hydrateAgentContext(storage, parsed.data.role);
    }));
    server.registerTool("trigger_macro_evolution", {
        description: "Evoluciona el Macro con las últimas sesiones y Gemini; guarda el resultado.",
        inputSchema: schemas.triggerMacroEvolutionSchema,
    }, wrapToolHandler(() => evolveMacro()));
    server.registerTool("ask_the_oracle", {
        description: "V3 Oráculo: consulta una duda técnica; el MCP busca contexto reciente y Gemini devuelve una directiva técnica curada (3 pasos).",
        inputSchema: schemas.askOracleSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.askOracleSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return askOracleApp.askOracle({ storage, gemini }, parsed.data.technical_doubt);
    }));
    server.registerTool("check_architectural_health", {
        description: "V3 Inquisidor: detecta paradojas entre el Macro y las sesiones recientes con Gemini, las persiste y devuelve un resumen.",
        inputSchema: schemas.checkArchitecturalHealthSchema,
    }, wrapToolHandler(async () => checkHealthApp.checkArchitecturalHealth({ storage, gemini })));
    server.registerTool("resolve_architectural_paradox", {
        description: "V3 Inquisidor: lee una paradoja por id, opcionalmente genera sugerencia de resolución con Gemini y la marca como resuelta.",
        inputSchema: schemas.resolveArchitecturalParadoxSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.resolveArchitecturalParadoxSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return resolveParadoxApp.resolveArchitecturalParadox({ storage, gemini }, parsed.data.paradox_id);
    }));
    server.registerTool("submit_for_background_review", {
        description: "V3 Consolidación: solicita revisión de la sesión; Gemini genera un plan de refactor desde la bitácora y se persiste.",
        inputSchema: schemas.submitForBackgroundReviewSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.submitForBackgroundReviewSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return submitReviewApp.submitForBackgroundReview({ storage, gemini }, parsed.data.session_id);
    }));
    server.registerTool("get_pending_refactors", {
        description: "V3 Consolidación: lista planes de refactor pendientes, opcionalmente filtrados por module_name.",
        inputSchema: schemas.getPendingRefactorsSchema,
    }, wrapToolHandler(async (args) => {
        const parsed = parseArgs(schemas.getPendingRefactorsSchema, args);
        if (!parsed.ok)
            return parsed.error;
        return getRefactorsApp.getPendingRefactors({ storage }, parsed.data.module_name);
    }));
}
const VITACORE_MCP_VERSION = "1.0.0";
/** Descriptor del módulo para el orquestador. */
export const vitacoreMcpModule = {
    name: "mcp-vitacore",
    version: VITACORE_MCP_VERSION,
    register: registerVitacoreTools,
};
export async function startServer(ports) {
    const server = new McpServer({ name: vitacoreMcpModule.name, version: vitacoreMcpModule.version }, { capabilities: { tools: { listChanged: false } } });
    registerVitacoreTools(server, ports);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
//# sourceMappingURL=server.js.map