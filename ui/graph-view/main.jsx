import { createRoot } from "react-dom/client";
import VitacoreGraphView from "./VitacoreGraphView.jsx";

/** @type {import('react-dom/client').Root | null} */
let root = null;

/**
 * Monta o actualiza la vista del grafo React Flow en el contenedor.
 * La primera vez vacía el contenedor y crea el root; las siguientes solo re-renderizan.
 * @param {HTMLElement} container - Contenedor DOM (ej. #graph).
 * @param {Object} props
 * @param {import('@xyflow/react').Node[]} props.nodes
 * @param {import('@xyflow/react').Edge[]} props.edges
 * @param {{ panX: number, panY: number, zoomLevel: number } | undefined} [props.viewState]
 * @param {(id: string) => void} [props.onNodeClick]
 * @param {(v: { panX: number, panY: number, zoomLevel: number }) => void} [props.onViewportChange]
 * @param {string | null} [props.selectedNodeId]
 * @param {(instance: import('@xyflow/react').ReactFlowInstance) => void} [props.onMount]
 */
function mountVitacoreGraph(container, props) {
  if (!container) return;
  if (!root) {
    container.innerHTML = "";
    root = createRoot(container);
  }
  root.render(
    <VitacoreGraphView
      nodes={props.nodes}
      edges={props.edges}
      viewState={props.viewState}
      selectedNodeId={props.selectedNodeId ?? null}
      onNodeClick={props.onNodeClick}
      onViewportChange={props.onViewportChange}
      onMount={props.onMount}
    />
  );
}

if (typeof window !== "undefined") {
  window.mountVitacoreGraph = mountVitacoreGraph;
}
