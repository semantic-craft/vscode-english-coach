import { describe, it, expect } from "vitest";
import { resolveModel, getTierLabel } from "../../src/core/models";

describe("resolveModel", () => {
  it("returns the catalog id for fast/pro", () => {
    expect(resolveModel("deepseek", "fast", "")).toBe("deepseek-v4-flash");
    expect(resolveModel("deepseek", "pro", "")).toBe("deepseek-v4-pro");
  });
  it("returns the custom model for custom tier", () => {
    expect(resolveModel("openai", "custom", "my-model")).toBe("my-model");
  });
  it("resolves Qwen models", () => {
    expect(resolveModel("qwen", "fast", "")).toBe("qwen-plus");
    expect(resolveModel("qwen", "pro", "")).toBe("qwen-max");
  });
  it("resolves the MiniMax high-speed model", () => {
    expect(resolveModel("minimax", "fast", "")).toBe("MiniMax-M2.7-highspeed");
    expect(resolveModel("minimax", "pro", "")).toBe("MiniMax-M2.7-highspeed");
  });
});

describe("getTierLabel", () => {
  it("labels known tiers", () => {
    expect(getTierLabel("fast")).toBe("Fast");
    expect(getTierLabel("pro")).toBe("Pro");
  });
});
