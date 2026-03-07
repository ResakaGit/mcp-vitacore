import { describe, it, expect } from "vitest";
import { analyzeGraph } from "../analysis.js";

describe("analyzeGraph", () => {
  it("returns empty dates/epics/types and count maps for empty nodes", () => {
    const result = analyzeGraph({ nodes: [], edges: [] });
    expect(result.dates).toEqual([]);
    expect(result.epics).toEqual([]);
    expect(result.types).toEqual([]);
    expect(result.typeCounts).toEqual({});
    expect(result.sessionCountByDate).toEqual({});
    expect(result.stepCountByDate).toEqual({});
  });

  it("extracts typeCounts", () => {
    const result = analyzeGraph({
      nodes: [
        { id: "s1", type: "session", label: "S1" },
        { id: "s2", type: "session", label: "S2" },
        { id: "step:1:0", type: "step", label: "Step", sessionId: "s1" },
      ],
      edges: [],
    });
    expect(result.types.sort()).toEqual(["session", "step"]);
    expect(result.typeCounts).toEqual({ session: 2, step: 1 });
  });

  it("extracts dates from session ids", () => {
    const result = analyzeGraph({
      nodes: [
        {
          id: "session:07/03/2026-auth-billing",
          type: "session",
          label: "07/03/2026-auth-billing",
        },
      ],
      edges: [],
    });
    expect(result.dates).toContain("07/03/2026");
    // epic only extracted when session id starts with pattern [a-z]+-[a-z]+
  });

  it("extracts epics when session id starts with epic pattern", () => {
    const result = analyzeGraph({
      nodes: [
        {
          id: "session:auth-billing-07/03/2026",
          type: "session",
          label: "auth-billing-07/03/2026",
        },
      ],
      edges: [],
    });
    expect(result.epics).toContain("auth-billing");
  });

  it("extracts date from step sessionId", () => {
    const result = analyzeGraph({
      nodes: [
        {
          id: "step:s1:0",
          type: "step",
          label: "X",
          sessionId: "08/03/2026-something",
        },
      ],
      edges: [],
    });
    expect(result.dates).toContain("08/03/2026");
  });

  it("returns sessionCountByDate and stepCountByDate", () => {
    const result = analyzeGraph({
      nodes: [
        { id: "session:07/03/2026-a", type: "session", label: "A" },
        { id: "session:07/03/2026-b", type: "session", label: "B" },
        { id: "step:07/03/2026-a:0", type: "step", label: "S1", sessionId: "07/03/2026-a" },
        { id: "step:07/03/2026-a:1", type: "step", label: "S2", sessionId: "07/03/2026-a" },
      ],
      edges: [],
    });
    expect(result.sessionCountByDate["07/03/2026"]).toBe(2);
    expect(result.stepCountByDate["07/03/2026"]).toBe(2);
  });
});
