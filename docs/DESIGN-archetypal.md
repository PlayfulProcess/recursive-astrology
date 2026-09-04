# Design — Archetypal Astrology (planetary pairs, after Tarnas)

Builder's direction (Jul 2026), near-verbatim: "Archetypal astrology of Richard Tarnas gets
its own UI (just planets relationships) and a grammar built from the AI's own knowledge that
reads as MY interpretation of it. It will be clear these are not his words but mine. Maybe it
is itself a meta grammar of just the planets over time coming from different grammars — since
his impetus was to find what is common across all traditions, which is why he chose planetary
relationships."

## Why pairs, not signs or houses

Richard Tarnas's whole method (*Cosmos and Psyche*, 2006) starts from an observation about
the *history* of astrology, not a claim about the sky: every tradition that ever read the
stars — Mesopotamian omen-craft, Hellenistic astrology, Jyotiṣa, Renaissance astrology —
disagreed about almost everything (which planet ruled what, which god a planet was, whether
the zodiac was tropical or sidereal) but kept independently reaching for the **same
planet-to-planet relationships** as the load-bearing unit of meaning. That convergence was
his own evidence for archetypal cosmology. So this grammar's subject is the *pair*, not the
planet alone — the UI is "just planets relationships," per the builder's brief.

## The honesty frame — non-negotiable

This grammar is an AI-assisted interpretation of a real author's real, still-in-print
framework — not folklore in the public domain like Ptolemy or Lilly. The frame appears in
three places, verbatim:

1. The grammar's `description` field.
2. A dedicated `_synthesis_note` (longer — also explains the personal-planet-pair honesty
   caveat below) and a short `_honesty_frame` field (the frame text alone, for the UI to
   render without re-deriving it).
3. Rendered directly on `archetypal.html`, in a `.honesty` box near the top of the page —
   not buried in a footer or a tooltip.

Text: *"Inspired by Richard Tarnas's archetypal astrology (Cosmos and Psyche, 2006; The
Passion of the Western Mind). These readings are PlayfulProcess's interpretation, written
with an AI from its knowledge of his work — NOT Tarnas's words, not his endorsement. Go to
the source: https://cosmosandpsyche.com/"* (URL verified findable via WebSearch this
session — the official Tarnas site).

## What's real vs. what's this grammar's own extension

Tarnas's own case studies in *Cosmos and Psyche* track **outer-planet-to-outer-planet
alignments correlated with collective historical periods** (world events, cultural epochs).
The 10 outer/social-planet pairs in this grammar draw on that real material — each "In
history" section is written as "Tarnas correlates..." and sticks to well-established
examples from the book (the 1960s Uranus-Pluto conjunction and civil rights/counterculture;
WWI, WWII, and 9/11 for Saturn-Pluto; the 1989 Soviet collapse and the 2008 financial crisis
for Saturn-Neptune; the Jupiter-Saturn "great conjunction" tradition Kepler and medieval
astrologers used; etc.). Where a specific date or reading is less central to the book's own
argument than its signature examples, the text says so with a confidence caveat, in the same
spirit as this repo's other primary-source grammars — never invented, never smoothed over.

The **5 personal-planet pairs** (Sun–Saturn, Sun–Pluto, Venus–Mars, Moon–Saturn,
Mercury–Uranus) are handled differently and honestly: their cycles (months to a couple of
years) are far too fast to mark collective epochs the way the book's central outer-planet
alignments do, so *Cosmos and Psyche* doesn't treat them as historical case studies. Rather
than manufacture a false "Tarnas correlates..." citation for material the book doesn't
cover, their "In history" sections say this plainly and instead extend Tarnas's archetypal
vocabulary (Sun = core identity, Saturn = structure/limit, etc.) to the personal register —
flagged explicitly as this grammar's own interpretation, not the book's data.

## The data structure — base items, stubs, and the emergence pattern

This build is the first consumer of the cross-grammar emergence pattern from
`docs/DESIGN-wheel-frames.md` ("Base items... records provenance in
`metadata.source_grammars`... Emergences: a new item `composite_of: [...]` carrying the
reader's own synthesis text plus the provenance of both parents"). Concretely, in
`grammars/archetypal-pairs/grammar.json`:

- **3 authored base items** (`planet-uranus`, `planet-neptune`, `planet-pluto`) — real
  content, one "Archetype" section each, because these are the outer planets every
  historical/classical voice grammar in this repo (Ptolemy, Lilly, Jyotiṣa, the Mesopotamian
  omens, and even Planetary Myths) lacks — they predate the telescopic discoveries of 1781 /
  1846 / 1930.
- **7 thin local stubs** (`planet-sun` … `planet-saturn`) — carry `metadata.source_grammars`
  provenance and a single "See also" section pointing at
  `western-astrology-canonical`. These exist **only** so `composite_of` on the pair items
  below resolves to an id in the *same* `items[]` array, per `GRAMMAR_FORMAT.md`'s hard rule
  ("composite_of references must point to IDs that exist in the same items[] array. Broken
  references will fail validation.") and `check.py`'s enforcement of exactly that. No real
  interpretive content is duplicated here — the stub is data-shape plumbing, not a second
  voice. A UI or the AI can tell a stub from a real entry generically: a stub's only section
  key is `"See also"`; anything with more than that is content-bearing. `archetypal.html`
  uses exactly this test (`contentBearing()`) to skip stubs when stacking voices, rather than
  special-casing the `archetypal-pairs` slug.
- **15 pair items** (`category: "archetypal-pair"`) — `composite_of: [planet-a, planet-b]`
  resolving locally per the above, `metadata: { planets: [...], archetype: "...",
  source_grammars: [...] }`, and the three sections (`The complex`, `In history`, `A
  question`) the builder specified.

## The meta layer IS the UI, not a second generator

The brief asked whether a `scripts/build_archetypal_context.py` should inject an "Across the
traditions" section into each pair's parent planet items, mirroring
`scripts/build_meta_astro.py`. **Decision: no — simpler and truer to the emergence design.**
Pair items stay hand-authored (Tarnas's synthesis needs a human/AI author's voice, not a
mechanical aggregation). The meta layer — "the planets, over time, across every tradition
that answered for them" — is instead **live UI behavior**: `archetypal.html` loads
`grammars/_collection.json`, fetches every public astrology grammar, and for each of the two
selected planets renders every *other* grammar's own entry for that planet (matched by
`category === 'planet'` + `metadata.planet`, exactly the matcher `viewers/lenses.html`
already uses). This is the reason `astro-of-all-astros` (the generated meta-voice grammar)
was deliberately **not** extended to source from `archetypal-pairs` — that generator
aggregates per-entity voices into one item; this grammar's "meta" nature is a *pair*
synthesis stacked live over per-entity voices, a different shape that the UI expresses
better than a script would.

## UI: `archetypal.html`

- Follows the family pattern: `theme.css` tokens only (no local colors), `site-header.js`
  mount (`active="archetypal"`, added to `COLLECTION_VIEWS`), `assistant.js` mount,
  `site-footer.js`, the "an interpretation, not a prediction" kicker.
- **Ring**: the 10 planets (Sun…Pluto) evenly spaced on a circle, SVG, mobile-first (viewBox
  `0 0 400 400`, verified readable at a 390px viewport). Labels use a dynamic `text-anchor`
  (start / end / middle by angle) so they don't clip past the SVG edge at the far
  left/right — a real bug caught and fixed during this build (a fixed `text-anchor:middle`
  cut "Mercury" down to "Mercur'" at the ring's right edge).
- **Tap two planets** → a chord line lights up between them (`.chord.on`) and the stage
  below renders: (a) the pair's synthesis card if `archetypal-pairs` has an authored item
  for that exact pair (matched order-independently via `metadata.planets`), or an honest
  `.gapnote` — *"No authored complex yet for X–Y... the parents still speak below"* — if
  not; (b) each planet's own "every voice" stack, oldest tradition first (same era-extraction
  logic as `viewers/lenses.html`).
- **Selecting a third planet** replaces the oldest of the current two (`SELECTED.shift()`) —
  a natural "pick two, then pick a fresh two" gesture, with removable chips as a second way
  to deselect.
- Deep-linkable via `#pair=Saturn,Pluto` in the URL hash.
- **Playwright-verified** at 390×844/900 (this session, headless Chromium): the ring renders
  all 10 circles; tapping Saturn then Pluto produces the authored synthesis title
  ("Saturn–Pluto") plus two "— every voice" headings and 20 voice cards total (10 traditions
  × 2 planets); tapping an unauthored pair (Mars, Neptune) renders the `.gapnote` text
  verbatim. No page errors from the app's own code (the only console errors were the
  sandbox's expected network block on the external Google Fonts / recursive.eco assistant
  requests, not this page's logic).

## Round 2 (Jul 8 2026): single-planet tap, and why the wheel looked broken

Builder report: "the tarnas wheel is not really working... when I click mars, I would like
the synthesis to be tarnas but something like the tarot lenses to pop up — how every grammar
sees it." Two real bugs, one design gap:

1. **A loading-race bug.** `TRADITIONS` started as `[]` (empty array), not `null`. If a
   visitor tapped a planet before the 17-grammar `Promise.all` fetch resolved (very plausible
   on mobile), `renderParentStack()` read the still-empty array and rendered a completely
   empty `.vgrid` — the "— every voice" heading with nothing beneath it, exactly what the
   screenshot showed. Fixed: `TRADITIONS` now starts `null`; `renderParentStack()` renders an
   explicit "Loading every voice…" card while `null`, so the UI can never look silently blank.
   Verified with Playwright: tapping immediately on `domcontentloaded` (before network idle)
   now shows the loading card, then the real content once the fetch settles.
2. **A federation gap in the Jyotiṣa voice**, unrelated to this page but surfaced by it: all
   9 `jyotisha-brihat-jataka` planet items use Sanskrit names ("Sūrya (the Sun)") and carried
   no `metadata.planet` at all, so the matcher (`category === 'planet'` + `metadata.planet`,
   the same one `viewers/lenses.html` uses) could never find them — Jyotiṣa silently dropped
   out of every "every voice" stack site-wide, not just here. Fixed the *grammar*, not the
   matcher (per this project's "fix the grammar, not the app" rule): added
   `metadata.planet: "Sun"` etc. to the 7 graha items with a Western-planet equivalent
   (`graha-surya`→Sun … `graha-sani`→Saturn); left `graha-rahu`/`graha-ketu` (the lunar nodes)
   alone since they have no slot on the 10-planet Western wheel this matcher serves.
3. **The design gap the builder actually asked to close**: tapping *one* planet showed
   nothing — the stage only rendered once two planets were selected. Now `SELECTED.length ===
   1` renders `renderSingleSynthesis(name)` (a new `.synth` box, "The archetype, after
   Tarnas," pulled from that planet's own item in `archetypal-pairs`) directly above that
   planet's existing `renderParentStack(name)` — the "how every grammar sees it" lens stack,
   unchanged. Tapping a second planet still adds the complex-between-them and both stacks, as
   before. This meant the 7 personal-planet items (`planet-sun` … `planet-saturn`), which
   previously carried only a `"See also"` provenance stub, needed real single-planet
   "Archetype" content to make the single-tap experience honest rather than a gap note on
   every ordinary planet tap. Authored 7 short entries (Sun through Saturn) in the same voice
   and length as the existing Uranus/Neptune/Pluto entries, each closing with an explicit
   caveat: Tarnas's own signature method is planetary *pairs* and outer-planet historical
   correlation, so a solo personal-planet portrait draws on the broader archetypal-astrology
   tradition his framework grows from (Rudhyar's humanistic astrology foremost) rather than
   his own direct writing — held as PlayfulProcess's synthesis, same honesty frame as
   everything else on this page. `check.py` still passes on all 17 grammars.

UI copy updated to match (pickhint, empty-state placeholder, "How this works" note all now
describe the one-tap and two-tap behaviors). Playwright-reverified: single-tap Mars shows the
archetype box + "Mars — every voice" with real cards (not the pair section); tapping Saturn
second adds the complex-between-them and "Saturn — every voice"; the race-condition case
(tap before network settles) shows the loading card, never a blank grid.

## Wiring

- `ids.json` — `_public_now` + `ids.archetypal-pairs` (placeholder UUID until this grammar
  is imported to Supabase) + a `preview_links` entry mirroring the existing template.
- `scripts/build_collection.py` — `BRANCH_OF["archetypal-pairs"] = "synthesis"`; re-run to
  regenerate `grammars/_collection.json` (17 grammars, 304 items).
- `site-header.js` — `COLLECTION_VIEWS` gains `['archetypal', 'Archetypal — planet pairs',
  archetypal.html]`; `autoActive()` recognizes the filename; the shared script tag version
  bumped to `?v=45` site-wide so the new menu entry ships everywhere without a stale cache.
- `index.html` — a gallery card in the "Across the collection" group, alongside Timeline /
  Genealogy / Chart Wheel / Chart Viewer.
- `check.py` passes on all 17 grammars, including this one.
