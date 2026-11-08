# Expo SDK 58: validation

Date: 8 November 2026, Windows 11, Node 24.19. Stack: Expo SDK 58,
React Native 0.88.1, React 19.3, expo-router 58.

## Commands run

| Command | Result |
|---|---|
| `npm ci` | completed |
| `npx expo install --check` | Dependencies are up to date |
| `npx expo-doctor@latest` | 20/20 checks passed |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 29 warnings (React Compiler advisories, unchanged from before this work) |
| `npm test` | 155/155 |
| `npm run test:unit` | 37/37 |
| `npm run qa:i18n` | all keys exist; 19 languages complete; placeholders and lists match |
| `npx expo export -p web` (`build:web`) | exported, all routes |
| `npx expo export -p ios -p android` | Hermes bytecode bundles: iOS 8.6 MB, Android 8.7 MB |
| `npm audit --omit=dev` | 5 moderate, all in Expo build tooling (`minimatch` via `@expo/fingerprint`/`glob`); the only offered fix downgrades Expo to SDK 52 — not applied |

## Expo Go on iPhone (development)

Fixed earlier on this branch and re-checked: dynamic `import()` of native
modules (`expo-asset`, `expo-sharing`, `expo-image-manipulator`, the art
session data) loaded separate bundles in Expo Go and crashed the app
("Cannot find native module 'ExpoAsset'", `"main" has not been registered`).
All are static imports now; the iOS development bundle contains no lazy chunk
from the app's code (one from inside `react-native-worklets` remains).

`expo-notifications` is loaded only in the native files (`lib/notifications/*.ts`
with `.web.ts` twins), so the web build carries no notification module.

## Areas checked

| Area | How |
|---|---|
| Expo Router, navigation, deep links | console sweep of every user and admin route (phone + desktop + admin viewports): no JS errors; browser journeys below |
| Safe areas, keyboard, chat scrolling | browser journeys on phone viewports (moderation, account 360, admin, professional) |
| Notifications | server and planner tests; native module split verified in bundles |
| Image Picker, FileSystem, Sharing | static imports verified in the iOS bundle |
| Audio, Reanimated, Worklets, Skia, SQLite | bundle and type checks only |

Browser journeys (real Chrome via Playwright): `qa:moderation` 14/14,
`qa:account360` 10/10, `qa:admin` 25/25, `qa:pro` 17/17 (apply → verify → book →
messages → Flitt TEST checkout), `qa:console` no errors. After credits were
added: `qa:art` (Georgian, a real drawing) PASS; all journeys re-run after the
Android fixes with the same results.

## Android in Expo Go (8 November, evening)

Expo Go 58.0.5 on an Android 12 emulator, Georgian, a registered test account:
every user feature was used end to end (art therapy with real drawings, the
daily limit, Anulia, cards, journal, community, private messages, check-in,
breathing, meditation, grounding, questionnaires, trends, help screen,
specialists, notification settings, admin). Results and fixes:
`BEHAPPY_RELEASE_READINESS.md` → "Android test pass".

Development notes from that pass:
- `metro.config.js` keeps Metro from watching `.server-data` (the dev
  database), `qa-shots` and `dist`; watching them made Metro's web server
  rendering fail now and then ("Requiring unknown module …") during journeys.
- Expo Go's floating "Tools" button can cover the send button when the
  keyboard is open; drag it aside (development builds only).
- On the emulator, a 15 MB development bundle sometimes stalled at 99 % over
  10.0.2.2 or the LAN address; `adb reverse tcp:8082 tcp:8082` and
  `adb reverse tcp:8787 tcp:8787`, then `exp://127.0.0.1:8082`, loads it in seconds.

## Not tested here

- **Native iOS/Android store builds** (Xcode, Gradle, EAS): not made here. The
  JS bundles compile for both.
- **iOS:** no Mac here; the iPhone runs the same JavaScript in Expo Go. The
  earlier Expo Go crash was diagnosed from the phone's own logs in Metro.
- Android Expo Go remote push (not supported by Expo since SDK 53).
