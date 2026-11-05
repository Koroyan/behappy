# BeHappy pricing strategy

Status, November 2026: **the current prices stay active.** A lower-price proposal is documented below and in `server/catalog.mjs` (`proposal`). It is off unless the owner sets `BEHAPPY_CATALOG=proposal`. All numbers come from `npm run economics` (`scripts/unit-economics.mjs`), where every assumption can be overridden.

## Principles

- One price per product, shown in GEL exactly as charged. No "regular price" strike-throughs, no countdowns, no fake scarcity.
- Plus is a time-boxed pass. It never renews by itself, and the person decides whether to buy again.
- Safety resources, journaling, breathing, meditation, self-check questionnaires and insights are free for everyone, always.
- Daily limits exist to bound cost and keep a calm pace. They are shown before purchase.
- The art program price (50 GEL, one-time) was approved by the owner and stays.

## What each tier includes

Source: `server/quota.mjs` (the pricing page reads the same numbers from `/api/catalog`).

| Feature | Free | Plus |
|---|---|---|
| Journal, mood check-ins, insights, goals | Unlimited, no AI needed | Unlimited |
| Breathing, meditation, PHQ-9 / GAD-7 / DASS-21 | Unlimited | Unlimited |
| "Get help now" | Always | Always |
| Anulia (AI companion) | 20 messages a month, plus 3 to finish a conversation | 40 messages a day |
| Anulia reflection on a journal entry | 1 a day | 3 a day |
| Art therapy (43 sessions, drawn on paper) | Session 1 | Full program, 1 new session a day |
| Reflection cards | 1 reflection | 2 new reflections a day |
| Voice messages (transcribed) | 5 a day | 30 a day |
| Read a reply aloud | 3 a day | 10 a day |

The art program can also be bought on its own, for one-time lifetime access. Owners without Plus keep the free Anulia limits.

## Active prices

| Product | Price | Per month |
|---|---|---|
| Plus, 30 days | 51 GEL | 51 GEL |
| Plus, 90 days | 142 GEL | ≈ 47.33 GEL |
| Plus, 365 days | 519 GEL | ≈ 43.25 GEL |
| Art therapy program, lifetime | 50 GEL | One-time |

## Unit economics

Assumptions (`DEFAULTS` in the script):

| Assumption | Value | Basis |
|---|---|---|
| Model | gpt-5.4-mini: $0.75 / 1M input, $0.075 cached, $4.50 output | OpenAI model page |
| Prompt caching | 50% of repeated prefix billed at the cached rate | Assumption |
| Speech-to-text, text-to-speech | $0.003 / min, $0.015 / min | Third-party price trackers |
| Payment fee | 2.5% | Flitt's published international-card rate; the domestic rate is not published |
| VAT | 0% (18% if VAT-registered) | Sensitivity below |
| Exchange rate | 2.65 GEL per USD | NBG was about 2.62 in Aug 2026 |
| Hosting | $0.05 per active user per month | Assumption |
| Conversation sizes | Anulia prompt 3,000 tokens and 10-turn conversations; art 6,500 tokens, 8 turns, 2 photos; cards 3,500 tokens, 8 turns | Rough measurement of the hosted prompts |

Cost per unit:

| Unit | Cost |
|---|---|
| Anulia message (incl. its share of the end summary) | $0.0039 |
| Art session (8 turns, 2 photos) | $0.0523 |
| Card reflection (8 turns) | $0.0342 |
| Journal reflection | $0.0020 |
| Voice message transcribed | $0.0015 |
| Reply read aloud | $0.0165 |

Monthly cost per user:

| Profile | Anulia | Art | Cards | Journal | Voice | Hosting | Total |
|---|---|---|---|---|---|---|---|
| Free (uses its allowance) | $0.09 | $0.05 | $0.03 | $0.02 | $0.07 | $0.05 | $0.31 (0.83 GEL) |
| Light Plus | $0.23 | $0.21 | $0.07 | $0.02 | $0.10 | $0.05 | $0.67 (1.78 GEL) |
| Typical Plus | $0.97 | $0.52 | $0.27 | $0.04 | $0.39 | $0.05 | $2.24 (5.94 GEL) |
| Heavy Plus | $2.70 | $1.15 | $1.03 | $0.12 | $1.71 | $0.05 | $6.76 (17.91 GEL) |
| Cap (every limit, every day) | $4.63 | $1.57 | $2.05 | $0.18 | $6.30 | $0.05 | $14.78 (39.18 GEL) |

Margin at the active prices, per month after the payment fee:

| Plan | Net per month | Light | Typical | Heavy | Cap |
|---|---|---|---|---|---|
| Plus 30 days | 49.73 GEL | 47.94 (96%) | 43.78 (88%) | 31.81 (64%) | 10.55 (21%) |
| Plus 90 days | 46.15 GEL | 44.37 (96%) | 40.21 (87%) | 28.24 (61%) | 6.97 (15%) |
| Plus 365 days | 42.17 GEL | 40.39 (96%) | 36.23 (86%) | 24.26 (58%) | 2.99 (7%) |

**No active plan loses money, even for someone who uses every limit every day.** Reading replies aloud is the most expensive unit: about four times an Anulia message. That is why its daily limits were lowered from 80 to 10 (Plus) and from 15 to 3 (free) during this review. At the old limits a subscriber at the cap would have cost about 135 GEL a month.

**Free tier.** A free user who uses their whole allowance costs about 0.83 GEL a month. At typical Plus usage, 1.86% of free users converting to Plus 30 covers the whole free tier.

**Art program.** 50 GEL, net 48.75 GEL. Completing all 43 sessions costs about 5.96 GEL in AI, leaving 42.79 GEL.

## Sensitivity

Margin of Plus 30 at the active price (proposal Plus 365 in brackets), per month:

| Scenario | Typical | Heavy | Cap |
|---|---|---|---|
| Base | 43.78 [14.29] | 31.81 [2.32] | 10.55 [−18.95] |
| No prompt caching | 41.60 [12.10] | 25.79 [−3.70] | 0.42 [−29.07] |
| Model price doubles | 39.01 [9.52] | 18.57 [−10.93] | −11.80 [−41.30] |
| Prompts 50% longer | 42.97 [13.47] | 29.58 [0.09] | 6.81 [−22.68] |
| VAT-registered (18%) | 36.20 [11.20] | 24.23 [−0.77] | 2.96 [−22.03] |
| GEL weakens to 3.00 per USD | 43.00 [13.51] | 29.45 [−0.05] | 5.37 [−24.12] |

The active prices survive every single shock for typical and heavy use. If the model price doubled, Plus limits would need tightening to keep cap users break-even.

## Proposal (not active)

| Product | Proposed price | Per month |
|---|---|---|
| Plus, 30 days | 29 GEL | 29 GEL |
| Plus, 365 days | 249 GEL | ≈ 20.75 GEL |
| Art therapy program | 50 GEL (unchanged) | One-time |

**Why consider it.** Georgia's average gross monthly salary was 2,389 GEL in Q2 2026 (Geostat). That is 2,780 GEL in Tbilisi and about 1,470 GEL in Imereti (Q1). Today's monthly pass is 2.1% of the national average gross salary and about 3.5% of the Imereti average. The proposal brings that to 1.2% and about 2%. Two plans instead of three is also easier to choose between.

**What it costs.** Matching today's revenue at 29 GEL needs 1.76 times as many paying subscribers. Matching today's margin at typical usage needs about 2 times as many (43.78 vs 22.33 GEL per subscriber per month). Those ratios are arithmetic, not forecasts. Nothing here predicts how many more people would buy at the lower price.

**Limits it needs.** At the current limits a cap user loses money on both proposed plans. With the limits in `docs/pricing/proposal-caps.json` (Anulia 20 a day, cards 1 a day, voice 20 a day, read-aloud 3 a day), the cap case breaks even. That leaves 0.29 GEL a month on the yearly plan and 8.33 GEL on the monthly plan:

```
node scripts/unit-economics.mjs --assumptions docs/pricing/proposal-caps.json
```

**To activate.** Set `BEHAPPY_CATALOG=proposal` on the server and lower the Plus limits in `server/quota.mjs` to match the file above. The pricing page and checkout read both from the server, so no app release is needed.

## Decisions for the owner

1. Keep the active prices, or run the proposal. A time-limited test on new users is the honest way to learn the effect: no "sale" framing, the same price for everyone in the test.
2. Confirm Flitt's domestic-card fee and whether the business is VAT-registered. Both change margins (see Sensitivity).
3. Recheck the model price and exchange rate before launch: `npm run economics`.

## Sources

- [OpenAI, GPT-5.4 mini model page](https://developers.openai.com/api/docs/models/gpt-5.4-mini) (token prices)
- [Flitt](https://flitt.com/) (published fees; the domestic-card rate is not listed)
- [Interpressnews: Geostat average salary Q1 2026](https://www.interpressnews.ge/en/article/148033-geostat-average-salary-in-georgia-reached-gel-23638-in-q1-2026/) and [Georgia Today: Q2 2026](https://georgiatoday.ge/average-monthly-salary-in-georgia-rises-8-to-gel-2389-3-geostat/)
- [CEIC: Georgia exchange rate against USD](https://www.ceicdata.com/en/indicator/georgia/exchange-rate-against-usd) (NBG series)
- Speech-to-text and text-to-speech per-minute prices: third-party trackers such as [OpenRouter, gpt-4o-mini-transcribe](https://openrouter.ai/models/openai/gpt-4o-mini-transcribe). Check OpenAI's pricing page.
