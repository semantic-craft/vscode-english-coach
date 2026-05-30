const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "e.g", "i.e", "a.m", "p.m",
]);

/** Split English text into sentences. Deterministic and offline. */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    if (ch === "." && /\d/.test(normalized[i - 1] ?? "") && /\d/.test(normalized[i + 1] ?? "")) continue;
    if (ch === ".") {
      const before = normalized.slice(start, i);
      const lastWord = before.split(/\s/).pop()?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(lastWord)) continue;
    }
    let end = i + 1;
    while (end < normalized.length && "!?.".includes(normalized[end])) end++;
    const sentence = normalized.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = end;
    i = end - 1;
  }
  const tail = normalized.slice(start).trim();
  if (tail) out.push(tail);
  return out.length > 0 ? out : [normalized];
}
