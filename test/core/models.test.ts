import { describe, it, expect } from "vitest";
import {
  DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS,
  DEFAULT_SAY_IT_RIGHT_TTS_MODELS,
  SAY_IT_RIGHT_TTS_MODELS,
  DEFAULT_TTS_VOICES,
  SAY_IT_RIGHT_ANALYSIS_MODELS,
  TTS_VOICES,
  getProviderModelOptions,
  resolveModel,
  getTierLabel,
} from "../../src/core/models";

describe("resolveModel", () => {
  it("returns the catalog id for fast/pro", () => {
    expect(resolveModel("deepseek", "fast", "")).toBe("deepseek-v4-flash");
    expect(resolveModel("deepseek", "pro", "")).toBe("deepseek-v4-pro");
  });
  it("returns the custom model for custom tier", () => {
    expect(resolveModel("openai", "custom", "my-model")).toBe("my-model");
  });
  it("resolves Qwen models", () => {
    expect(resolveModel("qwen", "fast", "")).toBe("qwen3.6-flash");
    expect(resolveModel("qwen", "pro", "")).toBe("qwen3.7-plus");
  });
  it("routes Gemini tiers to Gemini 3.5 Flash", () => {
    expect(resolveModel("gemini", "fast", "")).toBe("gemini-3.5-flash");
    expect(resolveModel("gemini", "pro", "")).toBe("gemini-3.5-flash");
  });
  it("resolves MiniMax model tiers", () => {
    expect(resolveModel("minimax", "fast", "")).toBe("MiniMax-M2.7-highspeed");
    expect(resolveModel("minimax", "pro", "")).toBe("MiniMax-M3");
  });
  it("keeps expired MiMo routing ids out of the active catalogs", () => {
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.mimo.map((m) => m.id)).not.toContain("mimo-v2-pro");
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.mimo.map((m) => m.id)).not.toContain("mimo-v2-omni");
  });
  it("exposes current flash-level coach model options", () => {
    expect(getProviderModelOptions("qwen").map((m) => m.id)).toContain("qwen3.6-flash");
    expect(getProviderModelOptions("gemini")).toEqual([{ id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" }]);
    expect(getProviderModelOptions("minimax").map((m) => m.id)).toContain("MiniMax-M3");
    expect(getProviderModelOptions("minimax").map((m) => m.id)).toContain("MiniMax-M2.7-highspeed");
    expect(getProviderModelOptions("mimo").map((m) => m.id)).toContain("mimo-v2.5");
    expect(getProviderModelOptions("openai").map((m) => m.id)).toEqual(["gpt-5.5"]);
  });
  it("keeps retired models out of the built-in model pickers", () => {
    const coachModels = {
      qwen: getProviderModelOptions("qwen").map((m) => m.id),
      minimax: getProviderModelOptions("minimax").map((m) => m.id),
      mimo: getProviderModelOptions("mimo").map((m) => m.id),
      gemini: getProviderModelOptions("gemini").map((m) => m.id),
    };
    expect(coachModels.qwen).not.toEqual(expect.arrayContaining(["qwen3.5-flash", "qwen-plus"]));
    expect(coachModels.mimo).not.toContain("mimo-v2-flash");
    expect(coachModels.minimax).toEqual(["MiniMax-M3", "MiniMax-M2.7-highspeed"]);
    expect(coachModels.gemini).toEqual(["gemini-3.5-flash"]);
    expect(coachModels.gemini.some((id) => id.includes("gemini-2.5"))).toBe(false);
    expect(getProviderModelOptions("openai").map((m) => m.id)).toEqual(["gpt-5.5"]);
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.qwen.map((m) => m.id)).not.toEqual(
      expect.arrayContaining(["qwen3.5-flash", "qwen-plus"]),
    );
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.qwen.map((m) => m.id)).toEqual([
      "qwen3.6-flash",
      "qwen3.7-plus",
      "qwen3.7-max",
    ]);
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.minimax.map((m) => m.id)).toEqual([
      "MiniMax-M3",
      "MiniMax-M2.7-highspeed",
    ]);
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.gemini.some((m) => m.id.includes("gemini-2.5"))).toBe(false);
    expect(SAY_IT_RIGHT_ANALYSIS_MODELS.openai.map((m) => m.id)).toEqual(["gpt-5.5"]);
    expect(SAY_IT_RIGHT_TTS_MODELS.minimax.map((m) => m.id)).toEqual(["speech-2.8-hd", "speech-2.8-turbo"]);
    expect(SAY_IT_RIGHT_TTS_MODELS.minimax.map((m) => m.id)).not.toContain("MiniMax-M2.7-highspeed");
    expect(SAY_IT_RIGHT_TTS_MODELS.gemini.some((m) => m.id.includes("gemini-2.5"))).toBe(false);
  });
  it("uses current pronunciation defaults", () => {
    expect(DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS.qwen).toBe("qwen3.6-flash");
    expect(DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS.minimax).toBe("MiniMax-M3");
    expect(DEFAULT_SAY_IT_RIGHT_TTS_MODELS.minimax).toBe("speech-2.8-hd");
    expect(DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS.openai).toBe("gpt-5.5");
    expect(DEFAULT_TTS_VOICES.minimax).toBe("English_expressive_narrator");
    expect(TTS_VOICES.minimax).not.toContain("male-qn-qingse");
  });
});

describe("getTierLabel", () => {
  it("labels known tiers", () => {
    expect(getTierLabel("fast")).toBe("Fast");
    expect(getTierLabel("pro")).toBe("Pro");
  });
});
