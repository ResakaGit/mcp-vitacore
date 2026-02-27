import { describe, it, expect, vi } from "vitest";
import { resolveArchitecturalParadox } from "./resolveArchitecturalParadox.js";

describe("resolveArchitecturalParadox", () => {
  it("returns error when paradox_id is empty", async () => {
    const ports = { storage: { getParadox: vi.fn() }, gemini: { answerFromContext: vi.fn() } };
    const result = await resolveArchitecturalParadox(ports as never, "");
    expect(result.isError).toBe(true);
    expect(ports.storage.getParadox).not.toHaveBeenCalled();
  });

  it("returns error when paradox not found", async () => {
    const ports = {
      storage: { getParadox: vi.fn().mockResolvedValue(null) },
      gemini: { answerFromContext: vi.fn() },
    };
    const result = await resolveArchitecturalParadox(ports as never, "missing");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("no encontrada");
  });

  it("returns paradox content and resolves when open with analysis", async () => {
    const ports = {
      storage: {
        getParadox: vi
          .fn()
          .mockResolvedValueOnce({
            id: "p1",
            description: "UTC vs local",
            analysis: "Conflict",
            status: "open",
            related_session_ids: "s1",
            created_at: "",
            resolved_at: null,
            resolution_suggestion: null,
          })
          .mockResolvedValueOnce({
            id: "p1",
            description: "UTC vs local",
            analysis: "Conflict",
            status: "resolved",
            related_session_ids: "s1",
            created_at: "",
            resolved_at: "now",
            resolution_suggestion: "Use UTC",
          }),
        resolveParadox: vi.fn().mockResolvedValue(undefined),
      },
      gemini: { answerFromContext: vi.fn().mockResolvedValue("Use UTC") },
    };
    const result = await resolveArchitecturalParadox(ports as never, "p1");
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain("UTC vs local");
    expect(result.content[0].text).toContain("Conflict");
    expect(ports.storage.resolveParadox).toHaveBeenCalledWith("p1", "Use UTC");
  });
});
