import * as vscode from "vscode";
import { PROVIDER_IDS, ProviderId } from "../core/types";

export type SecretKeyId = ProviderId;

const SECRET_PREFIX = "englishCoach.secret.";

const SECRET_LABELS: Record<SecretKeyId, string> = {
  qwen: "Qwen",
  minimax: "MiniMax",
  deepseek: "DeepSeek",
  mimo: "Xiaomi MiMo",
  gemini: "Gemini",
  openai: "OpenAI / ChatGPT",
};

// "chat" = the analysis/translation key (the default, historical slot). "speech" = the TTS key.
// Qwen keeps these separate: Token Plan keys drive Coach/analysis, while DashScope keys drive TTS.
export type KeyKind = "chat" | "speech";

export interface ApiKeyPreset {
  providerId?: string;
  kind?: string;
}

interface ProviderPick {
  label: string;
  description?: string;
  detail?: string;
  id: SecretKeyId;
}

interface KindPick {
  label: string;
  detail: string;
  keyKind: KeyKind;
}

function secretStorageKey(id: SecretKeyId, kind: KeyKind): string {
  return kind === "speech" ? `${SECRET_PREFIX}speech.${id}` : `${SECRET_PREFIX}${id}`;
}

export function getSecret(context: vscode.ExtensionContext, id: SecretKeyId): Thenable<string | undefined> {
  return context.secrets.get(secretStorageKey(id, "chat"));
}

export function getSpeechSecret(context: vscode.ExtensionContext, id: SecretKeyId): Thenable<string | undefined> {
  return context.secrets.get(secretStorageKey(id, "speech"));
}

function isSecretKeyId(value: unknown): value is SecretKeyId {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

function isKeyKind(value: unknown): value is KeyKind {
  return value === "chat" || value === "speech";
}

function providerPick(id: SecretKeyId): ProviderPick {
  return {
    label: SECRET_LABELS[id],
    description: id === "qwen" ? "Token Plan + DashScope" : undefined,
    detail: id === "qwen" ? "Coach/analysis uses Token Plan; Qwen read-aloud uses a separate DashScope key." : undefined,
    id,
  };
}

function keyKindOptions(id: SecretKeyId): KindPick[] {
  if (id === "qwen") {
    return [
      {
        label: "Coach / Analysis key (Token Plan)",
        detail: "Used for Coach, Translate, Native English, and pronunciation analysis.",
        keyKind: "chat",
      },
      {
        label: "Speech / TTS key (DashScope)",
        detail: "Required for Qwen read-aloud; it does not fall back to the Token Plan key.",
        keyKind: "speech",
      },
    ];
  }
  return [
    { label: "Analysis / Chat key", detail: "Used for pronunciation analysis and the Coach", keyKind: "chat" },
    {
      label: "Speech / TTS key",
      detail: "Optional separate key for read-aloud; falls back to the analysis key when supported.",
      keyKind: "speech",
    },
  ];
}

function keyUseLabel(id: SecretKeyId, kind: KeyKind): string {
  if (id === "qwen" && kind === "chat") return "Coach/Analysis (Token Plan)";
  if (id === "qwen" && kind === "speech") return "Speech/TTS (DashScope)";
  return kind === "speech" ? "Speech/TTS" : "Analysis/Chat";
}

export async function setApiKeyInteractive(context: vscode.ExtensionContext, preset?: ApiKeyPreset): Promise<void> {
  const ids: SecretKeyId[] = [...PROVIDER_IDS];
  const presetProviderId = isSecretKeyId(preset?.providerId) ? preset.providerId : undefined;
  const provider =
    presetProviderId !== undefined
      ? providerPick(presetProviderId)
      : await vscode.window.showQuickPick(ids.map(providerPick), {
          placeHolder: "Which provider's API key do you want to set?",
        });
  if (!provider) return;

  const options = keyKindOptions(provider.id);
  const presetKind = isKeyKind(preset?.kind) ? preset.kind : undefined;
  const kindPick =
    presetKind !== undefined
      ? options.find((option) => option.keyKind === presetKind)
      : await vscode.window.showQuickPick(options, { placeHolder: `Set which ${provider.label} key?` });
  if (!kindPick) return;

  const useLabel = keyUseLabel(provider.id, kindPick.keyKind);
  const value = await vscode.window.showInputBox({
    prompt: `Enter your ${provider.label} ${useLabel} API key`,
    password: true,
    ignoreFocusOut: true,
  });
  if (value === undefined) return;
  const key = secretStorageKey(provider.id, kindPick.keyKind);
  if (value.trim() === "") {
    await context.secrets.delete(key);
    void vscode.window.showInformationMessage(`Cleared ${provider.label} ${useLabel} API key.`);
  } else {
    await context.secrets.store(key, value.trim());
    void vscode.window.showInformationMessage(`Saved ${provider.label} ${useLabel} API key.`);
  }
}
