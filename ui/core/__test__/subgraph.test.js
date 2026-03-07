import { describe, it, expect } from "vitest";
import { extractConnectedSubgraph } from "../subgraph.js";

const node = (id, type = "session") => ({ id, type, label: id });

describe("extractConnectedSubgraph", () => {
  it("returns empty nodes and edges for empty seedIds", () => {
    const result = extractConnectedSubgraph(
      [node("a")],
      [{ from: "a", to: "b" }],
      new Set()
    );
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("returns single node and no edges for isolated node", () => {
    const nodes = [node("a")];
    const result = extractConnectedSubgraph(nodes, [], new Set(["a"]));
    expect(result.nodes).toEqual(nodes);
    expect(result.edges).toEqual([]);
  });

  it("returns connected component for one seed in connected graph", () => {
    const nodes = [
      node("a"),
      node("b"),
      node("c"),
    ];
    const edges = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    const result = extractConnectedSubgraph(
      nodes,
      edges,
      new Set(["a"])
    );
    expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    expect(result.edges).toHaveLength(2);
  });

  it("returns only component containing seed when two components exist", () => {
    const nodes = [
      node("a"),
      node("b"),
      node("c"),
      node("d"),
    ];
    const edges = [
      { from: "a", to: "b" },
      { from: "c", to: "d" },
    ];
    const result = extractConnectedSubgraph(
      nodes,
      edges,
      new Set(["a"])
    );
    expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(result.edges).toEqual([{ from: "a", to: "b" }]);
  });
});
