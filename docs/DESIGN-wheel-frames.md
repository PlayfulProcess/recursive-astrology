# Design — Wheel Frames (the astro repo's own instrument)

Builder's design (Jul 2026), superseding the flow-app "AstroCaster/Frame" experiment —
which is being REMOVED from recursive-eco per the same ruling.

## The architecture ruling (applies family-wide)

> **The flow app is the minimum common denominator. The open-source repo is where
> individuality comes to life — like private and public life.** Once a pattern matures it may
> migrate back into flow (as tarot spreads did), but the frames belong HERE, with a UI that is
> fairly flexible, in the astro repo. Flow keeps chart data + aspects + AI journaling, plus the
> **embedded wheel iframe served FROM this site** (builder correction, Jul 8 2026: the wheel
> stays embedded in flow **because the AI reads the wheel image** — `requestChartImage` hands a
> screenshot to the assistant as visual context; flow fetches the UI from this open-source repo,
> it never reimplements it). What flow does NOT get is the frame instrument below.

## Frames are hardcoded UI, not grammars

The earlier casting-* spread-grammars approach is retired for astro. The frames (All Houses,
the Big Three, One Aspect, …) are **hardcoded modes of the wheel UI**:

- The wheel renders with **highlightings** showing what the current frame selects
  (e.g. All Houses frame → the twelve house sectors glow; Big Three → Sun, Moon, Ascendant).
- **Hover/tap a highlighted element** (Taurus, House 1, Mars…) → its meaning appears.
- **Below the wheel, all highlighted meanings render STACKED** — and, exactly like the tarot
  cards viewer, the reader can stack MULTIPLE voice grammars at once: several Mars entries
  together, several Taurus together (Ptolemy + Lilly + Jyotiṣa + Leo + myths), the same
  multi-voice stacking the lenses view already does, applied to a framed chart.

## Save as grammar — two steps, two scopes

Like save-a-spread / save-a-cast in tarot, but with an explicit two-step choice:

1. **Scope**: save ONE item (this highlighted placement + its stacked meanings) or the WHOLE
   framed reading (e.g. all twelve houses with every attached meaning).
2. **Destination**: a NEW grammar, or into an EXISTING one (search picker — the app's
   Add-Reading-to-Grammar pattern).

A saved frame is a real grammar. Even private, it can then be LOADED BACK into this wheel
as a frame source — your own house-meanings driving the highlights.

## The data structure (the part to get right)

When a saved frame draws on multiple source grammars, the export must stay legible to both
the AI and the UI:

- **Base items**: a saved placement copies the entity item(s) with their matcher keys
  (`category` planet/sign/house + `metadata.planet/sign/house`) and records provenance in
  `metadata.source_grammars: [{uuid, name, item_id}]` — sources as METADATA.
- **Emergences**: "What does House 1 in Taurus mean?" is a genuine EMERGENCE — a new item
  `composite_of: [house-1-ref, sign-taurus-ref]` (the kali↔paradevi machinery), carrying the
  reader's own synthesis text plus the provenance of both parents. The UI (and the AI) must
  read BOTH base items and emergences: an emergence renders stacked beneath its parents when
  its parents are on the wheel.
- **Publishing + resolution**: a frame grammar published to this channel lets others build on
  it — but an emergence only fully POPULATES for a reader who also has the base grammars it
  references (resolution by item keys + source UUIDs). Unresolved parents render honestly:
  the emergence's own text always shows; the missing parent shows as a named gap with a link
  to the source grammar, never silently dropped. This is the recursive-public shape: my
  synthesis is usable alone, and richer inside the commons that produced it.

## What flow keeps (minimum common denominator)

Birth-data entry, the aspects/placements list, Select-for-AI-context, the placement detail +
Interpret-with-AI, save-reading — the journaling loop. The wheel itself: the **embedded iframe
of this site's viewer** (astro.recursive.eco), because the AI reads the wheel image
(`requestChartImage`) — plus the "Open Full Viewer ↗" link for the full experience here.
Flow embeds, it never reimplements: the wheel UI has exactly one home, this repo. The frame
instrument (highlightings, stacked meanings, save-as-grammar) stays HERE only; if frames
mature, we revisit what migrates back.

## Order of work (here, not flow)

1. ✅ Frame modes on wheel.html (All Houses first — it's the one the homepage already promises),
   highlight + hover-meaning + stacked meanings below, multi-voice stacking via the existing
   lenses matcher (entity keys). Done — see Round 1 below.
2. Save-as-grammar (two-step scope/destination) writing grammar JSON downloads first;
   publish-loop integration after.
3. Emergence authoring in the stack ("add your reading of House 1 in Taurus" → composite_of).
4. Load-a-frame-grammar-back (private frames as wheel sources).

## Round 1 (Jul 8 2026): the All Houses frame on wheel.html

Built the first frame mode per the order-of-work above, following `archetypal.html`'s
just-fixed "live multi-voice matcher" pattern (`contentBearing()`, `extractEra()`, the
per-entity stack) but keyed on **houses** instead of planets.

- **Frame mechanism**: a `FRAME_MODES` array (`{key, label, hint, selects()}`), rendered as
  pill buttons in a new `.framebar` above the wheel. `selects()` returns which house
  positions (1–12) the frame highlights — for "All Houses" that's all twelve; a future frame
  (Big Three, One Aspect) plugs in as another array entry with its own `selects()`, no
  rewrite needed. "All Houses" is ON by default (matches the homepage's "Frame" card, which
  already promises this); "No frame" restores the exact pre-existing click behavior.
- **Highlight**: framed sectors get `.sector.framed` — `fill:var(--chip,#f1ece1)` (the same
  fallback value this file already used for its own hover state) + `stroke:var(--accent)`.
  No new colour literals; both tokens and the fallback hex already existed in this file.
  Native `<title>` elements give a hover tooltip for free — no extra hover UI was built (see
  "Deviations" below).
- **Tap → every voice**: `findHouseItem()` matches by `id === 'house-N'` (the convention
  every voice grammar with house content already follows) with a `metadata.house` loose-
  equality fallback. `renderHouseVoiceStack()` stacks a `.vcard2` per tradition (era-sorted,
  oldest first — `extractEra()` ported verbatim from `archetypal.html`), an honest "No entry
  for House N in this voice" when a grammar lacks it, and — the specific bug this session's
  archetypal Round 2 had just fixed — `TRADITIONS` starts `null`, never `[]`, so a tap before
  the `grammars/_collection.json` fetch resolves renders a "Loading every voice…" card, never
  a silently blank grid. The stack is appended inside the existing house dialog (below the
  casting position + flagship-set sections that were already there), gated on
  `frameSelects(pos)` so "No frame" mode is byte-identical to the pre-existing dialog.
- **Loading-race refresh**: if a visitor taps a framed house before `TRADITIONS` resolves,
  then the fetch completes while that dialog is still open, `loadTraditions()` rebuilds the
  open dialog's body in place (`buildHouseDialogBody(OPEN_HOUSE)`) rather than leaving the
  stale "Loading…" card stuck until the next click.
- **Found and fixed in passing**: `wheel.html`'s `mdLite()` only handled single-asterisk
  emphasis, not `**bold**`. Harmless before (no house content used double-asterisk markdown),
  but `astro-of-all-astros`'s aggregated house entries do (`**Story:** ...`), so once that
  voice joined the stack its text showed literal asterisks. Ported the `**` rule from
  `archetypal.html`'s `mdLite` (same fix, same reason).
- **Playwright-verified** at 390×844 (headless Chromium, local `python3 -m http.server`):
  wheel renders 12 sectors, all 12 carry `.framed` under the default "All Houses" pill;
  tapping a framed house opens the dialog with 5 stacked voice cards (Ptolemy, Proctor, Alan
  Leo, Astro-of-all-astros, Western Astrology Canonical — the 5 grammars in this repo that
  actually carry `category:"house"` items); toggling to "No frame" removes both the highlight
  and the stack (dialog reverts to the original position + flagship-set-only content);
  toggling back restores it. **Race condition reproduced deterministically** by routing
  `grammars/**` fetches through an artificial 2.5s delay and tapping while `TRADITIONS` was
  still `null`: the dialog showed the honest "Loading every voice…" card, then refreshed
  in-place to the real 5-card stack once the delay-throttled fetch resolved — no blank grid at
  any point. No console/page errors from this page's own code; the only network failures were
  the sandbox's expected blocks on `fonts.googleapis.com` and `recursive.eco`'s assistant
  launcher script (both external, not fetched by this feature).
- **Deviations from spec / left out of scope**: "Hover or tap a highlighted house" is
  satisfied by tap/click (primary, works on both mouse and touch) plus a native `<title>`
  hover tooltip naming the house — a full custom hover-preview popover was not built, to keep
  the dialog (the existing, already-accessible interaction) as the single source of the
  meaning rather than adding a second UI surface that could drift from it. Save-as-grammar and
  emergence-authoring (order-of-work items 2–3) are untouched, per this round's scope.

## Round 2 (Jul 9 2026): the reader picks which grammars stack — `grammar-picker.js`

Builder: *"in the astro viewers I want the flexibility to pull different grammars. we could
recon grammars with houses and render there and highlight the ones for which they populate.
maybe we can multiselect and stack several grammars."* Round 1 stacked EVERY house-bearing
grammar automatically, with no reader control — this round gives the reader the wheel.

- **New shared module, `grammar-picker.js`** (repo root — the same "plain shared `<script>`,
  no bundler" pattern `site-header.js`/`icons.js`/`site-footer.js` already use, since this
  repo has no build step). It owns three things Round 1 had hardcoded inline in `wheel.html`:
  loading `grammars/_collection.json` + every `grammar.json` once, detecting what each
  grammar "has" (`house`/`planet`/`sign` — via `category` OR `metadata.<shape>`, the exact
  same data-shape inference `findHouseItem`/`findPlanetItem` already used, never a
  `document_type` or slug check — see CLAUDE.md's "grammar types are dead code"), and
  rendering the picker UI itself: a chip checklist, live multi-select, `localStorage`-backed
  per-viewer persistence.
- **Highlight, don't hide.** Chips for grammars that populate the current view (`shape:
  'house'` on `wheel.html`) render full-ink and get the "on" highlight treatment when
  selected; chips for grammars that don't are shown de-emphasized (dimmed, italic) but
  never removed from the list — the family's honesty convention (show the gap, don't erase
  it) applied to the picker itself, not just to the per-entity "No entry for House N in this
  voice" cards Round 1 already had.
- **`wheel.html`** now sources `TRADITIONS` from the picker's live selection instead of an
  unconditional "every house-bearing grammar" fetch. Default selection = every house-bearing
  grammar (so a reader who never touches the picker sees the exact same 5-voice stack Round 1
  shipped — no regression), narrowed live from there. The picker's `onChange` also refreshes
  an already-open house dialog in place, reusing Round 1's loading-race refresh path
  (`buildHouseDialogBody(OPEN_HOUSE)`).
- **`viewers/lenses.html`** already had its own working live multi-select (the "Grammars"
  deck panel) from before this round — its gap was purely "highlight which populate the
  current view." Added `currentEntityKey` tracking (resolved from whichever entity-scoped
  lens — Synopsis/Ribbon/Small-multiples — is active; `null` for Matrix/Reader, which aren't
  about one entity) and a `dp-has`/`dp-gap` class in the existing panel, not a second
  picker implementation — `lenses.html`'s data model (a flat `ITEMS` list keyed by
  `cardKey`) doesn't map cleanly onto `grammar-picker.js`'s per-grammar "shapes" concept, so
  reusing the shared module here would have forced an awkward abstraction rather than a
  clean fit; the two pickers share the same *convention* (highlight what populates, dim
  what doesn't, never hide) without sharing code that doesn't actually overlap.
- **`archetypal.html` intentionally untouched.** The builder's request said "viewers"
  generally, but `archetypal.html`'s all-grammars-always-on stacking is its own explicit
  design (see `docs/DESIGN-archetypal.md`) and wasn't called out as broken; `wheel.html` was
  named directly as the safe, clearly-requested target. A picker for `archetypal.html`
  (`shape: 'planet'`) is a natural drop-in with `grammar-picker.js` already built, if a
  future round wants it.
- **Playwright-verified** at 390×844: `wheel.html`'s picker lists all 17 grammars, exactly 5
  highlighted as house-bearing (cross-checked against the page's own loaded data — matched
  exactly); default selection stacks 5 voice cards (byte-identical to Round 1); selecting
  exactly 2 grammars stacks exactly 2 cards; deselecting one and reopening a house shows 1 —
  live, no page reload. `lenses.html`'s highlight for the entity "Saturn" matched the page's
  own `ITEMS` computation exactly (8 of 17 grammars); unchecking one has-Saturn grammar
  live-dropped the Synopsis view from 8 columns to 7, no reload. Found and fixed in passing:
  `lenses.html`'s deck-panel toggle button only flipped the panel's `open` CSS class without
  rebuilding its contents, so opening the panel after picking a new entity showed stale
  (unhighlighted) markup from page load — now rebuilds on open.
