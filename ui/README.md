# UI Mapas Vitacore

Visualización del estado de vitacore (macro, sesiones, pasos, paradojas, refactors) como grafo de nodos conectados.

## Por qué no hay datos

Los datos los escribe el **MCP vitacore** cuando en Cursor (u otro cliente) se usan tools como `log_step`, `close_session`, `check_architectural_health`, `submit_for_background_review`, etc. Si nunca se invocaron, la DB está vacía. La UI usa por defecto la misma DB que el MCP: `{workspace}/data/vitacore.sqlite` (al arrancar el servidor se imprime la ruta en consola).

## Cómo ejecutar

Desde la raíz de `mcp-vitacore`:

```bash
npm run serve:ui
```

Abre `http://localhost:3780` (o el puerto indicado por `UI_PORT`).

## Contrato API: GET /api/graph

Respuesta JSON:

- **nodes**: array de `{ id, type, label, summary?, sessionId?, relatedSessionIds? }`
  - `type`: `"macro" | "session" | "step" | "paradox" | "refactor" | "debate"`
  - `id`: estable (ej. `macro`, `session:epic-1`, `step:epic-1:0`, `paradox:uuid`, `refactor:uuid`)
- **edges**: array de `{ from, to }` (ids de nodos)

Ids de nodos: `macro`; `session:<session_id>`; `step:<session_id>:<index>`; `paradox:<id>`; `refactor:<id>`; `debate:<id>`.

## Filtros (modal Filtros)

- **Tipo, Fecha, Épica:** checkboxes como antes.
- **Buscar en id/label/resumen:** varios términos separados por coma o espacio = **OR** (ej. `auth, billing, limits`).
- **Solo subgrafo conectado al texto:** si está activo y hay búsqueda por texto, se muestra únicamente el subgrafo conexo que contiene los nodos que matchean (árbol conectado alrededor del query). Útil para ver solo la rama relacionada con un tema.
