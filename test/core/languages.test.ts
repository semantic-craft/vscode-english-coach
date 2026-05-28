import { describe, it, expect } from "vitest";
import { resolveTargetLanguage, getLanguageTitle } from "../../src/core/languages";

describe("resolveTargetLanguage", () => {
  it("honors an explicit non-auto language", () => {
    expect(resolveTargetLanguage("ja", "anything")).toBe("ja");
  });
  it("auto: Chinese text -> en", () => {
    expect(resolveTargetLanguage("auto", "你好世界")).toBe("en");
  });
  it("auto: non-Chinese text -> zh-Hans", () => {
    expect(resolveTargetLanguage("auto", "hello world")).toBe("zh-Hans");
  });
  it("auto: Japanese kana is not treated as Chinese", () => {
    expect(resolveTargetLanguage("auto", "こんにちは")).toBe("zh-Hans");
  });
});

describe("getLanguageTitle", () => {
  it("maps known codes and falls back to the code", () => {
    expect(getLanguageTitle("en")).toBe("English");
    expect(getLanguageTitle("xx")).toBe("xx");
  });
});
