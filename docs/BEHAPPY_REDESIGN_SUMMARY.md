# BeHappy 2.0 redesign summary

Branch: `behappy-2.0` (from `127a589`). The original app is untouched on `main` and in git history.

## What changed

**A new product shape.** Navigation follows what people come to do: **Today · Explore · Anulia · Journal · Profile** on phones, and a labelled sidebar with an optional context panel on desktop. Every screen was rebuilt on one design system (`docs/BEHAPPY_DESIGN_SYSTEM.md`), in light and dark.

| Area | 2.0 |
|---|---|
| Today | Mood check-in, one gentle suggestion based on how you feel, continue Anulia or art, quick journal, recent entries, a week view without streaks |
| Anulia | AI well-being companion (renamed from "Dr. Pijilo"): consent first, streaming replies, voice in and out, image sharing, conversation history, end-of-conversation summary, crisis banner, retry on failure |
| Journal | Works fully without AI: write, edit, delete, search, calendar, drafts, mood trend. AI reflection is opt-in per entry. |
| Art therapy | 43 sessions in 8 modules, **drawn on paper**. Each session says which paper and paints to use. Photo upload, guided reflection, gallery, progress, one new session a day. The in-app canvas is gone. |
| Reflection cards | All original decks and images; single-card and light/heavy pair selection; history |
| Self-checks | PHQ-9, GAD-7, DASS-21, one question at a time, verified scoring, published bands, screening-not-diagnosis framing, item-9 safety prompt, history |
| Breathing and meditation | Guided rhythms with reduced-motion support; short step-by-step meditations |
| Insights | Only what you recorded: mood over time, activity, most-named feelings. No predictions. |
| Goals | Small personal goals |
| Get help now | Per-country emergency numbers and crisis lines checked Nov 2026, steps for right now, always free |
| Profile | Membership and usage, purchases and recovery code, personal details, language, theme, text size, motion, AI consent, personalisation, export, delete everything |
| Onboarding | What BeHappy is and isn't, optional name and focus, AI consent, care note |
| Pricing and checkout | Transparent passes, no auto-renewal, Flitt test checkout, server-verified result screen |
| Quiz (`/quiz`) | Ad landing page reframed as a self-reflection check-in |

**A real backend** (`server/`): anonymous accounts with recovery codes, the AI proxy (no key in the app), per-feature quotas, Flitt payments with server-side verification, refunds, aggregate owner metrics.

**Safety and ethics** (`docs/ETHICS.md`): Anulia never claims credentials; crisis help is never paywalled; no fake numbers, prices or urgency; local-first private data.

**Languages**: English, Georgian, Russian, Armenian and German have full translations, with English fallback per string, plural rules per language and RTL for Arabic. See "Still open" for the remaining languages.

## Verified

| Check | Result |
|---|---|
| `npm test` | 26 tests pass (20 server: payments, AI proxy, quotas, metrics; 6 questionnaire scoring) |
| `npm run typecheck`, `npm run lint` | Clean |
| `npm run qa:i18n` | All 484 keys used by the app exist; placeholders and list lengths match English in every translation |
| `npm run qa:scroll` | 30 routes at 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920 px: no page-level scrolling, no sideways overflow, nothing hidden under the top bar, tab bar, footer or composer |
| Flitt sandbox (live, browser) | Approved card: Plus active for 30 days. Declined card: nothing granted. Refund: entitlement removed. |
| OpenAI (live) | Anulia introduces itself as an AI companion and asks one question; journal saves before any AI; opt-in reflection works; a Georgian art session with a photo completes and the photo lands in the gallery |

**Not verified:** iOS and Android builds were not run on devices or simulators in this pass. Every check above ran on the web build. Native-specific code (XHR streaming, SQLite, file system, audio recording) follows Expo SDK 54 APIs but needs a device test before release.

## Still open

1. **Owner actions:** rotate the leaked OpenAI key and take down the old GitHub Pages build (`docs/BEHAPPY_SECURITY_REVIEW.md`).
2. **Prompts:** update the hosted prompts to the Anulia persona and pin them to the current model (`docs/prompts/ANULIA_PERSONA_NOTE.md`). Until then the server overrides the model and the app adds a persona context.
3. **Translations:** Turkish, Azerbaijani, Spanish, French, Portuguese, Indonesian, Italian, Arabic, Hindi, Chinese, Japanese, Korean, Ukrainian and Polish fall back to English. Questionnaire translations outside English are not clinically validated and say so.
4. **Pricing decision:** keep the active prices or try the proposal (`docs/BEHAPPY_PRICING_STRATEGY.md`).
5. **Production:** HTTPS hosting, a database instead of the JSON store, a real Flitt merchant, and `expo-av` → `expo-audio` before Expo SDK 55.
6. **Native QA** on a real iPhone and Android phone, including safe areas, the keyboard over the composer, voice recording and photo upload.
