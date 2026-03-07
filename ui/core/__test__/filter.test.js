import { describe, it, expect } from "vitest";
import { nodeMatchesFilter, applyFilters } from "../filter.js";

const defaultState = {
  types: [],
  dates: [],
  epics: [],
  text: "",
  connectedSubgraphOnly: false,
};

describe("nodeMatchesFilter", () => {
  it("returns true when state has no filters", () => {
    expect(
      nodeMatchesFilter(
        { id: "s1", type: "session", label: "L1" },
        defaultState
      )
    ).toBe(true);
  });

  it("filters by type when types is non-empty", () => {
    const node = { id: "s1", type: "session", label: "L1" };
    expect(
      nodeMatchesFilter(node, { ...defaultState, types: ["session"] })
    ).toBe(true);
    expect(
      nodeMatchesFilter(node, { ...defaultState, types: ["step"] })
    ).toBe(false);
  });

  it("filters by date from sessionId", () => {
    const node = {
      id: "session:07/03/2026-x",
      type: "session",
      label: "07/03/2026-x",
    };
    expect(
      nodeMatchesFilter(node, {
        ...defaultState,
        dates: ["07/03/2026"],
      })
    ).toBe(true);
    expect(
      nodeMatchesFilter(node, {
        ...defaultState,
        dates: ["08/03/2026"],
      })
    ).toBe(false);
  });

  it("filters by text (OR) in id/label/summary", () => {
    const node = {
      id: "step:1:0",
      type: "step",
      label: "Auth flow",
      summary: "Billing limits",
    };
    expect(
      nodeMatchesFilter(node, { ...defaultState, text: "auth" })
    ).toBe(true);
    expect(
      nodeMatchesFilter(node, { ...defaultState, text: "billing" })
    ).toBe(true);
    expect(
      nodeMatchesFilter(node, { ...defaultState, text: "nonexistent" })
    ).toBe(false);
  });
});

describe("applyFilters", () => {
  it("returns data unchanged when null or no nodes", () => {
    expect(applyFilters(null, defaultState)).toBe(null);
    expect(applyFilters({ nodes: [], edges: [] }, defaultState)).toEqual({
      nodes: [],
      edges: [],
    });
  });

  it("filters nodes and edges by type", () => {
    const data = {
      nodes: [
        { id: "a", type: "session", label: "A" },
        { id: "b", type: "step", label: "B", sessionId: "a" },
      ],
      edges: [{ from: "a", to: "b" }],
    };
    const result = applyFilters(data, {
      ...defaultState,
      types: ["session"],
    });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("a");
    expect(result.edges).toHaveLength(0);
  });

  it("with connectedSubgraphOnly and text, returns connected subgraph", () => {
    const data = {
      nodes: [
        { id: "a", type: "session", label: "auth" },
        { id: "b", type: "step", label: "B", sessionId: "a" },
        { id: "c", type: "session", label: "other" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "c", to: "a" },
      ],
    };
    const result = applyFilters(data, {
      ...defaultState,
      text: "auth",
      connectedSubgraphOnly: true,
    });
    expect(result.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
  });
});
