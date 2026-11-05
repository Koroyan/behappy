# BeHappy 2.0 redesign summary

Branch: `behappy-2.0` (from `127a589`). The original app is untouched on `main` and in git history.

## What changed

**A new product shape.** Navigation follows what people come to do: **Today · Explore · Anulia · Journal · Profile** on phones, and a labelled sidebar with an optional context panel on desktop. Every screen was rebuilt on one design system (`docs/BEHAPPY_DESIGN_SYSTEM.md`), in light and dark.

| Area | 2.0 |
|---|---|
| Today | Mood check-in, one gentle suggestion based on how you feel, continue Anulia or art, quick journal, recent entries, a week view without streaks |
| Anulia | AI well-being companion (renamed from "Dr. Pijilo"): consent first, streaming replies, voice in and out, image sharing, conversation history, end-of-conversation summary, crisis banner, retry on failure |
| Journal | Works fully without AI: write, edit, delete, search, calendar, drafts, mood trend. AI reflection is opt-in per entry and never asks questions: the journal is a notebook, not a chat. Entries typed in Latin letters ("gamarjoba") are answered in Georgian script. An on-device check offers help and the safety plan when an entry mentions self-harm; nothing is sent anywhere for it. |
| Art therapy | 43 sessions in 8 modules, **drawn on paper**. Each session says which paper and paints to use. Photo upload, guided reflection, gallery, progress, one new session a day. The in-app canvas is gone. |
| Reflection cards | All original decks and images; single-card and light/heavy pair selection; history |
| Self-checks | PHQ-9, GAD-7, DASS-21, one question at a time, verified scoring, published bands, screening-not-diagnosis framing, item-9 safety prompt, history |
| Breathing and meditation | Guided rhythms with reduced-motion support; short step-by-step meditations |
| Insights | Only what you recorded: mood over time, activity, most-named feelings. No predictions. |
| Goals | Small personal goals |
| Get help now | Per-country emergency numbers and crisis lines checked Nov 2026, steps for right now, always free |
| Safety plan | A personal plan for hard moments in seven steps (warning signs, coping, people and places, who to ask, professionals, a safer environment, reasons to keep going), following the safety-planning approach clinicians use, with call buttons. Stored only on the device, included in the data export. |
| Grounding | The 5-4-3-2-1 senses exercise, linked from Get help now and Explore |
| Profile | Membership and usage, purchases and recovery code, personal details, language, theme, text size, motion, AI consent, personalisation, export, delete everything |
| Onboarding | What BeHappy is and isn't, optional name and focus, AI consent, care note |
| Pricing and checkout | Transparent passes, no auto-renewal, Flitt test checkout, server-verified result screen; a declined card is shown as declined in Purchases and grants nothing |
| Quiz (`/quiz`) | Ad landing page reframed as a self-reflection check-in |

**A real backend** (`server/`): anonymous accounts with recovery codes, the AI proxy (no key in the app), per-feature quotas, Flitt payments with server-side verification, refunds, aggregate owner metrics.

**Safety and ethics** (`docs/ETHICS.md`): Anulia never claims credentials; crisis help is never paywalled; no fake numbers, prices or urgency; local-first private data.

**Languages**: all 19 interface languages are complete, 743 strings each: Georgian, English, Russian, Armenian, Ukrainian, Turkish, Azerbaijani, German, French, Spanish, Italian, Portuguese, Polish, Indonesian, Arabic, Hindi, Chinese, Japanese and Korean. Plural rules follow each language (including the six Arabic forms). Georgian, Armenian and Azerbaijani dates get a fallback in browsers that lack the data. Arabic is laid out right to left, and Arabic sentences that start with a Latin name such as "Anulia" keep a right-to-left base direction. English stays the per-string fallback. No translation has been reviewed by a native speaker yet.

## Verified

| Check | Result |
|---|---|
| `npm test` | 43 tests pass (21 server: payments, declined attempts, AI proxy, quotas, metrics; 6 questionnaire scoring; 3 date fallback; 6 journal reflection filter; 2 risk language; 3 Latin-letter Georgian; 2 right-to-left text) |
| `npm run typecheck`, `npm run lint` | Clean |
| `npm run qa:i18n` | Every key the app uses exists; 18 translations × 743 strings, placeholders and list lengths match English everywhere |
| `npm run qa:scroll` | 30 routes at 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920 px: no page-level scrolling, no sideways overflow, nothing hidden under the top bar, tab bar, footer or composer. Also clean in Georgian and German at 320 and 390 px, in Arabic (right to left) at 320, 390, 768 and 1440 px, in Hindi and Japanese at 320 px, and in dark mode. |
| `npm run qa:journeys` | 19 of 19 steps pass for a first-time Georgian client on a 390 px phone: onboarding, check-in, a journal entry typed in Latin letters with a Georgian reflection and no questions, the on-device safety card on self-harm words, a safety plan that survives a reload, grounding, Anulia, an art session with a photo of a paper drawing, a card reflection, PHQ-9 with the item-9 safety prompt, breathing, goals, insights, Plus with the Flitt test card (server-verified), dark theme, Russian, data export (includes the safety plan) and delete-everything. No console errors. |
| `npm run qa:desktop` | 15 of 15 steps pass for an English-speaking client on a 1440 px laptop: sidebar navigation, a journal entry edited, found by search and deleted, an English reflection without questions, an Anulia conversation ended with a summary and listed in history, a light/heavy card pair, GAD-7 (14 of 21, Moderate), a declined Flitt test card (Flitt shows "Declined", nothing granted, Purchases says Declined), an approved card (Plus for 30 days), and Plus restored on a second device with the recovery code. No app errors. |
| Flitt sandbox (live, browser) | Approved card: Plus active for 30 days. Declined card: nothing granted. Refund: entitlement removed. |
| OpenAI (live) | Anulia introduces itself as an AI companion and asks one question; journal saves before any AI; opt-in reflection works; a Georgian art session with a photo completes and the photo lands in the gallery |

**Not verified:** iOS and Android builds were not run on devices or simulators in this pass. Every check above ran on the web build. Native-specific code (XHR streaming, SQLite, file system, audio recording) follows Expo SDK 54 APIs but needs a device test before release. Voice recording was not exercised (no microphone in the headless browser).

## Still open

1. **Owner actions:** rotate the leaked OpenAI key and take down the old GitHub Pages build (`docs/BEHAPPY_SECURITY_REVIEW.md`).
2. **Prompts:** update the hosted prompts to the Anulia persona and pin them to the current model (`docs/prompts/ANULIA_PERSONA_NOTE.md`). Until then the server overrides the model and the app adds a persona context.
3. **Translations:** all 19 languages are complete, but none has been reviewed by a native speaker. Start with Georgian, Russian and Armenian. The questionnaires outside English are not clinically validated, and the app says so; official PHQ-9 and GAD-7 translations exist for most of these languages and can replace ours.
4. **Pricing decision:** keep the active prices or try the proposal (`docs/BEHAPPY_PRICING_STRATEGY.md`).
5. **Production:** HTTPS hosting, a database instead of the JSON store, a real Flitt merchant, and `expo-av` → `expo-audio` before Expo SDK 55.
6. **Native QA** on a real iPhone and Android phone, including safe areas, the keyboard over the composer, voice recording and photo upload.
