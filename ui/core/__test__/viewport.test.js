import { describe, it, expect } from "vitest";
import {
  computeFitView,
  serializeViewport,
  deserializeViewport,
  viewportStorageKey,
} from "../viewport.js";

describe("computeFitView", () => {
  it("returns default view for empty nodes", () => {
    const result = computeFitView([], 640, 640);
    expect(result).toEqual({ zoomLevel: 1, panX: 0, panY: 0 });
  });

  it("returns zoom and pan so two points fit with padding", () => {
    const nodes = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    const result = computeFitView(nodes, 640, 640, 48);
    expect(result.zoomLevel).toBeLessThanOrEqual(2);
    expect(Number.isFinite(result.panX)).toBe(true);
    expect(Number.isFinite(result.panY)).toBe(true);
  });

  it("uses padding", () => {
    const nodes = [{ x: 0, y: 0 }, { x: 1000, y: 1000 }];
    const r1 = computeFitView(nodes, 640, 640, 0);
    const r2 = computeFitView(nodes, 640, 640, 100);
    expect(r2.zoomLevel).toBeLessThan(r1.zoomLevel);
  });
});

describe("serializeViewport", () => {
  it("returns JSON string", () => {
    const s = serializeViewport({ zoomLevel: 1.5, panX: 10, panY: 20 });
    expect(typeof s).toBe("string");
    expect(JSON.parse(s)).toEqual({ zoomLevel: 1.5, panX: 10, panY: 20 });
  });
});

describe("deserializeViewport", () => {
  it("returns default for null/undefined", () => {
    expect(deserializeViewport(null)).toEqual({ zoomLevel: 1, panX: 0, panY: 0 });
    expect(deserializeViewport(undefined)).toEqual({ zoomLevel: 1, panX: 0, panY: 0 });
  });

  it("returns default for invalid JSON", () => {
    expect(deserializeViewport("not json")).toEqual({ zoomLevel: 1, panX: 0, panY: 0 });
  });

  it("returns default for non-object parse", () => {
    expect(deserializeViewport("1")).toEqual({ zoomLevel: 1, panX: 0, panY: 0 });
  });

  it("round-trips with serialize", () => {
    const state = { zoomLevel: 1.2, panX: -50, panY: 30 };
    expect(deserializeViewport(serializeViewport(state))).toEqual(state);
  });

  it("clamps zoomLevel to [0.2, 3]", () => {
    const r = deserializeViewport(JSON.stringify({ zoomLevel: 10, panX: 0, panY: 0 }));
    expect(r.zoomLevel).toBe(3);
    const r2 = deserializeViewport(JSON.stringify({ zoomLevel: 0.1, panX: 0, panY: 0 }));
    expect(r2.zoomLevel).toBe(0.2);
  });
});

describe("viewportStorageKey", () => {
  it("is a non-empty string", () => {
    expect(typeof viewportStorageKey).toBe("string");
    expect(viewportStorageKey.length).toBeGreaterThan(0);
  });
});
