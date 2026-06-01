import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildNativeEnglishExpressionPrompt } from "../src/core/prompt";
import { detectProtocol, generateWithProvider } from "../src/core/providers";
import { parseRewriteResult } from "../src/core/rewrite";
import { ProviderConfig, ProviderId, RewriteTone } from "../src/core/types";

type CandidateId = "baseline" | "candidate-a" | "candidate-b";

interface EvalSample {
  id: string;
  scenario: string;
  tone: RewriteTone;
  input: string;
  checks: string[];
}

interface ScoreCard {
  nativeEnglish: number;
  intentFidelity: number;
  noChineseCalque: number;
  directUtterance: number;
  registerFit: number;
  noUnsupportedAddition: number;
  brevity: number;
  total: number;
  notes: string;
  failureModes: string[];
}

interface EvalRecord {
  sample: EvalSample;
  candidate: CandidateId;
  output: string;
  why?: string;
  score?: ScoreCard;
  raw?: string;
  error?: string;
}

const samples: EvalSample[] = [
  {
    id: "deadline-reminder",
    scenario: "Polite work message reminding someone to send a file before this afternoon.",
    tone: "natural",
    input: "我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。",
    checks: ["Must keep the deadline before this afternoon.", "Must ask for sending the file.", "Must not say I want to remind you."],
  },
  {
    id: "non-blaming-explanation",
    scenario: "Message to a foreign colleague explaining that the problem came from unclear requirements, not bad work.",
    tone: "natural",
    input: "我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。",
    checks: ["Must avoid sounding accusatory.", "Must not translate foreign colleague.", "Must preserve the shared responsibility."],
  },
  {
    id: "hotel-room-request",
    scenario: "Front desk request at a hotel.",
    tone: "natural",
    input: "我想跟酒店前台说，房间里的空调声音太大了，能不能换一个安静一点的房间。",
    checks: ["Must mention the noisy AC.", "Must ask about moving rooms.", "Must fit a service counter interaction."],
  },
  {
    id: "advisor-materials",
    scenario: "Message to an academic advisor.",
    tone: "natural",
    input: "我想跟导师说，材料我已经基本写完了，但还想再核对一下数据，能不能明天上午发给他。",
    checks: ["Must keep basically done.", "Must keep checking data.", "Must ask whether sending tomorrow morning is okay."],
  },
  {
    id: "reschedule-meeting",
    scenario: "Polite workplace meeting reschedule.",
    tone: "natural",
    input: "我想礼貌地说今天不太方便开会，能不能改到明天下午。",
    checks: ["Must say today is not convenient.", "Must ask to move to tomorrow afternoon.", "Must avoid unsupported excuses."],
  },
  {
    id: "mild-disagreement",
    scenario: "Mild disagreement in a technical or work discussion.",
    tone: "natural",
    input: "我想说我理解他的观点，但这个方案可能会让后续维护变复杂。",
    checks: ["Must acknowledge the point.", "Must preserve possible maintenance complexity.", "Must sound like mild disagreement."],
  },
];

const rewriteResponseSchema = {
  type: "object",
  properties: {
    rewritten: { type: "string" },
    why: { type: "string" },
  },
  required: ["rewritten", "why"],
  additionalProperties: false,
};

const scoreKeys: Array<keyof Omit<ScoreCard, "total" | "notes" | "failureModes">> = [
  "nativeEnglish",
  "intentFidelity",
  "noChineseCalque",
  "directUtterance",
  "registerFit",
  "noUnsupportedAddition",
  "brevity",
];

const candidates: Array<{
  id: CandidateId;
  title: string;
  build: (text: string, tone: RewriteTone) => { system: string; user: string };
}> = [
  {
    id: "baseline",
    title: "Current built-in buildNativeEnglishExpressionPrompt",
    build: buildNativeEnglishExpressionPrompt,
  },
  {
    id: "candidate-a",
    title: "Intent-to-utterance, native daily English, strict no unsupported additions",
    build: buildCandidateA,
  },
  {
    id: "candidate-b",
    title: "Conservative intent expression, closer to source constraints",
    build: buildCandidateB,
  },
];

async function main(): Promise<void> {
  loadEnvFile(join(homedir(), ".env"));
  loadEnvFile(join(homedir(), ".hermes", ".env"));
  if (process.env.INTENT_EVAL_ENV_FILE) loadEnvFile(expandHome(process.env.INTENT_EVAL_ENV_FILE));

  const config = resolveProviderConfig();
  const reportPath = join(projectRoot(), "docs", "evals", "intent-expression-2026-05-31.md");
  mkdirSync(dirname(reportPath), { recursive: true });

  if (!config.apiKey) {
    writeFileSync(reportPath, renderNoKeyReport(config), "utf8");
    console.log(`No project-visible provider key found. Wrote eval template: ${reportPath}`);
    return;
  }

  const records: EvalRecord[] = [];
  for (const sample of samples) {
    for (const candidate of candidates) {
      const record = await runCandidate(config, sample, candidate);
      if (record.output) {
        record.score = await judgeOutput(config, sample, candidate.id, record.output);
        applyDeterministicGuards(sample, record.output, record.score);
      }
      records.push(record);
    }
  }

  writeFileSync(reportPath, renderLiveReport(config, records), "utf8");
  console.log(`Wrote live eval report: ${reportPath}`);
}

async function runCandidate(
  config: ProviderConfig,
  sample: EvalSample,
  candidate: (typeof candidates)[number],
): Promise<EvalRecord> {
  const prompt = candidate.build(sample.input, sample.tone);
  try {
    const raw = await generateWithProvider(config, prompt, 90_000, 700, {
      responseMimeType: "application/json",
      responseJsonSchema: rewriteResponseSchema,
      temperature: 0,
    });
    const parsed = parseRewriteResult(raw);
    return { sample, candidate: candidate.id, output: parsed.rewritten, why: parsed.why, raw };
  } catch (error) {
    return {
      sample,
      candidate: candidate.id,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function judgeOutput(config: ProviderConfig, sample: EvalSample, candidate: CandidateId, output: string): Promise<ScoreCard> {
  const prompt = {
    system: [
      "You are a strict evaluator of Chinese-intent-to-native-English outputs.",
      "Score each criterion from 1 to 5. Be severe about translationese, unsupported additions, and meta-language.",
      "Return only JSON with numeric scores, total, notes, and failureModes.",
    ].join("\n"),
    user: [
      `Candidate: ${candidate}`,
      `Scenario: ${sample.scenario}`,
      `Chinese intent: ${sample.input}`,
      `Output: ${output}`,
      "",
      "Rubric:",
      "- nativeEnglish: sounds like something an English native speaker would naturally say/write.",
      "- intentFidelity: preserves intent, deadlines, requested actions, and tone strength.",
      "- noChineseCalque: avoids Chinese word order, Chinese politeness formulas, and meta-language.",
      "- directUtterance: writes the actual line to say, not a report such as I want to tell...",
      "- registerFit: fits the scene: colleague, front desk, advisor, meeting, or technical discussion.",
      "- noUnsupportedAddition: does not add greetings, apologies, names, sign-offs, excuses, concessions, promises, or facts not in the source.",
      "- brevity: concise and not over-hedged.",
      "",
      "Known failure modes to flag:",
      "- I want to tell/remind/ask...",
      "- weakens before this afternoon into sometime today or ideally this afternoon.",
      "- adds No worries if not, Hi Professor [Name], Sorry to bother you, or unsupported excuses.",
      "- sounds too formal, too long, or like translated Chinese.",
      "- makes the no-blame explanation sound accusatory.",
      "",
      "Return JSON exactly like:",
      '{"nativeEnglish":5,"intentFidelity":5,"noChineseCalque":5,"directUtterance":5,"registerFit":5,"noUnsupportedAddition":5,"brevity":5,"total":35,"notes":"...","failureModes":[]}',
    ].join("\n"),
  };
  const raw = await generateWithProvider(config, prompt, 90_000, 700, {
    responseMimeType: "application/json",
    temperature: 0,
  });
  const parsed = parseJson(raw) as Partial<ScoreCard>;
  const normalized = Object.fromEntries(scoreKeys.map((key) => [key, clampScore(parsed[key])])) as Omit<
    ScoreCard,
    "total" | "notes" | "failureModes"
  >;
  const total = scoreKeys.reduce((sum, key) => sum + normalized[key], 0);
  return {
    ...normalized,
    total,
    notes: typeof parsed.notes === "string" ? parsed.notes : "",
    failureModes: Array.isArray(parsed.failureModes) ? parsed.failureModes.map(String) : [],
  };
}

function buildCandidateA(text: string, tone: RewriteTone): { system: string; user: string } {
  const system = [
    "You are Parlance, a native-English expression editor for Chinese-speaking users.",
    "",
    "Core job: turn the user's communicative intent into the actual English utterance a native speaker would use in that situation.",
    "",
    "Principles:",
    "- Treat the Chinese source as communicative intent, not a sentence to mirror.",
    "- If the source says the user wants to say, remind, ask, explain, refuse, or disagree, write the actual line addressed to the listener. Do not write I want to say/tell/remind/ask.",
    "- Address the listener directly when that is what the scene calls for.",
    "- Preserve practical constraints exactly: deadlines, requested actions, permissions, conditions, uncertainty, and tone strength.",
    "- For 今天下午之前, use by this afternoon or before this afternoon. Do not weaken it to by end of day, sometime today, or ideally this afternoon.",
    "- Preserve person references. If the source says his/her/their point, do not turn it into your point unless the listener is clearly that person.",
    "- Do not add unsupported greetings, names, placeholders, apologies, sign-offs, excuses, promises, concessions, or new facts.",
    "- Do not invent room numbers, titles, professor names, dates, reasons, or relationship details.",
    "- Prefer concise idiomatic English. For polite requests, use one clear modal form such as Could you..., Could we..., or Would it be possible to..., instead of layered hedges.",
    "- Avoid Chinese calques, Chinese politeness formulas, and overly formal business-English padding.",
    "- Make it sound real: the result should be something someone could actually send or say today.",
    `Tone target: ${toneInstruction(tone)}`,
    "",
    "Output:",
    'Return only JSON: {"rewritten": string, "why": string}.',
    "rewritten must contain only the final English wording, with no labels, greetings unless explicitly supported, quotation marks, or Markdown.",
    'why must be a concise Simplified Chinese bullet list explaining the intent choice and why it avoids literal translation. Each point starts with "- ".',
  ].join("\n");

  return { system, user: ["Chinese intent:", text].join("\n") };
}

function buildCandidateB(text: string, tone: RewriteTone): { system: string; user: string } {
  const system = [
    "You are a careful bilingual English expression coach.",
    "",
    "Turn Chinese communicative intent into natural English. The goal is native, realistic English, but with conservative fidelity to the user's facts and constraints.",
    "",
    "Rules:",
    "- Remove meta-frames such as I want to tell/remind/ask; write the actual message.",
    "- Keep all concrete constraints explicit, especially deadlines and requested actions.",
    "- Do not weaken 今天下午之前 into end of day.",
    "- Preserve third-person references such as his point; do not automatically address the listener as you.",
    "- Use direct but polite English. Do not stack multiple politeness phrases.",
    "- Do not add greetings, names, apologies, excuses, sign-offs, or extra reassurance unless the Chinese source clearly implies them.",
    "- Prefer neutral everyday professional English over dramatic, literary, or textbook phrasing.",
    `Tone target: ${toneInstruction(tone)}`,
    "",
    "Output:",
    'Return only JSON: {"rewritten": string, "why": string}.',
    "rewritten must contain only the final English wording.",
    'why must be a concise Simplified Chinese bullet list. Each point starts with "- ".',
  ].join("\n");

  return { system, user: ["Chinese intent:", text].join("\n") };
}

function applyDeterministicGuards(sample: EvalSample, output: string, score: ScoreCard): void {
  const lower = output.toLowerCase();
  const failures: string[] = [];
  const cap = (key: keyof Omit<ScoreCard, "total" | "notes" | "failureModes">, max: number) => {
    if (score[key] > max) score[key] = max;
  };

  if (/\bi want to (tell|say|remind|ask|explain)\b/i.test(output)) {
    failures.push("meta-language: I want to...");
    cap("directUtterance", 1);
    cap("noChineseCalque", 2);
    cap("nativeEnglish", 3);
  }

  if (sample.id === "deadline-reminder" && /\bend of (the )?day\b|\bsometime today\b|\bideally this afternoon\b/i.test(output)) {
    failures.push("deadline weakened from before this afternoon");
    cap("intentFidelity", 3);
  }

  if (/\b(no worries if not|sorry to bother you|dear\b|best regards|regards\b|\[name\])\b/i.test(output)) {
    failures.push("unsupported politeness wrapper");
    cap("noUnsupportedAddition", 2);
    cap("brevity", 3);
  }

  if (/\bhi\b|\bhello\b/i.test(output)) {
    failures.push("unsupported greeting");
    cap("noUnsupportedAddition", 3);
    cap("brevity", 4);
  }

  if (/\b(room|rm)\s*\d+\b/i.test(output)) {
    failures.push("invented room number");
    cap("noUnsupportedAddition", 1);
  }

  if (/\bprofessor\b|\bdr\.\b/i.test(output)) {
    failures.push("unsupported academic title/name");
    cap("noUnsupportedAddition", 3);
  }

  if (sample.id === "non-blaming-explanation" && /\bforeign colleague\b/i.test(output)) {
    failures.push("translated audience meta-label");
    cap("directUtterance", 2);
    cap("noChineseCalque", 2);
  }

  if (sample.id === "non-blaming-explanation" && /\bbad job\b|\bpoor job\b|\bnot good enough\b/i.test(output)) {
    failures.push("no-blame explanation sounds too blunt");
    cap("registerFit", 3);
    cap("nativeEnglish", 4);
  }

  if (sample.id === "mild-disagreement" && /他的观点/.test(sample.input) && /\byour point\b/i.test(lower)) {
    failures.push("changed third-person point into direct second-person point");
    cap("intentFidelity", 4);
  }

  if (failures.length) {
    score.failureModes = Array.from(new Set([...(score.failureModes || []), ...failures]));
    score.total = scoreKeys.reduce((sum, key) => sum + score[key], 0);
  }
}

function toneInstruction(tone: RewriteTone): string {
  if (tone === "casual") return "relaxed and conversational, but still clear.";
  if (tone === "formal") return "professional and polished, without bureaucratic padding.";
  if (tone === "concise") return "as short as possible while preserving the intent.";
  return "natural everyday English for the scene.";
}

function resolveProviderConfig(): ProviderConfig {
  const provider = (process.env.INTENT_EVAL_PROVIDER || "mimo") as ProviderId;
  const defaults: Record<string, { title: string; baseURL: string; model: string; keyEnv: string[] }> = {
    mimo: {
      title: "Xiaomi MiMo",
      baseURL: process.env.XIAOMI_BASE_URL || "https://token-plan-cn.xiaomimimo.com/v1",
      model: process.env.INTENT_EVAL_MODEL || "mimo-v2.5",
      keyEnv: ["INTENT_EVAL_API_KEY", "XIAOMI_API_KEY"],
    },
    minimax: {
      title: "MiniMax",
      baseURL: process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic",
      model: process.env.INTENT_EVAL_MODEL || "MiniMax-M3",
      keyEnv: ["INTENT_EVAL_API_KEY", "MINIMAX_API_KEY", "MINIMAX_CN_API_KEY"],
    },
    qwen: {
      title: "Qwen (Token Plan)",
      baseURL: process.env.QWEN_BASE_URL || "https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic",
      model: process.env.INTENT_EVAL_MODEL || "qwen3.6-flash",
      keyEnv: ["INTENT_EVAL_API_KEY", "QWEN_TOKEN_PLAN_API_KEY", "TOKEN_PLAN_API_KEY", "QWEN_API_KEY"],
    },
  };
  const fallback = defaults[provider] || defaults.mimo;
  const baseURL = process.env.INTENT_EVAL_BASE_URL || fallback.baseURL;
  const model = process.env.INTENT_EVAL_MODEL || fallback.model;
  const apiKey = fallback.keyEnv.map((key) => process.env[key]).find(Boolean) || "";
  return {
    id: provider,
    title: fallback.title,
    apiKey,
    baseURL,
    model,
    reasoningMode: "off",
    apiProtocol: detectProtocol(provider, baseURL),
  };
}

function renderLiveReport(config: ProviderConfig, records: EvalRecord[]): string {
  const byCandidate = candidates.map((candidate) => {
    const candidateRecords = records.filter((record) => record.candidate === candidate.id && record.score);
    const total = candidateRecords.reduce((sum, record) => sum + (record.score?.total || 0), 0);
    return { ...candidate, total, avg: candidateRecords.length ? total / candidateRecords.length : 0 };
  });
  const winner = byCandidate.slice().sort((a, b) => b.avg - a.avg)[0];
  const lines = [
    "# Intent Expression Prompt Eval",
    "",
    `Date: 2026-05-31`,
    `Provider: ${config.title}`,
    `Model: ${config.model}`,
    `Base URL: ${config.baseURL}`,
    "Temperature: 0 via project generateWithProvider(options.temperature)",
    "API key: present (redacted)",
    "",
    "## Summary",
    "",
    "| Candidate | Total | Average per sample |",
    "|---|---:|---:|",
    ...byCandidate.map((item) => `| ${item.id} - ${item.title} | ${item.total} | ${item.avg.toFixed(2)} |`),
    "",
    `Selected: ${winner.id} (${winner.title}).`,
    "",
    "## Outputs And Scores",
    "",
  ];

  for (const sample of samples) {
    lines.push(`### ${sample.id}`);
    lines.push("");
    lines.push(`Scenario: ${sample.scenario}`);
    lines.push("");
    lines.push(`Chinese intent: ${sample.input}`);
    lines.push("");
    for (const candidate of candidates) {
      const record = records.find((item) => item.sample.id === sample.id && item.candidate === candidate.id);
      lines.push(`#### ${candidate.id}`);
      lines.push("");
      if (!record || record.error) {
        lines.push(`Error: ${record?.error || "missing record"}`);
        lines.push("");
        continue;
      }
      lines.push("Output:");
      lines.push("");
      lines.push(blockquote(record.output));
      lines.push("");
      lines.push(scoreLine(record.score));
      if (record.score?.failureModes.length) {
        lines.push(`Failure modes: ${record.score.failureModes.join("; ")}`);
      }
      if (record.score?.notes) {
        lines.push(`Notes: ${record.score.notes}`);
      }
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderNoKeyReport(config: ProviderConfig): string {
  return [
    "# Intent Expression Prompt Eval",
    "",
    "Status: live provider eval not run.",
    `Provider attempted: ${config.title}`,
    `Model attempted: ${config.model}`,
    `Base URL attempted: ${config.baseURL}`,
    "Reason: no project-visible API key was found in INTENT_EVAL_API_KEY, provider env vars, ~/.env, or ~/.hermes/.env.",
    "",
    "Run:",
    "",
    "```bash",
    "npm run eval:intent-expression",
    "```",
    "",
    "Samples:",
    "",
    ...samples.map((sample) => `- ${sample.id}: ${sample.input}`),
    "",
  ].join("\n");
}

function scoreLine(score: ScoreCard | undefined): string {
  if (!score) return "Score: not available";
  return [
    `Score: ${score.total}/35`,
    `Native=${score.nativeEnglish}`,
    `Intent=${score.intentFidelity}`,
    `NoCalque=${score.noChineseCalque}`,
    `Direct=${score.directUtterance}`,
    `Register=${score.registerFit}`,
    `NoAdd=${score.noUnsupportedAddition}`,
    `Brevity=${score.brevity}`,
  ].join(" | ");
}

function blockquote(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error(`Could not parse JSON: ${cleaned.slice(0, 200)}`);
  }
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.round(n), 1), 5);
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function expandHome(value: string): string {
  return value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
}

function projectRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
