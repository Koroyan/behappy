# BeHappy 3.0 design system

3.0 keeps the 2.0 foundations — warm neutral surfaces, sage primary, calm typography, generous space, one design system for iOS, Android and the web ([BEHAPPY_DESIGN_SYSTEM.md](BEHAPPY_DESIGN_SYSTEM.md)). This page covers what 3.0 adds: navigation for three pillars, the community and professional components, and the rules that keep 19 languages and nine screen widths working.

## Principles for the new areas

- **Calm, not busy.** Rooms read like a conversation, the directory like a short list of people, the workspace like a notebook. No counters that create pressure except unread badges.
- **Honest by design.** TEST payments are always labelled; "Verified" is explained wherever it appears; no promises of clients, income or results; BeHappy never presents itself as the therapy provider.
- **Safety is one tap away.** Every community and directory screen carries "Get help now"; it is never behind a paywall or a sign-in.
- **Privacy is visible.** Screens say who can see what: "Only the specialist can read it", "Private and stored encrypted", "Other members see only this name".

## Navigation

| Width | Pattern | Contents |
|---|---|---|
| < 768 px (phones) | Bottom tab bar, five tabs | Today · Community · Anulia · Specialists · Profile. The Profile tab lists the rest (appointments, messages, notifications, the professional workspace, staff tools) with unread badges (`features/shell/MoreMenu.tsx`) |
| 768–1023 px (tablets) | Icon rail | Every sidebar item as an icon with a short label |
| ≥ 1024 px | Sidebar | Sections: Personal · Community · Professional help · Workspace (professionals) · Account · BeHappy team (staff) |

One navigation model (`usePrimaryNav()` in `features/shell/Sidebar.tsx`) feeds all three, so a screen added once is reachable everywhere. Journal moved from the tab bar into Personal; Today links to Journal, Community and Specialists.

**Tab labels fit any language.** `tabLabelSize()` (`features/shell/TabBar.tsx`) shrinks a label that is longer than its tab, using a per-script glyph width estimate (Georgian/Armenian, CJK, Arabic/Devanagari, Latin/Cyrillic), down to 9 px. Languages also choose short tab words where needed (for example ჯგუფები / ფსიქოლოგი in Georgian).

## Layout

- `Screen` owns safe areas, the pinned top bar and widths: `reading` for forms and lists, full width for the dashboard and directory. At ≥ 1280 px a screen can show an `aside` context panel (status cards on the professional dashboard, the booking card on a profile).
- Chat surfaces (rooms, private threads) dock the composer above the keyboard and keep the newest message in view (`features/chat/ChatKit.tsx`).
- Lists of cards wrap: `flexBasis` + `flexGrow` + **`flexShrink: 1` and `maxWidth: '100%'`** — React Native does not shrink flex items by default, so a 320 px basis would overflow a 320 px phone.
- Right-to-left (Arabic) mirrors the whole layout, including the tab bar and chevrons.

## New components

| Component | File | Use |
|---|---|---|
| `ProAvatar`, `ProCard` | `features/pro/ProParts.tsx` | Photo or initials; a directory card with verified badge, city, experience, focus chips, lowest price |
| `VerifiedBadge`, `VerificationBadge`, `MembershipBadge`, `BookingStatusBadge` | same | One colour language for states: sage = good, gold = needs attention, lavender = trial, muted = waiting, danger = blocked |
| `SlotPicker` | same | Day chips then time chips, in the viewer's time zone |
| `InfoRow` | same | Icon, label, value — appointment and profile facts |
| Room parts, `RoomCard` | `features/community/` | Message bubbles with pseudonym and AI label, reactions, reply quote, held/removed states, composer with Ask Anulia |
| `MoreMenu` | `features/shell/MoreMenu.tsx` | The phone list of everything outside the tab bar |
| `Segmented` | `design/components/Bits.tsx` | Requests / upcoming / past; admin sections |
| `Banner tone="test"` | same | The TEST payment notice (gold, flask icon) |

## State colours and words

| State | Badge | Example |
|---|---|---|
| Verified, confirmed, active | success / sage | "Verified", "Confirmed", "Active" |
| Free trial | lavender | "Free trial" |
| Waiting | muted | "Waiting for confirmation", "Sent: waiting for review", "Not started" |
| Needs attention | gold | "More information needed", "Renew soon", "Last payment didn't go through" |
| Blocked | danger | "Suspended", "Not approved" |

## Writing

- Plain, warm, short. The professional screens address professionals as colleagues; the client screens never use clinical language.
- Explain consequences before actions ("Your profile stays listed until …", "The other side will be told").
- Translate the meaning, not the words: each language keeps its own register (informal "you" in Georgian, Turkish, Spanish, German…; formal in Russian, Armenian, Ukrainian, French, Hindi…) and gender-neutral phrasing where the grammar allows (Arabic, Polish, Hindi).

## Verified sizes

The 3.0 screens were checked at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px (126 screen × width combinations, no overflow) and at 320 px in all 19 languages; see [BEHAPPY_3_TEST_RESULTS.md](BEHAPPY_3_TEST_RESULTS.md).
