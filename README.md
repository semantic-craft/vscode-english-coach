# English Coach · 英语口语教练

用 **Qwen 通义千问 · DeepSeek · MiniMax 海螺 · 小米 MiMo · Gemini · GPT/OpenAI** 把你写的英文（或中文）改写成 **地道、像母语者** 的表达，并用 **中文讲解** 为什么这样更自然——一边写提示词（vibe coding）一边练英语口语，越用越会说。

> Rewrite your English into natural, native-sounding phrasing with Simplified-Chinese explanations — powered by Qwen, DeepSeek, MiniMax, Xiaomi MiMo, Gemini and OpenAI. Bring your own key.

## 功能 Features

- **教练模式 Coach** — 粘贴/输入英文 → 地道改写 + 中文讲解（用词、搭配、习语、语气）。
- **翻译模式 Translate** — 中文（或任意语言）→ 目标语言，不带讲解。
- **自带 Key（BYOK）** — Qwen(DashScope)、DeepSeek、MiniMax、小米 MiMo、Gemini、OpenAI，侧边栏一键切换。
- **剪贴板监听 Clipboard watch** — 复制即教练（默认关，可选自动）。
- **朗读 Read aloud (TTS)** — 听地道发音：Qwen-TTS / MiniMax / 小米 MiMo / Gemini（macOS）。
- **最近记录 Recent** — 每次教练/翻译自动存档，点击即还原。
- **@coach** — 在 Copilot Chat 里输入 `@coach <你的英文>` 直接改写讲解，或 `@coach /translate <文本>`。

## Say It Right — 发音教练 (pronunciation)

Select English text in the editor → right-click **Say It Right: Analyze Selection** (or run **Say It Right: Practice a Sentence**). A player opens showing the sentence's **prosody stave** — stress (●) / reduced (·), the nuclear word, rising/falling tone per thought group, connected-speech links, and General American IPA — plus a model voice you can:

- play at **0.25×–4×** (pitch-preserved) and a **Teacher slow** clear re-reading,
- **AB-repeat** a sentence, run a **Shadow ×N** loop with gaps, and step sentence by sentence,
- **export** the model audio.

Powered by Qwen (`qwen3.5-flash` analysis, `qwen3-tts(-instruct)-flash` voice) or OpenAI (`gpt-5.4-nano` + `gpt-4o-mini-tts`). Configure under `sayItRight.*`.

## 快速开始 Setup

1. 侧边栏点 **🔑 API Key**（或命令面板运行 *English Coach: Set API Key*），默认填 **Qwen / DashScope** 的 key。
2. 打开活动栏的 **English Coach** 侧边栏，输入英文按 `⌘↵`。
3. 在设置 `englishCoach.*` 里启用更多 provider、调模型与 base URL。

API key 存在 VS Code SecretStorage（系统钥匙串），不会写进 settings.json。

## 支持的模型 Supported models

| Provider | 用途 | 默认模型 |
| --- | --- | --- |
| Qwen / 通义千问 (DashScope) | 教练 + 朗读 | `qwen-plus` / `qwen3-tts-flash` |
| DeepSeek | 教练 | `deepseek-v4-flash` |
| MiniMax / 海螺 | 教练 + 朗读 | `MiniMax-M2.7-highspeed` / `speech-2.8-turbo` |
| 小米 MiMo | 教练 + 朗读 | `mimo-v2.5-pro` / `mimo-v2.5-tts` |
| Gemini | 教练 + 朗读 | `gemini-3.5-flash` |
| OpenAI / GPT | 教练 | `gpt-4.1-mini` |

## 开发 Develop

- `npm install`
- `npm run watch`，然后按 F5 打开 Extension Development Host
- `npm test` 跑核心单测
