import { describe, it, expect } from "vitest";
import { isValidGraphData } from "../contracts.js";

describe("isValidGraphData", () => {
  it("returns false for null/undefined", () => {
    expect(isValidGraphData(null)).toBe(false);
    expect(isValidGraphData(undefined)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isValidGraphData("")).toBe(false);
    expect(isValidGraphData(0)).toBe(false);
  });

  it("returns false for object without nodes array", () => {
    expect(isValidGraphData({})).toBe(false);
    expect(isValidGraphData({ edges: [] })).toBe(false);
  });

  it("returns true for object with nodes array", () => {
    expect(isValidGraphData({ nodes: [], edges: [] })).toBe(true);
    expect(isValidGraphData({ nodes: [{ id: "a", type: "session", label: "A" }] })).toBe(true);
  });
});
