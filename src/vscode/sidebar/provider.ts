import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { LANGUAGE_CHOICES, resolveTargetLanguage, getLanguageTitle } from "../../core/languages";
import { translateWithProvider, MissingAPIKeyError } from "../../core/providers";
import { runNativeEnglishExpression, runRewrite } from "../../core/rewrite";
import { normalizeInputText } from "../../core/text";
import { ProviderId, ReasoningMode, RewriteTone, TranslationRequest } from "../../core/types";
import {
  PROVIDER_TITLES,
  getCoachModelOptions,
  getCoachModelSelection,
  getMaxOutputTokens,
  getOrderedProviderIds,
  getProviderConfig,
  getReasoningMode,
  getTimeoutMs,
} from "../config";
import { loadUiState, saveUiState, UiState } from "../settings-store";
import { HistoryEntry } from "../../core/history";
import { HistoryStore } from "../history";
import { getProviderModelOptions } from "../../core/models";

const TONE_OPTIONS: RewriteTone[] = ["natural", "casual", "formal", "concise"];

export class CoachViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "englishCoach.sidebar";
  private view?: vscode.WebviewView;
  private pendingRestore?: HistoryEntry;
  private pendingReview?: HistoryEntry[];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly history: HistoryStore,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
    };
    webviewView.webview.onDidReceiveMessage((msg) => this.onMessage(msg));
    webviewView.webview.html = this.html(webviewView.webview);
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) this.postInit();
    });
  }

  public get webviewView(): vscode.WebviewView | undefined {
    return this.view;
  }

  public reveal(): void {
    void vscode.commands.executeCommand("englishCoach.sidebar.focus");
  }

  public post(message: unknown): void {
    void this.view?.webview.postMessage(message);
  }

  private postInit(): void {
    const state = loadUiState(this.context);
    state.reasoningMode = getReasoningMode();
    const providerIds = getOrderedProviderIds();
    const providers = providerIds.map((id) => ({ id, title: PROVIDER_TITLES[id] }));
    if ((!state.providerId || !providerIds.includes(state.providerId as ProviderId)) && providers[0]) {
      state.providerId = providers[0].id;
    }
    const selectedModels = Object.fromEntries(providerIds.map((id) => [id, getCoachModelSelection(id)]));
    this.post({ type: "init", state, providers, models: getCoachModelOptions(providerIds), selectedModels });
    if (this.pendingRestore) {
      this.post({ type: "restore", entry: this.pendingRestore });
      this.pendingRestore = undefined;
    }
    if (this.pendingReview) {
      this.post({ type: "review", cards: this.pendingReview });
      this.pendingReview = undefined;
    }
  }

  private async onMessage(msg: any): Promise<void> {
    switch (msg.type) {
      case "ready":
        this.postInit();
        return;
      case "setState": {
        const allowedKeys: ReadonlyArray<keyof UiState> = ["mode", "tone", "providerId", "targetLanguage"];
        if (allowedKeys.includes(msg.key)) {
          await saveUiState(this.context, { [msg.key]: msg.value } as Partial<UiState>);
        }
        return;
      }
      case "setModel":
        await this.handleModelChange(msg.providerId, msg.model);
        return;
      case "setReasoningMode":
        await this.handleReasoningModeChange(msg.reasoningMode);
        return;
      case "setApiKey":
        await vscode.commands.executeCommand("englishCoach.setApiKey", {
          providerId: typeof msg.providerId === "string" ? msg.providerId : undefined,
          kind: typeof msg.kind === "string" ? msg.kind : undefined,
        });
        return;
      case "practicePronunciation":
        await vscode.commands.executeCommand(
          "sayItRight.practiceSentence",
          typeof msg.text === "string" ? normalizeInputText(msg.text) : "",
        );
        return;
      case "star":
        if (typeof msg.id === "string") await this.history.toggleStar(msg.id);
        return;
      case "copy":
        if (msg.text) {
          await vscode.env.clipboard.writeText(msg.text);
          void vscode.window.showInformationMessage("Copied the native version.");
        }
        return;
      case "coach":
        await this.handleCoach(msg.text, msg.tone, msg.providerId, msg.model, msg.reasoningMode);
        return;
      case "express":
        await this.handleExpress(msg.text, msg.tone, msg.providerId, msg.model, msg.reasoningMode);
        return;
      case "translate":
        await this.handleTranslate(msg.text, msg.targetLang, msg.providerId, msg.model, msg.reasoningMode);
        return;
    }
  }

  public async coachText(text: string): Promise<void> {
    const state = loadUiState(this.context);
    const providerId = (state.providerId || getOrderedProviderIds()[0]) as ProviderId;
    await this.handleCoach(text, state.tone, providerId);
  }

  public restoreEntry(entry: HistoryEntry): void {
    this.reveal();
    if (!this.view) {
      this.pendingRestore = entry;
      return;
    }
    this.post({ type: "restore", entry });
  }

  public startReview(): void {
    const cards = this.history.loadStarred();
    this.reveal();
    if (!this.view) {
      this.pendingReview = cards;
      return;
    }
    this.post({ type: "review", cards });
  }

  private resolveProvider(providerId: string): ProviderId {
    return getOrderedProviderIds().includes(providerId as ProviderId)
      ? (providerId as ProviderId)
      : getOrderedProviderIds()[0];
  }

  private async handleModelChange(providerId: string, model: string): Promise<void> {
    const id = this.resolveProvider(providerId);
    const value = typeof model === "string" ? model.trim() : "";
    if (!this.isKnownModel(id, value)) return;
    const c = vscode.workspace.getConfiguration("englishCoach");
    await c.update(`${id}.model`, value, vscode.ConfigurationTarget.Global);
    await c.update("modelTier", "custom", vscode.ConfigurationTarget.Global);
    this.postInit();
  }

  private async handleReasoningModeChange(mode: string): Promise<void> {
    if (!this.isReasoningMode(mode)) return;
    const c = vscode.workspace.getConfiguration("englishCoach");
    await c.update("reasoningMode", mode, vscode.ConfigurationTarget.Global);
    await saveUiState(this.context, { reasoningMode: mode });
    this.postInit();
  }

  private isReasoningMode(mode: string): mode is ReasoningMode {
    return mode === "off" || mode === "on" || mode === "auto";
  }

  private isKnownModel(providerId: ProviderId, model: string): boolean {
    return getProviderModelOptions(providerId).some((option) => option.id === model);
  }

  private async getConfigFor(
    providerId: ProviderId,
    requestedModel?: string,
    requestedReasoningMode?: string,
  ): Promise<Awaited<ReturnType<typeof getProviderConfig>>> {
    const config = await getProviderConfig(this.context, providerId);
    const model = typeof requestedModel === "string" ? requestedModel.trim() : "";
    const requestedMode = requestedReasoningMode ?? "";
    const reasoningMode: ReasoningMode = this.isReasoningMode(requestedMode) ? requestedMode : getReasoningMode();
    return {
      ...config,
      ...(this.isKnownModel(providerId, model) ? { model } : {}),
      reasoningMode,
    };
  }

  private async handleCoach(
    text: string,
    tone: RewriteTone,
    providerId: string,
    model?: string,
    reasoningMode?: string,
  ): Promise<void> {
    const clean = normalizeInputText(text);
    if (!clean) return;
    this.post({ type: "loading" });
    const id = this.resolveProvider(providerId);
    try {
      const config = await this.getConfigFor(id, model, reasoningMode);
      const result = await runRewrite(config, clean, tone, getTimeoutMs(), getMaxOutputTokens());
      const entryId = await this.history.add({
        kind: "coach",
        source: clean,
        output: result.rewritten,
        why: result.why,
        provider: PROVIDER_TITLES[id],
        model: config.model,
      });
      this.post({
        type: "result",
        mode: "coach",
        rewritten: result.rewritten,
        why: result.why,
        source: clean,
        entryId,
      });
    } catch (e) {
      this.postError(e, id);
    }
  }

  private async handleExpress(
    text: string,
    tone: RewriteTone,
    providerId: string,
    model?: string,
    reasoningMode?: string,
  ): Promise<void> {
    const clean = normalizeInputText(text);
    if (!clean) return;
    this.post({ type: "loading" });
    const id = this.resolveProvider(providerId);
    try {
      const config = await this.getConfigFor(id, model, reasoningMode);
      const result = await runNativeEnglishExpression(config, clean, tone, getTimeoutMs(), getMaxOutputTokens());
      const entryId = await this.history.add({
        kind: "express",
        source: clean,
        output: result.rewritten,
        why: result.why,
        provider: PROVIDER_TITLES[id],
        model: config.model,
      });
      this.post({
        type: "result",
        mode: "express",
        rewritten: result.rewritten,
        why: result.why,
        source: clean,
        entryId,
      });
    } catch (e) {
      this.postError(e, id);
    }
  }

  private async handleTranslate(
    text: string,
    targetLang: string,
    providerId: string,
    model?: string,
    reasoningMode?: string,
  ): Promise<void> {
    const clean = normalizeInputText(text);
    if (!clean) return;
    this.post({ type: "loading" });
    const id = this.resolveProvider(providerId);
    try {
      const config = await this.getConfigFor(id, model, reasoningMode);
      const resolved = resolveTargetLanguage(targetLang, clean);
      const request: TranslationRequest = {
        text: clean,
        targetLanguage: resolved,
        targetLanguageTitle: getLanguageTitle(resolved),
        style: "balanced",
        promptProfile: "general",
        timeoutMs: getTimeoutMs(),
        maxOutputTokens: getMaxOutputTokens(),
      };
      const translation = await translateWithProvider(config, request);
      const entryId = await this.history.add({
        kind: "translate",
        source: clean,
        output: translation,
        provider: PROVIDER_TITLES[id],
        model: config.model,
      });
      this.post({ type: "result", mode: "translate", translation, entryId });
    } catch (e) {
      this.postError(e, id);
    }
  }

  private postError(error: unknown, id: ProviderId): void {
    const title = PROVIDER_TITLES[id];
    if (error instanceof MissingAPIKeyError) {
      this.post({ type: "error", message: `Add a ${title} API key.`, action: "setApiKey" });
      return;
    }
    this.post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }

  private html(webview: vscode.Webview): string {
    const nonce = getNonce();
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "sidebar.css"));
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "media", "sidebar.js"));
    const tones = TONE_OPTIONS.map((t) => `<option value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join("");
    const langs = LANGUAGE_CHOICES.map((l) => `<option value="${l.value}">${l.title}</option>`).join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
<link href="${cssUri}" rel="stylesheet" />
</head>
<body>
  <div class="row">
    <label>Mode</label>
    <select id="mode">
      <option value="coach">Polish English</option>
      <option value="express">Say It in English</option>
    </select>
    <label>Provider</label>
    <select id="provider"></select>
  </div>
  <div class="row">
    <label>Model</label><select id="model"></select>
    <label>Thinking</label>
    <select id="reasoning">
      <option value="off">Off</option>
      <option value="on">On</option>
      <option value="auto">Auto</option>
    </select>
  </div>
  <div class="row" id="toneRow"><label>Tone</label><select id="tone">${tones}</select></div>
  <div class="row hidden" id="langRow"><label>Target</label><select id="targetLanguage">${langs}</select></div>
  <textarea id="input"></textarea>
  <div class="actions primary-actions">
    <button id="coach">Polish English (⌘↵)</button>
    <button id="setKey" class="secondary icon-button" title="API Keys" aria-label="API Keys">🔑</button>
  </div>
  <hr />
  <div class="section-title" id="resultTitle">✨ Polished English</div>
  <div id="native" class="native muted">Your polished English will appear here.</div>
  <div class="actions hidden" id="resultActions">
    <button id="copy" class="secondary">Copy</button>
    <button id="pronunciation" class="secondary">🎙 Practice</button>
    <button id="star" class="secondary">⭐ 收藏</button>
  </div>
  <div id="diffWrap"><div class="section-title">🔁 改了什么</div><div id="diff" class="diff"></div></div>
  <div id="whyWrap"><div class="section-title">💡 为什么更自然</div><div id="why" class="why"></div></div>
  <div id="reviewWrap" class="hidden">
    <div class="row">
      <strong style="flex:1">复习错题本 <span id="reviewProgress" class="muted"></span></strong>
      <button id="reviewExit" class="secondary">退出</button>
    </div>
    <div class="section-title">📝 你写的</div>
    <div id="reviewSource" class="native"></div>
    <div id="reviewAnswer" class="hidden">
      <div class="section-title">✨ 地道版本</div>
      <div id="reviewNative" class="native"></div>
      <div id="reviewWhy" class="why"></div>
    </div>
    <div class="actions">
      <button id="reviewReveal">显示答案</button>
      <button id="reviewNext" class="secondary">下一张</button>
      <button id="reviewGotit" class="secondary">记住了 ✅</button>
    </div>
  </div>
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  return randomBytes(16).toString("hex");
}
