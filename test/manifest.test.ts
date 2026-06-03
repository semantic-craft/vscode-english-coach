import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const properties = manifest.contributes.configuration.properties as Record<string, any>;

describe("extension manifest provider defaults", () => {
  it("shows Xiaomi MiMo in the default Coach provider switcher", () => {
    expect(properties["englishCoach.mimo.enabled"].default).toBe(true);
    expect(properties["englishCoach.providerOrder"].default.split(",")).toContain("mimo");
  });

  it("defaults the Coach sidebar to provider-specific flash-level model settings", () => {
    expect(properties["englishCoach.modelTier"].default).toBe("custom");
    expect(properties["englishCoach.reasoningMode"].default).toBe("off");
    expect(properties["englishCoach.reasoningMode"].enum).toEqual(["off", "on", "auto"]);
    expect(properties["englishCoach.qwen.baseURL"].default).toBe(
      "https://YOUR_MAAS_ENDPOINT/apps/anthropic",
    );
    expect(properties["englishCoach.qwen.model"].enum).toEqual(["qwen3.6-flash", "qwen3.7-plus", "qwen3.7-max"]);
    expect(properties["englishCoach.qwen.model"].default).toBe("qwen3.6-flash");
    expect(properties["englishCoach.gemini.model"].enum).toEqual(["gemini-3.5-flash"]);
    expect(properties["englishCoach.minimax.model"]).toBeUndefined();
    expect(properties["englishCoach.mimo.baseURL"].default).toBe("https://token-plan-cn.xiaomimimo.com/anthropic");
    expect(properties["englishCoach.mimo.model"].default).toBe("mimo-v2.5");
    expect(properties["englishCoach.openai.model"].enum).toEqual(["gpt-5.5"]);
    expect(properties["englishCoach.openai.model"].default).toBe("gpt-5.5");
  });

  it("exposes active analysis, speech model, and voice choices without MiniMax", () => {
    expect(properties["sayItRight.analysisProvider"].enum).toEqual(expect.arrayContaining(["qwen", "mimo", "gemini", "openai"]));
    expect(properties["sayItRight.analysisProvider"].enum).not.toContain("minimax");
    expect(properties["sayItRight.speechProvider"].enum).toEqual(expect.arrayContaining(["qwen", "mimo", "gemini"]));
    expect(properties["sayItRight.speechProvider"].enum).not.toContain("minimax");
    expect(properties["sayItRight.analysisModel.qwen"].enum).toEqual([
      "qwen3.6-flash",
      "qwen3.7-plus",
      "qwen3.7-max",
    ]);
    expect(properties["sayItRight.analysisModel.minimax"]).toBeUndefined();
    expect(properties["sayItRight.analysisModel.mimo"].enum).toContain("mimo-v2.5-pro");
    expect(properties["sayItRight.analysisModel.gemini"].enum).toEqual(["gemini-3.5-flash"]);
    expect(properties["sayItRight.analysisModel.openai"].enum).toEqual(["gpt-5.5"]);
    expect(properties["sayItRight.analysisModel.openai"].default).toBe("gpt-5.5");
    expect(properties["sayItRight.ttsModel.minimax"]).toBeUndefined();
    expect(properties["sayItRight.ttsModel.mimo"].enum).toContain("mimo-v2.5-tts");
    expect(properties["sayItRight.ttsModel.gemini"].enum).toEqual(["gemini-3.1-flash-tts-preview"]);
    expect(properties["sayItRight.voice.minimax"]).toBeUndefined();
    expect(properties["sayItRight.voice.mimo"].enum).toEqual(expect.arrayContaining(["Chloe", "Mia", "Milo", "Dean"]));
  });

  it("declares the macOS ffmpeg recorder path setting", () => {
    expect(properties["sayItRight.ffmpegPath"].default).toBe("/opt/homebrew/bin/ffmpeg");
  });

  it("uses mode-specific sidebar copy so Native English does not look English-only", () => {
    const sidebarScript = readFileSync(new URL("../media/sidebar.js", import.meta.url), "utf8");
    const sidebarProvider = readFileSync(new URL("../src/vscode/sidebar/provider.ts", import.meta.url), "utf8");
    expect(sidebarScript).toContain('placeholder: "输入中文意思；我会用真实地道的英文表达…"');
    expect(sidebarScript).toContain('placeholder: "Type or paste English to polish…"');
    expect(sidebarScript).toContain('$("resultTitle").textContent = copy.resultTitle');
    expect(sidebarProvider).toContain('option value="coach">Polish English');
    expect(sidebarProvider).toContain('option value="express">Say It in English');
    expect(sidebarProvider).not.toContain('option value="translate"');
    expect(sidebarProvider).not.toContain('id="translateAction"');
    expect(sidebarProvider).toContain('class="actions primary-actions"');
    expect(sidebarProvider).toContain('class="secondary icon-button"');
    expect(sidebarProvider).toContain('id="pronunciation" class="secondary">🎙 Practice');
  });

  it("keeps translation and Chinese-expression results out of the English diff renderer", () => {
    const sidebarScript = readFileSync(new URL("../media/sidebar.js", import.meta.url), "utf8");
    expect(sidebarScript).toContain("function hasCjk(text)");
    expect(sidebarScript).toContain('currentDiffSuppressed = msg.mode === "express" || hasCjk(msg.source || "")');
    expect(sidebarScript).toContain(
      'state.mode = e.kind === "express" || e.kind === "translate" ? "express" : "coach"',
    );
    expect(sidebarScript).toContain("Polish English (⌘↵)");
    expect(sidebarScript).toContain('text: lastNative || $("input").value');
  });

  it("wraps long pronunciation staves into visual lines", () => {
    const playerScript = readFileSync(new URL("../media/player/player.js", import.meta.url), "utf8");
    const playerCss = readFileSync(new URL("../media/player/player.css", import.meta.url), "utf8");
    expect(playerScript).toContain("function splitVisualRows(row, containerEl)");
    expect(playerScript).toContain("function visualPoints(row, start, end)");
    expect(playerScript).toContain("ResizeObserver");
    expect(playerCss).toContain(".group-continued");
    expect(playerCss).toContain(".word.long-word .syl-text");
  });

  it("keeps Qwen Token Plan and DashScope keys separate", () => {
    const config = readFileSync(new URL("../src/vscode/config.ts", import.meta.url), "utf8");
    const secrets = readFileSync(new URL("../src/vscode/secrets.ts", import.meta.url), "utf8");
    const sidebarScript = readFileSync(new URL("../media/sidebar.js", import.meta.url), "utf8");
    const playerScript = readFileSync(new URL("../media/player/player.js", import.meta.url), "utf8");
    const tts = readFileSync(new URL("../src/core/tts.ts", import.meta.url), "utf8");
    expect(config).toContain('dashscopeApiKey: (await getSpeechSecret(context, "qwen")) || ""');
    expect(config).toContain('provider === "qwen" ? "" : base.apiKey');
    expect(secrets).toContain("Coach / Analysis key (Token Plan)");
    expect(secrets).toContain("Qwen DashScope key (Speech/TTS)");
    expect(secrets).toContain("does not fall back to the Token Plan key");
    expect(sidebarScript).toContain('kind: "chat"');
    expect(playerScript).toContain('kind: "speech"');
    expect(tts).toContain("Qwen DashScope key (Speech/TTS)");
    expect(properties["englishCoach.tts.qwenBaseURL"].description).toContain("separate Qwen DashScope key (Speech/TTS)");
  });
});
