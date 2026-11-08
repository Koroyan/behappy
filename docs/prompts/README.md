# AI instructions

The instructions for every AI feature are **server-owned Markdown** that ships
with the server:

| Feature | File | Model setting |
|---|---|---|
| Anulia chat | `server/prompts/anulia.md` | `AI_MODEL_ANULIA` |
| Art reflection | `server/prompts/art.md` | `AI_MODEL_ART`, `AI_REASONING_ART`, `AI_ART_MAX_OUTPUT_TOKENS`, `AI_ART_STORE` |
| Reflection cards | `server/prompts/cards.md` | `AI_MODEL_CARDS` |
| Anulia in community rooms | `server/prompts/community.md` | `AI_MODEL_COMMUNITY` |

`server/prompts/index.mjs` loads them (`PROMPT_SET_VERSION`). The AI proxy
(`server/ai.mjs`) attaches them to every request; a client can't read, change
or replace them, and can't pick the model. App builds from before 3.0 still
send the ids of the old prompts hosted on the OpenAI dashboard; the server
accepts only the matching id and replaces it with its own instructions.

Art reflection replies are additionally checked before the person sees them
(`server/art/`, see [docs/BEHAPPY_ART_THERAPY_RELIABILITY.md](../BEHAPPY_ART_THERAPY_RELIABILITY.md)).

Older notes about the hosted prompts are in [archive/](archive/) for history only.
