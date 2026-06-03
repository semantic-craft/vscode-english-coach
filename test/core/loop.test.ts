import { describe, it, expect } from "vitest";
import { buildLoopPlan } from "../../src/core/loop";

describe("buildLoopPlan", () => {
  it("plays N times with a gap after each play except the last", () => {
    expect(buildLoopPlan(2, 3, 1)).toEqual([
      { type: "play" }, { type: "gap", ms: 1000 },
      { type: "play" }, { type: "gap", ms: 1000 },
      { type: "play" },
    ]);
  });
  it("clamps times to at least 1 and gap to >= 0", () => {
    expect(buildLoopPlan(1, 0, -5)).toEqual([{ type: "play" }]);
  });
});
