import { describe, it, expect } from "vitest";
import { splitTextForQwen, wrapPCMInWAV } from "../../src/core/tts";

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
  it("prepends a 44-byte RIFF/WAVE header", () => {
    const pcm = Buffer.from([0, 1, 2, 3]);
    const wav = wrapPCMInWAV(pcm, 24000);
    expect(wav.length).toBe(44 + 4);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
  });
});
