# BeHappy as an installable web app (PWA)

The existing Expo Router web build, made installable on iPhone, Android and
computers, with offline support, updates and notifications. Same code and
design as before, and the native Expo apps are unchanged. Flitt payments are
unchanged.

## What was added

| Area | Files |
|---|---|
| Manifest, icons | `public/manifest.webmanifest`, `public/icons/*` (made by `scripts/brand/logo.mjs`) |
| HTML shell | `app/+html.tsx`: manifest link, `viewport-fit=cover`, iOS home-screen tags, theme colours, no white flash |
| Service worker | `public/sw.js`: app shell, offline page, safe caching, notifications, update hand-off |
| Offline page | `public/offline.html`: 4 languages, the emergency number |
| Build step | `scripts/pwa/finalize.mjs`: validates the manifest, icons and HTML, stamps the worker's build id and install list, guards the caching rules (`npm run build:web` runs it) |
| App runtime | `lib/pwa/pwa.web.ts` (+ native no-op `pwa.ts`), `lib/pwa/usePwa.ts`, `features/pwa/PwaBridge.tsx` (update prompt, theme colour), `features/pwa/InstallCard.tsx`, `app/install.tsx` |
| Web Push | client `lib/notifications/webPush.ts`, `push.web.ts`, `reminders.web.ts`, `native.web.ts`, shared plan `plan.ts`; server `server/notify/webpush.mjs`, `push.mjs`, `routes.mjs`, migration `015_web_push.sql` |
| Hosting | `vercel.json` (clean URLs, dynamic-route rewrites, headers), `scripts/pwa/serve-dist.mjs` (the same rules locally) |
| Strings | `i18n/locales/pwa/*.ts`, 19 languages |
| Tests | `server/test/webpush.test.mjs`, `scripts/qa/pwa-check.mjs` |

## How it behaves

**Caching (`public/sw.js`).** Pages are network-first. Offline, a page opens
from the copy saved on its last visit, or the offline page is shown. Pages are
the pre-rendered static HTML and never contain anyone's data. Hashed
scripts, fonts, images and sounds are served cache-first. The worker never
touches other origins (the API on its own domain, Flitt, AI), `/api` and
`/socket.io`, requests with an `Authorization` header, anything except GET,
Range requests or `no-store` responses. Account data, AI replies, journal
text and payment pages are therefore never cached. `finalize.mjs` fails the
build if those rules disappear from the worker.

**Updates.** A new deployment changes the worker's build id. The new version
downloads in the background and waits. The app shows "A new version of
BeHappy is ready · Refresh". Nothing switches until the person taps it, so an
entry being written is never interrupted. The app checks for an update when
it returns to the screen, at most every 30 minutes.

**Installing.**
- Android, and Chrome/Edge on a computer: the browser's own install dialog,
  offered by a small card on Today on phones. The card never appears on the
  first visit. "Not now" hides it for 30 days, and after the second "Not now"
  only Profile → Install BeHappy offers it.
- iPhone and iPad: there is no install dialog. The card and `/install` show
  the Share → Add to Home Screen → Open as Web App steps, and the app never
  claims an automatic install.

**Notifications (Web Push).**
- Chats and messages use the same server rules as on phones: only unread,
  nothing while the chat is open, one summary per burst, quiet hours on the
  device's own clock, categories, and no message text.
- Reminders: a browser can't schedule notifications, so the app makes the
  same plan as on a phone (`plan.ts`, from data that stays on the device) and
  sends only the times, the discreet text and the link. The server sends each
  reminder once at its time.
  - It never sends a reminder more than 2 hours late, or after sign-out.
  - A new plan replaces the pending reminders.
  - The text is deleted once a reminder is sent.
  - Several servers never send the same reminder twice (`FOR UPDATE SKIP LOCKED`).
  - No background timers run in the page.
- Permission is asked only when the person turns chats or reminders on.
- iPhone/iPad: Web Push works only in BeHappy opened from the Home Screen
  (iOS 16.4+). Settings says so and links to the steps.
- Browsers without Web Push keep the old fallback: notifications while
  BeHappy is open in a tab.
- Endpoints must belong to a known push service (Google, Mozilla, Apple,
  Microsoft), because the server makes requests to them.

**Payments.**
- Flitt is unchanged. On the web, checkout is a full-page redirect to Flitt's
  hosted page. Flitt returns through the API (`/api/payments/flitt/return`),
  which sends the person back to `/checkout/result`.
- Plus is granted only after the server verifies the payment (signed
  callback, or a status check with Flitt), never from the redirect itself.
- In an installed app the Flitt page opens inside the app window, with the
  system's small browser bar on iOS/Android, and the return lands back in
  the app.

**Sessions.** The sign-in token lives in the app's local storage, so it
survives closing and reopening the installed app. On iPhone the Home Screen
app has its own storage, separate from Safari, so the person signs in once
inside it (or restores with the recovery code).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` | API (`server/.env`, `deploy/.env.production`) | VAPID key pair: `npx web-push generate-vapid-keys`. The private key is a secret. Changing the pair makes every browser subscribe again. |
| `WEB_PUSH_SUBJECT` | API | `mailto:` address or https URL, so the push services can contact the sender |
| `APP_PUBLIC_URLS` | API | must include the web app's https origin (checkout returns, CORS) |
| `EXPO_PUBLIC_API_URL` | web build | only if the API is on another origin than the web app |

Without the keys, development makes and keeps its own pair (`server_keys`).
Production then has web push off and logs a warning at start.

## Deploying

1. Migration `015_web_push.sql` runs on API start (as all migrations do).
2. Set the `WEB_PUSH_*` variables on the API and restart it.
3. Run `npm run build:web` (`expo export -p web`, then `finalize.mjs`). It fails if
   the manifest, icons, HTML shell, worker rules or dynamic-route rewrites
   are wrong.
4. Host `dist/` over HTTPS. Service workers need HTTPS, except on localhost.
   - `vercel.json` covers Vercel: clean URLs, a rewrite for every
     `[param]` page, `sw.js` never cached, hashed bundles immutable.
   - On another host, mirror those rules (see `scripts/pwa/serve-dist.mjs`).
5. Serving the web app and the API on the same origin, like the development
   proxy, is the simplest setup. Otherwise set `EXPO_PUBLIC_API_URL` and
   include the web origin in `APP_PUBLIC_URLS`.

Test locally: `npm run build:web`, `npm run server:local`, `npm run pwa:serve`
(http://localhost:8090), then `npm run qa:pwa`.

## Installing (for users)

- **iPhone / iPad (Safari):** Share → Add to Home Screen → keep "Open as Web
  App" on → Add. Open BeHappy from the Home Screen. Notifications need iOS
  16.4 or later and the Home Screen app.
- **Android (Chrome):** "Install" on the Today card, or menu ⋮ → Install app /
  Add to Home screen.
- **Computer (Chrome / Edge):** the install icon in the address bar, or the
  browser menu → Install BeHappy.

## Limitations and what needs a real device

- Automated checks run in Chrome on Windows (`npm run qa:pwa`). Physical
  iPhone and Android devices were not tested. To check by hand:
  - adding to the Home Screen on iOS 16.4+, and installing on Android;
  - the standalone look under the notch, the Dynamic Island and the home
    indicator;
  - the keyboard in the journal and chat;
  - Web Push on an installed iPhone app;
  - a Flitt payment from the installed app, including Apple Pay / Google Pay
    on Flitt's page;
  - the return to the app.
- iOS Safari in a tab (not installed) clears a site's stored data after 7
  days without a visit. BeHappy keeps the journal on the device, so the
  installed app (exempt from this) is the safer way to use BeHappy on an
  iPhone. Export/backup remains in Profile.
- iOS has no install prompt, and web apps there get no background sync.
  Badges on the icon need iOS 16.4+.
- Web Push to iPhone goes through Apple's service. Delivery is best-effort on
  every platform, which is why reminders are also visible in the app.
