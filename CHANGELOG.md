# Say It Right Changelog

## [0.4.10] - 2026-06-01

- Exposed MiniMax analysis model choices in both Coach and Say It Right settings: `MiniMax-M3` remains the default, with `MiniMax-M2.7-highspeed` available as the previous fast option.

## [0.4.9] - 2026-06-01

- Clarified the Coach sidebar input and result copy per mode so Native English no longer looks like an English-only rewrite field.
- Added direct Native English and Translate action buttons in the Coach sidebar.
- Suppressed the English word-diff panel for translation and Chinese-to-English expression results.
- Wrapped long pronunciation staves into multiple visual lines to keep word labels, IPA, and pitch curves readable.
- Switched Qwen Coach and pronunciation-analysis defaults to Bailian Token Plan's Anthropic-compatible endpoint.
- Kept Qwen Token Plan and DashScope API keys separate so Coach/analysis keys are no longer reused for Qwen TTS.
- Limited Qwen text model choices to `qwen3.6-flash` and `qwen3.6-plus`.
- Restricted Gemini Coach text model choices to `gemini-3.5-flash`.
- Updated built-in MiniMax analysis support to `MiniMax-M3` on the recommended Anthropic-compatible endpoint while keeping MiniMax TTS on T2A.

## [0.4.6] - 2026-05-31

- Trimmed built-in model pickers to the current preferred set, including OpenAI analysis/Coach on `gpt-5.5` only.
- Removed retired Qwen, MiMo, MiniMax, Gemini 2.5, and GPT 4.1/5.4 choices from Coach, pronunciation, TTS settings, and installed manifests.
- Hardened stale-setting fallback so older locally saved model ids no longer reappear in the sidebar dropdowns.
- Fixed OpenAI strict structured-output schemas for pronunciation analysis by converting optional schema fields to nullable required fields.
- Tightened built-in prompts for teacher audio, prosody analysis, pronunciation feedback, Coach, Native English, and Translate.

## [0.4.5] - 2026-05-31

- Added a Coach sidebar model picker that switches `englishCoach.modelTier` to custom and writes provider-specific model settings.
- Added a Coach sidebar thinking toggle (`off`, `on`, `auto`) for providers with compatible reasoning controls.
- Added a Native English mode for Chinese input that asks providers for how a native speaker would express the same meaning, not a literal translation.
- Updated the Coach model catalog/defaults to current flash-level choices for Qwen, MiniMax, MiMo, Gemini, and OpenAI.
- Set OpenAI defaults to `gpt-5.5` and disable reasoning for supported GPT-5.x Chat Completions calls.
- Centralized and tightened built-in prompts for TTS teacher audio, prosody analysis, pronunciation feedback, Coach, Native English, and Translate, with prompt-contract and request-body tests.

## [0.4.0] - 2026-05-30

- Extended the everyday-English prosody correction layer across Qwen, Gemini, MiniMax, and MiMo analysis so provider output is normalized before the stave is drawn.
- Added karaoke word-highlight: generated model audio can be ASR-aligned to stave words, highlighted during playback, and clicked for seek-to-word practice.
- Added macOS recording, A/B playback, comparison, learner-audio export, and word-level feedback for shadowing practice.
- Added ASR transcription, word-timing alignment, pronunciation feedback diff, ffmpeg argument, and manifest coverage tests.

## [0.3.4] - 2026-05-30

- Fixed MiniMax pronunciation analysis when the provider returns a schema echo, a loose word-analysis JSON shape, missing top-level IPA, or missing word syllables.
- Added an everyday-English prosody normalization layer so MiniMax/MiMo graphs reduce function words, stress content words, pick a natural nuclear focus, merge weak thought groups, and use habitual statement/question tones.
- Verified MiniMax and MiMo live analysis outputs produce graph-ready stress, reduced-word, IPA, nuclear-word, and intonation data.

## [0.3.3] - 2026-05-30

- Upgraded the pronunciation player from text-only stave marks to responsive SVG pitch-contour groups, with stress/reduced/nuclear dots, tone badges, connected-speech links, and per-word IPA.
- Fixed narrow-panel visual clipping so common thought groups remain readable in the VS Code webview instead of losing the nuclear word or tone badge off-screen.

## [0.3.2] - 2026-05-30

- Added visible provider, analysis model, speech model, and voice selectors to the pronunciation player.
- Restored Xiaomi MiMo in the default Coach provider switcher.
- Aligned MiniMax analysis/TTS and MiMo Token Plan analysis/TTS request shapes with official docs.
- Added runtime and unit coverage for MiniMax/MiMo provider, model, and voice selection.

## [0.3.1] - 2026-05-30

- Restored Marketplace publishing under `Xianwei-Zhang.vscode-say-it-right`.
- Kept the Marketplace display name as `Say It Right` to avoid the server-side suspicious-content block.
- Removed optional chat participant, automatic clipboard watching, and host-side sidebar read-aloud paths from the packaged extension.

## [0.3.0] - 2026-05-30

- Rebranded the extension package to `vscode-say-it-right` with display name `Say It Right 英语发音教练`.
- Added a visible sidebar pronunciation entry point that opens the Say It Right player from the current sidebar text.
- Added provider-specific pronunciation analysis, TTS model, and voice settings for Qwen, MiniMax, MiMo, Gemini, and OpenAI.
- Updated pronunciation defaults for Qwen analysis, MiniMax speech, and Gemini speech.
- Removed expiring MiMo model ids from the active pronunciation catalog.
- Fixed synthesized-audio caching so changing the TTS model produces fresh cached audio.

## [0.2.2] - 2026-05-30

- Fixed Qwen JSON-mode pronunciation analysis by making the prosody prompt explicitly request JSON.
- Improved the pronunciation stave so intonation arrows align with the nuclear word.

## [0.2.0] - 2026-05-30

- Added the Say It Right pronunciation player for selected English text.
- Added sentence navigation, speed control, teacher-slow playback, AB repeat, shadowing loops, and audio export.
- Added local history and sidebar coach workflows.
