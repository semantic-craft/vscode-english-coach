const vscode = acquireVsCodeApi();
let state = {
  mode: "coach",
  tone: "natural",
  providerId: "",
  reasoningMode: "off",
  targetLanguage: "auto",
};
let modelsByProvider = {};
let selectedModels = {};
let lastNative = "";
let currentEntryId = null;
let currentStarred = false;
let reviewCards = [];
let reviewIdx = 0;
let currentDiffSuppressed = false;

const $ = (id) => document.getElementById(id);

const modeCopy = {
  coach: {
    placeholder: "Type or paste English to polish…",
    resultTitle: "✨ Polished English",
    emptyResult: "Your polished English will appear here.",
    action: "Polish English (⌘↵)",
  },
  express: {
    placeholder: "输入中文意思；我会用真实地道的英文表达…",
    resultTitle: "✨ Native English",
    emptyResult: "Natural English phrasing will appear here.",
    action: "Say It in English (⌘↵)",
  },
  translate: {
    placeholder: "输入要翻译的文字…",
    resultTitle: "Translation",
    emptyResult: "Your translation will appear here.",
    action: "Translate (⌘↵)",
  },
};

function send(type, payload) {
  vscode.postMessage({ type, ...payload });
}

function hasCjk(text) {
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
}

function updateDiffVisibility() {
  const translate = state.mode === "translate";
  const express = state.mode === "express";
  $("diffWrap").classList.toggle("hidden", translate || express || currentDiffSuppressed);
}

function setMode(mode, persist = true) {
  if (!modeCopy[mode]) return;
  state.mode = mode;
  currentDiffSuppressed = false;
  applyState();
  if (persist) send("setState", { key: "mode", value: state.mode });
}

function applyState() {
  if (!$("mode").querySelector(`option[value="${state.mode}"]`)) {
    state.mode = state.mode === "coach" ? "coach" : "express";
  }
  $("mode").value = state.mode;
  $("tone").value = state.tone;
  $("provider").value = state.providerId;
  $("reasoning").value = state.reasoningMode || "off";
  $("targetLanguage").value = state.targetLanguage;
  renderModelOptions();
  const translate = state.mode === "translate";
  const express = state.mode === "express";
  $("toneRow").classList.toggle("hidden", translate);
  $("langRow").classList.toggle("hidden", !translate);
  $("whyWrap").classList.toggle("hidden", translate);
  updateDiffVisibility();
  const copy = modeCopy[state.mode] || modeCopy.coach;
  $("coach").textContent = copy.action;
  $("input").placeholder = copy.placeholder;
  $("resultTitle").textContent = copy.resultTitle;
  if (!lastNative && $("native").classList.contains("muted")) {
    $("native").textContent = copy.emptyResult;
  }
}

function renderModelOptions() {
  const sel = $("model");
  if (!sel) return;
  const provider = state.providerId;
  const options = modelsByProvider[provider] || [];
  const requested = selectedModels[provider] || "";
  const selected = options.some((model) => model.id === requested) ? requested : (options[0] && options[0].id) || "";
  sel.innerHTML = "";
  for (const model of options) {
    const opt = document.createElement("option");
    opt.value = model.id;
    opt.textContent = model.title || model.id;
    sel.appendChild(opt);
  }
  if (selected) sel.value = selected;
}

function setLoading() {
  currentDiffSuppressed = state.mode !== "coach" || hasCjk($("input").value);
  $("diff").textContent = "";
  updateDiffVisibility();
  $("native").textContent =
    state.mode === "translate" ? "Translating…" : state.mode === "express" ? "Finding natural English…" : "Polishing…";
  $("native").className = "native muted";
  $("why").textContent = "";
  $("resultActions").classList.add("hidden");
}

function wordDiff(a, b) {
  const A = a.trim().split(/\s+/).filter(Boolean);
  const B = b.trim().split(/\s+/).filter(Boolean);
  const n = A.length,
    m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0,
    j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ t: "same", w: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ t: "del", w: A[i] });
      i++;
    } else {
      out.push({ t: "ins", w: B[j] });
      j++;
    }
  }
  while (i < n) out.push({ t: "del", w: A[i++] });
  while (j < m) out.push({ t: "ins", w: B[j++] });
  return out;
}

function renderDiff(source, rewritten) {
  const el = $("diff");
  el.innerHTML = "";
  if (!source) return;
  for (const part of wordDiff(source, rewritten)) {
    const span = document.createElement("span");
    span.className = part.t;
    span.textContent = part.w + " ";
    el.appendChild(span);
  }
}

function showResult(msg) {
  currentEntryId = msg.entryId || null;
  currentStarred = false;
  if (msg.mode === "translate") {
    currentDiffSuppressed = true;
    lastNative = msg.translation || "";
    $("native").textContent = lastNative;
    $("native").className = "native";
    $("why").textContent = "";
    $("diff").textContent = "";
  } else {
    lastNative = msg.rewritten || "";
    $("native").textContent = lastNative;
    $("native").className = "native";
    $("why").textContent = msg.why || "";
    currentDiffSuppressed = msg.mode === "express" || hasCjk(msg.source || "");
    if (currentDiffSuppressed) $("diff").textContent = "";
    else renderDiff(msg.source || "", lastNative);
  }
  updateDiffVisibility();
  $("resultActions").classList.toggle("hidden", !lastNative);
  updateStar();
}

function updateStar() {
  const btn = $("star");
  btn.textContent = currentStarred ? "✅ 已收藏" : "⭐ 收藏";
  btn.classList.toggle("hidden", !currentEntryId);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startReview(cards) {
  reviewCards = shuffle((cards || []).slice());
  reviewIdx = 0;
  const empty = reviewCards.length === 0;
  $("reviewReveal").classList.toggle("hidden", empty);
  $("reviewNext").classList.toggle("hidden", empty);
  $("reviewGotit").classList.toggle("hidden", empty);
  if (empty) {
    $("reviewProgress").textContent = "";
    $("reviewSource").textContent = "还没有收藏的句子。在教练结果里点 ⭐ 收藏,再来复习。";
    $("reviewAnswer").classList.add("hidden");
  } else {
    showReviewCard();
  }
  $("reviewWrap").classList.remove("hidden");
}

function showReviewCard() {
  const c = reviewCards[reviewIdx];
  $("reviewProgress").textContent = `(${reviewIdx + 1}/${reviewCards.length})`;
  $("reviewSource").textContent = c.source;
  $("reviewNative").textContent = c.output;
  $("reviewWhy").textContent = c.why || "";
  $("reviewAnswer").classList.add("hidden");
}

function reviewNext() {
  if (!reviewCards.length) return;
  reviewIdx = (reviewIdx + 1) % reviewCards.length;
  showReviewCard();
}

function showError(msg) {
  $("native").className = "native error";
  $("native").textContent = msg.message || "Something went wrong.";
  $("why").textContent = "";
  $("resultActions").classList.add("hidden");
  if (msg.action) {
    const btn = document.createElement("button");
    btn.textContent = "Set API key";
    btn.onclick = () => send("setApiKey", {});
    $("native").appendChild(document.createElement("br"));
    $("native").appendChild(btn);
  }
}

function run(modeOverride) {
  const text = $("input").value;
  if (modeOverride && modeCopy[modeOverride] && modeOverride !== state.mode) {
    setMode(modeOverride);
  }
  if (!text.trim()) return;
  const model = selectedModels[state.providerId] || $("model").value;
  const reasoningMode = state.reasoningMode || "off";
  if (state.mode === "translate") {
    send("translate", { text, targetLang: state.targetLanguage, providerId: state.providerId, model, reasoningMode });
  } else if (state.mode === "express") {
    send("express", { text, tone: state.tone, providerId: state.providerId, model, reasoningMode });
  } else {
    send("coach", { text, tone: state.tone, providerId: state.providerId, model, reasoningMode });
  }
}

window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg.type === "init") {
    state = msg.state;
    modelsByProvider = msg.models || {};
    selectedModels = msg.selectedModels || {};
    const sel = $("provider");
    sel.innerHTML = "";
    for (const p of msg.providers) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.title;
      sel.appendChild(opt);
    }
    if ((!state.providerId || !msg.providers.some((p) => p.id === state.providerId)) && msg.providers[0]) {
      state.providerId = msg.providers[0].id;
    }
    state.reasoningMode = state.reasoningMode || "off";
    const providerModels = modelsByProvider[state.providerId] || [];
    if (!selectedModels[state.providerId] && providerModels[0]) selectedModels[state.providerId] = providerModels[0].id;
    applyState();
  } else if (msg.type === "loading") setLoading();
  else if (msg.type === "result") showResult(msg);
  else if (msg.type === "error") showError(msg);
  else if (msg.type === "restore") {
    const e = msg.entry;
    state.mode = e.kind === "express" || e.kind === "translate" ? "express" : "coach";
    setMode(state.mode);
    $("input").value = e.source;
    if (state.mode === "express") showResult({ mode: "express", rewritten: e.output, why: e.why, source: e.source });
    else showResult({ mode: "coach", rewritten: e.output, why: e.why, source: e.source });
  } else if (msg.type === "review") startReview(msg.cards);
  else if (msg.type === "setText") {
    $("input").value = msg.text;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  $("coach").onclick = () => run();
  $("pronunciation").onclick = () => send("practicePronunciation", { text: lastNative || $("input").value });
  $("setKey").onclick = () => send("setApiKey", { providerId: state.providerId, kind: "chat" });
  $("copy").onclick = () => send("copy", { text: lastNative });
  $("input").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
  });
  $("mode").onchange = (e) => {
    setMode(e.target.value);
  };
  $("tone").onchange = (e) => {
    state.tone = e.target.value;
    send("setState", { key: "tone", value: state.tone });
  };
  $("reasoning").onchange = (e) => {
    state.reasoningMode = e.target.value;
    send("setReasoningMode", { reasoningMode: state.reasoningMode });
  };
  $("provider").onchange = (e) => {
    state.providerId = e.target.value;
    const providerModels = modelsByProvider[state.providerId] || [];
    if (!selectedModels[state.providerId] && providerModels[0]) selectedModels[state.providerId] = providerModels[0].id;
    send("setState", { key: "providerId", value: state.providerId });
    renderModelOptions();
  };
  $("model").onchange = (e) => {
    selectedModels[state.providerId] = e.target.value;
    send("setModel", { providerId: state.providerId, model: selectedModels[state.providerId] });
  };
  $("targetLanguage").onchange = (e) => {
    state.targetLanguage = e.target.value;
    send("setState", { key: "targetLanguage", value: state.targetLanguage });
  };
  $("star").onclick = () => {
    if (!currentEntryId) return;
    currentStarred = !currentStarred;
    send("star", { id: currentEntryId });
    updateStar();
  };
  $("reviewReveal").onclick = () => $("reviewAnswer").classList.remove("hidden");
  $("reviewNext").onclick = reviewNext;
  $("reviewExit").onclick = () => $("reviewWrap").classList.add("hidden");
  $("reviewGotit").onclick = () => {
    const c = reviewCards[reviewIdx];
    if (!c) return;
    send("star", { id: c.id });
    reviewCards.splice(reviewIdx, 1);
    if (!reviewCards.length) {
      $("reviewWrap").classList.add("hidden");
      return;
    }
    if (reviewIdx >= reviewCards.length) reviewIdx = 0;
    showReviewCard();
  };
  send("ready", {});
});
