import { describe, it, expect } from "vitest";
import { parseSearchTerms } from "../search.js";

describe("parseSearchTerms", () => {
  it("returns empty array for empty string", () => {
    expect(parseSearchTerms("")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(parseSearchTerms(null)).toEqual([]);
    expect(parseSearchTerms(undefined)).toEqual([]);
  });

  it("returns empty array for non-string", () => {
    expect(parseSearchTerms(123)).toEqual([]);
    expect(parseSearchTerms({})).toEqual([]);
  });

  it("splits by comma and normalizes to lowercase", () => {
    expect(parseSearchTerms("a, b")).toEqual(["a", "b"]);
  });

  it("splits by spaces", () => {
    expect(parseSearchTerms("a  b   c")).toEqual(["a", "b", "c"]);
  });

  it("splits by comma or spaces (OR), trims, filters empty", () => {
    expect(parseSearchTerms("a, b c")).toEqual(["a", "b", "c"]);
    expect(parseSearchTerms("  auth , billing  limits  ")).toEqual([
      "auth",
      "billing",
      "limits",
    ]);
  });
});
