export type LoopStep = { type: "play" } | { type: "gap"; ms: number };

/** A shadowing loop: play, gap, play, gap, ..., play. The trailing gap is omitted. */
export function buildLoopPlan(_durationSec: number, times: number, gapSec: number): LoopStep[] {
  const n = Math.max(1, Math.floor(times));
  const gapMs = Math.max(0, gapSec) * 1000;
  const steps: LoopStep[] = [];
  for (let i = 0; i < n; i++) {
    steps.push({ type: "play" });
    if (i < n - 1) steps.push({ type: "gap", ms: gapMs });
  }
  return steps;
}
