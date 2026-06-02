import { ProviderId } from "./types";

export interface ModelEntry {
  id: string;
  title: string;
}

interface ProviderModels {
  fast: ModelEntry;
  pro: ModelEntry;
  all: ModelEntry[];
}

const MODEL_CATALOG: Record<ProviderId, ProviderModels> = {
  qwen: {
    fast: { id: "qwen3.6-flash", title: "Qwen 3.6 Flash" },
    pro: { id: "qwen3.7-plus", title: "Qwen 3.7 Plus" },
    all: [
      { id: "qwen3.6-flash", title: "Qwen 3.6 Flash" },
      { id: "qwen3.7-plus", title: "Qwen 3.7 Plus" },
      { id: "qwen3.7-max", title: "Qwen 3.7 Max" },
    ],
  },
  deepseek: {
    fast: { id: "deepseek-v4-flash", title: "V4 Flash" },
    pro: { id: "deepseek-v4-pro", title: "V4 Pro" },
    all: [
      { id: "deepseek-v4-flash", title: "V4 Flash" },
      { id: "deepseek-v4-pro", title: "V4 Pro" },
    ],
  },
  mimo: {
    fast: { id: "mimo-v2.5", title: "V2.5" },
    pro: { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
    all: [
      { id: "mimo-v2.5", title: "V2.5" },
      { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
    ],
  },
  gemini: {
    fast: { id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" },
    pro: { id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" },
    all: [{ id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" }],
  },
  minimax: {
    fast: { id: "MiniMax-M2.7-highspeed", title: "M2.7 Highspeed" },
    pro: { id: "MiniMax-M3", title: "M3" },
    all: [
      { id: "MiniMax-M3", title: "M3" },
      { id: "MiniMax-M2.7-highspeed", title: "M2.7 Highspeed" },
    ],
  },
  openai: {
    fast: { id: "gpt-5.5", title: "GPT-5.5" },
    pro: { id: "gpt-5.5", title: "GPT-5.5" },
    all: [{ id: "gpt-5.5", title: "GPT-5.5" }],
  },
};

export function getTierLabel(tier: string): string {
  switch (tier) {
    case "fast":
      return "Fast";
    case "pro":
      return "Pro";
    case "custom":
      return "Custom";
    default:
      return tier;
  }
}

export function resolveModel(providerId: ProviderId, tier: string, customModel: string): string {
  if (tier === "custom") return customModel;
  if (tier === "fast" || tier === "pro") return MODEL_CATALOG[providerId][tier].id;
  return customModel;
}

export function getProviderModelOptions(providerId: ProviderId): ModelEntry[] {
  return MODEL_CATALOG[providerId].all;
}

export const SAY_IT_RIGHT_PROVIDER_IDS = ["qwen", "minimax", "mimo", "gemini", "openai"] as const;

export type SayItRightProviderId = (typeof SAY_IT_RIGHT_PROVIDER_IDS)[number];

export const DEFAULT_SAY_IT_RIGHT_ANALYSIS_MODELS: Record<SayItRightProviderId, string> = {
  qwen: "qwen3.6-flash",
  minimax: "MiniMax-M3",
  mimo: "mimo-v2.5",
  gemini: "gemini-3.5-flash",
  openai: "gpt-5.5",
};

export const SAY_IT_RIGHT_ANALYSIS_MODELS: Record<SayItRightProviderId, ModelEntry[]> = {
  qwen: [
    { id: "qwen3.6-flash", title: "Qwen 3.6 Flash" },
    { id: "qwen3.7-plus", title: "Qwen 3.7 Plus" },
    { id: "qwen3.7-max", title: "Qwen 3.7 Max" },
  ],
  minimax: [
    { id: "MiniMax-M3", title: "M3" },
    { id: "MiniMax-M2.7-highspeed", title: "M2.7 Highspeed" },
  ],
  mimo: [
    { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
    { id: "mimo-v2.5", title: "V2.5" },
  ],
  gemini: [{ id: "gemini-3.5-flash", title: "Gemini 3.5 Flash" }],
  openai: [{ id: "gpt-5.5", title: "GPT-5.5" }],
};

export const DEFAULT_SAY_IT_RIGHT_TTS_MODELS: Record<SayItRightProviderId, string> = {
  qwen: "qwen3-tts-flash",
  minimax: "speech-2.8-hd",
  mimo: "mimo-v2.5-tts",
  gemini: "gemini-3.1-flash-tts-preview",
  openai: "gpt-4o-mini-tts",
};

export const SAY_IT_RIGHT_TTS_MODELS: Record<SayItRightProviderId, ModelEntry[]> = {
  qwen: [
    { id: "qwen3-tts-flash", title: "Qwen3 TTS Flash" },
    { id: "qwen3-tts-instruct-flash", title: "Qwen3 TTS Instruct Flash" },
  ],
  minimax: [
    { id: "speech-2.8-hd", title: "Speech 2.8 HD" },
    { id: "speech-2.8-turbo", title: "Speech 2.8 Turbo" },
  ],
  mimo: [{ id: "mimo-v2.5-tts", title: "MiMo V2.5 TTS" }],
  gemini: [{ id: "gemini-3.1-flash-tts-preview", title: "Gemini 3.1 Flash TTS Preview" }],
  openai: [{ id: "gpt-4o-mini-tts", title: "GPT-4o Mini TTS" }],
};

export const DEFAULT_TTS_VOICES: Record<SayItRightProviderId, string> = {
  qwen: "Jennifer",
  minimax: "English_expressive_narrator",
  mimo: "Chloe",
  gemini: "Charon",
  openai: "marin",
};

export const TTS_VOICES: Record<SayItRightProviderId, string[]> = {
  qwen: ["Jennifer", "Aiden", "Neil", "Elias", "Cherry", "Katerina"],
  minimax: [
    "English_expressive_narrator",
    "English_CaptivatingStoryteller",
    "English_Trustworth_Man",
    "English_SereneWoman",
    "English_WiseScholar",
  ],
  mimo: ["Chloe", "Mia", "Milo", "Dean"],
  gemini: ["Charon", "Iapetus", "Sulafat", "Puck"],
  openai: [
    "marin",
    "cedar",
    "coral",
    "alloy",
    "ash",
    "ballad",
    "echo",
    "fable",
    "nova",
    "onyx",
    "sage",
    "shimmer",
    "verse",
  ],
};
