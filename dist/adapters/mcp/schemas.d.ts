import { z } from "zod";
export declare const logStepSchema: z.ZodObject<{
    session_id: z.ZodString;
    action: z.ZodString;
    implications: z.ZodString;
}, z.core.$strip>;
export declare const closeSessionSchema: z.ZodObject<{
    session_id: z.ZodString;
}, z.core.$strip>;
export declare const hydrateAgentContextSchema: z.ZodObject<{
    role: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const triggerMacroEvolutionSchema: z.ZodObject<{}, z.core.$strip>;
export declare const askOracleSchema: z.ZodObject<{
    technical_doubt: z.ZodString;
}, z.core.$strip>;
export declare const checkArchitecturalHealthSchema: z.ZodObject<{}, z.core.$strip>;
export declare const resolveArchitecturalParadoxSchema: z.ZodObject<{
    paradox_id: z.ZodString;
}, z.core.$strip>;
export declare const submitForBackgroundReviewSchema: z.ZodObject<{
    session_id: z.ZodString;
}, z.core.$strip>;
export declare const getPendingRefactorsSchema: z.ZodObject<{
    module_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LogStepInput = z.infer<typeof logStepSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
export type HydrateAgentContextInput = z.infer<typeof hydrateAgentContextSchema>;
export type AskOracleInput = z.infer<typeof askOracleSchema>;
export type ResolveArchitecturalParadoxInput = z.infer<typeof resolveArchitecturalParadoxSchema>;
export type SubmitForBackgroundReviewInput = z.infer<typeof submitForBackgroundReviewSchema>;
export type GetPendingRefactorsInput = z.infer<typeof getPendingRefactorsSchema>;
//# sourceMappingURL=schemas.d.ts.map