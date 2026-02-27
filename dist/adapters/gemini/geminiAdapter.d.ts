/**
 * Adaptador Gemini: implementación de GeminiPort con @google/genai.
 * Prompts inyectados desde prompts.ts. Timeout vía AbortSignal.
 */
import type { GeminiPort } from "../../ports/gemini.js";
export declare function createGeminiAdapter(apiKey: string, model: string, timeoutMs?: number): GeminiPort;
//# sourceMappingURL=geminiAdapter.d.ts.map