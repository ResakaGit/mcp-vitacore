import { describe, it, expect, vi } from "vitest";
import { getPendingRefactors } from "./getPendingRefactors.js";
describe("getPendingRefactors", () => {
    it("returns message when no pending plans", async () => {
        const ports = { storage: { getPendingRefactorPlans: vi.fn().mockResolvedValue([]) } };
        const result = await getPendingRefactors(ports);
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain("No hay planes");
    });
    it("returns formatted list of plans", async () => {
        const ports = {
            storage: {
                getPendingRefactorPlans: vi.fn().mockResolvedValue([
                    {
                        id: "rp1",
                        session_id: "s1",
                        module_name: "auth",
                        plan_text: "• Extraer validación",
                        status: "pending",
                        created_at: "",
                    },
                ]),
            },
        };
        const result = await getPendingRefactors(ports);
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain("rp1");
        expect(result.content[0].text).toContain("s1");
        expect(result.content[0].text).toContain("auth");
        expect(result.content[0].text).toContain("Extraer validación");
    });
    it("passes module_name to getPendingRefactorPlans when provided", async () => {
        const ports = { storage: { getPendingRefactorPlans: vi.fn().mockResolvedValue([]) } };
        await getPendingRefactors(ports, "auth");
        expect(ports.storage.getPendingRefactorPlans).toHaveBeenCalledWith("auth");
    });
    it("returns tool error on throw", async () => {
        const ports = { storage: { getPendingRefactorPlans: vi.fn().mockRejectedValue(new Error("DB")) } };
        const result = await getPendingRefactors(ports);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("get_pending_refactors falló");
    });
});
//# sourceMappingURL=getPendingRefactors.test.js.map