# Intent Expression Prompt Eval

Date: 2026-05-31
Provider: Xiaomi MiMo
Model: mimo-v2.5
Base URL: https://token-plan-cn.xiaomimimo.com/v1
Temperature: 0 via project generateWithProvider(options.temperature)
API key: present (redacted)

## Summary

| Candidate | Total | Average per sample |
|---|---:|---:|
| baseline - pre-change built-in buildNativeEnglishExpressionPrompt | 202 | 33.67 |
| candidate-a - Intent-to-utterance, native daily English, strict no unsupported additions | 207 | 34.50 |
| candidate-b - Conservative intent expression, closer to source constraints | 210 | 35.00 |

Selected: candidate-b (Conservative intent expression, closer to source constraints). The built-in prompt was updated after this report was generated, so "baseline" here means the pre-change prompt.

## Outputs And Scores

### deadline-reminder

Scenario: Polite work message reminding someone to send a file before this afternoon.

Chinese intent: 我想委婉地提醒对方，今天下午之前把文件发我，不要显得太催。

#### baseline

Output:

> Just a friendly reminder — if you could send the file over by this afternoon, that would be great.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and polite English sentence that perfectly matches the scenario of a colleague reminding another colleague. It preserves the deadline ('by this afternoon'), the requested action ('send the file'), and the gentle, non-pressuring tone ('Just a friendly reminder', 'that would be great'). It avoids Chinese calques, meta-language, and any unsupported additions.

#### candidate-a

Output:

> Just a friendly reminder to send the file over by this afternoon if you can.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and polite English sentence that perfectly matches the scenario of a colleague reminding another colleague. It preserves the deadline ('by this afternoon'), the requested action ('send the file over'), and the softening tone ('if you can'). It avoids all Chinese calques, meta-language, and unsupported additions.

#### candidate-b

Output:

> Just a gentle reminder to please send the file over by this afternoon.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and polite English sentence that perfectly matches the intent of a gentle reminder with a clear deadline. It avoids all common pitfalls like translationese, meta-language, or unsupported additions.

### non-blaming-explanation

Scenario: Message to a foreign colleague explaining that the problem came from unclear requirements, not bad work.

Chinese intent: 我想跟外国同事说，这事不是你做得不好，是我们之前没有把要求讲清楚。

#### baseline

Output:

> This isn't about your work at all. The issue is that we didn't communicate the requirements clearly from the start.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct English sentence that perfectly captures the intent of absolving the colleague of blame and attributing the issue to unclear requirements. It uses no Chinese calques, adds no unsupported elements, and fits the professional yet collegial register.

#### candidate-a

Output:

> This isn't about you doing a bad job. We didn't make the requirements clear enough beforehand.

Score: 32/35 | Native=4 | Intent=5 | NoCalque=5 | Direct=5 | Register=3 | NoAdd=5 | Brevity=5
Failure modes: no-blame explanation sounds too blunt
Notes: The output is a natural, direct, and concise English sentence that perfectly matches the intent of reassuring a colleague while explaining the root cause. It avoids translationese, meta-language, and any unsupported additions.

#### candidate-b

Output:

> This isn't about your performance; we didn't communicate the requirements clearly beforehand.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct English sentence that perfectly captures the intent of absolving the colleague of blame and attributing the issue to unclear requirements. It fits a professional colleague-to-colleague register, avoids any Chinese calques or meta-language, and adds no unsupported elements.

### hotel-room-request

Scenario: Front desk request at a hotel.

Chinese intent: 我想跟酒店前台说，房间里的空调声音太大了，能不能换一个安静一点的房间。

#### baseline

Output:

> Hi, I'm in room 205. The air conditioner is quite loud. Would it be possible to switch to a quieter room?

Score: 30/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=1 | Brevity=4
Failure modes: unsupported greeting; invented room number
Notes: The output is a natural, direct, and concise request that perfectly matches the scenario and intent. It uses appropriate register for a hotel front desk interaction, avoids any Chinese calques or meta-language, and adds no unsupported elements.

#### candidate-a

Output:

> The air conditioner in my room is really loud. Could I switch to a quieter room?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, direct, and concise request that perfectly matches the scenario and intent. It uses appropriate register for a hotel front desk interaction and contains no translationese or unsupported additions.

#### candidate-b

Output:

> The air conditioner in my room is very loud. Could I be moved to a quieter room?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, direct, and concise request that perfectly matches the intent and register of a front desk interaction. It avoids all common translationese and unsupported additions.

### advisor-materials

Scenario: Message to an academic advisor.

Chinese intent: 我想跟导师说，材料我已经基本写完了，但还想再核对一下数据，能不能明天上午发给他。

#### baseline

Output:

> Hi Professor, I've finished drafting the materials, but I'd like to double-check the data one more time. Would it be okay if I send them to you tomorrow morning?

Score: 32/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=3 | Brevity=4
Failure modes: unsupported greeting; unsupported academic title/name
Notes: The output is a natural, direct, and concise message that perfectly matches the intent, tone, and register of a student addressing an academic advisor. It avoids all common pitfalls like translationese, meta-language, and unsupported additions.

#### candidate-a

Output:

> I've mostly finished the materials, but I'd like to double-check the data. Could I send them to you tomorrow morning?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct request that perfectly matches the intent. It uses appropriate register for an advisor, avoids translationese, and adds no unsupported elements.

#### candidate-b

Output:

> I've mostly finished the materials, but I'd like to double-check the data. Could I send them to you tomorrow morning?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct request that perfectly matches the intent. It uses appropriate register for an advisor, avoids translationese, and adds no unsupported elements.

### reschedule-meeting

Scenario: Polite workplace meeting reschedule.

Chinese intent: 我想礼貌地说今天不太方便开会，能不能改到明天下午。

#### baseline

Output:

> I'm afraid I can't make the meeting today. Would it be possible to reschedule for tomorrow afternoon?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and polite English utterance that perfectly matches the intent of rescheduling a meeting. It uses standard workplace phrasing without any Chinese calques, meta-language, or unsupported additions.

#### candidate-a

Output:

> I'm not available for a meeting this afternoon. Could we reschedule to tomorrow afternoon instead?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct request that perfectly matches the intent and tone of the Chinese source. It uses standard English phrasing for rescheduling, avoids any Chinese calques or meta-language, and fits a professional workplace context without adding unsupported elements.

#### candidate-b

Output:

> I'm not available for a meeting this afternoon. Could we reschedule to tomorrow afternoon?

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct English utterance that perfectly matches the intent of politely rescheduling a meeting from today to tomorrow afternoon. It uses standard workplace phrasing without any Chinese calques, meta-language, or unsupported additions.

### mild-disagreement

Scenario: Mild disagreement in a technical or work discussion.

Chinese intent: 我想说我理解他的观点，但这个方案可能会让后续维护变复杂。

#### baseline

Output:

> I see his point, but this approach could make future maintenance more complicated.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct statement that perfectly captures the intent of acknowledging a point while expressing concern about future complexity. It fits a technical discussion register and contains no translationese or unsupported additions.

#### candidate-a

Output:

> I see his point, but this approach could make future maintenance more complicated.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct statement that perfectly captures the intent of acknowledging a point while expressing concern about future complexity. It fits a technical discussion register and avoids all listed failure modes.

#### candidate-b

Output:

> I understand his point, but this approach could make future maintenance more complex.

Score: 35/35 | Native=5 | Intent=5 | NoCalque=5 | Direct=5 | Register=5 | NoAdd=5 | Brevity=5
Notes: The output is a natural, concise, and direct statement that perfectly matches the Chinese intent. It uses appropriate technical register, avoids any Chinese calques or meta-language, and adds no unsupported elements.
