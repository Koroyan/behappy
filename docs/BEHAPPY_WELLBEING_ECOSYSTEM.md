# Well-being ecosystem — `feature/behappy-wellbeing-ecosystem`

Date: 9 November 2026. Branch from `feature/behappy-intelligence-and-stability`.
Not merged, not deployed. Flitt stays TEST-only. Art therapy is unchanged.

## What it adds

| Part | Where | Works offline / without AI |
|---|---|---|
| Event log (versioned, deduplicated) | `lib/wellbeing/events.ts`, `eventStore.ts`, `legacySync.ts` | yes |
| My Steps (routines, reminders, calendar) | `lib/wellbeing/steps.ts`, `stepStore.ts`, `app/steps` | yes |
| Badges and 7/14/30-day challenges | `lib/wellbeing/badges.ts`, `progressStore.ts`, `app/badges.tsx` | yes |
| Sounds: 30 ready tracks (sleep, relax, meditate, focus, frequencies, nature, noise), mixer, Headache comfort | `lib/audio/*`, `app/sound` | yes |
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

## Sounds (catalog) and the mixer

**What people get.** `/sound` is a catalog of 30 finished tracks, one tap to
play, in the shelves people look for in sleep and meditation apps and on
YouTube (research: BetterSleep, Calm, Endel; YouTube meditation channels):
Sleep, Relax, Meditate, Focus, Frequencies, Nature, Noise. Each track is a
designed, level-matched mix with its own timer (sleep 45 min with a one-minute
fade, relax 20, focus 25, frequencies 30) — nobody has to adjust anything. The
now-playing card has pause/stop, quick timers (15–90 min or none, changeable
while playing), volume, and the honest note that applies (headphones for
binaural, the frequency note, the sleep fade). "Make your own mix"
(`/sound/mixer`, the former Sound Lab) and Headache comfort stay one tap away.
Old links (`/sound?mode=sleep|focus|relax`) open the matching shelf. Today
offers one track for the hour with one tap (sleep from 21:00, focus 9–17, relax
around them; the person's own latest choice in that shelf first) and names the
track while it plays; the Sleep companion's "wind down" starts the person's
latest sleep track (else Rain and soft piano).

| Shelf | Tracks |
|---|---|
| Sleep | Deep sleep · Delta 2 Hz (minor music, rain, binaural 200/202 Hz), Rain and soft piano, Ocean at night, Fireplace, Summer night, (Rain, Brown noise) |
| Relax | Calm · Alpha 10 Hz (harp, waves, binaural 200/210), Singing bowls and stream, Ambient piano, Forest stream and bells |
| Meditate | Meditation · Theta 6 Hz (bowls, drone, binaural 220/226), Tibetan bowls, (432 Hz music, Singing bowls and stream) |
| Focus | Focus · Beta 15 Hz (steady chords, pink noise, binaural 240/255), Rain for focus, (Pink noise) |
| Frequencies | 174, 285, 396, 417, 528, 639, 741, 852, 963 Hz, 432 Hz music, 528 + 174 Hz |
| Nature | Rain, Ocean waves, Stream, (Fireplace, Summer night) |
| Noise | Brown, Pink, White |

**How the music is made** (`lib/audio/music.ts`, compositions in
`lib/audio/pieces.ts`): the way ambient and sleep music is usually produced — a
slow chord change every 16 s (I – vi – IV – Isus2 or i – VI – iv – i add9, over a
tonic pedal; drones for bowls/sea/fire), soft pads (each note plus a quieter
partner detuned 0.05–0.15 Hz: a slow shimmer; tone colour slowly opening and
closing), a quiet bass with short changes (long overlaps of low notes sound
muddy), a sparse melody on chord tones (felt piano with slightly stretched
partials and two strings on the lowest partials; harp; or soft bells), singing
bowls now and then (partials at 1 : 2.83 : 5.42 : 8.77, each a close pair for
the slow "wah"), everything in a long, dark reverb (8-line FDN, T60 5–6 s, wet
high-passed at 150 Hz). Just intonation over one tonic; loops of 32–64 s.

**Frequency tracks** (as popular on YouTube, without the claims): each piece is
built on a tonic that is an octave of the named frequency (528 Hz = 4 × 132 Hz;
963 Hz = 8 × 120.375 Hz), every chord holds that tonic, and a soft pure tone at
exactly the frequency sounds over it — so the tone is part of the harmony and
never clashes. "432 Hz music" is piano music tuned to A4 = 432 Hz (no tone).
Under every frequency track: "They are simply musical tones: there is no
evidence that any frequency heals."

**Binaural tracks** carry a true stereo pair on the tonic (2 × root, 200–240 Hz,
where binaural beats are heard best) under the music, quietly; the music keeps
that band free of every partial, so nothing beats in one ear. Described as two
tones and a heard beat, nothing more; headphones note.

**Nature** (`lib/audio/textures.ts`), from published procedural-audio models:
water is mostly the ringing of small bubbles (Minnaert; van den Doel's damping:
f0 ≈ 3.26 kHz / radius in mm), so the stream is a babble of bubbles over a quiet
hush and rain is a bed, many tiny ticks and drops plinking on water; the
fireplace follows Farnell (lapping roar, crackles in clusters, rare pops, faint
hiss); the summer night is crickets (pulsed tones near 4.5 kHz) over a breeze.
Ocean and wind as before. Loops 30–40 s, so no pattern is heard repeating.

**Level matching.** Every track's gain brings it to the catalog median loudness
(ITU BS.1770 K-weighting, as the app mixes it): the spread fell from 11.8 dB to
under 2 dB, so switching tracks never jumps in volume (tested).

**Checking sound without hearing it.** Each new sound was rendered, measured
and drawn as a spectrogram before shipping; this found and fixed a stream
drowned by its own noise bed, rumbling rain, two bass notes overlapping for 5 s
at chord changes, and drone notes that nearly vanished every few seconds (a
detuned partner as loud as the note, and an overtone landing on another note:
both now quieter or removed; the deepest remaining swell is ~9 dB in one ear).
Listening demos of all 30 tracks, loudness-matched, and spectrograms:
`qa-shots/sound-demos/` (not in git).

**Speed on phones.** Phones run JavaScript without a JIT: generation runs in
slices (the screen stays responsive); musical layers use 12 kHz (every partial
stays below 4.5 kHz); the reverb is unrolled and runs at half rate; WAV and
base64 encoding are bulk operations; files are written under a temporary name
first. A tap plays at once what is already generated (nature, tones, binaural)
and fades the rest in when ready (generation continues in the background; a
newer track or Stop cancels it); the catalog prepares the likeliest next track
while the person browses. Measured on the Android emulator (Expo Go 58): a
64 s piece takes 3–4 s the first time, then plays from the cache at once; with a
cached rain layer, sound started about a second after the tap and the music
joined ~5 s later.

**Other sounds and the mixer.** Binaural editor (base 100–500 Hz, beat
0.5–30 Hz, bands Delta/Theta/Alpha/Beta), noise colours, nature, soft
harmonies, pure tones, bowls and bells; layer volumes; favourites (30) and
history (200 sessions, with the catalog track). Safety: layer gains never sum
above full scale, master capped at 0.8, Headache comfort starts in silence with
a dim screen and caps sound at 0.15. Background playback through the expo-audio
config plugin (Expo Go has no lock-screen service: detected with
`isRunningInExpoGo()`, since `Constants.executionEnvironment` did not report
Expo Go in SDK 58).

**Verified** (`lib/audio/synth.test.mjs`, `lib/audio/tracks.test.mjs`, the
browser journey): every track plays with one tap in the browser and its playing
buffers hold what its title says (binaural 200/202, 200/210, 220/226, 240/255;
tones 174, 285, 396, 417, 528, 639, 741, 852, 963 Hz); 432 Hz music has its A at
432 Hz; no music line within 3–20 Hz of a tone; nothing inside a binaural band;
every sound loops without a seam; loudness within 2 dB. Negative controls (a
delta piece without its clear band, a 528 Hz piece on a 130 Hz tonic) fail
these tests as they should.

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
| `npm test` | 193/193 (incl. reflection 7, AI cost/budget, streamed tokens, synth, Sound catalog) |
| `npm run test:unit` | 67/67 (events, Steps across DST, badges, challenges, memory, recap, synth 14, Sound catalog 5: every track valid and named in en/ka, frequency tones exact with nothing beating near them, binaural pairs exact with their band clear, seamless loops for every sound, loudness within 2 dB; planner incl. Step/reflection/sleep reminders) |
| `npm run qa:wellbeing` (Chrome) | 15/15: Today (one-tap suggestion plays), Tools, Steps auto-completion, undo/skip, badges, Calm now, mixer measured 200/210 Hz, 528 + 174 Hz measured in both ears, all 30 catalog tracks played with one tap and measured (binaural pairs, nine frequency tones), Sleep (morning report; wind down plays a sleep track), reflection (live AI, checked), memory preview/switches, Insights, Arabic dark RTL, no page errors |
| Android (Expo Go 58, emulator) | Steps (journal after save, breathing after finishing), reminders scheduled at the right local times, badges, reflection in Georgian (live), memory with Anulia (live), revocation |

Not tested: iOS (no Mac here), native store builds, audio interruptions by a
real phone call, playback longer than a few minutes in the background (needs a
development build: Expo Go has no lock-screen service on Android).

Translations: English and Georgian written by hand; the other 17 languages
machine-translated with `scripts/i18n/translate-wb.mjs` (checked keys,
placeholders, lists) — native review recommended.
