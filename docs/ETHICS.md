# BeHappy ethics charter

BeHappy is a self-care companion for reflection and emotional awareness. People open it on hard days, so every product decision is held to the rules below. They override growth, engagement and revenue goals.

The pre-2.0 version of this document described hidden "patient" risk analysis shown only to professionals. That model is retired: BeHappy does not run hidden assessments, and there is no professional console.

## 1. Say what it is, and what it is not

- BeHappy is not medical care, therapy or a crisis service, and it does not diagnose. The About screen, onboarding and the questionnaires say so plainly.
- **Anulia is an AI.** She never claims to be a therapist, psychologist or doctor, never claims credentials, and never presents AI support as treatment.
- Questionnaire results (PHQ-9, GAD-7, DASS-21) are screening scores with their published bands, framed as "your answers suggest". Translations that are not clinically validated are labeled as such.
- No feature is called "therapy" when it is a reflection tool. Card reflections, not "card therapy". The art program is art therapy *exercises*, done on paper.

## 2. Safety comes first, and is never for sale

- "Get help now" is free, has no limits, and works without an account or AI.
- Crisis numbers are listed per country only after they are checked, with the check date shown. Lines that could not be verified are left out, and findahelpline.com is offered instead.
- PHQ-9 item 9 above zero always shows a supportive message with ways to get help today, whatever the total score.
- When the AI flags possible risk, the app shows the help banner. Anulia is told to encourage contacting emergency services or a crisis line. She cannot contact anyone and must never say she can.
- When a limit is reached, the message about it always includes a way to get help now.

## 3. Consent, privacy and control

- Nothing goes to an AI provider until the person agrees on a consent screen that names the provider and explains what is sent.
- Journaling works fully without AI. A journal entry is sent to Anulia only when the person asks for a reflection on that entry.
- Personal details are shared with Anulia only if the person turns personalisation on.
- Journal entries, conversations, artwork photos and questionnaire answers stay on the device. The server keeps accounts, orders and usage counts, never content.
- No third-party analytics, advertising SDKs or selling of data. The owner sees aggregate counts only.
- People can export everything and delete everything, on the device and the server, from Profile › Privacy.

## 4. Honest design

- No fabricated numbers: insights only show what the person recorded. No predictions about someone's mental health, no "wellness scores".
- No streaks, guilt, loss-framing or nagging. Missing a day is not a failure.
- Money: one exact price in GEL. No fake "regular" prices, countdowns or scarcity. Passes never renew by themselves. Limits are shown before buying and exist to keep costs and pace sustainable, not to pressure upgrades.
- No control is decorative. If something cannot work yet, it is not shown.

## 5. Respect for language and culture

- Georgian, Russian and Armenian are complete. The other supported languages fall back to English key by key until reviewed translations exist, so the interface never invents wording.
- Each language keeps a consistent, respectful register (Georgian «შენ», Russian «вы», Armenian «դուք»).

## 6. Before public launch

1. Clinical review of all user-facing safety and questionnaire text by a licensed professional in Georgia.
2. Professional review of the Georgian, Russian and Armenian questionnaire translations, or replacement with validated versions.
3. Updating the hosted AI prompts to the Anulia persona (`docs/prompts/ANULIA_PERSONA_NOTE.md`) and red-team testing them for crisis, abuse and self-harm conversations in each main language.
4. A way for people to report a harmful AI reply, and an owner who reviews reports.
5. Re-checking every crisis number at least every three months.
