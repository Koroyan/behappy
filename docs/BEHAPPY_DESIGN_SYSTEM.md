# BeHappy 2.0 design system

Source of truth: `design/` (`tokens.ts`, `typography.ts`, `ThemeProvider.tsx`, `useLayout.ts`, `components/`).
Screens use semantic roles and components, never raw hex values or ad-hoc sizes.

## Principles

1. **Calm before clever.** Quiet surfaces, one accent per view, generous space. Nothing blinks, counts down or nags.
2. **Plain, kind words.** Speak to one person. No diagnosis words for app features, no guilt, no streak pressure.
3. **Honest UI.** No fake numbers, no decorative controls, no dark patterns around money. A disabled control explains why.
4. **Safety is always one step away** and never behind a paywall.
5. **Built for every script.** Georgian, Armenian, Cyrillic, Arabic (RTL) and CJK all look intentional, not fallback.

## Color

Palette roles live in `palettes.light` and `palettes.dark`. The brand colors are the foundation:

| Role | Light | Use |
|---|---|---|
| `bg` | `#F7F8F5` ivory | App background |
| `surface` | `#FFFFFF` | Cards, sheets, composer |
| `text` | `#203B37` forest | Body text (more than 11:1 on bg) |
| `textSecondary` | `#4F6661` | Supporting text (5.7:1) |
| `textTertiary` | `#627571` | Metadata only (4.6:1) |
| `brand` | `#4B9388` teal | Icons, rings, illustration. Decorative only (3.6:1). |
| `primary` | `#3A7D73` | Buttons and links. White label passes AA (4.8:1). |
| `sage` / `sageSoft` | `#BBD8CA` / `#E8F2EC` | Calm, body, breathing |
| `peach` / `peachSoft` | `#F2BEAB` / `#FBEDE7` | Creative, art therapy |
| `lavender` / `lavenderSoft` | `#D9D1ED` / `#F1EEF8` | Reflection, cards |
| `gold` / `goldSoft` | `#F4D99F` / `#FBF3DE` | Highlights, gratitude |
| `border` | `#E2E9E4` | Hairlines; most surfaces rely on borders, not shadows |
| `danger` | `#B4483B` | Safety and destructive actions only |

Dark mode starts from `#111E1C` and lifts the accents (`primary` `#7CC2B6`) to keep contrast. Every role has a dark value, so switching themes never needs per-screen code.

Rules:
- Soft tints (`*Soft`) are backgrounds; their `on*Soft` partner is the text color on them.
- Charts use `chart` (5 hues, never red vs green as good vs bad). Mood uses `moodScale`, one teal family from low to high.
- Red appears only for safety and destructive actions, never for "bad mood".

## Typography

Two families per script: a sans for UI and a serif for headings and long reading.

| Script | Sans | Serif |
|---|---|---|
| Latin and Cyrillic | Inter | Lora |
| Georgian | Noto Sans Georgian | Noto Serif Georgian |
| Armenian | Noto Sans Armenian | Noto Serif Armenian |
| Arabic, Hindi, Chinese, Japanese, Korean | System fonts | System fonts |

Scale (`VARIANTS` in `typography.ts`), size in px with the desktop size in brackets:

| Variant | Family | Size | Line height |
|---|---|---|---|
| `display` | serif semibold | 32 (44) | 1.16 |
| `title1` | serif semibold | 27 (32) | 1.2 |
| `title2` | sans semibold | 20 (22) | 1.3 |
| `title3` | sans semibold | 17 (18) | 1.35 |
| `body` / `bodyStrong` | sans | 16 | 1.5 |
| `bodySerif` | serif | 18 (19) | 1.6, for reading |
| `callout` | sans medium | 15 | 1.45 |
| `small` / `smallStrong` | sans | 14 | 1.45 |
| `caption` | sans | 13 | 1.4 |
| `label` | sans semibold | 12, +0.4 tracking | 1.35 |

Georgian and Armenian render at 97% size with +0.08 line height, because their glyphs run wider and taller. Letter-spacing applies only to Latin. Users can scale all text by 100%, 112% or 125% (Profile › Text size).

## Space, radius, elevation, motion

- **Space** (4/8 grid): `space[1]=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64`.
- **Radius**: `xs 8, sm 12, md 14, lg 18, xl 22, xxl 28, pill`. Cards use `lg`/`xl`, the composer `xxl`, chips `pill`.
- **Elevation**: three soft levels, used sparingly (sheets, floating composer). Most surfaces use a 1px border.
- **Motion**: `fast 140ms`, `base 220ms`, `slow 360ms`, `breathe 4s`. When reduced motion is on (OS setting or Profile › Motion), animations become fades or stop.

## Layout

| Width | Layout |
|---|---|
| under 768 | Phone: bottom tab bar (Today, Explore, Anulia, Journal, Profile), 20px gutter (16px under 360) |
| 768 and up | Side rail (84px), 28px gutter |
| 1024 and up | Labelled sidebar (256px), 40px gutter, desktop type sizes |
| 1280 and up | Optional right context panel (340px) |

- Content column: 1080px max; reading width 680px; chat column 820px.
- Minimum touch target 44px.
- `Screen` owns safe areas. On phones the status-bar strip and the top row (back button, actions) stay pinned while content scrolls. The tab bar sits below the scroll area, not over it. Footers carry the bottom inset.
- Chat screens (Anulia, art session, card reflection) are a column: header, scrolling messages, composer docked at the bottom.
- `npm run qa:scroll` checks every route at 9 widths. It fails on page-level scrolling, sideways overflow, content hidden under a bar, or an unpinned back button.

## Components (`design/components/`)

| Component | Notes |
|---|---|
| `Screen` | Page shell: title, back, header actions, width, tab mode, footer, optional context panel |
| `AppText` | All text; picks the right font per script and applies the text-size setting |
| `Button`, `IconButton` | Button: primary, secondary, outline, ghost, quiet, danger. Icon button: ghost, soft, solid, outline; it always needs a label. |
| `Card` | Tones: surface, muted, sunken, primary, sage, peach, lavender, gold, info, danger. Pressable when given `onPress`. |
| `Chip` | Toggle chips (checkbox role) or action chips (`action`, button role). Labels wrap. |
| `Badge`, `Banner`, `EmptyState`, `ListRow`, `SectionHeader`, `Divider` | Status and structure |
| `Toggle`, `Segmented`, `TextField`, `ProgressBar`, `Skeleton`, `Avatar` | Inputs and feedback |
| `Sheet`, `FeedbackProvider` (`useFeedback`: toast, confirm) | Dialogs and confirmations. Destructive confirms use the danger button. |
| `BrandMark`, `BrandLockup`, `AnuliaMark`, `ProgressRing`, `MoodGlyph` | Brand and illustration |
| `features/chat/ChatKit` | `MessageBubble`, `Composer` (one line, grows to 160px), `ChatScroll`, `TypingDots` |

## Accessibility checklist

- Text contrast is AA at least. The decorative `brand` color never carries text.
- Every icon-only control has an accessibility label. Toggles expose checked state.
- Focus ring (`focusRing`) is visible on web keyboard focus.
- Text scaling to 125% must not clip. Test long Georgian and Russian strings, which are often 30–40% longer than English.
- RTL (Arabic): layout mirrors through `start`/`end` paddings and the document `dir`. On native the app asks for a restart.
- Reduced motion is respected everywhere, including the breathing circle.

## Voice and content

- Address the person directly: Georgian «შენ», Russian «вы», Armenian «դուք». Keep each language's register consistent.
- Describe what something is, not what it will fix. "Reflection cards", not "card therapy". "Self-check questionnaires", not "diagnostics".
- Anulia is always "an AI companion". Never "therapist", "doctor" or "psychologist".
- Numbers are what they are: exact prices in GEL, real counts, no invented statistics.
