import { describe, it, expect, vi } from "vitest";
import { evolveMacroOrchestrator } from "./evolveMacro.js";
import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";

describe("evolveMacroOrchestrator", () => {
  it("returns stable error when setMacro rejects", async () => {
    const storage: StoragePort = {
      getStepsBySession: vi.fn(),
      hasSession: vi.fn(),
      insertStep: vi.fn(),
      insertSession: vi.fn(),
      getRecentSessions: vi.fn().mockResolvedValue([{ id: "s1", summary: "S1", closed_at: "2025-01-01T00:00:00Z" }]),
      getMacro: vi.fn().mockResolvedValue("Macro actual"),
      setMacro: vi.fn().mockRejectedValue(new Error("disk full")),
      getOpenDebates: vi.fn(),
      closeDebate: vi.fn(),
    };
    const gemini: GeminiPort = {
      generateSessionSummary: vi.fn(),
      evolveMacro: vi.fn().mockResolvedValue("Nuevo macro."),
    };
    const handler = evolveMacroOrchestrator({ storage, gemini });
    const result = await handler();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error al guardar el Macro.");
    expect(gemini.evolveMacro).toHaveBeenCalledWith("Macro actual", ["S1"]);
    expect(storage.setMacro).toHaveBeenCalledWith("Nuevo macro.");
  });

  it("returns success when setMacro succeeds", async () => {
    const storage: StoragePort = {
      getStepsBySession: vi.fn(),
      hasSession: vi.fn(),
      insertStep: vi.fn(),
      insertSession: vi.fn(),
      getRecentSessions: vi.fn().mockResolvedValue([]),
      getMacro: vi.fn().mockResolvedValue(null),
      setMacro: vi.fn().mockResolvedValue(undefined),
      getOpenDebates: vi.fn(),
      closeDebate: vi.fn(),
    };
    const gemini: GeminiPort = {
      generateSessionSummary: vi.fn(),
      evolveMacro: vi.fn().mockResolvedValue("Nuevo contenido."),
    };
    const handler = evolveMacroOrchestrator({ storage, gemini });
    const result = await handler();
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe("Macro evolucionado y guardado.");
  });
});
