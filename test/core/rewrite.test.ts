import { describe, it, expect } from "vitest";
import { parseRewriteResult } from "../../src/core/rewrite";

describe("parseRewriteResult", () => {
  it("parses a plain JSON object", () => {
    const r = parseRewriteResult('{"rewritten":"Good.","why":"- clearer"}');
    expect(r.rewritten).toBe("Good.");
    expect(r.why).toBe("- clearer");
  });
  it("parses JSON wrapped in a code fence", () => {
    const r = parseRewriteResult('```json\n{"rewritten":"Hi","why":"- x"}\n```');
    expect(r.rewritten).toBe("Hi");
  });
  it("parses JSON with surrounding prose", () => {
    const r = parseRewriteResult('Here you go: {"rewritten":"Yes","why":"- y"} done');
    expect(r.rewritten).toBe("Yes");
  });
  it("throws on a response with no rewritten text", () => {
    expect(() => parseRewriteResult("not json at all")).toThrow();
  });
});
