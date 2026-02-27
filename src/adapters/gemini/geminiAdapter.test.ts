import { describe, it, expect } from "vitest";
import type { GeminiPort } from "../../ports/gemini.js";

describe("GeminiPort (mock)", () => {
  const mockGemini: GeminiPort = {
    async generateSessionSummary(steps) {
      if (steps.length === 0) return "Sesión sin pasos registrados.";
      return steps.map((s) => `• ${s.action}: ${s.implications}`).join("\n");
    },
    async evolveMacro(current, summaries) {
      const base = current ?? "(vacío)";
      return `${base}\n---\nEvolución con ${summaries.length} sesiones.`;
    },
    async answerFromContext(question, contextRecords) {
      if (contextRecords.length === 0) return "Sin contexto.";
      return `Directiva para: ${question} (${contextRecords.length} registros).`;
    },
    async detectParadoxes(macro, sessionSummaries) {
      if (sessionSummaries.length === 0) return [];
      return [{ description: "Paradoja de ejemplo", analysis: "Análisis mock" }];
    },
    async generateRefactorPlan(sessionSteps, macro) {
      return `• Plan con ${sessionSteps.length} pasos y macro ${macro ? "presente" : "ausente"}.`;
    },
  };

  it("generateSessionSummary returns string", async () => {
    const out = await mockGemini.generateSessionSummary([
      { action: "a1", implications: "i1" },
    ]);
    expect(out).toContain("a1");
    expect(out).toContain("i1");
  });

  it("generateSessionSummary empty steps", async () => {
    const out = await mockGemini.generateSessionSummary([]);
    expect(out).toBe("Sesión sin pasos registrados.");
  });

  it("evolveMacro with null and summaries", async () => {
    const out = await mockGemini.evolveMacro(null, ["s1", "s2"]);
    expect(out).toContain("(vacío)");
    expect(out).toContain("2 sesiones");
  });

  it("answerFromContext returns string", async () => {
    const out = await mockGemini.answerFromContext("¿Cómo conecto la BD?", [
      { action: "conexión", implications: "usar pool" },
    ]);
    expect(out).toContain("¿Cómo conecto la BD?");
    expect(out).toContain("1 registros");
  });

  it("answerFromContext empty context", async () => {
    const out = await mockGemini.answerFromContext("duda", []);
    expect(out).toBe("Sin contexto.");
  });

  it("detectParadoxes returns array", async () => {
    const out = await mockGemini.detectParadoxes("Macro UTC", ["Sesión usó local"]);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(0);
    if (out.length > 0) {
      expect(out[0]).toHaveProperty("description");
      expect(out[0]).toHaveProperty("analysis");
    }
  });

  it("detectParadoxes empty summaries returns []", async () => {
    const out = await mockGemini.detectParadoxes(null, []);
    expect(out).toEqual([]);
  });

  it("generateRefactorPlan returns string", async () => {
    const out = await mockGemini.generateRefactorPlan(
      [{ action: "validación", implications: "repetida" }],
      "Macro"
    );
    expect(out).toContain("1 pasos");
    expect(out).toContain("presente");
  });
});
