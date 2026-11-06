# BeHappy 3.0 moderation

Moderation keeps the community rooms safe and fair. People decide; automatic checks only hold messages for a person to look at. Every decision is recorded.

Code: `server/community/moderation.mjs`, the `/api/moderation` router in `server/community/routes.mjs`, and the screen `app/moderation/index.tsx`.

## Who can moderate

- Accounts with the `moderator` or `admin` role, **signed in with email and password** (a device session is not enough). The server checks this on every request (`requireStaff('moderator', 'admin')`); the screen only hides itself for others.
- Roles are granted by the owner: `npm run admin:grant -- someone@example.org moderator` (uses `ADMIN_TOKEN` from `server/.env`; the token is never printed). Add `--revoke` to remove a role.
- Community rooms in 19 languages need moderators who read those languages. The moderation screen is translated into all 19.

## What moderators see

Only what was reported or held: the message text as it was when reported (a snapshot), the room, the member's community name, earlier reports about the same member, and the decision history. Moderators never see journals, Anulia conversations, emails or other private data. Reported private messages between a client and a psychologist arrive as a snapshot of that one message.

## The queue

| Source | Priority |
|---|---|
| Member report: self-harm risk, threats or violence | 3 (urgent) |
| Member report: harassment, hate, sexual content | 2 |
| Member report: spam, harmful health advice, impersonation, privacy, other | 1 |
| Automatic: self-harm risk language | 3 (urgent); the author also gets a private safety notice |
| Automatic: contact details, professional claim, link from a new member | 1; the message is held until a moderator decides |

Urgent reports are listed first. A moderator **claims** a report ("I'll review this") so two people don't act on it at once.

Members can report a message or a member, once per item (repeats answer "already reported"), at most 20 reports an hour. The reported person never learns who reported them.

## Actions

| Action | Effect | Member is notified |
|---|---|---|
| No action needed | Report closed | – |
| Remove message | Text is no longer served to anyone; shows "Removed by a moderator" | Yes |
| Approve message | A held message becomes visible | – |
| Restore message | Undo a removal | – |
| Send a warning | Recorded warning about the guidelines | Yes |
| Pause posting 24 hours / 7 days | Temporary suspension; the member can still read | Yes, with the end date and reason |
| Pause posting permanently | Permanent suspension; the member can still read | Yes, with the reason |
| Lift suspension | Ends a pause early | Yes |
| Pin message | One pinned message per room | – |

## Review requests (appeals)

A suspended member can ask for a review and explain what happened (one open request per suspension at a time). **The moderator who issued the suspension cannot decide its review** — the server answers `409 own_decision` and the screen explains that another moderator must decide. A different moderator keeps the decision or lifts the pause; the member is notified either way.

## Record and audit

- `moderation_actions` keeps every decision with the moderator, target, note and time; the History tab shows it per member.
- `audit_log` records sensitive actions across the platform (for example `moderation.*`, `professional.*`, `membership.*`, `role.*`, `account.*`, `order.*`), readable by admins at `GET /api/admin/audit`.

## API (`/api/moderation`, staff only)

| Method and path | Purpose |
|---|---|
| `GET /summary` | Open counts, urgent counts, open appeals |
| `GET /reports` · `POST /reports/:id/claim` · `POST /reports/:id/resolve` | Queue, claim, resolve with an action and note |
| `POST /messages/:id/remove` · `/restore` | Remove or restore a message |
| `POST /members/:ref/suspend` · `POST /suspensions/:id/lift` | Pause posting (24 h, 7 days, permanent) and lift |
| `GET /appeals` · `POST /appeals/:id/decide` | Review requests (`upheld` or `overturned`) |
| `GET /history?member=` | Decisions, optionally for one member |
| `POST /rooms/:roomId/pin` | Pin or unpin a message |

Tests: `server/test/community.test.mjs` covers reporting rules, removal, suspension, the posting block, the appeal (including the own-decision refusal and a second moderator deciding) and the audit history.
