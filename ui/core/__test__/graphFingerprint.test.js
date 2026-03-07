import { describe, it, expect } from "vitest";
import { graphFingerprint } from "../graphFingerprint.js";

describe("graphFingerprint", () => {
  it("returns stable string for empty graph", () => {
    const fp = graphFingerprint({ nodes: [], edges: [] });
    expect(typeof fp).toBe("string");
    expect(JSON.parse(fp)).toEqual({ ids: [], edgeCount: 0 });
  });

  it("returns stable string for single node", () => {
    const fp = graphFingerprint({
      nodes: [{ id: "n1", type: "session", label: "L1" }],
      edges: [],
    });
    expect(JSON.parse(fp)).toEqual({ ids: ["n1"], edgeCount: 0 });
  });

  it("returns stable string for nodes + edges (ids sorted)", () => {
    const fp = graphFingerprint({
      nodes: [
        { id: "n2", type: "step", label: "S2" },
        { id: "n1", type: "session", label: "L1" },
      ],
      edges: [{ from: "n1", to: "n2" }],
    });
    const parsed = JSON.parse(fp);
    expect(parsed.ids).toEqual(["n1", "n2"]);
    expect(parsed.edgeCount).toBe(1);
  });

  it("handles missing nodes/edges (null-safe)", () => {
    const fp = graphFingerprint({});
    expect(JSON.parse(fp)).toEqual({ ids: [], edgeCount: 0 });
  });
});
