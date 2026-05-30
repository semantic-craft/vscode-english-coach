import * as vscode from "vscode";
import { PROVIDER_IDS, ProviderId } from "../core/types";

export type SecretKeyId = ProviderId;

const SECRET_PREFIX = "englishCoach.secret.";

const SECRET_LABELS: Record<SecretKeyId, string> = {
  qwen: "Qwen / DashScope",
  minimax: "MiniMax",
  deepseek: "DeepSeek",
  mimo: "Xiaomi MiMo",
  gemini: "Gemini",
  openai: "OpenAI / ChatGPT",
};

// "chat" = the analysis/translation key (the default, historical slot). "speech" = an optional
// separate key for TTS, so the speech engine can authenticate against a different endpoint/account
// than the analysis engine (e.g. a token-plan key for analysis, a regular key for speech).
type KeyKind = "chat" | "speech";

function secretStorageKey(id: SecretKeyId, kind: KeyKind): string {
  return kind === "speech" ? `${SECRET_PREFIX}speech.${id}` : `${SECRET_PREFIX}${id}`;
}

export function getSecret(context: vscode.ExtensionContext, id: SecretKeyId): Thenable<string | undefined> {
  return context.secrets.get(secretStorageKey(id, "chat"));
}

export function getSpeechSecret(context: vscode.ExtensionContext, id: SecretKeyId): Thenable<string | undefined> {
  return context.secrets.get(secretStorageKey(id, "speech"));
}

export async function setApiKeyInteractive(context: vscode.ExtensionContext): Promise<void> {
  const ids: SecretKeyId[] = [...PROVIDER_IDS];
  const provider = await vscode.window.showQuickPick(
    ids.map((id) => ({ label: SECRET_LABELS[id], id })),
    { placeHolder: "Which provider's API key do you want to set?" },
  );
  if (!provider) return;

  const kindPick = await vscode.window.showQuickPick(
    [
      { label: "Analysis / Chat key", detail: "Used for pronunciation analysis and the Coach", keyKind: "chat" as KeyKind },
      { label: "Speech / TTS key", detail: "Optional separate key for read-aloud (falls back to the analysis key)", keyKind: "speech" as KeyKind },
    ],
    { placeHolder: `Set which ${provider.label} key?` },
  );
  if (!kindPick) return;

  const useLabel = kindPick.keyKind === "speech" ? "Speech/TTS" : "Analysis/Chat";
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
