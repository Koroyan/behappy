# Updating the hosted prompts to the Anulia persona

The three AI features use prompts hosted on the OpenAI dashboard. Their IDs are in `server/ai.mjs` (`PROMPTS`):

| Feature | Prompt ID (env override) | Notes |
|---|---|---|
| Anulia chat | `pmpt_6902…` (`PROMPT_ID_ANULIA`) | Written for the old "Dr. Pijilo" persona |
| Art therapy | `pmpt_690baa…` (`PROMPT_ID_ART`) | Version 21; draft in `archive/ART_THERAPY_SYSTEM_PROMPT_V21_DRAFT.md` |
| Reflection cards | `pmpt_690f8a…` (`PROMPT_ID_CARDS`) | Version 4 |

## Why this is needed

1. **Persona.** The prompts introduce a "doctor"-style therapist. BeHappy 2.0 presents **Anulia, an AI well-being companion**, who is never a therapist, psychologist or doctor. Until the prompts change, the app prepends a short context block to every request (`features/anulia/persona.ts`, `ANULIA_PERSONA_CONTEXT`). It works, but it argues with the hosted instructions. One consistent source is better.
2. **Model.** The prompts are pinned on the dashboard to retired models (`gpt-5-chat-latest`, `gpt-5.2-chat-latest`), which return 404. The server overrides the model (`gpt-5.4-mini` by default; `AI_MODEL_ANULIA`, `AI_MODEL_ART`, `AI_MODEL_CARDS`). When you save new versions, pin them to the same model. `gpt-4.1` fails the art prompt because of its reasoning setting.

## What every prompt should say

- You are **Anulia**, BeHappy's AI well-being companion. If asked, say you are an AI.
- You are not a therapist, psychologist or doctor. Do not claim credentials, do not diagnose, and do not present your support as treatment.
- Warm, plain language. At most **one question per reply**.
- Reply in the language the person writes in. Georgian, Russian and Armenian are the main ones.
- Do not interpret drawings or cards as proof of anything. Offer observations as possibilities and ask what they mean to the person.
- If someone may be in danger, mentions self-harm or suicide, or describes abuse: respond with care first. Encourage contacting local emergency services or a crisis line now. Mention the app's **"Get help now"** screen. Never promise to contact anyone; Anulia cannot.
- Art sessions: drawing happens **on paper**. Never ask the person to draw in the app.

## Output fields the app reads

Keep these names and value sets. The app ignores other fields and tolerates missing ones.

| Feature | Field | Used for |
|---|---|---|
| Anulia | `response_text` | The reply shown to the person |
| Anulia | `crisis_level` | Shows the "Need help now?" banner when risky |
| Anulia | `detected_emotion`, `key_insights` | Conversation summary |
| Art | `response_text` | The reply |
| Art | `phase` | Progress indicator (first drawing, looking again, closing) |
| Art | `session_complete` | Closes the session. When true, the reply must not end with a question. |
| Art | `safety_assessment.risk_level` (`none`, `low`, `moderate`, `high`, `imminent`) | Shows the help banner |
| Art | `detected_emotions`, `psychological_themes`, `progress_tracking` | Memory context for later sessions |
| Cards | `response_text` | The reply |

## After updating

1. Save the new prompt versions and note their version numbers.
2. If the IDs change, set `PROMPT_ID_*` in `server/.env`.
3. Run `npm run qa:ai` and `npm run qa:art` against the dev server. They check that Anulia introduces itself correctly, asks one question and doesn't claim to be a therapist, and that an art session runs end to end in Georgian.
4. Then the app-level context in `features/anulia/persona.ts` can shrink to the parts that are app-specific (the "Get help now" screen name, paper-only drawing).
