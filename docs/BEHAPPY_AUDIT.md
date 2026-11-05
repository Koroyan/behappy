# BeHappy audit (pre-2.0 → 2.0)

Audited: the app as of commit `127a589` on `behappy-2.0`'s base, November 2026.
Scope: product, UX, safety, security, payments, AI, data, code health.
Each finding lists its severity and what 2.0 did about it.

Severity: **Critical** = harm to users or money now. **High** = broken core flow or serious trust problem. **Medium** = real defect with a workaround. **Low** = polish or hygiene.

## 1. Secrets and security

| # | Finding | Severity | 2.0 status |
|---|---|---|---|
| S1 | A live OpenAI API key was shipped to every client: `services/apiKey.js`, `EXPO_PUBLIC_API_KEY`, `app.config.js` `extra`. It was also committed in `.env.example` and three README files, and it is inside the published web bundle in `dist/` (on the `gh-pages` branch). | Critical | Client key removed. All AI calls go through the BeHappy server. Docs redacted. `dist/` untracked and git-ignored. **The key is public and must be rotated by the owner** (see the security review). |
| S2 | Premium access was decided on the device (AsyncStorage flags in `services/subscriptionService.ts`). Anyone could unlock it from the browser console. | Critical | Entitlements are granted only by the server after Flitt confirms the order with a valid signature or a server-side status check. |
| S3 | No backend: AI usage could not be metered, rate-limited or capped. | High | Express server with per-account quotas, rate limits, field allowlists and a server-chosen model. |
| S4 | 50 npm advisories (3 critical, 20 high). Unused `openai`, `undici` and `body-parser` dependencies. | Medium | Unused packages removed, safe fixes applied: 27 remain (0 critical, 6 high, all in Expo build tooling). |

## 2. Safety and ethics

| # | Finding | Severity | 2.0 status |
|---|---|---|---|
| E1 | The AI was presented as "Dr. Pijilo", and internal prompts told it it was a "clinical psychotherapist". A wellness AI must not imply professional credentials. | Critical | Renamed **Anulia, an AI well-being companion**. App-level context forbids credential claims and diagnosis. Disclaimers in chat, onboarding, About. |
| E2 | Crisis resources were scattered (an SOS component with Russian-only numbers; a US-only 988 entry inside the art service). | High | One `/safety` screen, never paywalled. It is always in the desktop sidebar, and on phones it is linked from Today, Explore, Anulia, Profile, art sessions, assessment results and every limit notice. Per-country numbers were checked in Nov 2026. Unverifiable lines are left out, with findahelpline.com as the fallback. |
| E3 | The ad quiz showed a 0–100 "pressure level" score, an "Evidence-based" badge and an email gate. That is clinical-looking scoring with an overclaiming badge, aimed at people who are struggling. | High | Self-reflection framing, a 3-zone indicator, no badge. The email step appears only when a real lead endpoint is configured. |
| E4 | Pricing used "-35% launch price" strike-throughs against a "regular" price that never existed. | High | Removed. Prices are shown once, exactly as charged. |
| E5 | Private text was sent to the AI without an explicit consent step. | High | AI consent before any AI feature. Journaling works fully without AI. Reflection on a journal entry is opt-in per entry. |
| E6 | Assessments had no clear "screening, not diagnosis" framing or item-9 safety handling. | High | PHQ-9, GAD-7 and DASS-21 one question at a time, verified scoring tests, a disclaimer, and a safety prompt when PHQ-9 item 9 is above 0. |

## 3. Product and UX

| # | Finding | Severity | 2.0 status |
|---|---|---|---|
| U1 | Visual design inconsistent across screens; heavy gradients, many one-off styles. | High | New design system (tokens, type scale, components), light and dark. See `BEHAPPY_DESIGN_SYSTEM.md`. |
| U2 | Navigation built around implementation (screens/cards/…) rather than tasks. | High | Today · Explore · Anulia · Journal · Profile on phones; a sidebar plus context panel on desktop. |
| U3 | In-app drawing canvas for art therapy. The owner decided drawing happens on paper only. | Medium | Canvas removed. Each session shows which paper and paints to use, and the user uploads a photo of the paper drawing. |
| U4 | Safe-area bugs: core `SafeAreaView` is a no-op on Android; content scrolled under the tab bar. | High | `Screen` owns insets. The top bar is pinned on phones, the tab bar is a flex sibling, and `npm run qa:scroll` checks every route at 9 widths. |
| U5 | Journal required AI to be useful; no edit, search or calendar. | High | The local journal works without AI: search, edit, delete, calendar, drafts and mood trend. |
| U6 | Cards had no free trial, and the decks were hard to discover. | Medium | One free card reflection. All original images and categories preserved, including light/heavy pair selection. |
| U7 | Insights showed predictions and "AI insights" with no data behind them. | High | Insights only chart what the user recorded. No predictions, no scores about the person. |
| U8 | Dead or decorative controls in Profile/Settings. | Medium | Every control works: language, theme, text size, motion, AI consent, personalisation, export, delete. |

## 4. AI integration

| # | Finding | Severity | 2.0 status |
|---|---|---|---|
| A1 | Hosted prompts are pinned on the OpenAI dashboard to retired models (`gpt-5-chat-latest`, `gpt-5.2-chat-latest`), so requests failed with 404. That was the cause of the "400 on art session 5" the owner reported. | Critical | The server sets the model per feature (`gpt-5.4-mini`, overridable via `AI_MODEL_*`). |
| A2 | Native streaming did not work for cards (React Native `fetch` has no readable body). | Medium | One transport in `lib/api/ai.ts`: fetch stream on web, XHR progress on native. |
| A3 | `previous_response_id` chains could be replayed across users. | High | The server binds each response id to the account that created it. |
| A4 | Fragile end-of-session regex forced art sessions closed early. | High | Fixed earlier (see `docs/prompts/archive/ART_THERAPY_SYSTEM_PROMPT_V21_DRAFT.md`), kept in 2.0. |

## 5. Code health

| # | Finding | Severity | 2.0 status |
|---|---|---|---|
| C1 | 52 component files with many duplicates (`…Old`, `…_FIXED`, `….backup`). | Medium | Rebuilt as `design/`, `features/`, `lib/`. Legacy files removed from the branch (kept in git history and on `main`). |
| C2 | About 40 status/prompt notes in the repo root. | Low | Moved to `docs/archive/` and `docs/prompts/archive/`. |
| C3 | Built web bundle (`dist/`) committed to git. | Medium | Untracked and git-ignored. |
| C4 | `package.json` scripts pointed at files that no longer existed (`server/realtime-session.js`). | Low | Scripts rewritten: `server`, `server:dev`, `test`, `qa:*`, `economics`. |
| C5 | 26 Expo packages out of line with SDK 54, including `expo-file-system` one major version behind. | Medium | Aligned with `expo install --fix`. File-system calls now import `expo-file-system/legacy`. |
| C6 | Hard-coded strings, partial i18n. | High | Typed catalog: 674 English strings, complete Georgian, Russian and Armenian, key-by-key English fallback, RTL for Arabic. |
| C7 | `expo-av` is deprecated (removed in SDK 55). | Low | Still used for recording and playback. Migrating to `expo-audio` is required before SDK 55. |

## 6. What still needs an owner decision

1. Rotate the leaked OpenAI key, remove it from the root `.env` and from Windows environment variables, and redeploy or take down the GitHub Pages build.
2. Choose whether to keep the current prices or adopt the proposal (`BEHAPPY_PRICING_STRATEGY.md`).
3. Before going live with payments: a real Flitt merchant, a hosted HTTPS server and a database (see `BEHAPPY_FLITT_TEST_SETUP.md`).
4. Update the hosted prompts to the Anulia persona (`docs/prompts/ANULIA_PERSONA_NOTE.md`).
5. Professional review of the Georgian, Russian and Armenian questionnaire wording. The app labels them as not clinically validated.
