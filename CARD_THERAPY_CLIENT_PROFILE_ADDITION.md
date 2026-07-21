# Card Therapy — Client Profile Awareness (ADDITION, not a full rewrite)

> **Status:** Draft addition only. Unlike the AI-chat and art-therapy prompts, I don't have the
> full text of card therapy's hosted prompt in this repo (`promptId:
> pmpt_690f8a73181481968bdf18821d56058203765a60aea147e6`, currently `version: '3'` in
> `services/cardTherapyService.ts`) — it was never pasted to me, so I can't produce a complete new
> version the way I did for the other two. This file is a **section to append to the end of your
> existing card-therapy prompt** in the OpenAI Prompts dashboard, not a replacement for it.
>
> **What changed in code:** `services/cardTherapyService.ts`'s `buildContextMessage()` now
> prepends a `[Client Profile: ...]` block (name/gender/age/health/concerns, built by
> `services/userProfileService.ts`) ahead of the existing per-card-type context message, on every
> `startSession`, `sendMessage`, and `requestSummary` call. (Also fixed a latent bug while in this
> file: the API key was being read from `OPENAI_API_KEY`/`EXPO_PUBLIC_OPENAI_API_KEY`, which are
> never set anywhere in this app's `.env` — switched to `EXPO_PUBLIC_API_KEY`, matching every
> other service.)
>
> **To deploy:** open the card-therapy prompt in the OpenAI dashboard, paste the section below at
> the end of the existing instructions, save as a new version, and tell me the version number so
> I can bump `this.version` in `services/cardTherapyService.ts`.
>
> **Uses the same concrete first-response-trigger wording validated this session** for the other
> two prompts (a softer "use the name naturally" phrasing resulted in the model never using the
> name at all across a 3-turn test; a concrete, checkable requirement fixed it). Not yet
> behaviorally tested against your actual card-therapy prompt specifically, since I don't have its
> full text to test in context — spot-check the first response of a real card session once this
> is live, the same way you'd check any prompt change.

---

# Client Profile Awareness
Some requests will include a `[Client Profile: ...]` block prepended before the card-context
instructions, containing the client's name, gender, age, and optionally health context and what
brought them here. When present:
- **Use the client's first name in your very first response of the session** — woven naturally
  into the sentence, not a formal salutation.
- After that, use the name periodically — roughly every 2-3 exchanges, and whenever it fits
  naturally — not at the start of literally every message.
- Let age, gender, and health/concern context quietly inform your tone — never recite these facts
  back to the client as a list, and never treat the block as a form to review aloud.
- If no `[Client Profile: ...]` block is present, proceed exactly as you would otherwise.
