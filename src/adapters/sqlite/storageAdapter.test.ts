import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { initSchema, createStorageAdapter } from "./storageAdapter.js";

describe("storageAdapter", () => {
  describe("initSchema", () => {
    it("creates all tables and macro row", () => {
      const db = new Database(":memory:");
      initSchema(db);
      const steps = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
      expect(steps.map((r) => r.name).sort()).toEqual(["debates", "macro", "paradoxes", "refactor_plans", "sessions", "steps"]);
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

    it("getOpenDebates returns empty when no debates", async () => {
      const all = await storage.getOpenDebates();
      expect(all).toEqual([]);
      expect(await storage.getOpenDebates("dev")).toEqual([]);
    });

    it("closeDebate does not throw", async () => {
      await storage.closeDebate("nonexistent");
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
