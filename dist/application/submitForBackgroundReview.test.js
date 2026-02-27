import { describe, it, expect, vi } from "vitest";
import { submitForBackgroundReview } from "./submitForBackgroundReview.js";
describe("submitForBackgroundReview", () => {
    it("returns error when session_id is empty", async () => {
        const ports = { storage: { getStepsBySession: vi.fn(), getMacro: vi.fn() }, gemini: { generateRefactorPlan: vi.fn() } };
        const result = await submitForBackgroundReview(ports, "");
        expect(result.isError).toBe(true);
        expect(ports.storage.getStepsBySession).not.toHaveBeenCalled();
    });
    it("returns error when session has no steps", async () => {
        const ports = {
            storage: {
                getStepsBySession: vi.fn().mockResolvedValue([]),
                getMacro: vi.fn().mockResolvedValue(null),
            },
            gemini: { generateRefactorPlan: vi.fn() },
        };
        const result = await submitForBackgroundReview(ports, "s1");
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("sin steps");
    });
    it("generates plan and inserts refactor plan", async () => {
        const ports = {
            storage: {
                getStepsBySession: vi.fn().mockResolvedValue([{ action: "a1", implications: "i1" }]),
                getMacro: vi.fn().mockResolvedValue("Macro"),
                insertRefactorPlan: vi.fn().mockResolvedValue(undefined),
            },
            gemini: { generateRefactorPlan: vi.fn().mockResolvedValue("• Extraer validación") },
        };
        const result = await submitForBackgroundReview(ports, "s1");
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain("Plan de refactor guardado");
        expect(ports.gemini.generateRefactorPlan).toHaveBeenCalledWith([{ action: "a1", implications: "i1" }], "Macro");
        expect(ports.storage.insertRefactorPlan).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1", planText: "• Extraer validación" }));
    });
});
//# sourceMappingURL=submitForBackgroundReview.test.js.map