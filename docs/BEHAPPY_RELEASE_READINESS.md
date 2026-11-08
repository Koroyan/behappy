# Release readiness — `feature/behappy-intelligence-and-stability`

Date: 8 November 2026. Not merged, not deployed. Flitt stays TEST-only.

## Verdict

**Not ready for production yet.** The code changes are tested, but the
blockers below are outside the code (credits, keys, accounts, native builds,
privacy decisions) and must be handled first.

## Production blockers

1. ~~OpenAI account has no credits~~ — credits were added on 8 November; all
   AI features were re-tested live (see "Android test pass"). If it happens
   again the server answers 503 `ai_unavailable` and logs a warning.
2. **Leaked OpenAI keys** in git history (`b38100c`, on `behappy-2.0`,
   `behappy-3.0`, `gh-pages`) and one still in the project-root `.env`
   (`EXPO_PUBLIC_API_KEY`): revoke both keys; delete the line.
3. **Native builds** were not made (no Xcode/Android SDK/EAS here). Build and
   test on real devices with EAS before any store release.
4. **Push to phones** needs `EAS_PROJECT_ID` (`npx eas init`, Expo account) and
   push credentials (APNs/FCM) for store builds.
5. **AI data retention decision:** keep `AI_ART_STORE=true` (OpenAI stores
   responses, 30 days by default) or switch to `false` (nothing stored, more
   tokens). Align with the OpenAI data processing agreement and state it in the
   privacy notice. Both modes are implemented and tested.
6. **Production configuration** (existing requirement, unchanged): the server
   refuses to start without `DATABASE_URL`, https URLs and encryption keys
   (`docs/BEHAPPY_3_SECURITY.md`); email/SMS providers.
7. **Review of the art prompt changes** by the person responsible for the
   mental-health safety content (the changes are listed in
   `docs/BEHAPPY_ART_THERAPY_RELIABILITY.md`).

## Passed (executed in this work)

| Check | Result |
|---|---|
| `npm test` | 156/156 (server: payments, AI proxy, quotas, accounts, community, moderation, professionals, bookings, membership, staff security, analytics, admin authorization matrix, AI cost and budget, streamed token counts, push 17, art 20) |
| `npm run test:unit` | 37/37 (scoring, dates, bidi, journal reflection, risk language, Georgian Latin, secret scan, reminder planner 9, art turn guard 3) |
| typecheck / lint / i18n | 0 errors / 0 errors (29 old warnings) / 19 languages complete |
| `npm ci`, `expo install --check`, `expo-doctor` | ok / up to date / 20/20 |
| Web export; iOS + Android JS (Hermes) export | ok |
| Browser journeys | moderation 14/14, account 360 10/10, admin 25/25, professional 17/17, console sweep: no JS errors |
| Live model evaluation | 5 configurations × 39 turns (see `BEHAPPY_AI_MODEL_EVALUATION.md`) |

## Android test pass (8 November 2026, evening)

Expo Go 58.0.5 on an Android 12 emulator (Nexus 5X image), Georgian interface,
a registered test account with Plus and the art program, live OpenAI (credits
added), two real drawings (a painted eye, JPEG; a watercolour face, WebP).

| Area | What was done | Result |
|---|---|---|
| Art therapy | Sessions 1–3 to the end: identical second drawing, a different second drawing (WebP first), the story branch, ending by button and by a written request; Latin-letter Georgian; "ara sasiamovno"; "sasiamovno daZabuloba" | Three phases unchanged; identical → "no visible change"; different → the real difference named; negation and mixed feelings kept; summaries contain only what was said |
| Daily limit | Session 4 after today's new session was used; and the same after the allowance was used on another device | Notice before any upload, no error box; a refused first turn is rolled back |
| Anulia | Text, a photo, finish and summarise, history | Works; summary rebuilt (see fixes) |
| Cards, journal, check-in, breathing, meditation, grounding, GAD-7, trends, help screen | Each used once end to end | Work |
| Community, private messages | Room message, Anulia in a room (Russian), private message | Work (rooms and private messages are text-only by design) |
| Specialists | Directory, profile, booking up to the time slot | Works (booking itself is in the browser journey) |
| Notifications | Settings, reminders on, alarms read from Android | Reminders scheduled at the planned local times; remote push not available in Expo Go on Android (expected) |
| Admin on the phone | Overview, AI | Works; AI costs now shown |

Live re-checks with credits: `art-model-eval --only regression,mixed` (Sol,
10 turns: JSON 100 %, 0 reversed feelings, 0 invented changes, language
100 %); `qa:art` in Georgian with the eye painting: PASS. Browser journeys
after the fixes: admin 25/25, specialists 17/17, moderation 14/14,
Account 360 10/10, console sweep clean.

Found and fixed in this pass: the "Art Therapy Streaming Error: Allowance
reached" error box; "I don't see a change" repeated on every turn; Anulia
summaries that missed Latin-letter Georgian and invented topics; streamed
Anulia replies recorded with 0 tokens (OpenAI's `tool_usage` came first);
no AI cost without a staff-set price, so the daily budget never applied;
3-column grids wrapping to 2 on phones; Georgian words split mid-word;
same-topic rooms in two languages looking identical; "Georgia" in English
on the Georgian help screen; "Get help now" in English inside Russian
replies; the art suggestion shown when no art session was possible;
the membership page for non-specialists; Metro's web rendering failing
during journeys (it watched the dev database).

Open product decision: the art session "focus" tags (89, English only, some
clinical such as "trauma-processing") are now shown only in English;
translate them or drop them.

Not tested: iOS (no Mac here; your iPhone runs the same JavaScript), native
store builds, remote push to a device.

## Failed / found and fixed during this work

- Push marked as sent before Expo accepted it; quiet hours by one phone's time zone → fixed, tested.
- Model evaluation round 1 invalid (shared run id) → discarded and repeated.
- Two false alarms of the new checks ("Хорошо, …"; typographic apostrophe) → fixed, tested.
- OpenAI 429 shown as a generic 400 → 503 `ai_unavailable`, tested.

## Not tested

- Native store builds and iOS in this run (Android was tested in Expo Go on an
  emulator, see above); remote push delivery to a phone.
- Android Expo Go remote push (not supported by Expo).
- Load and performance under many users (not measured; push and art add a few
  queries per notification/turn, all indexed).

## Security review (this branch)

Checked: authentication and sessions (unchanged; phones tied to sessions),
staff permissions (admin authorization matrix tests), moderation context only
through a report (journey), account 360 per role (journey), sensitive-data
access (`server/admin/sensitive.mjs`: case-based, separately approved, ≤ 24 h,
audited, no "read all"; journals, Anulia chats, assessments and safety plans
are on devices only), push devices (only the owner can remove; deliveries of a
reassigned phone are dropped), art chains (`previous_response_id` bound to the
account), AI prompt injection (client can't send system/developer messages or
choose the model; text that imitates an app note is treated as the person's
words), logging (codes only, never content).

Remaining risks: a person who knows another phone's Expo push token could
register it to their own account (tokens are not public; documented);
at-least-once push after a crash at the exact moment of sending; the art
checks' word lists cover ka/ru/en/hy, other languages rely on the model.

New data held by the server: art facts (feeling stems with polarity, colours,
body places — no text), drawing fingerprints (no images), push delivery
records. Deleted with the account; retention 60/60/30 days.

## Required configuration

Server (`server/.env`): `OPENAI_API_KEY` (with credits), `AI_MODEL_ART`
(default `gpt-6.1-sol`), optionally `AI_MODEL_ART_FALLBACK`, `AI_REASONING_ART`,
`AI_ART_MAX_OUTPUT_TOKENS`, `AI_ART_STORE`, `PUSH_DRIVER` (default `expo`),
`EXPO_ACCESS_TOKEN` (only with enhanced push security). App (root `.env`):
`EAS_PROJECT_ID` for phone push.

## Deferred

**My well-being summary / prepare for your psychologist (P2)** — not
implemented. It needs consent design, legal and professional review, a
sharing/expiry/revocation model and a new data category on the server; doing it
alongside the P0 repairs would have meant an incomplete feature touching the
most sensitive data. Requirements are kept in the task brief; it should start
as its own branch, disabled for the public until reviewed.

Mobile UX (P1) beyond the fixes made: no general redesign was done (the
existing navigation and visual identity are kept); touch targets, keyboard and
chat scrolling were exercised by the phone-viewport journeys only.
