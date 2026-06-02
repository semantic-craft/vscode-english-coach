# Intent Expression Prompt Eval

Date: 2026-05-31
Provider: Qwen (Token Plan)
Model: qwen3.6-flash
Base URL: https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic
Temperature: 0 via project generateWithProvider(options.temperature)
API key: present (redacted)

## Summary

| Candidate | Total | Average per sample |
|---|---:|---:|
| baseline - Current built-in buildNativeEnglishExpressionPrompt | 207 | 34.50 |
| candidate-a - Intent-to-utterance, native daily English, strict no unsupported additions | 204 | 34.00 |
| candidate-b - Conservative intent expression, closer to source constraints | 204 | 34.00 |

Selected: baseline (Current built-in buildNativeEnglishExpressionPrompt).

## Outputs And Scores

### deadline-reminder

Scenario: Polite work message reminding someone to send a file before this afternoon.

Chinese intent: 我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。

#### baseline

Output:

> Could you please send the file over by this afternoon?

Score: 34/35 | Native=5 | Intent=4 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Failure modes: weakens before this afternoon into sometime today or ideally this afternoon.
Notes: The output is natural and concise. However, it slightly weakens the deadline constraint. The source explicitly states 'before this afternoon' (今天下午之前), implying a cutoff earlier in the day or by early afternoon. The candidate uses 'by this afternoon', which is often interpreted as 'by the end of the workday/afternoon'. While acceptable in casual contexts, it misses the specific nuance of 'before' the afternoon period fully begins or concludes, making it a minor fidelity issue.

#### candidate-a

Output:

> Could you please send me the file by this afternoon?

Score: 34/35 | Native=5 | Intent=4 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Failure modes: weakens before this afternoon into sometime today or ideally this afternoon.
Notes: The output is natural and concise. However, it slightly weakens the specific deadline constraint 'before this afternoon' to 'by this afternoon'. While often used interchangeably in casual speech, 'by' can imply the end of the day or a specific cutoff time later than 'before', potentially missing the nuance of urgency implied by the Chinese intent. It does not add any unsupported elements.

#### candidate-b

Output:

> Could you please send me the file by the end of the day?

Score: 32/35 | Native=5 | Intent=3 | NoCalque=5 | Direct=5 | Register=4 | NoAdd=5 | Brevity=5
Failure modes: weakens before this afternoon into sometime today or ideally this afternoon.; deadline weakened from before this afternoon
Notes: The translation is natural and concise. However, it fails on intent fidelity regarding the specific deadline constraint. The source explicitly requests the file 'before this afternoon' (implying a morning or early afternoon cutoff), but the output uses 'by the end of the day', which extends the deadline to evening/night. This significantly weakens the urgency and changes the requested action window.

### non-blaming-explanation

Scenario: Message to a foreign colleague explaining that the problem came from unclear requirements, not bad work.

Chinese intent: 我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。

#### baseline

Output:

> This isn't a reflection on your work; we just didn't make the requirements clear earlier.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, concise, and accurately conveys the intended meaning without adding unsupported elements or using Chinese calques. It fits the professional yet direct tone required for a colleague.

#### candidate-a

Output:

> It's not that you did a bad job; we just didn't make the requirements clear earlier.

Score: 32/35 | Native=4 | Intent=5 | NoCalque=5 | Direct=5 | Register=3 | NoAdd=5 | Brevity=5
Failure modes: no-blame explanation sounds too blunt
Notes: The translation is natural, direct, and accurately reflects the source intent without adding meta-language or unsupported elements. It fits the professional yet collegial register perfectly.

#### candidate-b

Output:

> This isn't a reflection on your performance; we simply didn't clarify the requirements clearly enough beforehand.

Score: 34/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=4
Notes: The translation is natural and accurate. The only minor deduction in brevity is due to the slight redundancy of 'clarify... clearly', though this is common in native speech for emphasis.

### hotel-room-request

Scenario: Front desk request at a hotel.

Chinese intent: 我想跟酒店前台说，房间里的空调声音太大了，能不能换一个安静一点的房间。

#### baseline

Output:

> The air conditioning in my room is too loud. Could I get a quieter room?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, concise, and perfectly captures the intent without adding unsupported elements or calques. It fits the register of a hotel front desk request appropriately.

#### candidate-a

Output:

> The air conditioning in my room is really loud. Could I get a quieter room?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, concise, and perfectly captures the intent without adding unsupported elements or meta-language. It fits the hotel front desk register appropriately.

#### candidate-b

Output:

> The air conditioner in my room is too loud. Could I please be moved to a quieter room?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, polite, and directly addresses the hotel front desk. It accurately conveys the complaint about the noise and the request for a room change without adding unsupported elements or using Chinese calques.

### advisor-materials

Scenario: Message to an academic advisor.

Chinese intent: 我想跟导师说，材料我已经基本写完了，但还想再核对一下数据，能不能明天上午发给他。

#### baseline

Output:

> I've basically finished the draft, but I'd like to double-check the data first. Would it be possible to send it to you tomorrow morning?

Score: 34/35 | Native=5 | Intent=4 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural and direct. However, it slightly weakens the intent fidelity by omitting the explicit request for permission ('能不能') regarding sending it tomorrow morning, turning a question of possibility into a statement of intent followed by a polite inquiry about timing. It implies the action will happen rather than asking if it is acceptable.

#### candidate-a

Output:

> I've basically finished the draft, but I'd like to double-check the data first. Would it be okay if I sent it to you tomorrow morning?

Score: 34/35 | Native=5 | Intent=4 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural and fits the register well. However, it slightly weakens the intent fidelity by omitting the explicit request for permission ('能不能') regarding the specific action of sending it tomorrow morning. The candidate translates 'I've basically finished... but I'd like to double-check' as a statement of fact rather than framing the delay as the reason for the proposed deadline, which makes the request for extension less direct than the source intent implies. It is still very good.

#### candidate-b

Output:

> I have basically finished the draft, but I want to double-check the data. Could I send it to you tomorrow morning?

Score: 33/35 | Native=5 | Intent=4 | NoCalque=5 | Direct=5 | Register=4 | NoAdd=5 | Brevity=5
Notes: The translation is natural and direct. However, it slightly weakens the intent fidelity by omitting 'basically' (基本), which implies the draft is not fully complete but close enough to review. In an academic context, this nuance matters. Additionally, while 'you' is appropriate for an advisor, the register is slightly casual; however, without a specific name or title in the source, 'you' is the safest direct translation. The omission of 'basically' is the primary reason for deducting points on fidelity.

### reschedule-meeting

Scenario: Polite workplace meeting reschedule.

Chinese intent: 我想礼貌地说今天不太方便开会，能不能改到明天下午。

#### baseline

Output:

> Would it be possible to reschedule our meeting to tomorrow afternoon? Today is a bit tight for me.

Score: 34/35 | Native=4 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is natural and polite. 'Today is a bit tight' is slightly informal/idiomatic for 'inconvenient', but acceptable in many workplace contexts. It avoids Chinese calques and unsupported additions.

#### candidate-a

Output:

> Would it be possible to reschedule our meeting to tomorrow afternoon? Today is a bit tight for me.

Score: 34/35 | Native=5 | Intent=4 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is natural and fits the register well. However, 'Today is a bit tight for me' is slightly ambiguous; while it implies scheduling conflicts, it could technically refer to workload rather than availability. A native speaker might prefer 'I'm tied up today' or 'My schedule is full today'. The intent fidelity is high but not perfect due to this slight semantic drift.

#### candidate-b

Output:

> I'm not available for a meeting today. Could we reschedule to tomorrow afternoon?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, concise, and accurately reflects the polite but direct intent of the source text without adding unsupported elements or calques.

### mild-disagreement

Scenario: Mild disagreement in a technical or work discussion.

Chinese intent: 我想说我理解他的观点，但这个方案可能会让后续维护变复杂。

#### baseline

Output:

> I understand his point, but this approach might complicate future maintenance.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, accurate, and fits the technical context perfectly. It avoids all listed failure modes.

#### candidate-a

Output:

> I see his point, but this approach might complicate future maintenance.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, concise, and accurately reflects the original intent without adding meta-language or unsupported content. It fits the technical/work context perfectly.

#### candidate-b

Output:

> I understand his point, but this approach might complicate future maintenance.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The translation is natural, concise, and accurately reflects the original intent without adding meta-language or unsupported elements. It fits the technical discussion context perfectly.
