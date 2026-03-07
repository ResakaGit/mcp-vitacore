import { useCallback, useMemo } from "react";
import { ReactFlow, Controls, MiniMap, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import VitacoreNode from "./VitacoreNode.jsx";

const NODE_TYPES = { vitacoreNode: VitacoreNode };

/** @param {{ panX?: number, panY?: number, zoomLevel?: number } | null} viewState */
function viewStateToViewport(viewState) {
  if (!viewState) return { x: 0, y: 0, zoom: 1 };
  return {
    x: viewState.panX ?? 0,
    y: viewState.panY ?? 0,
    zoom: viewState.zoomLevel ?? 1,
  };
}

/** No-op: grafo es solo lectura (posiciones desde layout). */
function noop() {}

export default function VitacoreGraphView({
  nodes,
  edges,
  viewState,
  selectedNodeId,
  onNodeClick,
  onViewportChange,
  onMount,
}) {
  const defaultViewport = viewStateToViewport(viewState);

  const nodesWithSelection = useMemo(
    () =>
      (nodes || []).map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  const handleNodeClick = useCallback(
    (_ev, node) => onNodeClick?.(node.id),
    [onNodeClick]
  );

  const handleMoveEnd = useCallback(
    (_ev, viewport) =>
      onViewportChange?.({
        panX: viewport.x,
        panY: viewport.y,
        zoomLevel: viewport.zoom,
      }),
    [onViewportChange]
  );

  const handleInit = useCallback(
    (instance) => onMount?.(instance),
    [onMount]
  );

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 400 }}>
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edges}
        onInit={handleInit}
        onNodesChange={noop}
        onEdgesChange={noop}
        onNodeClick={handleNodeClick}
        defaultViewport={defaultViewport}
        onMoveEnd={handleMoveEnd}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
