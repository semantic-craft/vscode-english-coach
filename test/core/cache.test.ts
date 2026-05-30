import { describe, it, expect } from "vitest";
import { audioCacheKey } from "../../src/core/cache";

describe("audioCacheKey", () => {
  it("is stable for identical inputs and differs when any field changes", () => {
    const base = { text: "Hi.", provider: "qwen", voice: "Cherry", instructions: "", format: "mp3" };
    const k1 = audioCacheKey(base);
    expect(k1).toBe(audioCacheKey({ ...base }));
    expect(k1).not.toBe(audioCacheKey({ ...base, voice: "Ethan" }));
    expect(k1).not.toBe(audioCacheKey({ ...base, instructions: "slow" }));
    expect(k1).toMatch(/^[0-9a-f]{16,}$/);
  });
});
