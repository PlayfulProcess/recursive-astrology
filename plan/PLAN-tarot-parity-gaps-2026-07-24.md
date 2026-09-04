# Tarot → Astrology UI parity — gap analysis (2026-07-24)

Code-level comparison of `recursive-tarot` (reference, read-only) against
`recursive-astrology` (this repo). Both are static-viewer sites reading their own
grammar JSON, so "feature parity" was checked by reading the actual viewer HTML/JS in
both repos, not by browsing the live sites. Ranked by (value × how likely the builder
will actually reach for it) ÷ effort. **Headline finding: this repo already ported far
more of the tarot UI than expected** — most of what looked like a gap from the file
list turned out to be already adapted (often improved, sometimes exceeded). The real,
still-open gaps are short and are listed first.

## 0. Already at parity (don't rebuild — noted so the next session doesn't re-derive)

- **Card hover preview** — `viewers/explorer.html` in both repos carries the identical
  floating large-preview-on-hover block (`#hovprev`). Ported verbatim.
- **Views dropdown / site-header pattern** — `site-header.js` here is an explicit port
  of `recursive-tarot/site-header.js` (same dropdown hover/gap fix, commit 84934e6
  credited in the file's own header comment), adapted with this repo's own menu items.
- **Genealogy** — tarot's `genealogy.html` is a force-directed Cytoscape.js graph (an
  external CDN dependency). This repo's `genealogy.html` was **not a straight port**: a
  previous session reimplemented it as a vertical CSS/SVG tree with **zero external
  dependencies**, reading `historiographies-of-astrology`'s own view items. Arguably
  ahead of the source, and it already honors this repo's "no new external dependency"
  rule that a Cytoscape port would have violated.
- **Course-assistant AI chat** (`course/course-assistant.js`) — ported near verbatim
  from tarot's `viewers/course-assistant.js` (same flow.recursive.eco cross-subdomain
  credit-billed chat pattern).
- **The Caster (as a concept)** — tarot's `viewers/caster.html` is actually a dead
  redirect stub to `caster-studio.html` (the real tool); this repo's `wheel.html` +
  `viewer/astrology-viewer.html` are astro's own answer to "a casting surface," and in
  one respect exceed the source: `astrology-viewer.html` computes a **real natal chart**
  (an actual ephemeris), which tarot's card-drawing Caster has no equivalent of.
- **"One entity, every voice" comparison** — turns out this repo already had
  `viewers/lenses.html`, a 5-view power-tool (Ribbon / Synopsis / Small multiples /
  Matrix / Reader) that computes cross-grammar comparison **live**, across every voice
  grammar, with a deep-link (`?card=saturn`) and a grammar-picker that highlights which
  grammars actually cover the current entity. This is an **astro-original invention**
  (tarot has no equivalent file) — tarot solves the "same card, many decks" problem
  differently, via a precomputed meta-grammar (`tarot/all-decks-many-lenses`) browsed
  through `explorer.html`'s pivot table. `lenses.html` is a legitimate, already-shipped
  answer to "see a planet across every tradition" — see §1 for why Part 2 still built a
  second, complementary page rather than calling this gap fully closed.

## 1. [BUILT THIS SESSION] A curated "one symbol, every voice" reading page

**What tarot has:** no direct equivalent — tarot's nearest pattern is the *precomputed*
meta-grammar (`tarot/all-decks-many-lenses/grammar.json`, built by
`scripts/build_meta_grammar.py`) browsed as a plain grammar through `viewers/cards.html`
or pivoted through `viewers/explorer.html`'s Sections mode.

**What astro had:** `grammars/astro-of-all-astros/grammar.json` — the exact same
precomputed-meta-grammar pattern (31 items: 7 planets/12 signs/12 houses, each carrying
every voice's own text) — existed but had **no dedicated reading page**. The only way
to browse it was generically through `viewers/cards.html?src=…/astro-of-all-astros/…`
(a plain card list — no symbol picker, no per-voice attribution, no creed banner) or the
power-user `lenses.html` (accurate but built for pivoting/exploring, not a plain,
inviting read: a `<select>` dropdown rather than a picker of symbols, no creed banner,
column layout rather than collapsible attributed cards).

**Why it was still worth building, given `lenses.html` already existed:** the builder's
ask was specifically for *"good UI"* — a grid/wheel of symbols to pick from, the creed
shown as the standing container, per-voice attribution, collapsible cards — a plain
*reading* experience, not a pivot tool. `lenses.html` remains the right tool for
cross-referencing/pivoting; the new page is the front door for just reading one symbol.

**Built:** `viewers/all-astros.html` — fetches `grammars/astro-of-all-astros/grammar.json`
directly (no live cross-grammar computation), renders a category-tabbed grid of 31
symbol tiles (planet/zodiac glyphs, house numbers in roman numerals — all already
present as each item's own `symbol` field, not invented in the page), the creed as a
persistent banner above the reading pane, and one collapsible `<details>` card per voice
(clearly labelled: "Ptolemy (Tetrabiblos)", "Lilly (1647)", etc., each linking out to
that voice's full grammar in Cards), with Prev/Next and a `?item=<id>` deep link.
Wired into `site-header.js`'s Views → "Across the collection" group, version-bumped
(`?v=45` → `?v=46`) across all 13 pages that include the header, per the family's
cache-busting convention. Also extended `scripts/build_meta_astro.py` to (a) fold in
`grammars/dignities-rulerships` as a seventh voice — its "The record — Raphael…" /
"…Sepharial…" primary-source sections were sitting unused, never wired into the meta;
now they are — and (b) carry each entity's own `symbol` glyph (previously hardcoded for
planets only, signs/houses had none) straight from `western-astrology-canonical`'s own
`symbol` field, so the picker's grid needed no invented iconography. `python
check.py` still ends "OK: all checks passed (22 grammars)" after both script changes and
a full rebuild of `astro-of-all-astros` + `_collection.json`.

**Effort:** spent — ~1 session (this one). **Data support:** full; no new research or
citation was needed, only re-plumbing text that already existed in the repo.

## 2. Interactive casting / spread-builder surface

**What tarot has:** `viewers/caster-studio.html` — build a custom spread layout, cast it
(draw), send the result, import/export via a `?spread=<preset|base64>` URL param. One
consolidated tool (the old separate Caster + Spread Builder were merged into it).

**What astro has instead:** `wheel.html` (a static, click-through twelve-house frame —
no drawing, no custom spread authoring, no share-by-URL) and the three casting grammars
(`casting-big-three`, `casting-twelve-houses`, `casting-single-aspect`) whose positions
always resolve to the querent's *own* chart rather than a random draw — a deliberate,
already-documented design choice (see `plan/HANDOVER-next-session.md`), not an oversight.
`viewer/astrology-viewer.html` (the one page exempted from the "no app code" rule per
`CLAUDE.md`) is the real ephemeris-backed chart calculator — more capable than tarot's
Caster in the one dimension that matters most for astrology (an actual, not drawn,
chart), but it doesn't yet expose a spread-builder-style *casting UI* on top of that
data.

**The gap:** no equivalent of "build your own layout of positions and cast it" as an
interactive, shareable surface. This is not a surprise gap — it is already named and
sequenced in `plan/REPLAN-THE-OBSERVATORY-2026-07.md` §4 as **Phase D** ("playful
casting — sky-shaped spreads on existing machinery, honestly labeled") and **Phase E**
("charts as emergences — ephemeris; app-shaped; after D proves appetite").

**Effort:** large — 3–5+ sessions (chart-wheel interaction design + ephemeris wiring +
share/import-export). **Data support:** partial — the three casting grammars exist;
the ephemeris/chart-calc plumbing exists in `viewer/astrology-viewer.html` but isn't yet
exposed as a generic "cast a custom layout" tool.

## 3. Generic "any grammar as a course" viewer

**What tarot has:** `viewers/grammar-course.html` — takes `?src=<any grammar.json>` and
an optional `?group=<metadata field>`, and renders **any** grammar as a readable,
chaptered course (each item → a section, grouped by a metadata field if given) — the
proof that "a grammar can BE a course," reusable on grammars that were never authored as
courses.

**What astro has instead:** `pages/course-viewer.html` takes `?course=<slug>` and looks
up a **per-course manifest** (`course/*.json` presumably) — it's built for the three
authored courses (History of Astrology, The Right Size, Three Doors), not for turning an
arbitrary grammar (e.g. `dignities-rulerships`, `historiographies-of-astrology`) into a
readable course on demand without first authoring a manifest for it.

**Effort:** small–medium — ~1 session (mostly plumbing: accept `?src=` as a fallback
that reads `items[].name`/`.sections` directly, same rendering CSS already exists).
**Data support:** full — every grammar already has the shape this needs (`items` with
`name`/`sections`); no new content required.

## 4. Course-embeds (interactive widgets inside course prose)

**What tarot has:** `viewers/course-embeds.css` / `.js` — lets an MDX course drop in
quizzes/small interactive widgets inline.

**What astro has:** nothing equivalent; none of the three existing course pages
currently reference or need one.

**Effort:** small, but **speculative** — no current course content asks for this.
Lowest priority; revisit only if a course draft actually needs an embed.

## 5. Tarot-specific mechanics with no clear astro analogue (probably N/A, not a gap)

- `viewers/sequence.html` / `sequence-v2.html` — a card-reading-as-game sequencing UI.
  No astro equivalent, and no obvious need for one (astro's castings are chart-reflection,
  not a drawn sequence of cards).
- `viewers/perform.html` — audio/narration ("performance") playback, paired with the
  parent platform's karaoke/TTS pipeline. `CLAUDE.md`'s "no images" stance and the
  absence of any audio pipeline in this repo suggest this is out of scope, not a gap.
- Root `deck.html` (a single-deck template page) — functionally superseded here by
  `viewers/cards.html?src=…`, which every nav link and grammar-menu entry already uses.
  Not worth a dedicated page.

## Summary table

| # | Gap | Tarot reference | Astro effort | Data ready? |
|---|-----|-----------------|--------------|--------------|
| 1 | "One symbol, every voice" reading page | (astro's own precomputed-meta pattern) | **Done this session** | Yes |
| 2 | Interactive spread-builder / casting UI | `viewers/caster-studio.html` | Large (3–5+ sessions) | Partial — ephemeris wiring incomplete |
| 3 | Generic any-grammar-as-course viewer | `viewers/grammar-course.html` | Small–medium (~1 session) | Yes |
| 4 | Course-embeds (quizzes in prose) | `viewers/course-embeds.js/css` | Small, but speculative | N/A yet |
| 5 | Sequence / Perform (game & audio) | `viewers/sequence*.html`, `perform.html` | N/A — likely out of scope | N/A |
