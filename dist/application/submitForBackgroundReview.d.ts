/**
 * Caso de uso V3: submit_for_background_review.
 * Obtiene steps de la sesión y macro, genera plan de refactor con Gemini y lo persiste.
 */
import type { StoragePort } from "../ports/storage.js";
import type { GeminiPort } from "../ports/gemini.js";
import { type ToolResult } from "../domain/errors.js";
export type Ports = {
    storage: StoragePort;
    gemini: GeminiPort;
};
export declare function submitForBackgroundReview(ports: Ports, sessionId: string): Promise<ToolResult>;
//# sourceMappingURL=submitForBackgroundReview.d.ts.map