# BeHappy finance: costs, prices, promotions and the 15 GEL rule

Status: 2026-11-09, branch `feature/behappy-wellbeing-ecosystem`. Flitt stays in TEST mode.
Every table under "Generated report" comes from `npm run economics` (`server/finance/model.mjs`,
the same code the CI test, the promotions guard and the admin center use). Assumptions,
with their source and date, are in `server/finance/assumptions.mjs`.

## The rule and how it is guaranteed

Each paid product must leave at least **15 GEL per 30 days** of net contribution
(Plus 90: 45, Plus 365: 180, Art program: 15 for the whole program, Professional: 15)
in the **worst usage the server allows**, at its list price and at any promotional price,
on every supported payment channel. `server/test/finance.test.mjs` fails CI otherwise;
`npm run economics:check` prints the same check.

Token counts, caching and retries vary too much to guarantee anything on their own. So the
server now enforces a **per-account AI allowance in USD** (`server/quota.mjs`, `AI_ALLOWANCES`):

| Who | Allowance | Window |
|---|---|---|
| Plus | $3.50 | rolling 30 days, every feature |
| Free | $0.10 | rolling 30 days, everything except Art |
| Free first Art session | $0.80 | once |
| Art program (without Plus) | $12.40 | the whole 43-session program |

Every request first **reserves its worst-case cost** (`RESERVE_USD`; one Art turn is $0.40:
three calls of about 19k input and 8,000 output tokens) inside the same locked transaction,
and the real cost replaces the reservation when the call ends. Two requests at once can't
overrun an allowance, and a crash leaves the reservation counted (the safe side). People
see a fair-use meter and the reset date, never dollars. Safety resources are never metered.

## Audit: every AI call (from the code)

| Feature | Endpoint | Model (chosen by the server) | Calls per request | Output cap |
|---|---|---|---|---|
| Bea (the companion) | `/api/ai/responses`, streamed | gpt-5.4-mini, reasoning none | 1 | 2,048 |
| Art reflection | `/api/ai/responses` → `server/art/turn.mjs` | gpt-6.1-sol, reasoning medium (fallback gpt-5.4-mini) | up to 3 (checked retries) | 8,000 (12,800 after a cut-off) |
| Reflection cards | `/api/ai/responses` | gpt-5.4-mini | 1 | 2,048 |
| Journal reflection | `/api/ai/chat` | gpt-4.1-mini | 1 | 380 |
| Conversation summary | `/api/ai/chat` | gpt-5.4-mini, reasoning low | 1 | 500 (+1,500 reasoning) |
| Motivation line | `/api/ai/chat` | gpt-4.1-mini | 1 | — |
| Daily reflection | `/api/ai/reflection` | gpt-5.4-mini | 1, plus one correction | 1,500 |
| Community companion | `server/community/anulia.mjs` | gpt-5.4-mini | 1 | 700 |
| Speech-to-text | `/api/ai/transcribe` | gpt-4o-mini-transcribe | 1 | — |
| Text-to-speech | `/api/ai/speech` | gpt-4o-mini-tts | 1 | 2,000 characters in |

No scheduled job, notification or moderation step calls OpenAI (community moderation uses word
lists and staff). Measured token counts (local `ai_usage`, p50 and p95) are in the assumptions file.

## Problems found and fixed

| # | Problem | Fix |
|---|---|---|
| 1 | `/api/ai/chat` passed the client's `system` messages on, and the client chose the model | Client `system` messages are dropped, `developer`/`tool` refused, `response_format` limited; the instructions live on the server (`CHAT_PROMPTS`) and the model is set per feature |
| 2 | Speech and transcription were never recorded: no cost, outside every budget | Recorded, with a cost estimated from the size |
| 3 | Cached input was ignored and no cost was stored per call | `ai_usage.cost_usd` and `cached_tokens`; cached input at its own rate; older rows priced from their tokens |
| 4 | Rate limits and the global cap lived in one process's memory | Shared table `rate_events` (exact sliding window) for AI, account creation, restore and the community |
| 5 | The global limit counted requests, not money | Daily and per-feature budgets in USD (`ai.dailyBudgetUsd`, new `ai.featureBudgetsUsd`), checked against the next request's worst case |
| 6 | Grace messages were 3 per conversation, so 40 one-message conversations gave 120 extra messages a day | At most 6 a day (Plus) or 3 a month (free), across all conversations |
| 7 | Art allowed 80 messages per session | 24 (a session takes 8–15 turns); the 43 sessions and the three phases are unchanged |
| 8 | A stream cut before its usage arrived, or an Art timeout, cost nothing in the records | Counted at the reservation (stream) or at a third of the turn's worst case (timeout) |
| 9 | `unit-economics.mjs` priced Art at gpt-5.4-mini rates, assumed 8 turns per session and $0.05 hosting per user | Rewritten on the model: Art at gpt-6.1-sol, the real limits, fixed hosting spread over paying customers |
| 10 | The Art program at 50 GEL lost about 23 GEL per buyer in the worst case; Plus 365 at 519 GEL missed its minimum | New prices (below) |

Checked and fine: Flitt signatures (SHA-1, constant-time comparison), amount and currency
checked against the order on every callback, conversation chains bound to their account,
admin permissions per role with a fresh confirmation for money actions, the secret scan in
the unit tests.

## Prices

| Product | Before | Now | Why |
|---|---|---|---|
| Plus 30 days | 51 | **49 GEL** | the lowest round price that still leaves 15 GEL in the worst case (floor 46) |
| Plus 90 days | 142 | **135 GEL** (45 a month) | floor 133 |
| Plus 365 days | 519 | **549 GEL** (45.75 a month, 6.6% under 12 × 49) | 519 missed the 180 GEL minimum |
| Art program, 43 sessions | 50 | **105 GEL** | 43 sessions on gpt-6.1-sol cost up to about $12 without caching |
| Professional, 30 days | 79 | **79 GEL** | no AI; up to about 55% discount is safe |

If an accountant confirms the **1% small-business status without VAT**, the `affordable`
catalog becomes safe: Plus 39 / 109 / 449 GEL, Art 85 GEL (`BEHAPPY_CATALOG=affordable` and
`FINANCE_TAX_SCENARIO=small_business_1`). The CI test checks both catalogs.

## Promotions

`server/promotions.mjs`: percent, fixed-price and amount-off offers; automatic campaigns or
codes; first purchase only; start and end dates; redemption limits per promotion and per
account; stacking only when every part allows it. Every price is decided on the server at
checkout; a discount under the floor is reduced to the floor (or refused, if staff turned
reducing off). The reference ("regular") price is the catalog price that is really charged
without an offer, never an invented "was" price. Orders store the regular price, the discount
and the promotion. Staff manage promotions in the admin Financial control center (permission
`promotions.manage`, a fresh confirmation, written to the audit log).

## Launch blockers (owner actions)

- **Tax status: ACCOUNTANT/LEGAL APPROVAL REQUIRED.** Whether SaaS qualifies for the 1%
  small-business status (the current Government Resolution 415, Annex 4 could not be read),
  VAT registration (the 18% rate and the threshold are UNVERIFIED here), and VAT for foreign
  customers. Until then the conservative case is used.
- **CAC** is unknown, so the 15 GEL is not a full profit guarantee. Set `FINANCE_CAC_GEL`.
- **Flitt production**: live credentials, the contract rates (the page lists 2.2%, 2.0% and
  2.5%; the model uses 2.5%), refund and chargeback terms. Live mode stays off in this build.
- **App stores**: selling digital subscriptions inside the iOS and Android apps normally needs
  Apple or Google billing (15–30%), which this build doesn't have; prices would have to be much
  higher (see the stress table). Check the store rules before publishing with web checkout.
- **OpenAI**: revoke the key that is in the git history; set a project budget in the OpenAI
  dashboard; keep `server/aiPricing.mjs` in step with the price page (a 2× price change that
  isn't entered there breaks the margins: see the stress table).
- **Infrastructure**: production database backups, monitoring, an email plan (Resend Pro), SMS
  (Twilio) for professional verification, Expo push in production.
- **Native testing** on real iOS and Android devices, and a review of the 17 machine translations.

## Generated report

Assumptions checked 2026-11-09. Sources: https://developers.openai.com/api/docs/pricing (read 2026-11-09; no last-updated date on the page); https://flitt.com/ka/pricing/ and https://flitt.com/pricing/ (read 2026-11-09; no date on the page); https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/ (USD 2.5943 GEL, valid from 2026-11-10); https://matsne.gov.ge/ka/document/view/1043717 (Tax Code; Arts. 81, 83-98 read 2026-11-09; VAT Arts. 161-165 NOT read); https://matsne.gov.ge/ka/document/view/1164635 (Government Resolution 415, Annex 4; only the 2010 text was readable); https://www.hetzner.com/cloud/cost-optimized/ , /storage/object-storage/ (read 2026-11-09; EUR, excl. VAT); https://www.digitalocean.com/pricing/droplets , /pricing/managed-databases , /products/spaces (read 2026-11-09); https://resend.com/pricing (read 2026-11-09); https://www.twilio.com/en-us/verify/pricing and /sms/pricing/ge (pricing current as of October 2026); https://expo.dev/pricing (read 2026-11-09; push pricing not listed).

### A. Cost breakdown (per use)

Measured token counts (ai_usage, p50; heavy = p95 with +50% context). USD list prices https://developers.openai.com/api/docs/pricing (read 2026-11-09; no last-updated date on the page). GEL at 2.86 per USD (NBG 2.5943 + 10%).

| Feature | Typical (50% cached) | No caching | Heavy, no caching | Heavy in GEL |
|---|---|---|---|---|
| Anulia: one message | $0.0014 | $0.0021 | $0.0038 | 0.01 |
| Anulia: 10-message conversation | $0.020 | $0.032 | $0.054 | 0.16 |
| Anulia: 20-message conversation | $0.054 | $0.089 | $0.146 | 0.42 |
| Anulia: 40-message conversation | $0.163 | $0.277 | $0.440 | 1.26 |
| Anulia memory block (per message, max 4,500 chars) | $0.0006 | $0.0011 | $0.0017 | 0.00 |
| Conversation summary | $0.0009 | $0.0011 | $0.0019 | 0.01 |
| Daily reflection | $0.0011 | $0.0014 | $0.0024 | 0.01 |
| Daily reflection with its correction round | $0.0023 | $0.0028 | $0.0048 | 0.01 |
| Art: one turn (gpt-6.1-sol, all calls) | $0.011 | $0.018 | $0.060 | 0.17 |
| Art: one session (12 turns) | $0.162 | $0.279 | $0.809 | 2.31 |
| Art: session at the cap (24 turns, every turn retried twice) | $1.176 | $2.062 | $5.437 | 15.55 |
| Art: full program, 43 sessions x 12 turns | $6.967 | $11.991 | $34.783 | 99.48 |
| Reflection cards: one message | $0.0013 | $0.0021 | $0.0045 | 0.01 |
| Reflection cards: 8-message conversation | $0.014 | $0.023 | $0.045 | 0.13 |
| Journal reflection (gpt-4.1-mini) | $0.0003 | $0.0004 | $0.0006 | 0.00 |
| Community companion reply | $0.0011 | $0.0015 | $0.0024 | 0.01 |
| Speech-to-text, 1 minute | $0.0030 | $0.0030 | $0.0030 | 0.01 |
| Text-to-speech, 1,000 characters | $0.017 | $0.017 | $0.017 | 0.05 |

Worst case per request (reserved before each call, so parallel requests cannot overrun an allowance):

| anulia | summary | motivation | journal | cards | community | reflection | art | transcribe | speech |
|---|---|---|---|---|---|---|---|---|---|
| $0.030 | $0.020 | $0.010 | $0.010 | $0.030 | $0.010 | $0.020 | $0.400 | $0.010 | $0.040 |

Monthly AI cost by user profile (USD; "charged" = what the server lets an account spend):

| Profile | Uncapped use | Charged | Hits the allowance |
|---|---|---|---|
| free | $0.116 | $0.116 | yes |
| light_plus | $0.802 | $0.802 | no |
| normal_plus | $2.701 | $2.701 | no |
| heavy_plus | $8.199 | $3.900 | yes |
| max_allowed_plus | $25.876 | $3.900 | yes |

AI allowances (server/quota.mjs): Plus $3.5 per rolling 30 days; free $0.1 per 30 days (+ $0.8 once for the free Art session); Art program $12.4 for all 43 sessions.

### B. Pricing recommendation

Worst case = every allowance fully used, Conservative worst case: 18% VAT inside the price + 3% of turnover, Flitt international card 2.5%, refunds 3%, 10 free users per paying customer, fixed costs over 100 paying customers, CAC UNKNOWN (not included).

| Product | Old price | Typical cost | Recommended price | Promo floor (max safe discount) | Worst-case cost | NET margin (worst case) | Required |
|---|---|---|---|---|---|---|---|
| plus_30 | 51 GEL | 27.54 | **49 GEL** | 46 GEL (6.1%) | 30.97 | 18.03 | 15 |
| plus_90 | 142 GEL | 79.82 | **135 GEL** | 133 GEL (1.5%) | 87.82 | 47.18 | 45 |
| plus_365 | 519 GEL | 324.06 | **549 GEL** | 540 GEL (1.6%) | 361.36 | 187.64 | 180 |
| art_program | 50 GEL | 69.58 | **105 GEL** | 101 GEL (3.8%) | 86.27 | 18.73 | 15 |
| professional_30d | 79 GEL | 29.91 | **79 GEL** | 35 GEL (55.7%) | 29.91 | 49.09 | 15 |

**Old prices in the same worst case:**

| Product | Old price | NET margin | Passes |
|---|---|---|---|
| plus_30 | 51 GEL | 19.57 | yes |
| plus_90 | 142 GEL | 52.55 | yes |
| plus_365 | 519 GEL | 164.63 | **NO** |
| art_program | 50 GEL | -23.45 | **NO** |
| professional_30d | 79 GEL | 49.09 | yes |

**Pricing strategies compared** (GEL; worst-case NET margin in brackets):

| Product | Existing | Affordable (only if 1% status confirmed) | Recommended | Promotional floor | Annual equivalent / month | Worst-case safe minimum |
|---|---|---|---|---|---|---|
| plus_30 | 51 [19.57] | 39 [1%: 16.91] | 49 [18.03] | 46 | 49.00 | 46 |
| plus_90 | 142 [52.55] | 109 [1%: 45.55] | 135 [47.18] | 133 | 45.00 | 133 |
| plus_365 | 519 [164.63] | 449 [1%: 186.36] | 549 [187.64] | 540 | 45.12 | 540 |
| art_program | 50 [-23.45] | 85 [1%: 17.67] | 105 [18.73] | 101 | — | 101 |
| professional_30d | 79 [49.09] | — | 79 [49.09] | 35 | 79.00 | 35 |

### C. Monthly business forecast

Mix of paying customers: 50% Plus 30, 30% Plus 90, 20% Plus 365 (monthly share of the price). Typical = normal usage; worst = every paying account spends its whole AI allowance. Hosting: Hetzner Cloud (EU): app server + database server + backups + object storage. GEL.

| Users | Paid share | Paying | Revenue | Taxes+fees+refunds | Hosting & services | Support | AI typical | AI worst | Profit typical | Profit worst |
|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 2% | 2 | 94.05 | 21.91 | 183.63 | 2.00 | 43.48 | 71.82 | -156.97 | -185.32 |
| 100 | 5% | 5 | 235.12 | 54.78 | 183.63 | 5.00 | 65.79 | 103.77 | -74.08 | -112.05 |
| 100 | 10% | 10 | 470.25 | 109.55 | 183.63 | 10.00 | 102.98 | 157.01 | 64.08 | 10.05 |
| 500 | 2% | 10 | 470.25 | 109.55 | 206.40 | 10.00 | 217.38 | 359.12 | -73.09 | -214.82 |
| 500 | 5% | 25 | 1175.62 | 273.88 | 206.40 | 25.00 | 328.96 | 518.85 | 341.38 | 151.49 |
| 500 | 10% | 50 | 2351.23 | 547.76 | 206.40 | 50.00 | 514.92 | 785.07 | 1032.16 | 762.01 |
| 1000 | 2% | 20 | 940.49 | 219.10 | 220.70 | 20.00 | 434.77 | 718.24 | 45.92 | -237.55 |
| 1000 | 5% | 50 | 2351.23 | 547.76 | 220.70 | 50.00 | 657.92 | 1037.70 | 874.86 | 495.07 |
| 1000 | 10% | 100 | 4702.47 | 1095.52 | 220.70 | 100.00 | 1029.84 | 1570.14 | 2256.41 | 1716.11 |
| 5000 | 2% | 100 | 4702.47 | 1095.52 | 374.74 | 100.00 | 2173.84 | 3591.21 | 958.37 | -458.99 |
| 5000 | 5% | 250 | 11756.16 | 2738.79 | 374.74 | 250.00 | 3289.61 | 5188.52 | 5103.03 | 3204.12 |
| 5000 | 10% | 500 | 23512.33 | 5477.58 | 374.74 | 500.00 | 5149.21 | 7850.70 | 12010.80 | 9309.32 |
| 10000 | 2% | 200 | 9404.93 | 2191.03 | 639.77 | 200.00 | 4347.68 | 7182.41 | 2026.45 | -808.28 |
| 10000 | 5% | 500 | 23512.33 | 5477.58 | 639.77 | 500.00 | 6579.21 | 10377.03 | 10315.77 | 6517.95 |
| 10000 | 10% | 1000 | 47024.66 | 10955.15 | 639.77 | 1000.00 | 10298.42 | 15701.40 | 24131.31 | 18728.34 |

**Hosting options** (USD per month incl. email, domain and store builds):

| Active users | Hetzner | DigitalOcean |
|---|---|---|
| 100 | 63.21 | 74.80 |
| 1000 | 67.17 | 89.20 |
| 5000 | 81.03 | 133.30 |
| 10000 | 123.70 | 226.35 |

**Break-even** (paying customers to cover the fixed costs, worst case):

- plus_30: 9
- plus_90: 11
- plus_365: 11
- art_program: 23
- professional_30d: 4

### D. Stress test (passes the 15 GEL-per-30-days rule?)

| Scenario | plus_30 | plus_90 | plus_365 | art_program | professional_30d |
|---|---|---|---|---|---|
| Base (worst case, design assumptions) | PASS 18.03 | PASS 47.18 | PASS 187.64 | PASS 18.73 | PASS 49.09 |
| 0% prompt caching (allowance in USD: unchanged) | PASS 18.03 | PASS 47.18 | PASS 187.64 | PASS 18.73 | PASS 49.09 |
| GEL weakens to 3.20 per USD | PASS 15.83 | **FAIL** 40.83 | **FAIL** 161.34 | **FAIL** 11.74 | PASS 48.08 |
| Flitt fee 3.5% | PASS 17.54 | PASS 45.83 | PASS 182.15 | PASS 17.68 | PASS 48.30 |
| 20 free users per paying customer | **FAIL** 12.98 | **FAIL** 32.02 | **FAIL** 126.17 | **FAIL** 3.58 | PASS 44.04 |
| Model prices x2, price table NOT updated | **FAIL** 6.88 | **FAIL** 16.01 | **FAIL** 56.37 | **FAIL** -17.87 | PASS 49.09 |
| Only 30 paying customers carry the fixed costs | **FAIL** 13.95 | **FAIL** 34.92 | **FAIL** 137.93 | **FAIL** 6.48 | PASS 45.00 |
| Eligible small business 1% (if confirmed) | PASS 26.26 | PASS 69.86 | PASS 279.86 | PASS 36.37 | PASS 62.36 |
| LLC, VAT-registered | PASS 19.28 | PASS 50.61 | PASS 201.60 | PASS 21.40 | PASS 51.10 |
| CAC 20 GEL per customer | **FAIL** -1.97 | **FAIL** 27.18 | **FAIL** 167.64 | **FAIL** -1.27 | PASS 29.09 |

In-app purchase is NOT supported in this build. If it were, Apple's 30% would need: plus_30: 71 GEL, plus_90: 207 GEL, plus_365: 841 GEL, art_program: 157 GEL.
