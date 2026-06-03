import { describe, it, expect } from "vitest";
import {
  buildGeminiSpeechPrompt,
  buildNativeEnglishExpressionPrompt,
  buildPronunciationFeedbackPrompt,
  buildRewriteCoachPrompt,
  buildTeacherSpeechInstructions,
  buildTranslationPrompt,
} from "../../src/core/prompt";

describe("buildTranslationPrompt", () => {
  it("uses a meaning-first native-expression translation flow", () => {
    const { system, user } = buildTranslationPrompt({
      text: "我今天有点撑不住了",
      targetLanguage: "en",
      targetLanguageTitle: "English",
      style: "polished",
      promptProfile: "general",
      timeoutMs: 1000,
      maxOutputTokens: 512,
    });
    expect(system).toContain("internally infer the speaker's intent");
    expect(system).toContain("native speaker would naturally express");
    expect(system).toContain("not as isolated dictionary entries");
    expect(system).toContain("SkillOpt-style validation gate");
    expect(system).toContain("faithfulness gate");
    expect(system).toContain("Return only the translation");
    expect(user).toContain("我今天有点撑不住了");
    expect(user).toContain("Preserve names, URLs, inline code");
  });
});

describe("buildRewriteCoachPrompt", () => {
  it("includes the selected text and asks for JSON output", () => {
    const { system, user } = buildRewriteCoachPrompt("I has a apple", "casual");
    expect(user).toContain("I has a apple");
    expect(system).toContain("rewritten");
    expect(system).toContain("why");
    expect(system).toContain("communicative job");
    expect(system).toContain("make only minimal edits");
    expect(system).toContain("The rewritten field may be pasted into a real message");
    expect(system).toContain("Use plain English text only for rewritten");
    expect(system).toContain("one or two short natural sentences");
    expect(system).toContain("native-English gate");
    expect(system).toContain("plain-speech gate");
    expect(system).toContain("schema gate");
  });
});

describe("buildNativeEnglishExpressionPrompt", () => {
  it("asks for native English expression rather than literal translation", () => {
    const { system, user } = buildNativeEnglishExpressionPrompt("我今天有点撑不住了", "natural");
    expect(user).toContain("我今天有点撑不住了");
    expect(system).toContain("Treat the Chinese source as communicative intent");
    expect(system).toContain("Do not write I want to say/tell/remind/ask");
    expect(system).toContain("Do not weaken it to by end of day");
    expect(system).toContain("Preserve person references");
    expect(system).toContain("Do not add unsupported greetings");
    expect(system).toContain("final English wording");
    expect(system).toContain("rewritten");
    expect(system).toContain("fidelity gate");
    expect(system).toContain("anti-invention gate");
    expect(system).toContain("The rewritten field may be pasted into a real message");
    expect(system).toContain("The why field is coaching metadata");
    expect(system).toContain("plain-speech gate");
  });
});

describe("speech prompt builders", () => {
  it("builds exact-text teacher speech instructions for mixed Chinese and English", () => {
    const instructions = buildTeacherSpeechInstructions("Keep a calm voice.");
    expect(instructions).toContain("shadowing practice");
    expect(instructions).toContain("Read the text exactly as written");
    expect(instructions).toContain("Do not translate");
    expect(instructions).toContain("General American");
    expect(instructions).toContain("short, natural breath groups");
    expect(instructions).toContain("mixes Chinese and English");
    expect(instructions).toContain("Keep a calm voice.");
  });

  it("wraps Gemini teacher speech with a clear text boundary", () => {
    const prompt = buildGeminiSpeechPrompt("Why does my Dropbox keep syncing the files?", true);
    expect(prompt).toContain("Speak only the text after TEXT");
    expect(prompt).toContain("TEXT:");
    expect(prompt).toContain("Why does my Dropbox keep syncing the files?");
    expect(prompt).toContain("Do not translate");
  });

  it("leaves normal Gemini speech as the exact input text", () => {
    expect(buildGeminiSpeechPrompt("Hello.", false)).toBe("Hello.");
  });
});

describe("buildPronunciationFeedbackPrompt", () => {
  it("asks for one concise JSON coaching tip grounded in the transcript diff", () => {
    const { system, user } = buildPronunciationFeedbackPrompt({
      target: "I really want it.",
      transcript: "I want it.",
      matched: 3,
      total: 4,
      missed: ["really"],
      extra: [],
    });
    expect(system).toContain("one concise Simplified Chinese coaching tip");
    expect(system).toContain("SkillOpt-style validation gate");
    expect(system).toContain("evidence gate");
    expect(system).toContain('{"tip":"..."}');
    expect(user).toContain("Missed: really");
    expect(user).toContain("Matched: 3/4");
  });
});
