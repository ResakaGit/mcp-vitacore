/**
 * Dominio: contrato de resultado de tools MCP (spec 2025-11-25).
 * Sin I/O; errores de ejecución se devuelven en el resultado con isError: true.
 * isError siempre explícito para clientes MCP.
 */

export type ToolSuccessResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: false;
};

export type ToolErrorResult = {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
};

export type ToolResult = ToolSuccessResult | ToolErrorResult;

export function toolSuccessResult(text: string): ToolSuccessResult {
  return {
    content: [{ type: "text", text }],
    isError: false,
  };
}

export function toolErrorResult(message: string): ToolErrorResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
    Object.setPrototypeOf(this, ToolError.prototype);
  }
}

export function isToolError(value: unknown): value is ToolError {
  return value instanceof ToolError;
}

/** Extrae mensaje de error de forma consistente (DRY). */
export function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error == null) return "Unknown error";
  return String(error);
}

export function errorToToolResult(error: unknown): ToolErrorResult {
  return toolErrorResult(messageFromUnknown(error));
}
