# Say It Right · 英语发音教练

用 **Qwen 通义千问 Token Plan · MiniMax 海螺 · 小米 MiMo · Gemini · GPT/OpenAI** 把任意英文拆成一节发音课：重音、弱读、升降调、节奏、连读和 IPA，并保留原来的英文改写、翻译、朗读和错题本功能。

> Turn any English text into a pronunciation lesson with a coach sidebar, prosody stave, model voices, looping and export. Bring your own key.

## 功能 Features

- **发音练习 Pronunciation** — 任意英文 → SVG prosody stave：语调曲线、重音/弱读、nuclear word、连读、GA IPA，并对 Qwen/Gemini/MiniMax/MiMo 的输出做日常英语校正，避免乱标。
- **Karaoke word-highlight** — 播放 model voice 时逐词高亮，点击任意词可跳到对应位置；有 ASR 时间戳就精确对齐，没有时按真实音频时长平滑降级。
- **录音对比 Record & compare** — macOS 上用 host-side ffmpeg 录下自己的跟读，A/B 播放、转写对比、查看漏读/多读和练习提示。
- **教练模式 Coach** — 粘贴/输入英文，选择 provider + model + thinking → 地道改写 + 中文讲解（用词、搭配、习语、语气）。
- **中译英 Native English** — 输入中文意思，让模型写出英语母语者自然会怎么说；可以和原中文结构完全不同，但意思一致。
- **翻译模式 Translate** — 中文（或任意语言）→ 目标语言，不带讲解。
- **自带 Key（BYOK）** — Qwen(Token Plan 文本 / DashScope TTS)、MiniMax、小米 MiMo、Gemini、OpenAI，Coach、发音分析和 TTS 都可选模型/声音。
- **朗读 Read aloud (TTS)** — 在发音播放器里听 model voice，并可慢速跟读。
- **最近记录 Recent** — 每次教练/翻译自动存档，点击即还原。

## 发音教练 Pronunciation

从侧边栏点 **🎙 发音 / Pronunciation**，或在编辑器选中英文后右键 **Say It Right: Analyze Selection**，即可打开播放器。它会显示句子的 **SVG prosody stave**：每个 thought group 有语调曲线，曲线上的点区分 stress (●)、reduced (·) 和 nuclear word，词行显示连读和 General American IPA，并配一条可调速的 model voice：

- play at **0.25×–4×** (pitch-preserved) and a **Teacher slow** clear re-reading,
- **AB-repeat** a sentence, run a **Shadow ×N** loop with gaps, and step sentence by sentence,
- follow the active word while audio plays, and click a word in the stave to seek to that moment,
- switch provider / analysis model / speech model / voice directly in the player,
- **export** the model audio.

默认使用 Qwen (`qwen3.6-flash` analysis，可切 `qwen3.6-plus`；`qwen3-tts(-instruct)-flash` voice)。也可以在播放器顶部直接切到 MiniMax、MiMo、Gemini 或 OpenAI，并选择 analysis model、TTS model 和 voice；这些选择会同步写入 `sayItRight.*` 设置。

发音图会先让模型给出 IPA、重音、弱读、thought group 和语调，再经过一层规则校正：function words 通常弱读，content words 和短语动词小品词通常重读，nuclear stress 放在自然的最后内容焦点，陈述句/wh-question 句末多为 fall，yes/no 或礼貌请求句末多为 rise。这样 Qwen、Gemini、MiniMax、MiMo 即使原始 JSON 分组不稳，也不会把 `Could you`、`and` 这类弱词乱标成重音中心。

### Prompt flow

内置 prompt 分三条可测试的链路维护：

- **TTS / Teacher slow**：只读原文，不翻译、不解释、不加例句；英文按 General American，混合中英文本各按原语言读，适合 shadowing。
- **Prosody stave**：模型只生成 learner-facing 的 IPA、重音、弱读、thought group 和语调候选；扩展再做规则归一化，避免 provider 把弱词、连读和核重音乱标。
- **Coach / Native English / Translate**：先内部判断语义、语境、语气和 speech act，再输出英语母语者自然会怎么说；Coach/Native English 返回 JSON 讲解，Translate 只返回译文。

对应契约在 `test/core/prompt.test.ts`、`test/core/prosody.test.ts`、`test/core/tts.test.ts` 和 provider request tests 里校验。

### Record & compare (macOS)

播放器里的 **Record** 会通过 VS Code extension host 调用 ffmpeg 录制系统默认麦克风；第一次使用时需要在 macOS 里允许 VS Code 访问麦克风。录完后可以播放 **Your take**，点 **Compare** 会用 ASR 转写你的录音，显示词面匹配、漏读、多读和一句练习提示；**Export mine** 可导出自己的 `.wav`。默认 ffmpeg 路径是 `/opt/homebrew/bin/ffmpeg`，可在 `sayItRight.ffmpegPath` 修改。

Word-highlight 的精确时间戳使用 OpenAI Whisper（需要设置 OpenAI key）；如果没有可用 ASR，播放器仍会按音频实际时长做 proportional highlight，不影响播放和跟读。

## 快速开始 Setup

1. 侧边栏点 **🔑 API Key**（或命令面板运行 _Say It Right: Set API Key_），Coach/analysis 填 **Qwen Coach/Analysis (Token Plan)** key；如果要用 Qwen 朗读，发音播放器里的 **API Key** 会引导你填单独的 **Qwen Speech/TTS (DashScope)** key。两个 key 不互相 fallback。
2. 打开活动栏的 **Say It Right** 侧边栏，输入英文按 `⌘↵`，或点 **🎙 发音 / Pronunciation**。
3. Coach 侧边栏可直接选择 provider/model/thinking；发音播放器顶部可选择发音分析/TTS provider、model 和 voice。

API key 存在 VS Code SecretStorage（系统钥匙串），不会写进 settings.json。

## 支持的模型 Supported models

| Provider                    | 用途                   | 默认模型 / 声音                                                               |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| Qwen / 通义千问             | 发音分析 + 教练 + 朗读 | `qwen3.6-flash` / `qwen3.6-plus` (Token Plan) / `qwen3-tts-flash` (DashScope) / `Jennifer` |
| MiniMax / 海螺              | 发音分析 + 教练 + 朗读 | `MiniMax-M3` / `speech-2.8-turbo` / `English_expressive_narrator`             |
| 小米 MiMo                   | 发音分析 + 教练 + 朗读 | `mimo-v2.5` / `mimo-v2.5-tts` / `Chloe`                                       |
| Gemini                      | 发音分析 + 教练 + 朗读 | `gemini-3.5-flash` / `gemini-3.1-flash-tts-preview` / `Charon`                |
| OpenAI / GPT                | 发音分析 + 教练 + TTS  | `gpt-5.5` / `gpt-4o-mini-tts` / `marin`                                       |

## 开发 Develop

- `npm install`
- `npm run watch`，然后按 F5 打开 Extension Development Host
- `npm test` 跑核心单测
