# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-01

### Added

- **agent_key en log_step:** argumento opcional `agent_key` (clase o clase-variante, ej. `paladin`, `paladin-enojado`, `paladin-1`). La fecha la persiste el MCP (`created_at`); el orquestador ya no envía fecha en la key.
- **hydrate_agent_context:** parámetro `role` renombrado a `agent_key`. Incluye sección "Steps recientes (agent_key)" filtrada por clave: búsqueda por clase (prefix) o por key completa (exact).
- **Storage:** columna `steps.agent_key`, migración idempotente (ALTER TABLE), índice `idx_steps_agent_key`. `getRecentStepsByAgentKey(agentKey, limit)` con semántica prefix (clase sin guión) vs exact (clase-variante o clase-N).

### Changed

- **Protocolo orquestador:** `agent_key` pasa a ser solo clase o variante; referencias a `MM/DD/YYYY-<clase>` actualizadas en docs y rules de TryMellon.

## [1.0.1] - 2026-02-28

### Changed

- **serve-ui:** updates to serve-ui and UI assets (app, styles, index).
- Rebuild dist (MCP server, serve-ui).

## [1.0.0] - (previous)

- MCP Vitacore: consolidación de memoria con Gemini + SQLite.
