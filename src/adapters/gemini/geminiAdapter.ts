/**
 * Adaptador Gemini: implementación de GeminiPort con @google/genai.
 * Prompts inyectados desde prompts.ts. Timeout vía AbortSignal.
 */

import { GoogleGenAI } from "@google/genai";
import type { GeminiPort, StepForSummary, ContextRecord, ParadoxCandidate } from "../../ports/gemini.js";
import {
  SESSION_SUMMARY_SYSTEM,
  sessionSummaryUser,
  EVOLVE_MACRO_SYSTEM,
  evolveMacroUser,
  ORACLE_SYSTEM,
  oracleUser,
  PARADOX_SYSTEM,
  paradoxUser,
  REFACTOR_PLAN_SYSTEM,
  refactorPlanUser,
} from "./prompts.js";

function createAbortSignalWithTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

export function createGeminiAdapter(apiKey: string, model: string, timeoutMs: number = 60000): GeminiPort {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateSessionSummary(steps: StepForSummary[]): Promise<string> {
      const { signal, clear } = createAbortSignalWithTimeout(timeoutMs);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: sessionSummaryUser(steps),
          config: { systemInstruction: SESSION_SUMMARY_SYSTEM, abortSignal: signal },
        });
        const text = response.text?.trim();
        return text ?? "Sesión sin pasos registrados.";
      } finally {
        clear();
      }
    },

    async evolveMacro(
      currentMacro: string | null,
      recentSessionSummaries: string[]
    ): Promise<string> {
      const { signal, clear } = createAbortSignalWithTimeout(timeoutMs);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: evolveMacroUser(currentMacro, recentSessionSummaries),
          config: { systemInstruction: EVOLVE_MACRO_SYSTEM, abortSignal: signal },
        });
        const text = response.text?.trim();
        return text ?? "";
      } finally {
        clear();
      }
    },

    async answerFromContext(question: string, contextRecords: ContextRecord[]): Promise<string> {
      const { signal, clear } = createAbortSignalWithTimeout(timeoutMs);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: oracleUser(question, contextRecords),
          config: { systemInstruction: ORACLE_SYSTEM, abortSignal: signal },
        });
        const text = response.text?.trim();
        return text ?? "Sin respuesta del oráculo.";
      } finally {
        clear();
      }
    },

    async detectParadoxes(macro: string | null, sessionSummaries: string[]): Promise<ParadoxCandidate[]> {
      const { signal, clear } = createAbortSignalWithTimeout(timeoutMs);
      let text: string | undefined;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: paradoxUser(macro, sessionSummaries),
          config: { systemInstruction: PARADOX_SYSTEM, abortSignal: signal },
        });
        text = response.text?.trim();
      } finally {
        clear();
      }
      if (!text) return [];
      try {
        const parsed = JSON.parse(text) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
          (item): item is ParadoxCandidate =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as ParadoxCandidate).description === "string" &&
            typeof (item as ParadoxCandidate).analysis === "string"
        );
      } catch {
        return [];
      }
    },

    async generateRefactorPlan(sessionSteps: StepForSummary[], macro: string | null): Promise<string> {
      const { signal, clear } = createAbortSignalWithTimeout(timeoutMs);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: refactorPlanUser(sessionSteps, macro),
          config: { systemInstruction: REFACTOR_PLAN_SYSTEM, abortSignal: signal },
        });
        const text = response.text?.trim();
        return text ?? "No se pudo generar plan de refactor.";
      } finally {
        clear();
      }
    },
  };
}
