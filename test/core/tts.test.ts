import { describe, it, expect, vi, afterEach } from "vitest";
import { splitTextForQwen, wrapPCMInWAV, synthesize, TTSConfig } from "../../src/core/tts";

afterEach(() => vi.restoreAllMocks());

function ttsConfig(overrides: Partial<TTSConfig>): TTSConfig {
  return {
    provider: "qwen",
    geminiApiKey: "",
    geminiVoice: "Kore",
    dashscopeApiKey: "",
    qwenModel: "qwen3-tts-flash",
    qwenVoice: "Cherry",
    qwenLanguageType: "Auto",
    qwenBaseURL: "https://dashscope.aliyuncs.com/api/v1",
    qwenInstructions: "",
    mimoApiKey: "",
    mimoBaseURL: "",
    mimoModel: "",
    mimoVoice: "",
    minimaxApiKey: "",
    minimaxBaseURL: "",
    minimaxModel: "",
    minimaxVoiceId: "",
    ...overrides,
  };
}

describe("splitTextForQwen", () => {
  it("returns one chunk for short text", () => {
    expect(splitTextForQwen("Hello there.")).toEqual(["Hello there."]);
  });
  it("splits long text on sentence boundaries", () => {
    const long = ("This is a sentence. ".repeat(40)).trim();
    const chunks = splitTextForQwen(long);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toContain("This is a sentence.");
  });
});

describe("wrapPCMInWAV", () => {
  it("prepends a 44-byte RIFF/WAVE header with valid fmt fields", () => {
    const pcm = Buffer.from([0, 1, 2, 3]);
    const wav = wrapPCMInWAV(pcm, 24000);
    expect(wav.length).toBe(44 + 4);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
    expect(wav.readUInt16LE(22)).toBe(1); // channels (mono)
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample — must not be 0
    expect(wav.readUInt32LE(40)).toBe(pcm.length); // data chunk size
  });
});

describe("synthesize", () => {
  it("Qwen falls back to the audio URL when inline data is an empty string", async () => {
    // Qwen3-TTS returns { audio: { data: "", url: "…wav" } } — an empty string,
    // not null, so the code must use || (not ??) to reach the URL.
    const audioBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: unknown) => {
      if (String(input).includes("multimodal-generation")) {
        return new Response(JSON.stringify({ output: { audio: { data: "", url: "http://example.com/a.wav" } } }), {
          status: 200,
        });
      }
      return new Response(audioBytes, { status: 200 });
    });
    const buffers = await synthesize("hi", ttsConfig({ provider: "qwen", dashscopeApiKey: "k" }));
    expect(buffers).toHaveLength(1);
    expect(buffers[0].length).toBe(8);
  });

  it("MiMo decodes base64 audio from the chat-completions response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { audio: { data: "AQIDBA==" } } }] }), { status: 200 }),
    );
    const buffers = await synthesize("hi", ttsConfig({ provider: "mimo", mimoApiKey: "k" }));
    expect(buffers).toHaveLength(1);
    expect(buffers[0].length).toBe(4);
  });

  it("MiniMax decodes hex audio from t2a_v2", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ base_resp: { status_code: 0 }, data: { audio: "01020304" } }), { status: 200 }),
    );
    const buffers = await synthesize("hi", ttsConfig({ provider: "minimax", minimaxApiKey: "k" }));
    expect(buffers).toHaveLength(1);
    expect(buffers[0].length).toBe(4);
  });
});
