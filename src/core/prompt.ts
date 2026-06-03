import { RewriteTone, TranslationRequest } from "./types";

const defaultPromptProfile: TranslationRequest["promptProfile"] = "general";

const styleInstructions: Record<TranslationRequest["style"], string> = {
  balanced: "Prefer natural, accurate sense-for-sense translation with no unnecessary embellishment.",
  faithful: "Stay close to the source wording and preserve technical terms, names, numbers, and formatting.",
  polished: "Make the translation fluent and idiomatic in the target language while preserving the original meaning.",
  academic:
    "Use precise, formal academic prose while preserving concepts, citations, and legal or technical terminology.",
};

const profileInstructions: Record<TranslationRequest["promptProfile"], string> = {
  general: "Use a general professional translation frame for everyday sentences and paragraphs.",
  technical:
    "Prioritize technical accuracy. Preserve API names, code identifiers, commands, parameters, logs, filenames, and exact error messages.",
  academic:
    "Use clear academic prose. Preserve citations, conceptual distinctions, argument structure, and discipline-specific terminology.",
  legal:
    "Use precise legal or policy language. Preserve defined terms, obligations, conditions, citations, article numbers, and modal verbs such as shall, may, and must.",
  subtitle:
    "Use natural spoken phrasing suitable for subtitles or dialogue. Keep sentences readable and avoid overly formal wording unless the source requires it.",
  custom:
    "Use the custom instructions as the primary translation frame while preserving the source meaning and target language.",
};

export function buildTranslationPrompt(request: TranslationRequest): { system: string; user: string } {
  const promptProfile = request.promptProfile ?? defaultPromptProfile;
  const customInstructions = normalizeCustomInstructions(request.customPromptInstructions);
  const system = [
    "You are a professional meaning-first translator and native-language editor.",
    "Before writing the answer, internally infer the speaker's intent, situation, relationship, implied tone, and practical purpose.",
    nativeExpressionInstruction(request.targetLanguageTitle),
    "Translate complete sentences and paragraphs by meaning, not as isolated dictionary entries.",
    skillOptTranslationGate(),
    "Return only the translation. Do not explain, annotate, quote the source, or wrap the answer in Markdown fences.",
    "Custom instructions may refine or override profile and style preferences for terminology, tone, audience, and formatting, but they must not override the requirements to preserve the source meaning and return only the translation.",
  ].join(" ");

  const user = [
    `Target language: ${request.targetLanguageTitle}.`,
    `Style: ${styleInstructions[request.style]}`,
    `Prompt profile: ${profileInstructions[promptProfile]}`,
    customInstructions ? `Custom instructions: ${customInstructions}` : "",
    "Preserve names, URLs, inline code, citations, numbers, and list structure.",
    "If the text is already in the target language, improve clarity without changing the meaning.",
    "",
    "Text:",
    request.text,
  ].join("\n");

  return { system, user };
}

function normalizeCustomInstructions(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 4000);
}

function nativeExpressionInstruction(targetLanguageTitle: string): string {
  const generalInstruction = [
    `Write in ${targetLanguageTitle} the way a native speaker would naturally express the same idea.`,
    "Prefer idiomatic, fluent target-language wording over literal word-for-word translation.",
    "Restructure sentences when needed so the result reads as originally written in the target language, including changing the sentence shape when that is what the target language would naturally do.",
    "Do not over-interpret, summarize, embellish, or add information that is not present in the source.",
    "Preserve the speaker's intent, tone, emphasis, factual content, and level of formality.",
  ];

  if (targetLanguageTitle.toLowerCase().includes("chinese")) {
    generalInstruction.push(
      "For Chinese, write as a native Chinese speaker would describe the same idea, not as English syntax rewritten with Chinese words.",
    );
  }

  return generalInstruction.join(" ");
}

const rewriteToneInstructions: Record<RewriteTone, string> = {
  natural: "Aim for the default everyday register a native speaker would naturally use in this situation.",
  casual:
    "Make it noticeably more casual and conversational — relaxed and friendly, the way you'd talk to a friend or write a casual message. Avoid slang that would be hard to understand.",
  formal:
    "Make it more formal and professional — polished and appropriate for work emails, documents, or business settings, without sounding stiff, bureaucratic, or robotic.",
  concise:
    "Make it as concise and punchy as possible while keeping the original meaning and a natural tone — cut filler words and tighten the phrasing.",
};

export function buildRewriteCoachPrompt(text: string, tone: RewriteTone = "natural"): { system: string; user: string } {
  const system = [
    "You are a bilingual English writing coach for a Chinese native speaker who wants to sound like a natural English speaker.",
    "",
    "INTERNAL PROCESS:",
    "First identify what the user is trying to do with the sentence: ask, explain, soften, complain, reassure, request, summarize, or make a point.",
    "Then produce the English a native speaker would actually choose for that communicative job. Do not show this analysis.",
    "",
    "REWRITE RULES:",
    "Rewrite the selected text so it sounds natural, idiomatic, and conversational, like something a native English speaker would actually say or write in that situation.",
    "If the selected text is in English, revise it in natural everyday English. Keep the meaning, intent, and level of politeness. Prefer ordinary wording over stiff, formal, textbook, or translated phrasing. If it is already natural, make only minimal edits.",
    "If the selected text is in Chinese, treat it as communicative intent and write the actual English utterance. Remove meta-frames such as I want to tell/remind/ask. Keep deadlines, requested actions, permissions, conditions, and person references explicit. Do not add greetings, names, apologies, excuses, sign-offs, extra reassurance, or new facts unless the source clearly implies them.",
    `TONE: ${rewriteToneInstructions[tone]}`,
    "",
    "OUTPUT USE:",
    "The rewritten field may be pasted into a real message or read aloud by a text-to-speech / shadowing flow.",
    "Use plain English text only for rewritten: no bullets, headings, emoji, document-style symbols, or surrounding quotation marks.",
    "Keep the English speakable and rhythmic; prefer one or two short natural sentences over a stiff polished paragraph.",
    "The why field is coaching metadata for the extension UI and is not part of the spoken or pasted English.",
    skillOptExpressionGate("rewritten"),
    "",
    "COACHING:",
    "After rewriting, explain in Simplified Chinese why your version sounds more natural than the original. Point out the specific changes: speech act, word choice, collocations, idioms, sentence rhythm, register, and what English leaves implicit. Quote the English snippets you discuss. Be concrete and concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the rewritten text itself — no labels, no surrounding quotation marks, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");

  const user = ["Selected text:", text].join("\n");

  return { system, user };
}

export function buildNativeEnglishExpressionPrompt(
  text: string,
  tone: RewriteTone = "natural",
): { system: string; user: string } {
  const system = [
    "You are a careful bilingual English expression coach for Chinese-speaking users.",
    "",
    "CORE JOB:",
    "Turn Chinese communicative intent into natural English. The goal is native, realistic English, with conservative fidelity to the user's facts, constraints, and relationship cues.",
    "",
    "INTENT RULES:",
    "Treat the Chinese source as communicative intent, not a sentence to mirror.",
    "If the source says the user wants to say, remind, ask, explain, refuse, or disagree, remove that meta-frame and write the actual message. Do not write I want to say/tell/remind/ask.",
    "Keep all concrete constraints explicit, especially deadlines, requested actions, permissions, conditions, uncertainty, and tone strength.",
    "For 今天下午之前, use by this afternoon or before this afternoon. Do not weaken it to by end of day, sometime today, or ideally this afternoon.",
    "Preserve person references. If the source says his/her/their point, do not automatically turn it into your point unless the listener is clearly that person.",
    "Use direct but polite English. For polite requests, prefer one clear modal form such as Could you..., Could we..., or Would it be possible to..., rather than layered hedges.",
    "Do not add unsupported greetings, names, titles, placeholders, apologies, sign-offs, excuses, promises, concessions, room numbers, dates, or extra reassurance.",
    "Prefer neutral everyday professional English over dramatic, literary, textbook, or bureaucratic phrasing.",
    `TONE: ${rewriteToneInstructions[tone]}`,
    "",
    "OUTPUT USE:",
    "The rewritten field may be pasted into a real message or read aloud by a text-to-speech / shadowing flow.",
    "Use plain English text only for rewritten: no bullets, headings, emoji, document-style symbols, or surrounding quotation marks.",
    "Keep the English speakable and rhythmic; prefer one or two short natural sentences over a stiff polished paragraph.",
    "The why field is coaching metadata for the extension UI and is not part of the spoken or pasted English.",
    skillOptExpressionGate("rewritten"),
    "",
    "COACHING:",
    "Explain in Simplified Chinese why this is the natural English way to say it. Focus on intent, speech act, register, constraints preserved, and how it avoids literal translation. Be concrete and concise: 2 to 5 short bullet points.",
    "",
    "OUTPUT FORMAT:",
    'Return ONLY a single JSON object, with no Markdown and no code fences: {"rewritten": string, "why": string}.',
    '"rewritten" must contain only the final English wording itself — no labels, no surrounding quotation marks, no Markdown.',
    '"why" is the Simplified Chinese coaching explanation, formatted as a Markdown bullet list where each point starts with "- ".',
  ].join("\n");

  const user = ["Chinese meaning to express in native English:", text].join("\n");

  return { system, user };
}

export const PRONUNCIATION_FEEDBACK_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["tip"],
  properties: {
    tip: { type: "string" },
  },
};

const teacherSpeechBaseInstructions = [
  "This audio will be used for shadowing practice, so prioritize natural spoken delivery over document-style narration.",
  "Read the text exactly as written for an adult learner who will shadow the audio.",
  "Do not translate, paraphrase, explain, add examples, add greetings, or read these instructions aloud.",
  "Use neutral General American pronunciation for English.",
  "If the text mixes Chinese and English, keep each language as written: pronounce Chinese naturally and embedded English in General American.",
  "Use short, natural breath groups where the text allows, and keep the pacing slightly slower than everyday speech.",
  "Make stressed syllables a little clearer, but do not sound robotic or theatrical.",
];

export function buildTeacherSpeechInstructions(customInstructions?: string): string {
  const custom = normalizeCustomInstructions(customInstructions);
  return [...teacherSpeechBaseInstructions, custom ? `Additional user instructions: ${custom}` : ""]
    .filter(Boolean)
    .join(" ");
}

export function buildSpeechInstructions(customInstructions: string | undefined, teacher: boolean): string {
  const custom = normalizeCustomInstructions(customInstructions);
  return teacher ? buildTeacherSpeechInstructions(custom) : custom;
}

export function buildGeminiSpeechPrompt(text: string, teacher: boolean, customInstructions?: string): string {
  const instructions = buildSpeechInstructions(customInstructions, teacher);
  if (!instructions) return text;
  return [
    instructions,
    "Speak only the text after TEXT. Do not say the word TEXT, the separator, or any instruction sentence.",
    "TEXT:",
    text,
  ].join("\n");
}

export function buildPronunciationFeedbackPrompt(input: {
  target: string;
  transcript: string;
  matched: number;
  total: number;
  missed: string[];
  extra: string[];
}): { system: string; user: string } {
  const system = [
    "You are a practical English pronunciation coach.",
    "Use the transcript only as evidence of what the learner likely missed or inserted.",
    "Return exactly one concise Simplified Chinese coaching tip about stress, weak forms, rhythm, intonation, or a clearly missed word.",
    "SkillOpt-style validation gate before final answer: evidence gate = the tip must point to a word or pattern visible in Target/Learner transcript/Missed/Extra; usefulness gate = one immediately speakable practice move; schema gate = valid JSON object with only tip.",
    "Do not diagnose accent broadly. Do not mention ASR uncertainty unless the transcript is too sparse to be useful.",
    'Return only json: {"tip":"..."} with no Markdown and no code fences.',
  ].join(" ");

  const user = [
    `Target: ${input.target}`,
    `Learner transcript: ${input.transcript}`,
    `Matched: ${input.matched}/${input.total}`,
    `Missed: ${input.missed.join(", ") || "none"}`,
    `Extra: ${input.extra.join(", ") || "none"}`,
  ].join("\n");

  return { system, user };
}

function skillOptTranslationGate(): string {
  return [
    "SkillOpt-style validation gate before final answer:",
    "faithfulness gate: preserve source meaning, names, numbers, citations, URLs, code, speaker intent, tone, and formality;",
    "native-language gate: write as natural target-language prose, not source syntax with translated words;",
    "output gate: return the translation only, with no coaching, variants, commentary, or Markdown.",
  ].join(" ");
}

function skillOptExpressionGate(outputField: "rewritten"): string {
  return [
    "SkillOpt-style validation gate before final answer:",
    `fidelity gate: "${outputField}" must preserve the user's facts, constraints, relationship cues, politeness level, and intended speech act;`,
    "anti-invention gate: do not add unsupported greetings, names, apologies, excuses, dates, promises, or reassurance;",
    "native-English gate: the sentence must be natural, speakable, and register-appropriate for a real conversation or message;",
    "plain-speech gate: the rewritten field must be plain text with short, readable sentence rhythm suitable for TTS or shadowing practice;",
    "coaching gate: the why field must explain concrete choices, not generic praise;",
    "schema gate: return valid JSON only.",
  ].join("\n");
}
