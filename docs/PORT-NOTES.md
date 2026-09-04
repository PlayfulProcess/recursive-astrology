# PORT-NOTES — porting recursive-tarot's viewers/homepage/header to The Recursive Astrology

*Jul 7 2026. Source of truth: `/workspace/recursive-tarot` (main). Target: this repo (main).
The prime rule: copy tarot's working files and adapt paths/branding/content — do not
rebuild or hand-write parallel versions. This file is the file-by-file record of what
was copied, what was changed, and why — the replication playbook for the next branch
(nara, or whichever comes after astro).*

## 0. What astro already had going in

- `grammars/<slug>/grammar.json` — now **15** grammars (grew from 11 mid-session: a
  concurrent process added `jyotisha-brihat-jataka`, `mesopotamian-omens`,
  `renaissance-lilly` while this port was in progress — see §2, the collection builder
  is glob-driven specifically so this doesn't go stale).
- `ids.json` (repo root) — slug → recursive.eco UUID map + `_public_now` + `preview_links`.
  Tarot's equivalent lives at `tarot/_eco_ids.json` (inside the collection folder); astro's
  is at the repo root. Every ported file that reads the eco-ids map had to point at
  `../ids.json`, not `../grammars/_eco_ids.json` — this is the single most common path
  mistake made and caught during this port (see §4).
- `index.html`, `site-header.js`, `theme.css` — all **replaced** (see §3, §5, §6).
- `genealogy.html`, `wheel.html`, `viewer/astrology-viewer.html` — **kept**, retoned only.
- `lenses.html` (astro's own custom 4-tab lens page) — **renamed** to `lenses-legacy.html`,
  no longer linked from the header (see §7).
- `pages/course.html`, `pages/course-viewer.html`, `course/*.mdx` — untouched; the ported
  header's Courses menu now points at them.

## 1. Collection layer — `scripts/build_collection.py`

New file, ported from `recursive-tarot/scripts/build_tarot_collection.py` +
`refresh_collection.py` (astro doesn't need the "migrate from a sibling repo" step
those two scripts split across, since grammars already live in `grammars/*/grammar.json`
here — one script covers both jobs).

**Schema**: identical to `tarot/_collection.json` (`repo`, `branch`, `github_url`,
`collection`, `name`, `version`, `license`, `original_creator`, `creator_name`,
`meta_grammar`, `branches[]`, `grammars[]` with `slug/name/type/branch/is_meta/
default_preview/items/cover_image_url/blurb/path/provenance/year/year_label`) — only the
root path differs (`grammars/` here vs `tarot/` there).

**What had to be invented, not copied** (tarot's decks are literal historical objects
with real creation dates and a genealogy; astro's grammars are independent voice
libraries/castings/readings with none of that structure):

- **Branches** (4, replacing tarot's 6 lineage branches): `primary-sources` (the dated
  voice libraries — Ptolemy, Alan Leo, Proctor, the Vedic/Mesopotamian/Renaissance
  additions), `synthesis` (historiographies, the flagship interpretation set, planetary
  myths, the Trika lens), `castings` (the three spread-grammars), `readings` (The Right
  Size, Three Doors). Curated in a `BRANCH_OF` dict, **not load-bearing** — any grammar
  not listed still appears in the collection (defaults to `synthesis`, no year), so a
  new grammar dropped into `grammars/` never silently disappears from any view.
- **Years** — only assigned where there's a genuine historical anchor: Mesopotamian
  omen-craft (~1000 BCE, using a negative sort year), Ptolemy (~150 CE, Ashmand tr. 1822),
  the Bṛhat Jātaka (~550 CE, 1885 tr.), William Lilly (1647), Proctor (1896), Alan Leo
  (~1900). Everything else (castings, readings, the flagship synthesis) is honestly
  undated (`provenance: "living"`) rather than assigned a fabricated date — this mirrors
  how tarot separates "historical decks" from "Contemporary decks" on its own homepage.
- **`meta_grammar`**: set to `historiographies-of-astrology` (the closest analogue to
  tarot's `tree-of-tarot` — a survey grammar, not a technical aggregation of the others,
  so `is_meta` stays `false` for every entry; nothing gets excluded from card/lens/list
  views the way tarot excludes its literal meta-grammar).

Run: `python3 scripts/build_collection.py` → writes `grammars/_collection.json`.
Re-run any time a grammar is added/removed (idempotent, glob-driven — ran twice during
this session as new grammars landed mid-port, both times correctly).

## 2. Viewers — `viewers/cards.html`, `explorer.html`, `lenses.html`, `tree-viewer.html`, `timeline.html`

Source → dest, all from `recursive-tarot/viewers/`:

| Source | Dest | Notes |
|---|---|---|
| `viewers/cards.html` | `viewers/cards.html` | Copied near-verbatim (5861 lines) |
| `viewers/explorer.html` | `viewers/explorer.html` | Copied, presets rewritten (§2c) |
| `viewers/prototypes/lenses.html` | `viewers/lenses.html` | **Rewritten**, not just copied (§2d) — moved one directory shallower (was 2 levels deep under `viewers/prototypes/`, astro has no `prototypes/` subfolder) |
| `viewers/tree-viewer.html` | `viewers/tree-viewer.html` | Copied near-verbatim |
| `viewers/timeline.html` | `viewers/timeline.html` | **Rewritten** data-loading (§2e) |
| `viewers/dimension-engine.js` | `viewers/dimension-engine.js` | Copied verbatim — already grammar-agnostic, zero tarot-specific names |
| `viewers/grammar-loader.js` | `viewers/grammar-loader.js` | Copied verbatim — generic Supabase/GitHub loader, no path changes needed |
| `viewers/deck-picker.js` | `viewers/deck-picker.js` | Copied, retoned + "decks"→"grammars" copy |
| `viewers/eco-links.js` | `viewers/eco-links.js` | Copied, path fixed (`tarot/_eco_ids.json` → `ids.json`), retoned |
| `icons.js` (repo root) | `icons.js` | Copied verbatim — small, self-contained SVG icon library so `<rt-icon>` tags actually render (worth the ~2 KB rather than leaving them inert) |
| `view-switcher.js` (repo root) | `view-switcher.js` | Copied — mostly **dead code upstream too** (the component self-hides; only its `?lens=` redirect logic runs). View list updated to astro's actual pages, retoned |

**Mechanical substitutions applied to every ported viewer** (sed, then hand-verified):

- `../tarot/_collection.json` → `../grammars/_collection.json`
- `../tarot/_eco_ids.json` → `../ids.json` (different repo path shape — see §0)
- `tarot/${slug}/grammar.json` template literals → `grammars/${slug}/grammar.json`
- the regex `/tarot\/([^/]+)\/grammar\.json/` (cards.html's slug-from-URL parser) → `/grammars\/([^/]+)\/grammar\.json/`
- `../tarot/all-decks-many-lenses/grammar.json` / `../tarot/tree-of-tarot/grammar.json`
  (tarot's "load this when nothing else is specified" defaults) → `../grammars/historiographies-of-astrology/grammar.json`
  (the closest astro analogue — a survey grammar, not a hand-built meta-grammar; astro has
  no equivalent all-in-one file, so this default is honestly a *different kind* of
  fallback, not a straight swap)
- `The Recursive Tarot` / `Recursive Tarot` → `The Recursive Astrology` / `Recursive Astrology`
- `tarot.recursive.eco` → `astro.recursive.eco`
- `PlayfulProcess/recursive-tarot` → `PlayfulProcess/Recursive-astrology` (note the
  capitalization — confirmed against `recursive-eco.json`'s own repo self-reference)
- Colors: `#9a7322`→`#2f5d8a`, `#7c5b18`/`#8a6414`→`#1f4468`, `#c4ad7a`→`#a9c2db`, and the
  matching `rgb(154,115,34)`/`rgb(124,91,24)`/`rgb(138,100,20)` triplets → `rgb(47,93,138)`/
  `rgb(31,68,104)` (see §6 for the full accent rationale)
- `--later` (tarot's violet "later/dated commentary" tag colour, `#6d4ab6`) → `#b5651d`
  (rust), because purple is reserved for eco-redirects only in this repo (builder
  directive) — a semantic content colour that happened to be purple still had to move.
  `rgb(196,167,255)`/`rgb(108,74,182)` (its light/dark rgba tints) → `rgb(212,150,90)`/`rgb(181,101,29)`.

**"deck" → "grammar" in user-visible copy** (not in internal variable names — `let decks`,
`activeDecks()`, `?decks=` query param etc. stayed as-is; renaming those would touch
dozens of call sites for zero user-facing benefit): button labels ("✦ Decks ▾" → "✦
Grammars ▾"), picker copy ("Tick several decks" → "Tick several grammars", "search
decks…" → "search grammars…"), footer text ("Public-domain tarot data" → "Public-domain
source texts & original research"), and the default `grammarType`/`detectTypeFromUrl()`
fallback (`'tarot'` → `'astrology'` — cosmetic only, since `data.items` being present
means `normalizeItems()` never actually reaches the legacy tarot/iching/astrology
type-specific branches; verified by reading `normalizeItems()` in full).

### 2a. cards.html — already generic, needed the least work

Confirmed by reading the file directly: `cards.html` is the SAME shared viewer the live
recursive.eco app uses, already built to detect `grammar_type` from the loaded JSON
(`grammarType = data.grammar_type` at two call sites) rather than branch on the URL.
`COMMUNITY_FOLDERS` already included `'astrology'`, and there's an (empty, CSS-var-driven)
`.theme-astrology` stub alongside `.theme-tarot`/`.theme-iching`. The `grammarType ===
'tarot'` branches (card-reversal, `TAROT_POSITIONS`, the legacy planets/signs/houses
parser) are dead code paths for this repo's data shape (all our grammars use the unified
`items[]` schema) but harmless to leave — they're exactly the kind of dead-but-safe
branch this shared component is designed to carry across domains.

### 2b. tree-viewer.html — least tarot-specific of all five

No card-selection/reversal logic, no hardcoded arcana/suit vocabulary. Only fix needed:
the `grammarType` default (`'tarot'` → `'astrology'`) and the src-path substitutions.

### 2c. explorer.html — preset buttons rewritten for astro's actual fields

Tarot's quick-pivot presets ("Major/Minor ▸ Suit ▸ Rank", "Arcana × Suit", "Deck ×
Arcana", "Lineage ▸ Deck") reference tarot-only field names (`arcana`, `suit`, `rank`,
`number`) that don't exist in astrology data and would have silently no-op'd. Checked
actual field names across all grammars (`python3` field-audit) and rewrote the presets
to the fields that are actually there: `category`/`subcategory` (present on nearly every
grammar), `keywords`, and `branch` (from the collection, when multiple grammars are
loaded). `BRANCH_COLOR` palette keys also swapped from tarot's lineage codes
(`A`/`B`/`C`/`occult`/`roots`/`sui-generis`) to astro's four branches. The underlying
pivot engine (`dimension-engine.js`) needed **zero changes** — it discovers whatever
fields exist in the data, so this was purely a "which shortcuts are worth a button"
question, not a functional gap.

### 2d. lenses.html — real logic rewrite, not just cosmetic (biggest single change)

Tarot's Lens prototypes page matches cards across decks via a **stamped metadata key**
(`metadata.trump_key` / `metadata.minor_key`) because deck card names vary by language
and tradition ("The Fool" / "Il Matto"). Astrology's voice libraries don't have — or
need — that: **the item NAME itself is already the shared key**. Checked directly:
`alan-leo`, `tetrabiblos-ashmand`, `proctor-skeptical-astrology`, `western-astrology-
canonical`, and `planetary-myths` all name their planet items identically ("Saturn",
"Mercury", "Sun" …), and `alan-leo` additionally carries signs/houses/aspects the same
way. So the port replaces `TRUMP_LABELS`/`RANK_ORDER`/`SUIT_ORDER`/`minorParts` etc. with
a single `entityKey()` (normalized lowercase name) + a small `CATEGORY_ORDER`/
`PLANET_ORDER`/`SIGN_ORDER` table for sensible display ordering. The five views
(Provenance ribbon / Synopsis / Small multiples / Matrix / Reader) are structurally
identical to tarot's; only the entity-matching layer underneath changed. The "Across the
decks" cross-grammar synthesis banner (tarot reads `research/synthesis/trumps.json`, a
hand-written per-card evolution commentary file) has **no astro equivalent** — no such
file exists in this repo — so `synthHTML()` is now a no-op stub (`''`) rather than a
broken fetch; noted as a real, honest gap, not silently dropped (see §9). The grammar
multiselect panel's "Pre-1700" quick filter (meaningless here — most grammars are
undated) became "Primary sources" (selects the `primary-sources` branch).

### 2e. timeline.html — data source rewritten (biggest structural gap)

The single largest thing that COULD NOT be ported as-is: tarot's Timeline reads ONE
special meta-grammar (`tarot/tree-of-tarot/grammar.json`) whose items are one-per-deck
nodes carrying `metadata.when`, `metadata.branch`, and **`metadata.derives_from`** — an
explicit genealogy (which deck descended from which), rendered as a descent rail
connecting nodes. **Astro has no equivalent meta-grammar and no genealogy between its
grammars** — Ptolemy, Alan Leo, and the flagship interpretation set don't "descend from"
one another the way Visconti-Sforza descends into the Marseille standard. Rewrote the
data source to read `grammars/_collection.json` directly (one node per grammar, using the
`year`/`year_label`/`branch`/`cover_image_url`/`blurb` fields `build_collection.py`
already provides) and **removed the descent-rail feature entirely** (the "Descent"
toggle checkbox, the `derives`-based edge-drawing) rather than fake it — same honesty
call as skipping fabricated dates in §1. Only the grammars with a real historical anchor
plot on the timeline (same "Contemporary decks get grouped separately" honesty rule
tarot itself uses). `SLUG_MAP` (deck-id → repo-slug translation table, needed because
tree-of-tarot's item ids don't match repo folder names) is gone entirely — the
collection's `slug` field already *is* the folder name, so `showDetail()`'s "open in
Cards" link needs no lookup table.

## 3. Homepage — `index.html`

Full replace. Structure ported from `recursive-tarot/index.html` (hero-with-plate,
"three ways in" cards, an "arch" timeline motif, editorial prose section, the
recursive.eco "tree" callout, and the view/grammar gallery) — but every grammar-gallery
card and view-card links to a **real page** (`viewers/cards.html?src=…`), never a popup
or an in-page dialog. This **replaces** astro's previous homepage mechanism entirely: the
old `index.html` was a single-grammar in-page viewer with a `?grammar=<slug>` query param
opening a `<dialog>` — that whole mechanism (the `fetch(GRAMMAR_URL)` boot script, the
`open(i)`/`render(g)` functions, the modal) is gone, replaced by the tarot-style
"gallery of real links" pattern per the task brief.

**Kept, not invented**: the hero title/subtitle/body copy comes verbatim (only lightly
trimmed) from `recursive-eco.json`'s `channel.hero` block — "Read the sky to know
yourself, not to be told your fate — five thousand years of meaning-making, held to the
record," and the two-paragraph body about public-domain voice libraries and castings as
mirrors, not commands. The Chart Wheel and Chart Viewer links are prominent in the hero
CTA row (per the task brief) and again in "Three ways in" and the view gallery.

**Invented, and flagged as such** (§9): the "How to hold a chart" arch section. Tarot's
version is a literal 1440→1781→now historical arc (game → occult reframing → gate).
Astro has no equivalent single, well-evidenced historical turning point to point to
without risking a fabricated claim, so this port uses a **looser, safer two-pole framing**
("Omen" / antiquity — "Command" / fate-as-warrant, unattributed to any one tradition or
voice — "Mirror, not fate" / now) built from `voices.json`'s own `shared_intention.creed`
rather than new historical claims. Ptolemy's image illustrates "Command" only as the
*classical predictive tradition in general*, explicitly NOT quoting the "stars incline,
they do not compel" maxim as his — `CLAUDE.md`-equivalent guidance in this repo already
flags that line as a later Latin maxim, not a `Tetrabiblos` quotation, so the port avoids
repeating that mistake.

**Courses section**: new — lists all three courses (History of Astrology → `pages/
course.html`; The Right Size → `pages/course-viewer.html?course=the-right-size`; Three
Doors → `pages/course-viewer.html?course=three-doors`), per the task brief.

**Images**: every illustrative image is a real, already-in-the-repo `cover_image_url`
from `grammars/_collection.json` (Wikimedia Commons public-domain plates — the Flammarion
engraving for the hero, the Venus Tablet of Ammisaduqa, Ptolemy's 16th-c. portrait, the
Cellarius/Aspects/Zodiac-woodcut plates used elsewhere in the gallery) — no new asset
URLs invented, all pulled from what the grammar-writing work already sourced.

## 4. Header — `site-header.js`

Full replace, ported from `recursive-tarot/site-header.js` (the dropdown-mechanics
source — hover/focus-within CSS + the `positionMenu()` gap-fix + touch-tap fallback,
commit 84934e6's fix). Astro's *pre-port* header already contained a lot of this same
mechanical code (apparently ported once before), so the mechanics changed little; what
changed is the **menu content**, per the task brief:

- **Home** — plain link (not a dropdown, unlike tarot's Home+About group — astro has no
  About page to hide behind it).
- **Views** — two groups: *By grammar* (Cards, Explorer, Lenses, Tree — added Cards to
  the task brief's list since we just built `viewers/cards.html` and it needs a nav
  entry) and *Across the collection* (Timeline, Genealogy, Chart Wheel, Chart Viewer, All
  grammars).
- **Courses** — History of Astrology, The Right Size, Three Doors (flat list — astro only
  has 3 courses, so tarot's "Start here / More" grouping wasn't needed).
- **Grammars** — **not hardcoded**. Fetches `grammars/_collection.json` at
  `connectedCallback()` time and renders one link per grammar, grouped by branch. This is
  a deliberate deviation from a literal reading of the task brief ("Grammars (all 11)")
  because the grammar count changed mid-session (11 → 15, live, while this port was in
  progress) — a hardcoded list would have been stale on arrival. Every entry links to
  `viewers/cards.html?src=../grammars/<slug>/grammar.json` (fixed with `../` — this is
  resolved relative to `cards.html`'s own fixed location in `viewers/`, NOT relative to
  whatever page the link sits on; caught and fixed this exact bug in three places during
  the port — see §9).
- **GitHub** — unchanged pattern, repo slug corrected to `PlayfulProcess/Recursive-astrology`.

Kept: the crescent+star brand SVG (astro's own, pre-port — not tarot's spiral), the
Fraunces/Inter webfont injection, the `?fig=1` screenshot-capture mode, and — new in this
port — loading `icons.js` so `<rt-icon>` tags render (tarot's header does the same).

Verified with Playwright: hovering the Views trigger opens the menu; stepping the mouse
across the 8px gap toward a menu item in small increments (not a teleport) keeps the
menu open the whole way — the actual behavior the gap-fix exists to guarantee.

## 5. Blue theme — `theme.css`

**This was the single most consequential miss caught mid-session**: the first retheme
pass changed every *inline* gold hex in the ported viewer files, but left `theme.css`'s
own `:root` token *definitions* untouched — meaning every page that correctly used
`var(--gold)`/`var(--accent)` (i.e. did the right thing) was still rendering gold,
because the token itself was still `#9a7322`. Fixed by editing the token block directly:

```
--gold:#2f5d8a;              /* was #9a7322 */
--accent:#2f5d8a;
--accent2:#2f5d8a;
--violet:#2f5d8a;             /* legacy alias, folded into the blue accent */
--grammar-accent:#2f5d8a;
--grammar-accent-dark:#1f4468;   /* was #7c5b18 */
--tree-accent:#2f5d8a;
--chip:#eaf0f7;               /* was #faf3e6 (warm gold-tinted cream) */
--later:#b5651d;              /* was #6d4ab6 (violet) — see §2d/§9 on why this moved too */
```

**Accent hexes chosen**: `#2f5d8a` (primary, "sky/indigo blue") and `#1f4468` (darker,
for hovers/gradients) — per the task brief's suggested range. `#a9c2db` replaces the
gold-family dotted-underline tint `#c4ad7a`.

**Left untouched, deliberately**: `--roots`/`--occult`/`--native`/`--myriads`/
`--strings`/`--tens`/`--sui`/`--cash`/`--a`/`--b`/`--c` (tarot's genealogy-lineage /
Dummett-order / suit / game-status hues) — these are unused dead tokens in astro's
context (no lineage, no suits, no card game), left in place because removing them serves
no purpose and theme.css is shared-lineage documentation with tarot. `--good`/`--bad`
(green/red semantic pass-fail) are untouched — not accent-related. The `.eco-chip` /
`a[href*="recursive.eco"]` / `a.solid[href*="...eco"]` purple wayfinding rules at the
bottom of the file are **untouched** — purple stays reserved for eco-redirects, per the
builder's rule, everywhere in this repo.

**Also retoned** (not originally in the task's 3-file list, but linked prominently by
the new header/homepage, so a clash would have been visible immediately): `site-footer.js`
(one hover-state hex), `course/course-assistant.js` (the course chat FAB/bubbles —
reachable from the new Courses menu), `view-switcher.js` (mostly-dead code, fixed anyway).

## 6. genealogy.html / wheel.html / viewer/astrology-viewer.html — retoned only

`genealogy.html` and `wheel.html` needed **zero direct hex changes** — both already
built entirely on `theme.css` tokens with no local color overrides, so the theme.css fix
in §5 retoned them automatically. Only a stale internal link was fixed: `genealogy.html`
linked to `lenses.html` (the file this port renamed away — see §7); repointed to
`viewers/lenses.html`.

`viewer/astrology-viewer.html` has its own local token layer (`--astro-gold`/
`--astro-purple`/`--astro-purple-dark`, light AND dark-mode variants) independent of
`theme.css` — retoned both blocks to blue (`#2f5d8a`/`#1f4468` light, `#6f9fd8`/`#4a76ad`
dark, the dark values brighter for contrast against the near-black dark-mode background,
same ratio tarot's own gold dark-mode value had to its light one). Left the variable
*names* as `--astro-gold`/`--astro-purple` (touching ~40 call sites for a rename with no
functional benefit was out of scope) but added a comment explaining the values are blue
now. **Left untouched, deliberately**: `--astro-blue` (a separate, pre-existing token for
one of the aspect/element legend swatches — domain content, not chrome) and the Human
Design bodygraph sub-view's fixed purple/red/gold gate-panel colors (`.gate-panel.
personality`, `.hd-channel.defined`, `.hd-gate-label.both`) — the file's own header
comment explicitly marks that sub-view's raw SVG fills as "out of scope" for any
theme pass, a pre-existing exemption this port respected rather than overrode.

## 7. Old astro `lenses.html` → `lenses-legacy.html`

Renamed per the task brief. Fixed the three real links that pointed at the old
`lenses.html` path so nothing 404s: `genealogy.html`, `pages/course-viewer.html`, and
(implicitly) every header/homepage reference now points at the new `viewers/lenses.html`
instead. `lenses-legacy.html` itself is no longer linked from anywhere in the site — kept
in the repo (not deleted) per the brief, purely as an archive.

## 8. Verification

Playwright (chromium, `--no-sandbox`) against `python3 -m http.server 8090` from the repo
root. Checked, for every ported/retoned page (`index.html`, all 5 `viewers/*.html`,
`genealogy.html`, `wheel.html`, `viewer/astrology-viewer.html`, `pages/course.html`,
`pages/course-viewer.html?course=the-right-size`, `pages/course-viewer.html?course=three-doors`):

- HTTP 200, no uncaught `pageerror`s from this repo's own code, no **local** (same-origin)
  404s or aborted requests — confirmed clean **after** finding and fixing three missing
  files (`viewers/grammar-loader.js`, `viewers/deck-picker.js`, `viewers/eco-links.js` —
  referenced by `cards.html`/`tree-viewer.html` but never copied in the first pass).
- Header dropdown gap-fix: hovering the Views trigger opens the menu
  (`display !== 'none'`); stepping the mouse across the 8px gap toward a menu item in 8
  small increments (not a teleport, to actually exercise the `.dd-menu::before` bridge +
  `positionMenu()`) keeps it open the whole way — both assertions came back `true`.
- Grammars dropdown: confirmed it renders real `<a>` entries fetched live from
  `grammars/_collection.json` (not a stale hardcoded list), grouped by branch, each
  pointing at a working `viewers/cards.html?src=…` URL.

**What I could NOT verify visually in this environment**: this sandbox's outbound network
is proxied and blocks the CDN/image hosts these pages depend on for a fully-dressed
render — `commons.wikimedia.org` (every cover image), `cdn.tailwindcss.com`,
`cdn.jsdelivr.net` (d3, used by `timeline.html`), `cdn.jsdelivr.net/npm/@supabase/
supabase-js`, and `recursive.eco/js/assistant-launcher.js` (the shared assistant star)
all fail with `ERR_TUNNEL_CONNECTION_FAILED`. This means screenshots taken here show
missing cover images, an unstyled Tailwind chart viewer, and `d3 is not defined` on the
Timeline page — **not new bugs**, the same dependency shape tarot's own pages have, and
one this repo's own `viewer/astrology-viewer.html` already depended on before this port
started. This needs a real network (a Vercel-style preview, or a session with unblocked
egress) to confirm the fully-dressed visual pass — flagging honestly rather than
claiming a look I couldn't actually see.

## 9. Known gaps / could not port faithfully

- **`viewers/lenses.html`'s cross-grammar "synthesis" banner is empty.** Tarot's
  equivalent reads a hand-written `research/synthesis/trumps.json` (per-card evolution
  commentary across decks) that has no astro counterpart. `synthHTML()` is now a
  documented no-op rather than a silently-broken fetch. If this repo ever wants that
  banner, it needs a `research/synthesis/<entity>.json`-shaped file written by hand,
  same as tarot's — not something a viewer port can invent.
- **`viewers/timeline.html`'s descent rail is gone, not adapted.** No genealogy exists
  between astro's grammars (they're independent works, not a family tree of derived
  decks), so the feature was removed rather than faked with an empty/fabricated
  `derives_from`. If a genuine influence-graph between voices is ever built (e.g.
  "Alan Leo's Theosophical revival responds to Ptolemy"), it would need its own curated
  data — again, not something to invent inside a port.
- **The homepage "arch" section's history is intentionally looser than tarot's.** Tarot
  can point to two hard dates (1440s card game, 1781 occult reframing) because those are
  settled historical facts already in its own research dossiers. Astrology's equivalent
  turning point (when does "read the sky as command" become dominant, and over whom?) is
  genuinely contested and under-sourced in this repo's current dossiers, so the port uses
  a generic two-pole frame instead of inventing a specific date/event to hang a third
  node on.
- **Icon coverage is not 100%.** `icons.js` was copied and covers every icon name actually
  used in the 5 ported viewers (`flag`, `x`, `link`, `message`, `grid`, `folder`,
  `package`, `book`, `cards` — checked directly against the library's contents), but a
  few `<rt-icon>` tags inside `cards.html`'s deeper interaction code (console-log
  strings, some conditional branches) weren't individually re-verified line by line given
  the file's size (5861 lines) — low risk since an unregistered/mis-named icon renders as
  nothing, not an error, but flagging the shortcut taken.
- **`viewer/astrology-viewer.html`'s supporting asset files** (`viewer/assets/js/
  components/signin-modal.js`, `site-shell-inline.js`, `viewer/spiral/spiral.js`) still
  contain their own purple (`#8b5cf6`, `#7c3aed`, `#9333ea`) — left untouched. These
  weren't in the task's named file list, and `spiral.js`'s purple in particular is very
  likely the recursive.eco brand mark's own signature color, not chrome to fix. Flagging
  rather than silently expanding scope into files not asked for.
