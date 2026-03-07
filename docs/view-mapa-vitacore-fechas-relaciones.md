# Vista Mapa Vitacore — Fechas y relaciones

## Objetivo

Permitir **entender mejor** y **moverse entre fechas y relaciones** en el mapa: ancla temporal clara, navegación por día y contexto de fecha en el detalle del nodo.

## Datos de entrada

- **Bitácora (agenda):** lista por día con formato "lun, 2 mar 2026" y conteos "X sesión(es), Y paso(s)". Orden cronológico descendente. Fuente: `/api/agenda` con `date_from` / `date_to`.
- **Grafo (mapa):** nodos macro, session, step, paradox, refactor; sesiones con `id` tipo `session:DD/MM/YYYY-...` o `session:epic-...`; steps con `sessionId` que puede contener fecha.
- **Análisis del grafo:** `analyzeGraph(fullGraphData)` devuelve `dates` (DD/MM/YYYY), `sessionCountByDate`, `stepCountByDate`, épicas y tipos.

## Diseño implementado

### 1. Tira de fechas (date strip)

- **Ubicación:** Encima del canvas del mapa (dentro de la página del mapa).
- **Contenido:** Un chip por cada fecha presente en el grafo actual, con:
  - Etiqueta legible: "lun, 2 mar 2026" (locale es-AR).
  - Conteos: "N sesión(es), M paso(s)" para ese día.
- **Interacción:**
  - **Click en un día:** Filtra el mapa a esa fecha (`filterState.dates = [date]`). Solo se muestran nodos de ese día; el chip queda resaltado.
  - **"Ver todos":** Quita el filtro de fecha (`filterState.dates = []`).
- **Fuente de datos:** Misma que el grafo (`state.fullGraphData`). No se llama a `/api/agenda` en el mapa; las fechas se derivan de los ids/sessionIds de los nodos (formato DD/MM/YYYY en prefijo). Así filtro y tira de fechas usan el mismo criterio.

### 2. Panel de detalle: línea Fecha

- Si el nodo seleccionado tiene una fecha asociada (sesión con id en DD/MM/YYYY, o step/refactor con `sessionId` en ese formato), se muestra una línea **Fecha: lun, 2 mar 2026**.
- Ayuda a situar el nodo en el tiempo sin salir del mapa.

### 3. Relaciones ya existentes

- **Sesión → pasos:** En el panel, al seleccionar una sesión se listan los steps; cada uno es clicable y centra/selecciona ese step.
- **Step → sesión:** "Parte de: [sesión]" con botón para ir a la sesión.
- **Conectados:** "Conectado a: N enlace(s)" (edges del grafo).
- **Centrar en mapa:** Botón para hacer fit al nodo seleccionado.

## Flujo de uso

1. Entrás al Mapa Vitacore; se cargan el grafo y la tira de fechas.
2. Elegís un día en la tira → el mapa muestra solo sesiones/steps de ese día; podés comparar días cambiando de chip.
3. Click en un nodo → panel con detalle, fecha (si aplica), pasos o "Parte de", y "Centrar en mapa".
4. "Ver todos" vuelve a mostrar todo el grafo sin filtro de fecha.

## Limitaciones y posibles mejoras

- **Formato de fecha en datos:** Si las sesiones usan solo formato épica (sin DD/MM/YYYY en el id), no tendrán fecha en la tira ni en el panel. Mejora posible: que el backend añada un campo `date` (YYYY-MM-DD) por sesión desde `created_at`, y el cliente use ese campo para filtrar y mostrar.
- **Agenda vs mapa:** La bitácora (agenda) y el mapa son vistas distintas; la tira del mapa solo muestra fechas que ya están en el grafo (p. ej. últimas 50 sesiones). Para ver "todos los días del último mes" en la tira habría que consumir `/api/agenda` en el mapa y alinear formato de filtro (p. ej. convertir YYYY-MM-DD → DD/MM/YYYY para `filterState.dates`).
- **Relaciones entre días:** Hoy no hay nodos "día" ni aristas entre días; las relaciones son sesión–step, sesión–paradox/refactor. Una ampliación futura podría ser agrupar visualmente por día (p. ej. contenedores por fecha) o un eje temporal en el layout.

## Archivos tocados

- `ui/core/analysis.js`: `sessionCountByDate`, `stepCountByDate`, `extractDateFromNode`.
- `ui/components/dateStrip.js`: componente de la tira de fechas.
- `ui/components/nodeDetailPanel.js`: línea "Fecha" usando `extractDateFromNode` y formato locale.
- `ui/app.js`: contenedor de la tira, `updateDateStrip()`, integración con filtros.
- `ui/styles.css`: estilos `.map-date-strip`, `.map-date-chip`, `.map-date-chip--active`.
