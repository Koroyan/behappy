# Art reflection: model evaluation

Date: 8 November 2026. Script: `scripts/qa/art-model-eval.mjs`. Raw results
(synthetic data only): `docs/eval/art-eval-*.json`.

## Decision

**`AI_MODEL_ART=gpt-6.1-sol`, `AI_REASONING_ART=medium`, `AI_ART_MAX_OUTPUT_TOKENS=8000`,
fallback `gpt-5.4-mini`.** Anulia, cards and community stay on `gpt-5.4-mini`
(independent settings).

Why Sol: on the turns that matter for this exercise it followed the method
where the current model did not (the comparison step after a second drawing,
an accurate summary), it matched GPT-6 Astra's quality at about a fifth of the
cost, and `high` reasoning brought no measurable gain for 1.7× the latency.

## Compatibility (verified against the live API)

| Check | gpt-6.1-sol |
|---|---|
| Available to the project (`GET /v1/models`) | yes (also gpt-6.1-terra, gpt-6-astra, gpt-5.4-mini) |
| Responses API, `text.format = json_object` | yes — 100 % complete JSON on the first answer (39/39 turns, medium and high) |
| Vision input (`input_image`, `detail: high`) | yes |
| `reasoning.effort` medium / high | yes / yes |
| `previous_response_id` chaining with `store: true` | yes (every scenario chains its turns) |
| Output budget | 8000 tokens: observed 220 (medium) – 444 (high) average output tokens per turn, no cut-off |
| Errors | out of credits → HTTP 429 `insufficient_quota` (seen at the end of the evaluation; now answered 503 `ai_unavailable`) |

Streaming from OpenAI is no longer used for art (the reply is checked first);
the app still receives the same event stream from our server.

## Method

- **Pipeline:** every turn goes through the real checking pipeline
  (`server/art/turn.mjs`) with an in-memory database; the script records the
  model's **first** answer (before any check or retry) and what the person
  would see.
- **Dataset:** 9 synthetic scenarios, 39 turns, no real person's data:
  `regression` (witeli → energia → tavshi → naprajenie → ara sasiamovno),
  `pleasant_ka` (kargad vgrdznob…), `mixed` (Russian + Latin Georgian, then
  "не знаю" twice), `georgian_ui` (Georgian app), `english_short` ("not good",
  "tense"), `stop` (asks to end), `identical` (same photo twice, full close),
  `lighting` (same drawing, different light), `modified` (a dark circle added).
  The drawing is a generated photo-like crayon picture on paper.
- **Rubric (binary per turn, first answer):** complete JSON · reversed the
  person's feeling · described a drawing change the comparison didn't find ·
  needed a phase/state fix · summary needed a fix · shown text in the selected
  language (script check) · image turn asked exactly two questions. Plus a
  manual reading of the key turns (below), recorded with quotes.
- **Price** per 1M tokens (list, Nov 2026, cached input not discounted, so an
  upper bound): Sol $2/$10, Terra $1/$5, Astra $10/$50, gpt-5.4-mini $0.75/$4.50.

A first round was discarded: the script's run ids contained dots, so all
scenarios of a model shared one run and earlier feelings leaked into later
scenarios. It also showed two false alarms in the checks ("Хорошо, …" read as a
feeling; a typographic apostrophe hiding "didn’t"), both fixed with tests.

## Results (round 2, reasoning medium unless stated)

| Model | Turns | JSON 1st | Reversed feeling (raw) | Invented change (raw) | State fix | Summary fix | Language | 2 questions on image | Median / p90 latency | Avg tokens in/out | $ per turn | $ per 7-turn session |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| gpt-5.4-mini (current) | 39 | 100 % | 0 | 0 | 0 | 0 | 100 % | 9/9 | 3.8 s / 4.6 s | 5121 / 465 | 0.006 | 0.044 |
| gpt-6.1-terra | 39 | 100 % | 1* | 0 | 0 | 0 | 100 % | 9/9 | 4.4 s / 5.2 s | 5270 / 243 | 0.007 | 0.050 |
| **gpt-6.1-sol** | 39 | 100 % | 0 | 0 | 0 | 0 | 100 % | 9/9 | 3.9 s / 5.7 s | 5098 / 220 | 0.012 | 0.097 |
| gpt-6.1-sol, high | 39 | 100 % | 0 | 0 | 0 | 0 | 100 % | 9/9 | 6.7 s / 10.5 s | 5463 / 444 | 0.015 | — |
| gpt-6-astra | 39 | 100 % | 0 | 0 | 0 | 0 | 100 % | 9/9 | 4.4 s / 6.7 s | 5088 / 216 | 0.062 | 0.472 |

\* a false alarm of the checks (typographic apostrophe), fixed afterwards.

All models already benefit from the new app notes, so the automatic counts are
close. The difference shows in the manual reading:

| Turn | gpt-5.4-mini | gpt-6.1-sol |
|---|---|---|
| identical, after the second (same) photo, person: "да" | "Если один элемент привлекает ваше внимание сильнее всего, какой это?" — skips the comparison step | "Я не вижу изменений между изображениями — возможно, отправился тот же рисунок, и мы можем продолжить с ним. Что вы хотели в нём изменить?" |
| lighting, same drawing in other light, person: "спокойно" | "…хотите ещё немного изменить его, или перейти к короткой истории…" — skips the comparison, repeats the choice | "Сейчас вам спокойно. Я не вижу явных изменений в рисунке — что вы изменили или хотели изменить?" |
| identical, closing summary | "…описали это как нейтральное…" — the person never said "neutral" | "…Два присланных изображения оказались одинаковыми. При обсуждении вы сказали: «Это ничего не значит», а затем попросили завершить сессию. …" |
| modified, a dark circle added top-right | "В правом верхнем углу теперь появился тёмный круг…" | "В правом верхнем углу появился тёмный круг…" (both correct) |
| regression, "naprajenie" | "Напряжение. Что в рисунке его для вас больше всего выражает?" | "Вы ощущаете неприятное напряжение в голове…" — adds "unpleasant" one turn early |
| regression, "ara sasiamovno" | "Неприятно. …" | "Это ощущение для вас неприятно. …" |
| Georgian app | "სხეულში სიმძიმე და დაძაბულობა იგრძნობა…" | "ცოტა სიმძიმეს და მკერდში დაძაბულობას გრძნობ…" |

Terra followed the comparison step like Sol; GPT-6 Astra's answers were close
to Sol's word for word at 5× the price. Sol `high` gave equivalent answers
(e.g. "Это ощущается как неприятное напряжение в голове. Когда вы впервые
заметили его…") with 1.7× median latency.

After the evaluation one prompt line was added against Sol's early evaluation
("tension" alone is not yet "unpleasant tension"). **It is not yet verified on
the live model:** the OpenAI account ran out of credits (HTTP 429
`insufficient_quota`) during the re-check. Re-run:
`node scripts/qa/art-model-eval.mjs --models gpt-6.1-sol --only regression,mixed`.

## Limits of this evaluation

- 39 turns per model with synthetic conversations and one generated drawing:
  enough to compare models on the known failure modes, not a statistical
  quality score. Model answers vary between runs.
- The images are generated, not phone photos of real paper.
- The same list prices are the server's default cost estimates per model
  (`server/aiPricing.mjs`: admin AI page, daily budget); a price set by staff
  overrides them.
- Costs are list prices without the cached-input discount; with
  `previous_response_id` most of the ~5k input tokens per turn (instructions,
  earlier turns) are cached, so real costs are lower.
