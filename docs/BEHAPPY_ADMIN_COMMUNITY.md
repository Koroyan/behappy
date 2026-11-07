# Admin: community rooms and access control

Complements [BEHAPPY_3_COMMUNITY.md](BEHAPPY_3_COMMUNITY.md).

## Who may read a room

Fixed in this branch (it was the first item of the brief). Reading a room's messages, searching it, seeing its pinned message and receiving its live stream require **all** of:

1. a registered account (verified email and password), active;
2. a community profile with accepted guidelines;
3. **membership of that room** (joined with "Join room");
4. no platform-wide suspension.

**Knowing a room id is never enough.** The same check runs for HTTP (`messages`, `search`, `room`'s pinned message) and Socket.IO (`room:join`, `room:sync` check before subscribing). Posting and reacting also need membership (there is no implicit join by posting), and the room must not be paused. Reports are accepted only for messages the reporter can see.

| Situation | Reading | Posting |
|---|---|---|
| Anonymous device account | `registration_required` | refused |
| Registered, no community profile | `profile_required` | refused |
| Not a member of the room | `not_a_member` (room details only: topic, language, member count) | `not_a_member` |
| Member | allowed | allowed |
| Community suspension (posting pause) | allowed | `suspended`; can't join new rooms |
| Platform-wide suspension or suspended account | refused | refused |
| Room paused by staff | allowed | `room_paused` |

**Live connections follow membership:** leaving a room removes that person's sockets from the room on every device; archiving a room removes everyone; every socket re-checks its session at least once a minute and is closed at once on sign-out, password reset or change, session revocation, account deletion or suspension.

In the app, a room you haven't joined shows "Only members can read this room" and a Join button; leaving clears the history from the screen.

## Rooms in the admin center

`/admin/community` (community.view):

- Totals for the period: messages, room joins, Anulia replies, messages held for review
- Messages per day; messages by topic (all languages)
- Rooms by language and state, with members (hidden under 5), messages in 7 days, open reports, last activity

With `community.manage`, a room opens a panel to:

- **Pause / resume** (reason): members keep reading, nobody posts or reacts.
- **Archive / restore** (reason): the room closes for everyone and live streams end.
- **Official notice**: posted in the room as "BeHappy", marked in the app as from the BeHappy team (badge, distinct colour); optionally pinned.
- **Description** in English and Georgian.

Also: **topic order** (how topics are listed in the app) and **moderator languages** (which rooms each moderator covers).

Statistics are per room and per topic, never per person. Nothing here says anything about anyone's health; room participation is not used to infer anything about a person.

## Endpoints

| Method | Path | Permission |
|---|---|---|
| GET | `/api/admin/community/rooms` | community.view |
| POST | `/api/admin/community/rooms/:id/state` (`pause`, `resume`, `archive`, `restore`) | community.manage |
| PUT | `/api/admin/community/rooms/:id/description` | community.manage |
| POST | `/api/admin/community/rooms/:id/notice` | community.manage |
| GET / PUT | `/api/admin/community/topics`, `/api/admin/community/topics/order` | community.view / community.manage |
| GET / PUT | `/api/admin/community/moderators`, `/api/admin/community/moderators/:id/languages` | community.view / community.manage |
| GET | `/api/admin/community/stats` | community.view |

## Tests

`server/test/community.test.mjs` › "access control: only joined members read or subscribe; a room id alone is never enough" covers anonymous, no profile, non-member over HTTP and the socket, cross-room, after leaving (HTTP and live stream), community vs platform suspension, a paused room, and a socket closed on sign-out. `server/test/admin.test.mjs` covers pause, notices and hidden member counts.
