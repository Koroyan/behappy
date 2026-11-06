# BeHappy 3.0 community

Peer-support rooms where people talk about what they are going through, in their own language. The rooms are not therapy and not an emergency service; every room says so and links to "Get help now".

Code: `server/community/` (service, text checks, Anulia, real time, moderation, routes) and `app/community/`, `app/(tabs)/community.tsx`, `features/community/`.

## Rooms

- **13 topics × 19 languages = 247 rooms**, created by the migrations: panic attacks, anxiety, stress, burnout, depression support, grief and loss, loneliness, relationships, self-esteem, sleep, emotional regulation, personal growth, general support.
- Room ids are `<topic>:<language>` (for example `panic:ka`). The Community tab lists the rooms of the app language first; other languages are one tap away. Nothing moves between language rooms except the member's name and settings.
- Members join and leave rooms freely. A room shows member counts, unread counts and when it was last active.

## Joining the community

A registered account is required (people should know a real account is behind each name). The first visit asks for:

1. **A community name** (pseudonym), 3–24 characters, unique. Names cannot contain contact details (6+ digits, links, domains), reserved words (BeHappy, Anulia, moderator, admin, …) or professional titles ("Dr.", "psychologist", "therapist", …), so nobody can pose as a professional.
2. **The guidelines**, accepted once (be kind; peer support only; no contact details; no diagnosing or medical/medication advice; nobody acts as a professional; no harassment, hate, sexual content, spam or selling; report what worries you).

The community name is the only identity shown. Members never see each other's email, journal or Anulia conversations.

## Messages

- Up to 2,000 characters. Replies quote the original; `@name` mentions notify the person mentioned.
- Rate limits per member: 5 messages per 30 seconds and 60 per hour (`slow_down`), plus duplicate detection. Reports: 20 per hour.
- Reactions: support, hug, strength, thanks, "me too".
- Members can delete their own messages, search a room, see a pinned message, and choose room notifications: every message, replies and mentions, or off.
- **Block** hides someone everywhere and stops their notifications. **Mute** hides their messages behind "Show". Both are managed in Community settings.

### Automatic checks (a person always decides)

`server/community/text.mjs` checks each message before it is shown:

| Finding | What happens |
|---|---|
| Contact details (email, phone, social handles) | Message is **held**: only the author sees it ("Waiting for a moderator"); a report is opened for moderators |
| Claim to be a professional | Held, report opened (impersonation) |
| Link from a brand-new member | Held, report opened (spam) |
| Self-harm risk language | Message is shown, the author privately gets a safety notice with local help, and an **urgent** report goes to moderators |

An optional OpenAI moderation pre-screen exists (`COMMUNITY_AI_MODERATION`, off by default). Automatic checks never punish anyone by themselves.

## Anulia in rooms

Anulia, the AI companion, answers in a room only when someone asks: the **Ask Anulia** button or an `@Anulia` mention. Her replies are public in the room, clearly labelled "AI", and remind people that she is not a professional.

Limits: per member 5 questions a day on the free plan and 15 with Plus (`server/quota.mjs`, feature `community`); per room 30 replies an hour; 2,000 a day across the platform (`COMMUNITY_ANULIA_ROOM_HOURLY_CAP`, `COMMUNITY_ANULIA_DAILY_CAP`). When a limit is reached the member sees why. The instructions are `server/prompts/community.md`: warm, short, peer-room appropriate, no diagnosis, and crisis language is routed to local help.

## Real time

Socket.IO delivers new messages, edits, removals, reactions and "Anulia is writing…" without reloading. When a phone reconnects, the client sends `room:sync` with its last message id and receives what it missed. Each recipient's stream is filtered by their blocks and mutes, and held messages reach only their author.

## Privacy and deletion

- Messages are visible to everyone in the room and stay until deleted; this is said in the guidelines.
- Deleting an account empties that member's messages, which then show "Former member".
- Moderators see reported content only (see [BEHAPPY_3_MODERATION.md](BEHAPPY_3_MODERATION.md)).

## API

| Method and path | Purpose |
|---|---|
| `GET /api/community/topics` · `GET /api/community/rooms?lang=` · `GET /api/community/my-rooms` | Topics, the rooms of a language (membership, unread counts), the member's rooms |
| `GET/PUT /api/community/profile` · `GET /api/community/status` | Community name and guidelines acceptance; suspension status |
| `GET /api/community/rooms/:roomId` · `POST …/join` · `…/leave` · `…/notify` · `…/read` | Room, membership, notification preference, read marker |
| `GET/POST /api/community/rooms/:roomId/messages` · `GET …/search` | Read a page (before an id) or post (`askAnulia`, `replyToId`, client nonce); search |
| `POST /api/community/messages/:id/reactions` · `…/report` · `DELETE /api/community/messages/:id` | Reactions, reports, deleting one's own message |
| `POST/DELETE /api/community/members/:ref/block` · `…/mute` · `POST …/report` · `GET /api/community/relations` | Block, mute, report a member, list blocks and mutes |
| `POST /api/community/appeals` | Ask for a review of a suspension |
| `/api/moderation/…` | Staff tools, see [BEHAPPY_3_MODERATION.md](BEHAPPY_3_MODERATION.md) |

Tests: `server/test/community.test.mjs` (15 tests: room set, names and titles, guidelines, posting, limits, holds, risk notice, Anulia quotas and caps, real-time delivery between two clients, reports, suspension, appeal, deletion).
