import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initSchema, createStorageAdapter } from "./storageAdapter.js";

describe("storageAdapter", () => {
  describe("initSchema", () => {
    it("creates all tables and macro row", () => {
      const db = new Database(":memory:");
      initSchema(db);
      const steps = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
      expect(steps.map((r) => r.name).sort()).toEqual(["macro", "paradoxes", "refactor_plans", "sessions", "steps"]);
      const macro = db.prepare("SELECT id, content FROM macro").get() as { id: number; content: string };
      expect(macro.id).toBe(1);
      expect(macro.content).toBe("");
      db.close();
    });
  });

  describe("createStorageAdapter (in-memory)", () => {
    let storage: ReturnType<typeof createStorageAdapter>;

    beforeEach(() => {
      storage = createStorageAdapter(":memory:");
    });

    it("insertStep and getStepsBySession", async () => {
      await storage.insertStep("s1", "action1", "impl1");
      await storage.insertStep("s1", "action2", "impl2");
      const steps = await storage.getStepsBySession("s1");
      expect(steps).toHaveLength(2);
      expect(steps[0].action).toBe("action1");
      expect(steps[0].implications).toBe("impl1");
      expect(steps[1].action).toBe("action2");
    });

    it("insertSession and getRecentSessions", async () => {
      await storage.insertSession("s1", "summary one");
      await new Promise((r) => setTimeout(r, 2));
      await storage.insertSession("s2", "summary two");
      const recent = await storage.getRecentSessions(2);
      expect(recent).toHaveLength(2);
      expect(recent[0].id).toBe("s2");
      expect(recent[0].summary).toBe("summary two");
      expect(recent[0].closed_at).toBeTruthy();
    });

    it("getMacro and setMacro", async () => {
      expect(await storage.getMacro()).toBeNull();
      await storage.setMacro("macro content");
      expect(await storage.getMacro()).toBe("macro content");
    });

    it("getStepsForOracle returns recent steps across sessions", async () => {
      await storage.insertStep("s1", "a1", "i1");
      await storage.insertStep("s2", "a2", "i2");
      await storage.insertStep("s1", "a3", "i3");
      const oracle = await storage.getStepsForOracle(10);
      expect(oracle.length).toBeGreaterThanOrEqual(3);
      expect(oracle[0]).toHaveProperty("session_id");
      expect(oracle[0].action).toBeDefined();
      expect(oracle[0].implications).toBeDefined();
      expect(oracle[0].created_at).toBeDefined();
      const limited = await storage.getStepsForOracle(2);
      expect(limited).toHaveLength(2);
    });

    it("getRecentStepsByAgentKey: prefix match by class, exact match by full key", async () => {
      await storage.insertStep("s1", "paladin: step 1", "i1", "paladin");
      await storage.insertStep("s1", "paladin-enojado: step", "i2", "paladin-enojado");
      await storage.insertStep("s1", "paladin-1: step", "i3", "paladin-1");
      await storage.insertStep("s1", "erudito: step", "i4", "erudito");
      const allPaladin = await storage.getRecentStepsByAgentKey("paladin", 10);
      expect(allPaladin.length).toBe(3);
      const onlyEnojado = await storage.getRecentStepsByAgentKey("paladin-enojado", 10);
      expect(onlyEnojado.length).toBe(1);
      expect(onlyEnojado[0].action).toBe("paladin-enojado: step");
      const onlyErudito = await storage.getRecentStepsByAgentKey("erudito", 10);
      expect(onlyErudito.length).toBe(1);
      const emptyKey = await storage.getRecentStepsByAgentKey("", 2);
      expect(emptyKey.length).toBe(2);
    });

    it("insertParadox and getOpenParadoxes and getParadox and resolveParadox", async () => {
      await storage.insertParadox({
        id: "p1",
        description: "UTC vs local",
        analysis: "Gemini analysis",
        relatedSessionIds: "s1,s2",
      });
      const open = await storage.getOpenParadoxes();
      expect(open).toHaveLength(1);
      expect(open[0].description).toBe("UTC vs local");
      expect(open[0].analysis).toBe("Gemini analysis");
      const one = await storage.getParadox("p1");
      expect(one).not.toBeNull();
      expect(one!.id).toBe("p1");
      await storage.resolveParadox("p1", "Use UTC everywhere");
      const openAfter = await storage.getOpenParadoxes();
      expect(openAfter).toHaveLength(0);
      const resolved = await storage.getParadox("p1");
      expect(resolved!.status).toBe("resolved");
      expect(resolved!.resolution_suggestion).toBe("Use UTC everywhere");
    });

    it("getParadox returns null for missing id", async () => {
      expect(await storage.getParadox("nonexistent")).toBeNull();
    });

    it("insertRefactorPlan and getPendingRefactorPlans", async () => {
      await storage.insertRefactorPlan({
        id: "rp1",
        sessionId: "s1",
        moduleName: "auth",
        planText: "Extract validation to middleware",
      });
      const pending = await storage.getPendingRefactorPlans();
      expect(pending).toHaveLength(1);
      expect(pending[0].plan_text).toBe("Extract validation to middleware");
      expect(pending[0].module_name).toBe("auth");
      const byModule = await storage.getPendingRefactorPlans("auth");
      expect(byModule).toHaveLength(1);
      const other = await storage.getPendingRefactorPlans("other");
      expect(other).toHaveLength(0);
    });
  });
});
