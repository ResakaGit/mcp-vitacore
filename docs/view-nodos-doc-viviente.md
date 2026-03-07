# Vista de nodos Vitacore — "Doc viviente"

## Análisis de datos

- **Macro:** 1 nodo, centro; `summary` = resumen del macro.
- **Sesiones:** `id` tipo `epic-slug-YYYY-MM-DD` o similar; `label = id`, `summary` = resumen de la sesión. Cada sesión tiene N **steps**.
- **Steps:** `step:sessionId:i`; `label` = acción (truncada 40 chars), `summary` = implications; `sessionId` los agrupa.
- **Paradox / Refactor:** nodos de segundo nivel; enlazados a sesiones por `relatedSessionIds` o `session_id`.

Layout actual: "cerebro" — macro centro, anillo sesiones (r=120), steps en arco alrededor de su sesión (r=200), paradox/refactor anillo exterior (r=260). Canvas fijo 640×640.

## Problemas actuales

1. **Labels ilegibles:** Nodo muestra `label.slice(0, 6)` → sesiones largas se ven como "epic-m".
2. **Un solo estilo de nodo:** Todos círculos; cuesta distinguir sesión vs step vs paradox.
3. **Panel plano:** Solo título + tipo + summary; no hay jerarquía "sesión → pasos" ni forma de "ir a la sesión".
4. **Navegación limitada:** Pan/zoom y fit view; no hay "centrar en este nodo" o "zoom a esta sesión".
5. **Sin sensación de doc:** No se lee como documento (bloques sesión, ítems paso, referencias paradox/refactor).

## Diseño objetivo — "Doc viviente"

### 1. Nodos por tipo (claridad visual)

| Tipo     | Forma / contenedor | Contenido visible |
|----------|--------------------|--------------------|
| macro    | Círculo acentuado  | "Macro" o icono; tooltip = summary |
| session  | **Rectángulo/card** con borde | Título corto: épica + fecha (parsear id); subtítulo opcional |
| step     | Círculo pequeño o pastilla | Primeras palabras de `label` (acción); tooltip completo |
| paradox  | Rombo/badge       | Label corto; color de alerta |
| refactor | Rombo/badge       | Label corto; color warning |

Así se distingue de un vistazo: sesiones = bloques, steps = ítems, paradox/refactor = anotaciones.

### 2. Labels legibles

- **Session:** Mostrar "épica" + fecha si el id sigue `epic-xxx-YYYY-MM-DD`; si no, primeras 2–3 palabras del id (ej. `epic-migrar_iniciativa • 2026-03-02`).
- **Step:** `label` hasta 25–30 caracteres, con ellipsis; tooltip con acción + implications.
- **Macro:** "Macro"; tooltip = summary.
- Nodo custom recibe `data.labelDisplay` (opcional) desde el adapter para no duplicar lógica de formateo en el componente.

### 3. Panel de detalle enriquecido

- **Si nodo = session:** Título (label), summary; **lista de steps** de esa sesión (títulos clicables que seleccionan el step); botón "Centrar en mapa" (zoom/fit a ese nodo).
- **Si nodo = step:** Título (acción), implications; "Parte de: [nombre sesión]" con botón "Ir a sesión" (selecciona la sesión y opcionalmente centra).
- **Si nodo = macro:** Resumen; "Sesiones recientes" con enlaces a sesiones si queremos.
- **Breadcrumb:** Macro > Sesión X > Step Y (cuando aplica), para contexto.

### 4. Navegación tipo mapa/doc

- **Centrar en nodo:** Al hacer click en un nodo, además de abrir el panel, opción de "fit view" a ese nodo + margen (React Flow `fitBounds` con el nodo seleccionado).
- **Persistencia:** Viewport ya se persiste en localStorage; mantener.
- **Minimap + Controls:** Ya están; conservar.

### 5. Agrupación visual (fase opcional)

- React Flow permite nodos con `parentId`. Podríamos crear un "nodo contenedor" por sesión (invisible o con borde) y asignar `parentId` a los steps. Layout tendría que posicionar steps dentro del bounds del padre. Aumenta complejidad; se puede dejar para una segunda iteración.

## Orden de implementación

1. **Nodos por tipo + labels legibles** — Adapter añade `labelDisplay` por tipo; VitacoreNode (o varios node types) con formas/estilos por tipo y label largo.
2. **Panel enriquecido** — Lista de steps en panel cuando nodo = session; "Parte de: sesión" + "Ir a sesión" cuando nodo = step; botón "Centrar en mapa".
3. **Centrar en nodo** — Callback desde app a React Flow: al seleccionar nodo, llamar `fitView` con bounds de ese nodo (vía ref/callback desde el componente React).

Implementación concreta en el código sigue en los archivos de la UI (graph-view, nodeDetailPanel, app.js).
