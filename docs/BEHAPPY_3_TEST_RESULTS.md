# BeHappy 3.0 test results

Branch `behappy-3.0`, 6–7 November 2026, Windows 11, Node 24, Chrome (Playwright, headless). Dev stack: API on 8787 with `--dev-tools`, Expo web on 8082, proxy on 8081, and an ngrok tunnel to 8081 for testing from outside.

## Summary

| Check | Command | Result |
|---|---|---|
| Unit and integration tests | `npm test` | **88 / 88 pass** |
| Types | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` | 0 errors |
| Translations | `npm run qa:i18n` | All used keys exist; **19 languages × 1,566 keys, 100%**; placeholders and lists match English |
| Professional journey, localhost, with a Flitt TEST payment | `npm run qa:pro -- --pay` | **17 / 17 steps pass** |
| Same journey through the ngrok tunnel | `npm run qa:pro -- --app https://<tunnel> --pay` | **17 / 17 steps pass** |
| Two clients in one room (phone via the tunnel, laptop on localhost) | community browser check | Live messages both ways, replies, Anulia, report |
| Rescheduling | browser check | One active booking before and after; the old one released as "rescheduled" |
| Responsive sweep | 14 key 3.0 screens × 9 widths | **126 / 126 render, no horizontal overflow** |
| Languages at 320 px | 4 screens × 19 languages | No overflow after one fix (below); Arabic renders right-to-left |
| Native bundles | `npx expo export --platform android --platform ios` | Android 1,969 modules (7.84 MB Hermes bytecode), iOS 1,979 modules (7.85 MB) |
| Secrets in native bundles | value check against `server/.env` and the root `.env` | Not present |

## `npm test` (88 tests)

| Suite | File | Tests |
|---|---|---|
| API: payments, AI proxy, quotas, metrics, Flitt signature and test-mode lock | `server/test/server.test.mjs` | 22 |
| Platform: database, passwords, accounts and sign-in, account deletion, 2.0 import | `server/test/platform.test.mjs` | 13 |
| Community: rooms, names, guidelines, posting limits, holds, risk notice, Anulia quotas and caps, real time, reports, suspension, appeal (incl. different moderator), history | `server/test/community.test.mjs` | 15 |
| Professionals: application and lock, encrypted documents, review flow, trial and listing, verification ≠ payment, one trial per person, membership checkout and refund, bookings, private messages and expiry, reminders, admin overview, client deletion, self-review refusal and verification expiry | `server/test/professionals.test.mjs` | 13 |
| Questionnaire scoring, date fallback, right-to-left text, journal reflection filter, risk language, Latin-letter Georgian, secret scan | `lib/…`, `i18n/…`, `features/…`, `scripts/qa/secrets.test.mjs` | 25 |

## Professional journey (`scripts/qa/pro-journey.mjs`)

Three real browsers: a psychologist on a 390 px phone, an admin on a 1440 px desktop, a client on a 375 px phone.

1. Join page shows price, trial and 0% commission
2. Phone confirmed with the test code
3. Identity saved
4. Three documents uploaded with the file chooser; two qualifications saved
5. Practice: bio, confirmed languages, focus areas, experience
6. Sessions and policies
7. Weekly hours, application sent
8. The unverified profile is not in the directory
9. Admin: start review, checklist, approve
10. Verified, free trial active, publish → listed
11. Client finds the specialist and requests a session
12. Psychologist confirms
13. Client sees the confirmed appointment and writes a message
14. The message arrives; the reply reaches the client live, without reloading
15. Notifications list the booking request and the verification update
16. Membership page → Flitt TEST checkout → test card → server-verified result → paid period stacked after the trial → receipt
17. Admin overview counts the listed professional and the TEST revenue

Final runs: localhost 17/17, tunnel 17/17; the paid period ended on 20 December (trial of 14 days, then 30 paid days).

## Issues found and fixed during testing

| Found by | Issue | Fix |
|---|---|---|
| Journey | Verifying the phone or uploading a document wiped unsaved fields on the same step | Those actions refresh only the profile, not the form |
| Journey | A refused free trial (same phone) showed "Expired" to someone who never had a membership | New state `not_started` and a notice explaining the refused trial |
| Journey | Flitt shows a method list first on narrow phones | Journey taps "Card"; documented |
| Phone review | Phones had no way to reach notifications, messages, appointments or staff tools | Profile tab lists everything outside the tab bar |
| 320 px, all languages | Long tab labels were cut off | Labels shrink to fit; shorter Georgian tab words |
| 320 px, all languages | The specialist card was wider than the screen | Cards may shrink (`flexShrink: 1`, `maxWidth: 100%`) |
| Code review | The appeal of a suspension could be decided by the moderator who issued it | Server refuses (`own_decision`); tested |
| Code review | "Choose another time" created a second booking | It now reschedules in one transaction |
| Code review | The private-messages notice said staff can never read messages | Corrected: staff see a message only if it is reported |

## Not covered yet

- Running the native apps on physical devices or emulators (bundles compile for iOS and Android; runtime behaviour was tested on the web build).
- Real email and SMS delivery (providers not configured; the dev server uses the code 123456).
- Live payments (Flitt stays in TEST by design).
- Load and soak tests of the real-time rooms; Safari and Firefox; a screen-reader audit.
- Native-speaker review of the 18 non-English translations.
