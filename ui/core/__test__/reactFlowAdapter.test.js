import { describe, it, expect } from "vitest";
import { graphDataToReactFlow } from "../reactFlowAdapter.js";

describe("graphDataToReactFlow", () => {
  it("returns empty nodes and edges for empty graph", () => {
    const result = graphDataToReactFlow({ nodes: [], edges: [] });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("returns RF nodes with id, position, data, type vitacoreNode", () => {
    const graphData = {
      nodes: [
        { id: "macro", type: "macro", label: "Macro" },
        { id: "session:1", type: "session", label: "s1" },
      ],
      edges: [{ from: "macro", to: "session:1" }],
    };
    const result = graphDataToReactFlow(graphData);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].id).toBe("macro");
    expect(result.nodes[0].position).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
    expect(result.nodes[0].data).toEqual(expect.objectContaining({ id: "macro", type: "macro", label: "Macro", radius: 36 }));
    expect(result.nodes[0].type).toBe("vitacoreNode");
  });

  it("returns RF edges with source and target", () => {
    const graphData = {
      nodes: [
        { id: "a", type: "step", label: "A" },
        { id: "b", type: "step", label: "B" },
      ],
      edges: [{ from: "a", to: "b" }],
    };
    const result = graphDataToReactFlow(graphData);
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
    const edge = result.edges.find((e) => e.source === "a" && e.target === "b");
    expect(edge).toBeDefined();
    expect(edge.id).toMatch(/^e-/);
  });

  it("infers type from id when type is missing so shapes and layout apply", () => {
    const graphData = {
      nodes: [
        { id: "macro", label: "Macro" },
        { id: "session:epic-a-2026-03-01", label: "s1" },
        { id: "step:epic-a-2026-03-01:0", label: "Step one", sessionId: "epic-a-2026-03-01" },
      ],
      edges: [
        { from: "macro", to: "session:epic-a-2026-03-01" },
        { from: "session:epic-a-2026-03-01", to: "step:epic-a-2026-03-01:0" },
      ],
    };
    const result = graphDataToReactFlow(graphData);
    expect(result.nodes[0].data.type).toBe("macro");
    expect(result.nodes[1].data.type).toBe("session");
    expect(result.nodes[2].data.type).toBe("step");
    expect(result.nodes[0].position).not.toEqual({ x: 0, y: 0 });
    expect(result.nodes[1].position).not.toEqual({ x: 0, y: 0 });
    expect(result.nodes[2].position).not.toEqual({ x: 0, y: 0 });
  });
});
