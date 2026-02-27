import { describe, it, expect, vi } from "vitest";
import { closeSessionOrchestrator } from "./closeSession.js";
import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";

describe("closeSessionOrchestrator", () => {
  it("returns error when session already closed", async () => {
    const storage: StoragePort = {
      getStepsBySession: vi.fn(),
      hasSession: vi.fn().mockResolvedValue(true),
      insertStep: vi.fn(),
      insertSession: vi.fn(),
      getRecentSessions: vi.fn(),
      getMacro: vi.fn(),
      setMacro: vi.fn(),
      getOpenDebates: vi.fn(),
      closeDebate: vi.fn(),
    };
    const gemini: GeminiPort = {
      generateSessionSummary: vi.fn(),
      evolveMacro: vi.fn(),
    };
    const closeSession = closeSessionOrchestrator({ storage, gemini });
    const result = await closeSession("s1");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Sesión ya cerrada.");
    expect(gemini.generateSessionSummary).not.toHaveBeenCalled();
  });

  it("returns error when session has no steps", async () => {
    const storage: StoragePort = {
      getStepsBySession: vi.fn().mockResolvedValue([]),
      hasSession: vi.fn().mockResolvedValue(false),
      insertStep: vi.fn(),
      insertSession: vi.fn(),
      getRecentSessions: vi.fn(),
      getMacro: vi.fn(),
      setMacro: vi.fn(),
      getOpenDebates: vi.fn(),
      closeDebate: vi.fn(),
    };
    const gemini: GeminiPort = {
      generateSessionSummary: vi.fn(),
      evolveMacro: vi.fn(),
    };
    const closeSession = closeSessionOrchestrator({ storage, gemini });
    const result = await closeSession("s1");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Sesión sin steps");
    expect(gemini.generateSessionSummary).not.toHaveBeenCalled();
  });

  it("returns stable error when insertSession rejects", async () => {
    const steps = [{ action: "a1", implications: "i1", created_at: "2025-01-01T00:00:00Z" }];
    const storage: StoragePort = {
      getStepsBySession: vi.fn().mockResolvedValue(steps),
      hasSession: vi.fn().mockResolvedValue(false),
      insertStep: vi.fn(),
      insertSession: vi.fn().mockRejectedValue(new Error("SQLITE_CONSTRAINT")),
      getRecentSessions: vi.fn(),
      getMacro: vi.fn(),
      setMacro: vi.fn(),
      getOpenDebates: vi.fn(),
      closeDebate: vi.fn(),
    };
    const gemini: GeminiPort = {
      generateSessionSummary: vi.fn().mockResolvedValue("Resumen."),
      evolveMacro: vi.fn(),
    };
    const closeSession = closeSessionOrchestrator({ storage, gemini });
    const result = await closeSession("s1");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Error al guardar la sesión.");
    expect(gemini.generateSessionSummary).toHaveBeenCalledWith(steps);
    expect(storage.insertSession).toHaveBeenCalledWith("s1", "Resumen.");
  });

  it("returns success when insertSession succeeds", async () => {
    const steps = [{ action: "a1", implications: "i1", created_at: "2025-01-01T00:00:00Z" }];
    const storage: StoragePort = {
      getStepsBySession: vi.fn().mockResolvedValue(steps),
      hasSession: vi.fn().mockResolvedValue(false),
      insertStep: vi.fn(),
      insertSession: vi.fn().mockResolvedValue(undefined),
      getRecentSessions: vi.fn(),
      getMacro: vi.fn(),
      setMacro: vi.fn(),
      getOpenDebates: vi.fn(),
      closeDebate: vi.fn(),
    };
    const gemini: GeminiPort = {
      generateSessionSummary: vi.fn().mockResolvedValue("Resumen."),
      evolveMacro: vi.fn(),
    };
    const closeSession = closeSessionOrchestrator({ storage, gemini });
    const result = await closeSession("s1");
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toBe("Sesión cerrada, bitácora procesada.");
  });
});
