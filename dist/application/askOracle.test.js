import { describe, it, expect, vi } from "vitest";
import { askOracle } from "./askOracle.js";
describe("askOracle", () => {
    it("returns error when technical_doubt is empty", async () => {
        const ports = {
            storage: { getStepsForOracle: vi.fn() },
            gemini: { answerFromContext: vi.fn() },
        };
        const result = await askOracle(ports, "");
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("requerido");
        expect(ports.storage.getStepsForOracle).not.toHaveBeenCalled();
    });
    it("calls getStepsForOracle and answerFromContext and returns text", async () => {
        const ports = {
            storage: {
                getStepsForOracle: vi.fn().mockResolvedValue([
                    { session_id: "s1", action: "a1", implications: "i1", created_at: "" },
                ]),
            },
            gemini: {
                answerFromContext: vi.fn().mockResolvedValue("1. Usar pool. 2. UTC. 3. Validar."),
            },
        };
        const result = await askOracle(ports, "¿Cómo conecto la BD?");
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toBe("1. Usar pool. 2. UTC. 3. Validar.");
        expect(ports.storage.getStepsForOracle).toHaveBeenCalledWith(20);
        expect(ports.gemini.answerFromContext).toHaveBeenCalledWith("¿Cómo conecto la BD?", [
            { action: "a1", implications: "i1", sessionId: "s1" },
        ]);
    });
    it("returns tool error on storage/gemini throw", async () => {
        const ports = {
            storage: { getStepsForOracle: vi.fn().mockRejectedValue(new Error("DB error")) },
            gemini: { answerFromContext: vi.fn() },
        };
        const result = await askOracle(ports, "duda");
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("Oráculo falló");
    });
});
//# sourceMappingURL=askOracle.test.js.map