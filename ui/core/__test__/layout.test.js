import { describe, it, expect } from "vitest";
import {
  getNodeRadius,
  polarToXY,
  computeLayout,
  nucleusKeys,
} from "../layout.js";
import { CENTER } from "../constants.js";

describe("getNodeRadius", () => {
  it("returns known radius for each type", () => {
    expect(getNodeRadius("macro")).toBe(36);
    expect(getNodeRadius("session")).toBe(22);
    expect(getNodeRadius("step")).toBe(14);
    expect(getNodeRadius("paradox")).toBe(18);
    expect(getNodeRadius("refactor")).toBe(18);
  });

  it("returns default 14 for unknown type", () => {
    expect(getNodeRadius("unknown")).toBe(14);
  });
});

describe("polarToXY", () => {
  it("places origin at CENTER", () => {
    expect(polarToXY(0, 0)).toEqual({ x: CENTER, y: CENTER });
  });

  it("radius and angle produce correct coords", () => {
    const p = polarToXY(100, 0);
    expect(p.x).toBeCloseTo(CENTER + 100);
    expect(p.y).toBeCloseTo(CENTER);
  });
});

describe("computeLayout", () => {
  it("returns byId, width, height", () => {
    const result = computeLayout([], []);
    expect(result.byId).toBeInstanceOf(Map);
    expect(result.width).toBe(640);
    expect(result.height).toBe(640);
  });

  it("places macro at center", () => {
    const nodes = [{ id: "macro", type: "macro", label: "Macro" }];
    const result = computeLayout(nodes, []);
    const m = result.byId.get("macro");
    expect(m).toBeDefined();
    expect(m.x).toBe(CENTER);
    expect(m.y).toBe(CENTER);
  });

  it("places sessions in ring, steps around session", () => {
    const nodes = [
      { id: "macro", type: "macro", label: "Macro" },
      { id: "session:s1", type: "session", label: "s1" },
      { id: "step:s1:0", type: "step", label: "Step", sessionId: "s1" },
    ];
    const result = computeLayout(nodes, []);
    const s = result.byId.get("session:s1");
    const st = result.byId.get("step:s1:0");
    expect(s).toBeDefined();
    expect(st).toBeDefined();
    expect(typeof s.x).toBe("number");
    expect(typeof s.y).toBe("number");
    expect(typeof st.x).toBe("number");
    expect(typeof st.y).toBe("number");
  });
});

describe("nucleusKeys", () => {
  it("returns session and date keys for session node", () => {
    const keys = nucleusKeys({
      id: "session:07/03/2026-epic",
      type: "session",
      label: "07/03/2026-epic",
    });
    expect(keys).toContain("session:07/03/2026-epic");
    expect(keys).toContain("date:07/03/2026");
    // epic key only when id starts with [a-z]+-[a-z]+
  });

  it("returns epic key when session id starts with epic pattern", () => {
    const keys = nucleusKeys({
      id: "session:auth-billing-07/03/2026",
      type: "session",
      label: "auth-billing-07/03/2026",
    });
    expect(keys).toContain("epic:auth-billing");
  });

  it("returns session key for step with sessionId", () => {
    const keys = nucleusKeys({
      id: "step:s1:0",
      type: "step",
      label: "X",
      sessionId: "s1",
    });
    expect(keys).toContain("session:s1");
  });
});
