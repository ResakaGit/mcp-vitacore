import { describe, it, expect } from "vitest";
import {
  toolSuccessResult,
  toolErrorResult,
  errorToToolResult,
  messageFromUnknown,
  isToolError,
  ToolError,
} from "./errors.js";

describe("domain/errors", () => {
  it("toolSuccessResult returns isError false and content", () => {
    const r = toolSuccessResult("ok");
    expect(r.isError).toBe(false);
    expect(r.content).toHaveLength(1);
    expect(r.content[0].text).toBe("ok");
  });

  it("toolErrorResult returns isError true and content", () => {
    const r = toolErrorResult("algo falló");
    expect(r.isError).toBe(true);
    expect(r.content).toHaveLength(1);
    expect(r.content[0].type).toBe("text");
    expect(r.content[0].text).toBe("algo falló");
  });

  it("errorToToolResult from Error uses message", () => {
    const r = errorToToolResult(new Error("msg"));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe("msg");
  });

  it("errorToToolResult from unknown string", () => {
    const r = errorToToolResult("string err");
    expect(r.content[0].text).toBe("string err");
  });

  it("messageFromUnknown extracts message from Error or primitive", () => {
    expect(messageFromUnknown(new Error("e"))).toBe("e");
    expect(messageFromUnknown("s")).toBe("s");
    expect(messageFromUnknown(null)).toBe("Unknown error");
  });

  it("isToolError identifies ToolError", () => {
    expect(isToolError(new ToolError("x"))).toBe(true);
    expect(isToolError(new Error("x"))).toBe(false);
  });
});
