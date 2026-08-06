# Card Therapy — New Image Deck: AI Generation Prompts

## Why a rewrite, and what I researched
Real projective-card decks (OH Cards, Points of You, Dixit-in-therapy, SoulCollage, Inner Child
Cards, strength/resource card decks) converge on the same design rules, and the app's **current**
cards violate several of them — worth knowing before generating:
- **Deliberate ambiguity, no obvious single reading.** OH Cards and Points of You are chosen
  specifically because they have *no direct connection* to any one theme — that's what forces
  projection instead of literal reading.
- **No text on the card face.**
- **Painterly/illustrative, not photorealistic.** AI-generated photoreal human faces are the
  biggest failure mode (uncanny eyes/hands, mismatched detail) — real decks and the research both
  point to abstract or illustrative styles instead.
- **Human figures minimized or abstracted** — distant, silhouetted, or absent. This avoids the
  uncanny-face problem, avoids AI's well-documented ethnic/gender representation bias, *and* is
  more therapeutically sound — a close-up identifiable face pulls the viewer into reading *that
  person's* expression instead of projecting their own feeling.
- **One consistent art style across the whole deck.** This is the biggest thing your current set
  gets wrong: `emotions/card1.jpg` is cosmic painterly surrealism, `narrative/1.jpg` is a gritty
  realistic photo of a sad teenager on a bench — a real deck reads as one object, not five
  unrelated image searches.
- **Category-specific imagery patterns** confirmed by real decks: emotion cards work better as
  pure abstract color/shape/atmosphere (per Lindsay Braman's Resonance Deck) than literal facial
  expressions; resource cards lean on nature/light/path/threshold symbolism; polarity decks pair
  opposite-valence imagery built from the *same* motif (open/closed door, calm/stormy sky);
  inner-child/narrative decks use mythic-fairytale imagery, not literal autobiographical photos.
- **Safety:** no depicted wounds, blood, weapons, nooses/hanging, restraint, extreme thinness, or
  menacing figures looming over a small one. Darkness/storm/shadow is fine as *symbolic*
  difficulty, not literal violence — this is reflected in every "difficult pole" prompt below.

## One consistent style for the whole deck
Every prompt below ends with this exact style suffix — **do not vary it** between cards. This is
what makes the deck read as one professional object instead of a grab-bag:

> *Painterly gouache-and-ink illustration, soft diffused light, visible textured paper grain,
> muted warm-and-cool palette, no photorealism, no text or watermark, no legible human faces —
> any human figure shown only as distant, silhouetted, or faceless — single clear focal point,
> dreamlike and symbolic rather than literal, square composition, therapeutic card-deck
> illustration style.*

**Technical notes:** generate at 1:1 (square), at least 1024×1024 — matches every existing card
file. Any tool works (Midjourney, DALL·E 3, Stable Diffusion, Flux) since prompts below are
written in plain language, not tool-specific syntax. Generate a few variants per card and pick
the one that feels most ambiguous (not the most literal) — that's the whole point of this kind of
image.

## Where each file goes — exact filenames, zero code changes needed
These map 1:1 onto the filenames the app already `require()`s, so dropping generated images into
these exact paths (overwriting what's there) is the entire integration — no code edit required:
- Emotion cards → `assets/cards/emotions/card1.jpg` … `card21.jpg`
- Resource cards → `assets/cards/resources/card1.jpg` … `card21.jpg`
- Mood (positive/negative, one deck of 20, client picks two) → `assets/cards/positivenegative/1.jpg` … `20.jpg`
- Narrative / inner child → `assets/cards/narrative/1.jpg` … `21.jpg`

**One thing worth flagging, not fixing yet:** `app/screens/cards/index.tsx` currently links to
*two* "Mood Cards" entries (`positivenegative` and `positivenegative2`, the latter pointing at the
old generic top-level `assets/cards/card1-20.png` files) — looks like a leftover duplicate from
earlier development, not an intentional second card type (`cardTherapyService.ts`'s `CardContext`
only recognizes 4 types: emotion, resource, positive_negative, narrative). I didn't touch this —
tell me if you want the duplicate entry removed once the new deck is in.

---

## 1. Emotion Cards (21) — `assets/cards/emotions/`
Abstract, atmosphere-and-color driven — not literal faces. Each is composition + color + motion
that *evokes* the feeling without naming or depicting it directly.

1. **card1.jpg — Heaviness/sadness**: A single bent grey-blue reed under a low, thick indigo sky pressing close to the horizon, everything slightly waterlogged and still.
2. **card2.jpg — Anxiety**: Sharp, thin jagged lines of pale yellow-white lightning scattered across a tight, claustrophobic dark grey composition, nothing resolving into a shape.
3. **card3.jpg — Anger**: A cracked field of deep red-orange, heat shimmering upward in jagged black fracture-lines splitting the ground.
4. **card4.jpg — Joy**: Loose scattered bursts of warm yellow and coral light rising and swirling upward like released confetti against a soft pale sky.
5. **card5.jpg — Calm**: A flat, glassy lake at dawn reflecting soft lavender-grey sky, one still ripple, nothing else moving.
6. **card6.jpg — Loneliness**: One small dark island of rock in a vast pale grey-blue empty sea, no shore in sight.
7. **card7.jpg — Hope**: A single thin beam of warm gold light breaking through a wall of dense blue-grey cloud.
8. **card8.jpg — Shame**: A small dark curled shape shrinking into the bottom corner of a large, cold, pale-lit empty room, mostly negative space.
9. **card9.jpg — Love/warmth**: Two soft overlapping circles of warm rose and amber light blending into each other against a dusk-blue background.
10. **card10.jpg — Confusion**: A thick swirling grey-white fog with faint half-formed shapes dissolving before they resolve.
11. **card11.jpg — Relief**: A tightly wound spiral of dark blue-grey unraveling outward into loose pale ribbons of light.
12. **card12.jpg — Grief**: A single bare dark tree standing in a wide field of soft ash-grey, one pale leaf falling.
13. **card13.jpg — Courage**: A narrow path of warm light cutting straight through a dense, dark blue-black forest silhouette.
14. **card14.jpg — Overwhelm**: Too many overlapping translucent layers of deep blue and violet water, as if seen from just below the surface, light barely reaching through.
15. **card15.jpg — Contentment**: A soft, evenly lit field of warm wheat-gold under a wide pale sky, nothing urgent, everything settled.
16. **card16.jpg — Longing**: A single warm-lit window seen from far across a cold dark blue field at night.
17. **card17.jpg — Pride**: A tall, solitary sunflower-gold form standing above a low field of muted green, catching the only direct light.
18. **card18.jpg — Fear**: A narrow gap of pale light between two towering dark shapes pressing in from either side, vanishing point unclear.
19. **card19.jpg — Gratitude**: An open cupped shape of warm golden light overflowing gently at the edges against a soft dusk background.
20. **card20.jpg — Emptiness**: A vast, flat, pale off-white expanse with one small grey shape near the very edge of the frame, mostly negative space.
21. **card21.jpg — Anticipation**: A figure-absent threshold — a doorway of warm light opening onto an unseen space beyond, curtain caught mid-motion.

## 2. Resource Cards (21) — `assets/cards/resources/`
Inner strengths and resources — nature, light, paths, thresholds, growing things. Symbolic of the
quality, not a literal illustration of it.

1. **card1.jpg — Resilience**: A single wind-bent tree on a cliff edge, roots visibly gripping into rock, branches curved but unbroken.
2. **card2.jpg — Inner calm**: Still, dark water perfectly reflecting a soft pale moon, not a ripple.
3. **card3.jpg — Courage**: One lit lantern sitting at the mouth of a dark, dense forest path.
4. **card4.jpg — Connection**: Two tree roots visibly intertwining beneath the soil, rendered in warm earth-tones, cross-section view.
5. **card5.jpg — Clarity**: Morning mist parting to reveal one clear, sharp mountain peak against soft sky.
6. **card6.jpg — Creativity**: A single seed cracking open with a small burst of multicolored light spilling out.
7. **card7.jpg — Patience**: A thin green shoot growing up through a crack in solid grey stone.
8. **card8.jpg — Self-compassion**: Two softly rendered hands (distant, faceless figure, warm light) cupped gently around a small glowing light.
9. **card9.jpg — Endurance**: A single mountain peak standing steady through a swirl of storm cloud around its base, summit clear.
10. **card10.jpg — Hope**: One bright star visible through a small break in heavy cloud cover.
11. **card11.jpg — Healthy boundaries**: A softly lit doorway with a translucent curtain of light marking the threshold, warm inside, cool outside.
12. **card12.jpg — Playfulness**: Loose, bright ribbons of color drifting and looping through open air like kite-tails, nothing else in frame.
13. **card13.jpg — Wisdom**: An old, wide tree shown mostly as roots, deep and calm, sky barely visible above.
14. **card14.jpg — Trust**: A simple wooden bridge disappearing into soft mist on both ends, spanning an unseen gap.
15. **card15.jpg — Renewal**: New green shoots emerging from dark, scorched earth, one shaft of light on the new growth.
16. **card16.jpg — Groundedness**: A cross-section view of a single tree's roots reaching deep and wide into warm earth tones, calm and still.
17. **card17.jpg — Freedom**: A length of pale fabric caught mid-flight in open wind against a wide, empty sky.
18. **card18.jpg — Community**: A cluster of small warm lanterns floating together on dark water, light overlapping between them.
19. **card19.jpg — Self-worth**: One fully bloomed flower standing alone in direct light, in an otherwise soft, muted field.
20. **card20.jpg — Adaptability**: Clear water flowing smoothly around a cluster of solid stones, unbroken movement.
21. **card21.jpg — Inner light**: A single lantern glowing steadily at the center of an otherwise dark, quiet room.

## 3. Mood Cards — Positive/Negative (20, one deck, client picks two) — `assets/cards/positivenegative/`
Ten paired themes, each pair built from the *same* motif at its difficult pole and its hopeful
pole — so any two cards drawn together read as a meaningful contrast, per how real polarity decks
work. Numbered consecutively as pairs for your reference; shuffle order doesn't matter for the app.

1. **1.jpg — Storm** *(difficult)*: A heavy dark storm cloud filling most of the frame, one distant flash of lightning, no ground visible.
2. **2.jpg — Clearing sky** *(hopeful)*: The same storm cloud breaking apart, warm sunlight pouring through the gap.
3. **3.jpg — Closed door** *(difficult)*: A heavy, weathered wooden door shut tight, dim cold light around its edges.
4. **4.jpg — Open door**: *(hopeful)*: The same style of door standing open, warm gold light and soft space visible beyond.
5. **5.jpg — Withered branch** *(difficult)*: A single bare, leafless branch against a flat grey sky.
6. **6.jpg — Branch in bloom** *(hopeful)*: The same branch shape, now covered in soft pale blossoms, warm light.
7. **7.jpg — Cracked vessel** *(difficult)*: A simple clay vessel with a visible crack, contents spilled and dark on the ground beside it.
8. **8.jpg — Overflowing vessel** *(hopeful)*: The same vessel shape, whole, overflowing gently with warm golden light.
9. **9.jpg — Tangled thorns** *(difficult)*: A dense tangle of dark thorned vines blocking a narrow path.
10. **10.jpg — Open meadow path** *(hopeful)*: A clear, soft path through an open sunlit meadow, no obstruction.
11. **11.jpg — Small figure in shadow** *(difficult)*: A small, distant, faceless silhouette curled low in a large cold shadow.
12. **12.jpg — Figure standing in light** *(hopeful)*: The same small distant silhouette, standing upright in a warm pool of light.
13. **13.jpg — Knotted rope** *(difficult)*: A tightly knotted coil of dark rope resting on bare ground (object only, no body/restraint context).
14. **14.jpg — Unraveling ribbons** *(hopeful)*: The same rope unraveling into loose, pale, flowing ribbons caught in light wind.
15. **15.jpg — Murky water** *(difficult)*: Still, murky, opaque dark green water with no reflection or visible bottom.
16. **16.jpg — Clear stream** *(hopeful)*: A clear, softly flowing stream over pale stones, light visible through the water.
17. **17.jpg — Cracked dry earth** *(difficult)*: Flat, cracked, sun-dried earth extending to the horizon, no growth.
18. **18.jpg — New growth** *(hopeful)*: The same dry earth with a few small bright green shoots breaking through.
19. **19.jpg — Heavy fog** *(difficult)*: Dense grey-white fog obscuring everything beyond a few feet, no horizon visible.
20. **20.jpg — Fog lifting** *(hopeful)*: The same fog thinning and lifting, a clear warm horizon just becoming visible.

## 4. Narrative / Inner Child Cards (21) — `assets/cards/narrative/`
Mythic, fairy-tale-toned, story-evoking — replacing the current literal/photographic style
entirely. Figures kept distant/silhouetted/absent per safety guidance.

1. **1.jpg**: A small silhouette standing at a forest's edge, a doorway of warm light opening in the trees ahead.
2. **2.jpg**: A single small lantern floating gently down a quiet river at dusk.
3. **3.jpg**: A bird's nest cradling one pale egg, high in a bare branch against a soft dawn sky.
4. **4.jpg**: A worn stone path winding upward into soft mist-covered mountains.
5. **5.jpg**: A small wooden boat adrift on calm water beneath a vast, star-filled sky.
6. **6.jpg**: An open book with a single feather resting on its blank pages, warm light streaming across.
7. **7.jpg**: A young sapling growing beside the fallen trunk of a great, ancient tree.
8. **8.jpg**: A single lit candle in the window of a small house, seen from a dark snowy distance.
9. **9.jpg**: A pair of small footprints in untouched snow, leading toward a warm distant light.
10. **10.jpg**: A butterfly emerging from a chrysalis caught in a shaft of golden late-day light.
11. **11.jpg**: An old brass key resting on moss-covered stone beside a closed, overgrown garden gate.
12. **12.jpg**: A distant silhouetted fox standing at a bend in a forest path, looking back, as if leading the way.
13. **13.jpg**: A cracked eggshell on dark soil, soft light spilling out from within.
14. **14.jpg**: A small treehouse nestled high in old branches, a rope ladder hanging down into shadow.
15. **15.jpg**: A single paper boat caught in a swirl of a fast stream, moving toward calmer, sunlit water ahead.
16. **16.jpg**: A field of tall pale grass with one bright wildflower standing above the rest.
17. **17.jpg**: A small worn, patched fabric shape (quilt or toy-like form) stitched from both starlit and shadowed patterns.
18. **18.jpg**: A lighthouse on a distant cliff, its beam sweeping slowly over dark night water.
19. **19.jpg**: A hand-shaped cluster of stars arranged gently over a small sleeping village below.
20. **20.jpg**: A single swing hanging still in an overgrown garden, warm late-afternoon light through the leaves.
21. **21.jpg**: A wide meadow gate standing alone with no fence beside it, a path leading through toward sunrise.

---

## When you've generated and dropped the images in
Tell me and I'll open `/screens/cards` and run through all four sessions end-to-end (select →
reflect → close) the same way I tested the AI chat sessions, to confirm everything renders
correctly and nothing broke.
