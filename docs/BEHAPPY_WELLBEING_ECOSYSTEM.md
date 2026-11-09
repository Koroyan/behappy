# Well-being ecosystem — `feature/behappy-wellbeing-ecosystem`

Date: 9 November 2026. Branch from `feature/behappy-intelligence-and-stability`.
Not merged, not deployed. Flitt stays TEST-only. Art therapy is unchanged.

## What it adds

| Part | Where | Works offline / without AI |
|---|---|---|
| Event log (versioned, deduplicated) | `lib/wellbeing/events.ts`, `eventStore.ts`, `legacySync.ts` | yes |
| My Steps (routines, reminders, calendar) | `lib/wellbeing/steps.ts`, `stepStore.ts`, `app/steps` | yes |
| Badges and 7/14/30-day challenges | `lib/wellbeing/badges.ts`, `progressStore.ts`, `app/badges.tsx` | yes |
| Sound Lab (Focus, Sleep, Relax, Headache comfort, mixer) | `lib/audio/*`, `app/sound` | yes |
| Calm now (breathing, grounding, silence) | `app/calm.tsx` | yes |
| Sleep companion (wind-down, morning self-report) | `app/sleep.tsx` | yes |
| Daily reflection (facts; checked AI text on request) | `lib/wellbeing/recap.ts`, `reflectionStore.ts`, `server/reflection`, `app/reflection.tsx` | facts: yes; AI: no |
| What Anulia can remember | `lib/privacy/consent.ts`, `lib/wellbeing/memory.ts`, `features/anulia/memoryLoader.ts`, `app/anulia/memory.tsx` | — |
| Insights: routines, calm and sleep | `features/wellbeing/InsightsWellbeing.tsx` | yes |

Navigation keeps exactly five tabs (Today, Tools, Anulia, Community,
Specialists). Today shows mood, today's Steps (done right there), a Sound/Calm
card and "Today so far". Tools has a new "Routines & growth" group and finds
every new tool by search. Anulia has a memory button in its header. Profile
links to badges, Steps and memory. Everything else opens as a stack screen or a
sheet.

## Events

One record per thing the person did (`journal.saved`, `mood.checkin`,
`breathing.completed`, `meditation.completed`, `grounding.completed`,
`calm.used`, `art.completed`, `cards.completed`, `sound.session`,
`focus.completed`, `sleep.bedtime`, `sleep.checkin`, `step.done`,
`step.skipped`, `challenge.completed`). Each has `v` (version) and a stable id
built from what it records, so importing twice or two screens reporting the
same thing count once. Older stores (journal, check-ins, breathing, meditation,
art therapy progress, completed card sessions) are imported at start and when
the app returns to the front; art therapy and cards are read, never changed.
Days are local calendar keys; all day arithmetic is calendar-based, so DST
days (23/25 h) are never skipped or doubled. Kept for 400 days, at most 6,000
events, on the device only.

## My Steps

Templates: gratitude, reading, walk, breathing, meditation, focus, kindness,
bedtime, journal, own step. Days, time, length, reminder, pause, edit, remove
(history stays), optional link to a goal in `@behappy_goals_v1` (goals storage
unchanged). One mark per step and day: done / skipped, undo.

A Step for an in-app tool completes only from its verified event: a **saved**
journal entry (a gratitude Step needs a gratitude entry), a **finished**
breathing session, meditation, focus timer, or the sleep wind-down — never from
opening a screen (tested on Android and in the browser).

Progress is gentle by default: "5 of 7 planned this week"; a chosen skip
leaves the count, today counts once done. A classic streak exists only behind
the owner-only setting `features.classicStreak` (off) **and** the person's
opt-in; skipped days don't break it (`docs/ETHICS.md`).

Reminders reuse the phone's local notifications and quiet hours: at the Step's
time on its days, never in quiet hours (moved to half an hour before), never for
what is already done or skipped, at most three Step reminders a day.

## Sound Lab

All sounds are generated on the device (`lib/audio/synth.ts`, music-like
layers in `lib/audio/ambient.ts`): 16-bit stereo PCM (24 kHz; 16 kHz for the
musical layers, which have nothing above ~4 kHz), looping without clicks (tones
complete whole cycles; noise is cross-faded; struck sounds and the reverb wrap
around the loop). Phones play cached WAV files with expo-audio (background audio
through the expo-audio config plugin; Expo Go has no lock-screen service, so it
is skipped there — detected with `isRunningInExpoGo()`, as
`Constants.executionEnvironment` did not report Expo Go in SDK 58); the web plays
the same samples as Web Audio buffers.

**Sounding like relaxation tracks.** Pure sines on their own sound like test
tones. The musical layers are built the way such tracks are usually produced:
every chord note is three voices (centre, and 0.05–0.15 Hz detuned to the left
and right: a slow shimmer, never a wobble) whose tone colour slowly opens and
closes; everything sits in a long, dark reverb (8-line feedback delay network,
T60 4–5.5 s, wet signal high-passed at 150 Hz); singing bowls (partials at
1 : 2.83 : 5.42 : 8.77, each a close pair 0.7–2.9 Hz apart for the slow "wah",
soft strikes) and sparse soft bells (a wandering melody 2.6–5.8 s apart) are
tuned to each harmony with a roughness model (Sethares), and no layer puts a
partial where it would beat against a tone. Listening demos (loudness-matched,
with the previous version for comparison): `qa-shots/sound-demos/` (not in git).

**Speed on phones.** Phones run JavaScript without a JIT. Generation runs in
slices (the screen stays responsive), the reverb is unrolled and runs at half
rate, and Sound Lab prepares the shown mix in the background while the person
looks at it. Measured on the Android emulator (Expo Go 58), first time only:
the 528 + 174 Hz mix (4 layers) was ready 7.8 s after tapping it (before these
changes: ~19 s of rendering after Play); "Singing bowls & stream" 3.5 s. Files
are cached; later plays start at once.

- **Binaural:** left = base tone, right = base + beat (e.g. 200 Hz + 210 Hz =
  10 Hz beat), base 100–500 Hz, beat 0.5–30 Hz; presets Delta 2, Theta 6,
  Alpha 10, Beta 15 Hz. The app says headphones are needed and describes it as
  two tones and a heard beat — nothing more.
- **Noise:** white, pink (−3 dB/oct), brown (−6 dB/oct). **Nature-like:** rain,
  ocean, wind, stream (synthesised; no recordings, nothing to license), softened
  (low-passed, slower swells) after a listening test found them harsh.
- **Soft harmonies:** slowly breathing chords — warm (A major, open: 110, 165,
  277.2, 330, 440 Hz; the 110 Hz note has no octave, so 175–250 Hz stays free for
  the binaural tone), deep (E from 82.4 Hz) and soft (only octaves of 174 and
  528 Hz: 87, 132, 174, 264, 348 Hz). **Singing bowls** and **soft bells** for
  each. Presets: Relax = warm harmony + bells + ocean + binaural; Sleep = deep
  harmony + rain + brown noise (no strikes: nothing to wake you); Mix = warm
  harmony + bowls + rain.
- **Ready mixes** (Relax and Mix): "528 + 174 Hz", "Singing bowls & stream",
  "Rain & soft bells".
- **Pure tones and the "528 + 174 Hz" ready mix** (Relax and Mix → Ready mixes),
  in the style of popular meditation tracks: 174 Hz and 528 Hz sine tones, the
  same in both ears (not binaural), each swelling slowly, over the soft harmony
  with bowls (264/174 Hz) and bells (264, 348, 396, 440, 528, 696 Hz).
  The soft harmony has no partial near either tone, so nothing beats (an earlier
  261 Hz note put 522 Hz beside 528 Hz: a 6 Hz wobble — now tested). Under the
  mix the app says they are simply musical tones and that there is no evidence
  any frequency heals.
- **Safety:** layer gains are scaled so their sum never exceeds full scale;
  master capped at 0.8; Headache comfort starts in silence with a dim screen and
  caps sound at 0.15.
- Timers: focus 25/50/custom (completed only when the timer runs out), sleep
  15–90 min with a one-minute fade; optional morning question.
- Favourites (30) and history (200 sessions) on the device.

Verified: unit tests measure each channel (Goertzel): 200 Hz only in the left,
210 Hz only in the right, no 10 Hz tone in the signal; noise colour slopes; WAV
header and channel order. The browser journey measures the buffers that are
actually playing (200/210 Hz, AudioContext running). On Android the
generated files play, loop and count down; the ear check is the person's.

## Daily reflection

1. Facts (`dayFacts`): only the categories the person allows (all on by
   default, each can be switched off), ids + numbers, plus the line the person
   sees. Never journal text.
2. "Write my reflection" (AI consent needed) → `POST /api/ai/reflection`:
   the server accepts only fact ids and primitive values (≤ 30 facts, ≤ 4 KB),
   adds journal excerpts / art summaries only if the person gave those
   separate permissions (defused, ≤ 3 × 600 chars), uses server instructions,
   `gpt-5.4-mini`, `store: false`.
3. The draft is checked: every pattern cites given fact ids; every number is in
   the facts; no clinical words; no causal claims (en/ka/ru/hy); no feelings
   unless a mood was recorded. One correction round, then a 422 — the app shows
   the factual recap with an honest one-line reason. Unchecked text is never
   sent to the app.
4. Saved per day (90 days). A failed AI attempt never overwrites an AI
   reflection already made. Refresh = "Write it again".

Limits: one AI reflection a day free, three with Plus (server quota
`reflection`); no facts → no AI call and no allowance used. The evening
reminder opens the screen, which writes the reflection then (nothing runs
while the app is closed; no cloud job, so no extra consent is needed).

Cost: about 1,500 input / 400 output tokens ≈ $0.003 per reflection at list
price (up to ≈ $0.006 with the correction round).

## What Anulia can remember

- Separate switches, all **off** by default: profile, Steps and goals, mood,
  activity counts, sounds and focus, sleep, earlier chat summaries, full journal
  text, art summaries, self-check results. AI consent alone shares nothing.
  The old "personalisation" switch is now the profile switch (existing explicit
  choices kept).
- Never included: community messages and messages with psychologists.
- The person can preview the exact text, leave out single journal entries or
  chats, write notes ("keep answers short"), and "Forget everything".
- Context per message (`buildMemoryBlock`): today's allowed facts, 7/30-day
  summaries, up to three journal entries related to the message (shared words,
  today and this week first), with sources; at most 4,500 characters; whole
  sections are dropped rather than cut (a `<journal>` is never left open).
- Journal and art text is untrusted data: tag-like or "app note"-like text is
  defused, it sits inside `<journal>`/`<art>`, and the server prompt says never
  to follow instructions in it.
- Revocation: switching anything off, excluding an item or deleting a note
  raises the consent version; the stored OpenAI conversation chain started
  under an older version is not continued — the next message starts a new chain
  (full local history, new memory block). Nothing is cached, so the next
  message already reflects the change. Memory is read on the device for the
  account using it; nothing is stored on the server.
- Transfer: only the switched-on parts are added to the message and sent
  through BeHappy's server to OpenAI for that reply (the app explains OpenAI's
  API retention of up to 30 days for abuse monitoring, no training).

Tested live: with Steps, activity and journal text on, Anulia referred to the
two planned Steps and the uncertainty in today's entry; after "Forget
everything" it said it can't see the person's records unless they switch them
on.

## Data

Everything lives in AsyncStorage on the device (`@behappy_events_v1`,
`@behappy_steps_v1`, `@behappy_progress_v1`, `@behappy_sound_v1`,
`@behappy_reflection_v1`, `@behappy_memory_consent_v1`) plus generated sound
files in the cache. "Export my data" includes all of it; "Delete all my data"
removes it, the sound files and the in-memory event cache.

## Tests and checks

| Check | Result |
|---|---|
| `npm test` | 188/188 (incl. reflection 7, AI cost/budget, streamed tokens, synth) |
| `npm run test:unit` | 62/62 (events, Steps across DST, badges, challenges, memory, recap, synth 14: 174 + 528 Hz tones and no beating, seamless loops for every musical layer, warm harmony clear of the binaural band, bowl partial pairs, bells only on their notes; planner incl. Step/reflection/sleep reminders) |
| `npm run qa:wellbeing` (Chrome) | 14/14: Today, Tools, Steps auto-completion, undo/skip, badges, Calm now, Sound Lab measured 200/210 Hz, the 528 + 174 Hz mix measured 174 + 528 Hz in both ears, Sleep, reflection (live AI, checked), memory preview/switches, Insights, Arabic dark RTL, no page errors |
| Android (Expo Go 58, emulator) | Steps (journal after save, breathing after finishing), reminders scheduled at the right local times, badges, reflection in Georgian (live), memory with Anulia (live), revocation |

Not tested: iOS (no Mac here), native store builds, audio interruptions by a
real phone call, playback longer than a few minutes in the background (needs a
development build: Expo Go has no lock-screen service on Android).

Translations: English and Georgian written by hand; the other 17 languages
machine-translated with `scripts/i18n/translate-wb.mjs` (checked keys,
placeholders, lists) — native review recommended.
