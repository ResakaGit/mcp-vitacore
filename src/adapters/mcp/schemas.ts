import { z } from "zod";

export const logStepSchema = z.object({
  session_id: z.string().min(1, "session_id requerido"),
  action: z.string().min(1, "action requerido"),
  implications: z.string(),
});

export const closeSessionSchema = z.object({
  session_id: z.string().min(1, "session_id requerido"),
});

export const hydrateAgentContextSchema = z.object({
  role: z.string().default(""),
});

export const triggerMacroEvolutionSchema = z.object({});

export const askOracleSchema = z.object({
  technical_doubt: z.string().min(1, "technical_doubt requerido"),
});

export const checkArchitecturalHealthSchema = z.object({});

export const resolveArchitecturalParadoxSchema = z.object({
  paradox_id: z.string().min(1, "paradox_id requerido"),
});

export const submitForBackgroundReviewSchema = z.object({
  session_id: z.string().min(1, "session_id requerido"),
});

export const getPendingRefactorsSchema = z.object({
  module_name: z.string().optional(),
});

export type LogStepInput = z.infer<typeof logStepSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
export type HydrateAgentContextInput = z.infer<typeof hydrateAgentContextSchema>;
export type AskOracleInput = z.infer<typeof askOracleSchema>;
export type ResolveArchitecturalParadoxInput = z.infer<typeof resolveArchitecturalParadoxSchema>;
export type SubmitForBackgroundReviewInput = z.infer<typeof submitForBackgroundReviewSchema>;
export type GetPendingRefactorsInput = z.infer<typeof getPendingRefactorsSchema>;
