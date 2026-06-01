import * as vscode from "vscode";
import {
  DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS,
  DEFAULT_SAY_IT_RIGHT_TTS_MODELS,
  DEFAULT_TTS_VOICES,
  ModelEntry,
  SAY_IT_RIGHT_ANALYSIS_MODELS,
  SAY_IT_RIGHT_PROVIDER_IDS,
  SAY_IT_RIGHT_TTS_MODELS,
  SayItRightProviderId,
  getProviderModelOptions,
  resolveModel,
} from "../core/models";
import { detectProtocol } from "../core/providers";
import { TTSConfig } from "../core/tts";
import { ModelTier, PROVIDER_IDS, ProviderConfig, ProviderId, ReasoningMode } from "../core/types";
import { getSecret, getSpeechSecret } from "./secrets";

export interface TtsTarget {
  provider: SayItRightProviderId;
  voice: string;
  teacherInstructions: string;
  ttsModel: string;
  ttsInstructModel: string;
  baseURL: string;
  apiKey: string;
}

export const PROVIDER_TITLES: Record<ProviderId, string> = {
  qwen: "Qwen (Token Plan)",
  minimax: "MiniMax",
  deepseek: "DeepSeek",
  mimo: "Xiaomi MiMo",
  gemini: "Gemini",
  openai: "OpenAI / ChatGPT",
};

const MIMO_ANALYSIS_BASE_URL = "https://token-plan-cn.xiaomimimo.com/anthropic";

function cfg() {
  return vscode.workspace.getConfiguration("englishCoach");
}

function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function getOrderedProviderIds(): ProviderId[] {
  const c = cfg();
  const parsed = (c.get<string>("providerOrder") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(isProviderId);
  const ordered = [...parsed, ...PROVIDER_IDS].filter((id, i, a) => a.indexOf(id) === i);
  const enabled = ordered.filter((id) => c.get<boolean>(`${id}.enabled`) === true);
  const list = enabled.length > 0 ? enabled : [defaultProviderId()];
  const def = defaultProviderId();
  return list.includes(def) ? [def, ...list.filter((id) => id !== def)] : list;
}

function isSayItRightProviderId(value: string): value is SayItRightProviderId {
  return (SAY_IT_RIGHT_PROVIDER_IDS as readonly string[]).includes(value);
}

export function defaultProviderId(): ProviderId {
  const value = cfg().get<string>("defaultProvider") ?? "deepseek";
  return isProviderId(value) ? value : "deepseek";
}

export function getModelTier(): ModelTier {
  const value = cfg().get<string>("modelTier") ?? "custom";
  return value === "fast" || value === "pro" || value === "custom" ? value : "custom";
}

export function getReasoningMode(): ReasoningMode {
  const value = cfg().get<string>("reasoningMode") ?? "off";
  return value === "on" || value === "auto" ? value : "off";
}

export function getTimeoutMs(): number {
  const n = cfg().get<number>("requestTimeoutSeconds") ?? 45;
  return Math.min(Math.max(Number.isFinite(n) ? n : 45, 5), 180) * 1000;
}

export function getMaxOutputTokens(): number {
  const n = cfg().get<number>("maxOutputTokens") ?? 4096;
  return Math.min(Math.max(Number.isFinite(n) ? n : 4096, 256), 32768);
}

export async function getProviderConfig(
  context: vscode.ExtensionContext,
  id: ProviderId,
  tier: ModelTier = getModelTier(),
): Promise<ProviderConfig> {
  const c = cfg();
  const configuredBaseURL = (c.get<string>(`${id}.baseURL`) ?? "").trim();
  const baseURL = id === "mimo" ? resolveMimoAnalysisBaseURL(configuredBaseURL) : configuredBaseURL;
  const customModel = (c.get<string>(`${id}.model`) ?? "").trim();
  const apiKey = (await getSecret(context, id)) ?? "";
  const model = resolveModel(id, tier, customModel) || getProviderModelOptions(id)[0]?.id || customModel;
  return {
    id,
    title: PROVIDER_TITLES[id],
    apiKey,
    baseURL,
    model,
    reasoningMode: getReasoningMode(),
    apiProtocol: detectProtocol(id, baseURL),
  };
}

export function getCoachModelOptions(ids: ProviderId[]): Record<ProviderId, ModelEntry[]> {
  return Object.fromEntries(ids.map((id) => [id, getProviderModelOptions(id)])) as Record<ProviderId, ModelEntry[]>;
}

export function getCoachModelSelection(id: ProviderId): string {
  const c = cfg();
  const customModel = (c.get<string>(`${id}.model`) ?? "").trim();
  const options = getProviderModelOptions(id);
  const resolved = resolveModel(id, getModelTier(), customModel);
  return knownModelOrDefault(resolved, options, options[0]?.id || "");
}

export async function getTTSConfig(context: vscode.ExtensionContext): Promise<TTSConfig> {
  const c = cfg();
  const raw = c.get<string>("tts.provider") ?? "qwen";
  const provider = (["qwen", "gemini", "mimo", "minimax"].includes(raw) ? raw : "qwen") as TTSConfig["provider"];
  return {
    provider,
    geminiApiKey: (await getSpeechSecret(context, "gemini")) || (await getSecret(context, "gemini")) || "",
    geminiModel: c.get<string>("tts.geminiModel") ?? "gemini-3.1-flash-tts-preview",
    geminiVoice: c.get<string>("tts.geminiVoice") ?? "Charon",
    dashscopeApiKey: (await getSpeechSecret(context, "qwen")) || "",
    qwenModel: c.get<string>("tts.qwenModel") ?? "qwen3-tts-flash",
    qwenVoice: c.get<string>("tts.qwenVoice") ?? "Jennifer",
    qwenLanguageType: c.get<string>("tts.qwenLanguageType") ?? "Auto",
    qwenBaseURL: c.get<string>("tts.qwenBaseURL") ?? "https://dashscope.aliyuncs.com/api/v1",
    qwenInstructions: c.get<string>("tts.qwenInstructions") ?? "",
    mimoApiKey: (await getSpeechSecret(context, "mimo")) || (await getSecret(context, "mimo")) || "",
    mimoBaseURL: c.get<string>("mimo.baseURL") ?? MIMO_ANALYSIS_BASE_URL,
    mimoModel: c.get<string>("tts.mimoModel") ?? "mimo-v2.5-tts",
    mimoVoice: c.get<string>("tts.mimoVoice") ?? "Chloe",
    minimaxApiKey: (await getSpeechSecret(context, "minimax")) || (await getSecret(context, "minimax")) || "",
    minimaxBaseURL: c.get<string>("tts.minimaxBaseURL") ?? "https://api.minimaxi.com/v1",
    minimaxModel: c.get<string>("tts.minimaxModel") ?? "speech-2.8-hd",
    minimaxVoiceId: c.get<string>("tts.minimaxVoiceId") ?? "English_expressive_narrator",
  };
}

function sirCfg() {
  return vscode.workspace.getConfiguration("sayItRight");
}

export function resolveMimoAnalysisBaseURL(baseURL?: string): string {
  const configured = (baseURL ?? "").trim();
  return isAnthropicCompatibleBaseURL(configured) ? configured : MIMO_ANALYSIS_BASE_URL;
}

function isAnthropicCompatibleBaseURL(baseURL: string): boolean {
  const lower = baseURL.toLowerCase();
  return lower.includes("/anthropic") || lower.endsWith("/v1/messages");
}

/**
 * The player runs two independent engines: an analysis engine and a speech engine. Each picks its
 * own provider (so e.g. Qwen analysis can pair with Gemini speech, or Qwen-on-token-plan analysis
 * with Qwen-on-the-regular-endpoint speech). Falls back to the legacy single `provider` setting,
 * then to qwen.
 */
export function getSayItRightProvider(role: "analysis" | "speech"): SayItRightProviderId {
  const c = sirCfg();
  const key = role === "analysis" ? "analysisProvider" : "speechProvider";
  const specific = (c.get<string>(key) ?? "").trim();
  if (isSayItRightProviderId(specific)) return specific;
  const legacy = (c.get<string>("provider") ?? "").trim();
  return isSayItRightProviderId(legacy) ? legacy : "qwen";
}

export async function getAnalysisConfig(context: vscode.ExtensionContext): Promise<ProviderConfig> {
  const provider = getSayItRightProvider("analysis");
  const base = await getProviderConfig(context, provider);
  return { ...base, model: getSayItRightAnalysisModel(provider) || base.model };
}

export function getSayItRightAnalysisModel(provider: SayItRightProviderId): string {
  const c = sirCfg();
  const overrideModel = (c.get<string>(`analysisModel.${provider}`) ?? "").trim();
  return knownModelOrDefault(
    overrideModel,
    SAY_IT_RIGHT_ANALYSIS_MODELS[provider],
    DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS[provider],
  );
}

export function getSayItRightTtsModel(provider: SayItRightProviderId): string {
  const c = sirCfg();
  const overrideModel = (c.get<string>(`ttsModel.${provider}`) ?? "").trim();
  return knownModelOrDefault(
    overrideModel,
    SAY_IT_RIGHT_TTS_MODELS[provider],
    DEFAULT_SAY_IT_RIGHT_TTS_MODELS[provider],
  );
}

function knownModelOrDefault(value: string, options: ModelEntry[], fallback: string): string {
  return options.some((option) => option.id === value) ? value : fallback;
}

export async function getTtsTarget(context: vscode.ExtensionContext): Promise<TtsTarget> {
  const c = sirCfg();
  const provider = getSayItRightProvider("speech");
  const base = await getProviderConfig(context, provider);
  // Qwen speech is DashScope-only in this extension and must not reuse the Token Plan analysis key.
  const apiKey = (await getSpeechSecret(context, provider)) || (provider === "qwen" ? "" : base.apiKey);
  return {
    provider,
    voice: (c.get<string>(`voice.${provider}`) ?? "").trim() || DEFAULT_TTS_VOICES[provider],
    teacherInstructions: (c.get<string>("teacherInstructions") ?? "").trim(),
    ttsModel: getSayItRightTtsModel(provider),
    ttsInstructModel: (c.get<string>("ttsInstructModel.qwen") ?? "").trim() || "qwen3-tts-instruct-flash",
    baseURL: base.baseURL,
    apiKey,
  };
}
