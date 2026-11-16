# My Programs: content and clinical review

Four seven-day self-care programs built from tools BeHappy already has. Code:
`lib/wellbeing/programs.ts` (definitions, pacing, auto-completion),
`lib/wellbeing/programStore.ts` (storage, events), `app/programs/`,
copy in `i18n/locales/jr/<lang>.ts` (`jr.programs`).

## Status: needs clinical review before a public release

Every program is marked `review: 'needs_clinical_review'` in code. The texts
were written to be self-care education, not treatment, and avoid claims of
cure or outcome, but they have **not** been reviewed by a qualified clinician.
Before a public release, a licensed psychologist (and, for the sleep program,
someone familiar with CBT-I sleep hygiene guidance) should review:

| Program | Items to check |
|---|---|
| 7 Days of Better Sleep | wind-down timing advice; "screens down 30 min"; steady wake time and morning light; the "see a doctor if poor sleep lasts weeks" threshold; that nothing reads as insomnia treatment |
| 7 Days of Everyday Calm | 4-in / 6-out breathing (safe for people with panic or breathing conditions?); grounding 5-4-3; "write about what weighs on you" day for people in acute distress; when-to-seek-help wording |
| 7 Days of Self-Reflection | prompts that can surface grief, trauma or self-criticism (days 4–6); the "it's fine to stop" note; self-compassion letter wording |
| 7 Days of Building Healthy Habits | "skipping is a choice" framing; movement day for people with health limits; no pressure or streak language |

Also review, in all 19 languages: the program disclaimer (`jr.programs.notBody`),
`expect` texts, and that translations keep the non-clinical tone. Translations
of the program content outside English and Georgian were written without a
native clinical reviewer.

## Design rules (docs/ETHICS.md)

- One day at a time on calendar days: the next day opens the day after the
  last one was done. A missed day waits; nothing resets, no streak, no
  warning. After two quiet days: "Welcome back … nothing was lost."
- A day is done by a verified event from its main activity (a finished
  breathing minute, a saved journal entry, a created Step…) or by "I did
  this" for things done away from the app.
- Every main activity works without AI. Picture cards (AI) appear only as an
  optional extra, with a note that they ask for consent.
- Recommendations come only from what the person chose (the first-launch
  question, earlier focus areas), never from usage or what they write. The
  card says so, and any program can be chosen instead.
- Reflections are the person's own text: stored on the device (and in their
  encrypted backup if on), never sent to the server or analytics.
- Reminders are off until turned on per program; at most one a day, never in
  quiet hours, and the lock-screen text never names the program.
- Safety help and "Find a psychologist" are on every program page, free.

## Analytics

Starts, completed days, pauses, completions are counted for people who allow
statistics. Which program (and which day number) only adds to anonymous daily
totals (`analytics_aggregates`), never stored with the account.
