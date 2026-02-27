import { describe, it, expect, vi } from "vitest";
import { checkArchitecturalHealth } from "./checkArchitecturalHealth.js";

describe("checkArchitecturalHealth", () => {
  it("returns OK when no paradoxes detected", async () => {
    const ports = {
      storage: {
        getMacro: vi.fn().mockResolvedValue("Macro"),
        getRecentSessions: vi.fn().mockResolvedValue([{ id: "s1", summary: "S1" }]),
        insertParadox: vi.fn(),
        getOpenParadoxes: vi.fn().mockResolvedValue([]),
      },
      gemini: { detectParadoxes: vi.fn().mockResolvedValue([]) },
    };
    const result = await checkArchitecturalHealth(ports as never);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("Sin paradojas");
    expect(ports.storage.insertParadox).not.toHaveBeenCalled();
  });

  it("inserts paradoxes and returns summary when detected", async () => {
    const ports = {
      storage: {
        getMacro: vi.fn().mockResolvedValue("UTC"),
        getRecentSessions: vi.fn().mockResolvedValue([{ id: "s1", summary: "used local" }]),
        insertParadox: vi.fn().mockResolvedValue(undefined),
        getOpenParadoxes: vi.fn().mockResolvedValue([{ id: "p1", description: "UTC vs local" }]),
      },
      gemini: {
        detectParadoxes: vi.fn().mockResolvedValue([
          { description: "UTC vs local", analysis: "Conflict" },
        ]),
      },
    };
    const result = await checkArchitecturalHealth(ports as never);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("1 paradoja");
    expect(ports.storage.insertParadox).toHaveBeenCalledTimes(1);
    expect(ports.storage.insertParadox).toHaveBeenCalledWith(
      expect.objectContaining({ description: "UTC vs local", analysis: "Conflict" })
    );
  });

  it("returns tool error on throw", async () => {
    const ports = {
      storage: { getMacro: vi.fn().mockRejectedValue(new Error("fail")) },
      gemini: { detectParadoxes: vi.fn() },
    };
    const result = await checkArchitecturalHealth(ports as never);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("check_architectural_health falló");
  });
});
