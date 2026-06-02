import { describe, it, expect, vi } from "vitest";
import { parseProsody, analyzeProsody, buildProsodyPrompt, PROSODY_SCHEMA } from "../../src/core/prosody";
import * as providers from "../../src/core/providers";

const sample = JSON.stringify({
  text: "Go.", isGeneratedExample: false, ipa: "/ɡoʊ/",
  thoughtGroups: [{ tone: "fall", words: [{ text: "Go", syllables: ["Go"], stressIndex: 0, stressed: true, nuclear: true }] }],
});

describe("buildProsodyPrompt", () => {
  it("frames the analysis as a learner-facing General American prosody plan", () => {
    const { system, user } = buildProsodyPrompt("Why does my Dropbox keep syncing the files?", false);
    expect(system).toContain("learner-facing General American prosody plan");
    expect(system).toContain("Preserve the user's words exactly");
    expect(system).toContain("Mark only what a learner should practice");
    expect(system).toContain("Function words");
    expect(system).toContain("leave linkToNext null");
    expect(system).toContain("SkillOpt-style validation gate");
    expect(system).toContain("text-fidelity gate");
    expect(user).toContain("Input kind: sentence or paragraph");
    expect(user).toContain("Why does my Dropbox keep syncing the files?");
  });

  it("keeps the structured tone contract aligned with the learner-facing prompt", () => {
    const tone = (((PROSODY_SCHEMA.properties as any).thoughtGroups.items.properties as any).tone.enum ?? []) as string[];
    expect(tone).toEqual(["fall", "rise", "level"]);
  });

  it("asks single-word analysis to generate one everyday example sentence", () => {
    const { user } = buildProsodyPrompt("sync", true);
    expect(user).toContain("Input kind: single selected word");
    expect(user).toContain("sourceWord");
    expect(user).toContain("one short, natural everyday example sentence");
  });
});

describe("parseProsody", () => {
  it("parses a clean JSON object", () => {
    expect(parseProsody(sample).text).toBe("Go.");
  });
  it("strips markdown fences", () => {
    expect(parseProsody("```json\n" + sample + "\n```").text).toBe("Go.");
  });
  it("repairs a missing top-level IPA from per-word IPA", () => {
    const raw = JSON.stringify({
      text: "Go home.",
      isGeneratedExample: false,
      thoughtGroups: [
        {
          tone: "fall",
          words: [
            { text: "Go", syllables: ["Go"], stressIndex: 0, stressed: true, nuclear: false, ipa: "/ɡoʊ/" },
            { text: "home", syllables: ["home"], stressIndex: 0, stressed: true, nuclear: true, ipa: "/hoʊm/" },
          ],
        },
      ],
    });
    expect(parseProsody(raw).ipa).toBe("/ɡoʊ hoʊm/");
  });
  it("repairs canonical words that omit syllables", () => {
    const raw = JSON.stringify({
      text: "Read it again?",
      isGeneratedExample: false,
      ipa: "/rid ɪt əˈɡɛn/",
      thoughtGroups: [
        {
          tone: "rise",
          words: [
            { text: "Read", stressIndex: 0, stressed: true, nuclear: false, ipa: "/rid/" },
            { text: "it", stressIndex: null, stressed: false, nuclear: false, ipa: "/ɪt/" },
            { text: "again", stressIndex: 1, stressed: true, nuclear: true, ipa: "/əˈɡɛn/" },
          ],
        },
      ],
    });
    expect(parseProsody(raw).thoughtGroups[0].words.map((word) => word.syllables)).toEqual([
      ["Read"],
      ["it"],
      ["again"],
    ]);
  });
  it("repairs canonical thought groups that omit tone", () => {
    const raw = JSON.stringify({
      text: "Can you read it again?",
      isGeneratedExample: false,
      ipa: "/kən jə rid ɪt əˈɡɛn/",
      thoughtGroups: [
        {
          words: [
            { text: "Can", syllables: ["Can"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "you", syllables: ["you"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "read", syllables: ["read"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "it", syllables: ["it"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "again", syllables: ["a", "gain"], stressIndex: 1, stressed: true, nuclear: true },
          ],
        },
      ],
    });
    expect(parseProsody(raw).thoughtGroups[0].tone).toBe("rise");
  });
  it("repairs a missing top-level IPA from syllable strings when word IPA is absent", () => {
    const raw = JSON.stringify({
      text: "Read it again?",
      isGeneratedExample: false,
      thoughtGroups: [
        {
          tone: "rise",
          words: [
            { text: "Read", syllables: ["rid"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "it", syllables: ["ɪt"], stressIndex: null, stressed: false, nuclear: false },
            { text: "again", syllables: ["ə", "ɡɛn"], stressIndex: 1, stressed: true, nuclear: true },
          ],
        },
      ],
    });
    const result = parseProsody(raw);
    expect(result.ipa).toBe("/rid ɪt əɡɛn/");
    expect(result.thoughtGroups[0].words[2].ipa).toBe("/əɡɛn/");
  });
  it("repairs loose word-analysis shape into the canonical stave shape", () => {
    const raw = JSON.stringify({
      text: "Could you turn it off and read the last line again?",
      transcription: "/kədʒu tɜːrn ɪt ɔːf ən riːd ðə læst laɪn əˈɡɛn/",
      isGeneratedExample: false,
      words: [
        { text: "Could", syllables: [{ text: "Could", ipa: "kəd" }], stress: 0 },
        { text: "you", syllables: [{ text: "you", ipa: "ju" }], stress: 0 },
        { text: "turn", syllables: [{ text: "turn", ipa: "tɜːrn" }], stress: 1 },
        { text: "it", syllables: [{ text: "it", ipa: "ɪt" }], stress: 0 },
        { text: "off", syllables: [{ text: "off", ipa: "ɔːf" }], stress: 1 },
        { text: "and", syllables: [{ text: "and", ipa: "ən" }], stress: 0 },
        { text: "read", syllables: [{ text: "read", ipa: "riːd" }], stress: 1 },
        { text: "the", syllables: [{ text: "the", ipa: "ðə" }], stress: 0 },
        { text: "last", syllables: [{ text: "last", ipa: "læst" }], stress: 1 },
        { text: "line", syllables: [{ text: "line", ipa: "laɪn" }], stress: 1 },
        { text: "again", syllables: [{ text: "a", ipa: "ə" }, { text: "gain", ipa: "ɡɛn" }], stress: 1 },
      ],
      thoughtGroups: [{ nuclearStress: 10, tone: "rise" }],
    });
    const result = parseProsody(raw);
    expect(result.ipa).toBe("/kədʒu tɜːrn ɪt ɔːf ən riːd ðə læst laɪn əˈɡɛn/");
    expect(result.thoughtGroups).toHaveLength(1);
    expect(result.thoughtGroups[0].tone).toBe("rise");
    expect(result.thoughtGroups[0].words.filter((word) => word.nuclear).map((word) => word.text)).toEqual(["again"]);
    expect(result.thoughtGroups[0].words.filter((word) => word.stressIndex === null).map((word) => word.text)).toEqual([
      "Could",
      "you",
      "it",
      "and",
      "the",
    ]);
  });
  it("normalizes everyday English stress, tone, punctuation, and nuclear focus", () => {
    const raw = JSON.stringify({
      text: "Could you turn it off and read the last line again?",
      isGeneratedExample: false,
      ipa: "/kəd jə tɝn ɪt ɔf ən rid ðə læst laɪn əˈɡɛn/",
      thoughtGroups: [
        {
          tone: "fall",
          words: [
            { text: "Could", syllables: ["Could"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "you", syllables: ["you"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "turn", syllables: ["turn"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "it", syllables: ["it"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "off", syllables: ["off"], stressIndex: 0, stressed: true, nuclear: true },
          ],
        },
        {
          tone: "fall",
          words: [
            { text: "and", syllables: ["and"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "read", syllables: ["read"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "the", syllables: ["the"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "last", syllables: ["last"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "line", syllables: ["line"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "again?", syllables: ["a", "gain"], stressIndex: 1, stressed: true, nuclear: true },
          ],
        },
      ],
    });
    const result = parseProsody(raw);
    expect(result.thoughtGroups[0].tone).toBe("level");
    expect(result.thoughtGroups[1].tone).toBe("rise");
    expect(result.thoughtGroups[0].words.map((word) => [word.text, word.stressed, word.stressIndex])).toEqual([
      ["Could", false, null],
      ["you", false, null],
      ["turn", true, 0],
      ["it", false, null],
      ["off", true, 0],
    ]);
    expect(result.thoughtGroups[1].words.at(-1)).toMatchObject({ text: "again", nuclear: true, stressed: true });
  });

  it("merges weak function-word thought groups before choosing nuclear stress", () => {
    const raw = JSON.stringify({
      text: "Could you turn it off and read the last line again?",
      isGeneratedExample: false,
      ipa: "/kəd jə tɝn ɪt ɔf ən rid ðə læst laɪn əˈɡɛn/",
      thoughtGroups: [
        {
          tone: "rise",
          words: [
            { text: "Could", syllables: ["Could"], stressIndex: null, stressed: false, nuclear: false },
            { text: "you", syllables: ["you"], stressIndex: 0, stressed: true, nuclear: true },
          ],
        },
        {
          tone: "fall",
          words: [
            { text: "turn", syllables: ["turn"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "it", syllables: ["it"], stressIndex: null, stressed: false, nuclear: false },
            { text: "off", syllables: ["off"], stressIndex: 0, stressed: true, nuclear: true },
          ],
        },
        {
          tone: "rise",
          words: [
            { text: "and", syllables: ["and"], stressIndex: 0, stressed: true, nuclear: true },
            { text: "read", syllables: ["read"], stressIndex: 0, stressed: true, nuclear: false },
          ],
        },
        {
          tone: "rise",
          words: [
            { text: "the", syllables: ["the"], stressIndex: null, stressed: false, nuclear: false },
            { text: "last", syllables: ["last"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "line", syllables: ["line"], stressIndex: 0, stressed: true, nuclear: true },
          ],
        },
        {
          tone: "rise",
          words: [{ text: "again", syllables: ["a", "gain"], stressIndex: 1, stressed: true, nuclear: true }],
        },
      ],
    });
    const result = parseProsody(raw);
    expect(result.thoughtGroups).toHaveLength(2);
    expect(result.thoughtGroups[0].words.map((word) => word.text)).toEqual(["Could", "you", "turn", "it", "off"]);
    expect(result.thoughtGroups[0].words.filter((word) => word.nuclear).map((word) => word.text)).toEqual(["off"]);
    expect(result.thoughtGroups[1].words.map((word) => word.text)).toEqual(["and", "read", "the", "last", "line", "again"]);
    expect(result.thoughtGroups[1].words.filter((word) => word.nuclear).map((word) => word.text)).toEqual(["again"]);
    expect(result.thoughtGroups[1].words[0]).toMatchObject({ text: "and", stressed: false, stressIndex: null });
  });

  it("reduces common contractions instead of over-stressing every word", () => {
    const raw = JSON.stringify({
      text: "I'm going to finish this today.",
      isGeneratedExample: false,
      ipa: "/aɪm ˈɡoʊɪŋ tə ˈfɪnɪʃ ðɪs təˈdeɪ/",
      thoughtGroups: [
        {
          tone: "level",
          words: [
            { text: "I'm", syllables: ["I'm"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "going", syllables: ["go", "ing"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "to", syllables: ["to"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "finish", syllables: ["fin", "ish"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "this", syllables: ["this"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "today.", syllables: ["to", "day"], stressIndex: 1, stressed: true, nuclear: true },
          ],
        },
      ],
    });
    const result = parseProsody(raw);
    expect(result.thoughtGroups[0].tone).toBe("fall");
    expect(result.thoughtGroups[0].words.map((word) => [word.text, word.stressed, word.nuclear])).toEqual([
      ["I'm", false, false],
      ["going", true, false],
      ["to", false, false],
      ["finish", true, false],
      ["this", false, false],
      ["today", true, true],
    ]);
  });
});

describe("analyzeProsody", () => {
  it("calls the provider with the schema and returns a validated analysis", async () => {
    const spy = vi.spyOn(providers, "generateWithProvider").mockResolvedValue(sample);
    const cfg = { id: "qwen", title: "Qwen", model: "qwen3.6-flash", apiKey: "k", baseURL: "b", apiProtocol: "openai" } as any;
    const result = await analyzeProsody("Go.", cfg, 1000, 2048);
    expect(result.text).toBe("Go.");
    expect(spy).toHaveBeenCalledWith(cfg, expect.anything(), 1000, 2048, expect.objectContaining({ responseJsonSchema: PROSODY_SCHEMA }));
    spy.mockRestore();
  });

  it("retries without the full schema when a provider returns the schema instead of an analysis", async () => {
    const schemaEcho = JSON.stringify(PROSODY_SCHEMA);
    const spy = vi.spyOn(providers, "generateWithProvider").mockResolvedValueOnce(schemaEcho).mockResolvedValueOnce(sample);
    const cfg = {
      id: "deepseek",
      title: "DeepSeek",
      model: "deepseek-v4-pro",
      apiKey: "k",
      baseURL: "b",
      apiProtocol: "anthropic",
    } as any;
    const result = await analyzeProsody("Go.", cfg, 1000, 2048);
    expect(result.text).toBe("Go.");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[0][4]).toEqual({ responseMimeType: "application/json" });
    expect(spy.mock.calls[1][4]).toEqual({ responseMimeType: "application/json" });
    expect(spy.mock.calls[1][1].system).toContain("not the JSON schema");
    spy.mockRestore();
  });

  it.each([
    ["qwen", "Qwen", "qwen3.6-flash", "openai", true],
    ["gemini", "Gemini", "gemini-3.5-flash", "openai", true],
    ["mimo", "MiMo", "mimo-v2.5-pro", "openai", true],
  ])("runs %s analysis through the same everyday-English normalization", async (id, title, model, apiProtocol, sendsSchema) => {
    const raw = JSON.stringify({
      text: "Can you read it again?",
      isGeneratedExample: false,
      ipa: "/kən jə rid ɪt əˈɡɛn/",
      thoughtGroups: [
        {
          tone: "fall",
          words: [
            { text: "Can", syllables: ["Can"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "you", syllables: ["you"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "read", syllables: ["read"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "it", syllables: ["it"], stressIndex: 0, stressed: true, nuclear: false },
            { text: "again?", syllables: ["a", "gain"], stressIndex: 1, stressed: true, nuclear: true },
          ],
        },
      ],
    });
    const spy = vi.spyOn(providers, "generateWithProvider").mockResolvedValue(raw);
    const cfg = { id, title, model, apiKey: "k", baseURL: "https://example.test/v1", apiProtocol } as any;
    const result = await analyzeProsody("Can you read it again?", cfg, 1000, 2048);
    expect(result.thoughtGroups[0].tone).toBe("rise");
    expect(result.thoughtGroups[0].words.filter((word) => word.stressIndex === null).map((word) => word.text)).toEqual([
      "Can",
      "you",
      "it",
    ]);
    expect(result.thoughtGroups[0].words.at(-1)).toMatchObject({ text: "again", nuclear: true });
    expect(Boolean(spy.mock.calls[0][4]?.responseJsonSchema)).toBe(sendsSchema);
    spy.mockRestore();
  });
});
