# mcp-vitacore

MCP Context Project Vitacore: consolidación de memoria de sesiones con **Gemini** (resúmenes y evolución del Macro) y **SQLite** (persistencia).

## Variables de entorno

| Variable | Obligatoria | Default | Descripción |
|----------|-------------|---------|-------------|
| `GEMINI_API_KEY` | Sí | — | API Key de Google AI (Gemini). |
| `VITACORE_DB_PATH` | No | `./data/vitacore.sqlite` | Ruta del archivo SQLite. |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Modelo Gemini (ej. `gemini-2.0-flash`). |
| `GEMINI_TIMEOUT_MS` | No | `60000` | Timeout en ms para llamadas a Gemini (AbortSignal). |

Para Vertex AI u otra base URL, consultar la documentación de `@google/genai` (p. ej. `GEMINI_BASE_URL` si el SDK lo soporta).

## Arranque

- **Local:** `npm run build && npm start` (o `npm run dev`). Requiere `GEMINI_API_KEY` en el entorno.
- **Docker:** `docker compose up --build`. Pasar `GEMINI_API_KEY` vía `.env` o `env`. El volumen `vitacore_data` persiste la DB.

Al iniciar se valida que `GEMINI_API_KEY` esté definida y se hace una llamada mínima a Gemini (`generateSessionSummary([])`). Si falla, se escribe en stderr y `process.exit(1)`.

## Flujo de datos

- **Bottom-up:** Tools MCP → Application (logStep, closeSession, hydrateAgentContext, evolveMacro) → Ports (StoragePort, GeminiPort) → Adapters (SQLite, Gemini).
- **Top-down:** El agente/orquestador llama a las tools; la aplicación orquesta storage + gemini y devuelve `ToolResult`; los adaptadores realizan I/O.

## Tools MCP

### Base (V1/V2)

- **log_step** — `session_id`, `action`, `implications`: registra un paso en la sesión.
- **close_session** — `session_id`: obtiene steps, genera resumen con Gemini y persiste la sesión. Idempotencia: si la sesión ya está cerrada, devuelve "Sesión ya cerrada." sin llamar a Gemini.
- **hydrate_agent_context** — `role` (opcional): devuelve macro + últimas 3 sesiones + debates abiertos (filtro por role).
- **trigger_macro_evolution** — sin args: evoluciona el Macro con las últimas 10 sesiones y Gemini y guarda.

### V3 — Subconsciente Activo

El modelo de fondo (Gemini) actúa como curador y corrector: el agente en Cursor (Sistema 1) escribe código; el MCP con Gemini (Sistema 2) sintetiza, detecta contradicciones y propone refactors. SQLite es el tejido donde ambos se comunican.

- **ask_the_oracle** — `technical_doubt`: consulta una duda técnica. El MCP toma los últimos N steps (contexto reciente), los envía a Gemini y devuelve una directiva técnica curada (3 pasos). El agente nunca lee bitácora cruda para esa duda.
- **check_architectural_health** — sin args: compara el Macro con los resúmenes de sesiones recientes vía Gemini; detecta paradojas (contradicciones), las persiste en la tabla `paradoxes` y devuelve un resumen. Si hay paradojas, el agente puede usar `resolve_architectural_paradox` para ver el análisis.
- **resolve_architectural_paradox** — `paradox_id`: lee la paradoja por id, opcionalmente pide a Gemini una sugerencia de resolución, la marca como resuelta y devuelve descripción, análisis y sugerencia al agente.
- **submit_for_background_review** — `session_id`: toma los steps de esa sesión y el Macro, llama a Gemini para generar un plan de refactor desde la bitácora (deuda técnica, extracciones sugeridas) y lo persiste en `refactor_plans`. No requiere acceso al código; la revisión es sobre la bitácora.
- **get_pending_refactors** — `module_name` (opcional): lista los planes de refactor pendientes; si se pasa `module_name`, filtra por ese módulo.

## Uso con Cursor

El MCP se consume por **stdio**. En el host, ejecutar el binario y configurar en `.cursor/mcp.json` el comando que arranca este servidor.

### Cursor: uso standalone (repo por separado)

Si este repo se usa solo (sin orquestador):

```bash
npm install && npm run build
```

En `.cursor/mcp.json` del workspace:

```json
"mcp-vitacore": {
  "command": "node",
  "args": ["mcp-vitacore/dist/index.js"],
  "env": {
    "GEMINI_API_KEY": "TU_API_KEY",
    "VITACORE_DB_PATH": "./data/vitacore.sqlite"
  }
}
```

Ajustá `args` si el MCP está en otra ruta. Reiniciar Cursor tras cambiar `mcp.json`.
