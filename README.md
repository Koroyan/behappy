# BeHappy

A self-care companion for reflection and emotional awareness: a private journal, art therapy exercises on paper, reflection cards, breathing, meditation, self-check questionnaires, and Anulia, an AI well-being companion.

BeHappy is not medical care, therapy or a crisis service. See [docs/ETHICS.md](docs/ETHICS.md).

## Stack

- **App**: Expo SDK 54, React Native 0.81, React 19, expo-router (iOS, Android, web)
- **API server**: Node 24 + Express 5 (`server/`). Anonymous accounts, AI proxy, quotas, Flitt payments in **test mode only**
- **AI**: OpenAI Responses API with hosted prompts, called only from the server
- **Languages**: 19 interface languages (Georgian, English, Russian and Armenian complete), RTL for Arabic

## Quick start

Requirements: Node 24, npm, and an OpenAI API key for the AI features.

```bash
npm install
cp server/.env.example server/.env    # then set OPENAI_API_KEY and ADMIN_TOKEN
npm run server:dev                    # API on http://localhost:8787
npx expo start --web --port 8081      # app on http://localhost:8081
```

Leave the root `.env` without API keys. The app needs only `EXPO_PUBLIC_API_URL` (see `.env.example`). Do not start Expo with `CI=1`: it disables file watching and the browser keeps serving old code.

Native: `npm run ios` / `npm run android` (Expo Go or a development build). Point `EXPO_PUBLIC_API_URL` at an address the device can reach.

## Scripts

| Command | What it does |
|---|---|
| `npm run server` / `server:dev` | Start the API (dev: restarts on changes in `server/`) |
| `npm test` | Server tests (payments, AI proxy, quotas) and questionnaire scoring tests |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint (Expo config) |
| `npm run qa:i18n` | Every used translation key exists; coverage per language |
| `npm run qa:scroll` | Scroll and bar checks per route and width (needs the app running) |
| `npm run qa:shots` | Screenshots for visual review |
| `npm run qa:payments` | Real browser payment against the Flitt sandbox |
| `npm run qa:ai` / `qa:art` | Live AI checks (use your OpenAI key) |
| `npm run economics` | Unit economics and pricing sensitivity |
| `npm run build:web` | Static web build in `dist/` (not committed) |

## Project layout

```
app/          routes (expo-router): tabs, art, cards, assessments, checkout, …
features/     feature logic and UI (shell, chat, anulia, journal, …)
design/       design system: tokens, typography, components
lib/          API client, storage, media, assessment scoring
content/      static content: art sessions, card decks, prompts, safety lines
i18n/         translations (en.ts is the source)
server/       API server and its tests
scripts/qa/   QA scripts; scripts/legacy/ holds pre-2.0 tools
docs/         audit, design system, security, pricing, Flitt setup, summary
```

## Documentation

- [Redesign summary](docs/BEHAPPY_REDESIGN_SUMMARY.md): what 2.0 changed and what is left
- [Audit](docs/BEHAPPY_AUDIT.md): findings in 1.x and their status
- [Design system](docs/BEHAPPY_DESIGN_SYSTEM.md)
- [Security and privacy review](docs/BEHAPPY_SECURITY_REVIEW.md): read the owner actions first
- [Pricing strategy](docs/BEHAPPY_PRICING_STRATEGY.md)
- [Flitt test setup](docs/BEHAPPY_FLITT_TEST_SETUP.md)
- [Updating the AI prompts](docs/prompts/ANULIA_PERSONA_NOTE.md)
