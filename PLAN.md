# FOUNDING PLAN — recursive-astrology

*Written 2026-07-05 by the recursive-tarot orchestration session. This doc travels with the seed.
The builder forks/copies this into a new repo, opens a fresh Claude session there, and pastes the
prompt in §6. Everything a first session needs is in this folder + this plan.*

> **Status (2026-07-05):** Phase 0 is done — the seed was promoted to the root of
> [PlayfulProcess/Recursive-astrology](https://github.com/PlayfulProcess/Recursive-astrology)
> (empty-repo start, path (b)), `check.py` green, paths in this plan rewritten to root.
> Phase 1 (the research spine) is underway. See `plan/HANDOVER-next-session.md` for live state.

---

## 1. What this repo is (one paragraph)

The astrology counterpart of [The Recursive Tarot](https://tarot.recursive.eco): a library of the
**historiographical views of astrology** — the eras and stances through which humans have read
meaning into the sky — each presented faithfully in its own terms, held honestly to the record,
under one creed: *read the sky to know yourself, not to be told your fate; a chart is a mirror and
a calendar, not a command; relate to the symbol, never obey it.* It is not a chart-casting manual
and not a verdict on astrology; it is the record of a five-thousand-year meaning-making practice.

## 2. Architecture (mirror the tarot repo's proven shape — don't reinvent)

| Piece | Here now (the seed) | Grows into (tarot-repo analog) |
|---|---|---|
| Creed + voices | `voices.json` (Ptolemy · Jung · Skeptical School) | more voices, each name-a-school |
| The spine grammar | `grammars/historiographies-of-astrology/` (10 views + 3 patterns) | enriched per-view, research-pointed |
| Evidence wing | — | `research/` dossiers + `bibliography.bib` (tarot's `research/SCHEMA.md` pattern) |
| Record grammars | — | `figures-of-astrology` (people; generated from dossiers) · `texts-of-astrology` (books; PD full-text links) |
| Practice wing | — | courses (`the-light-of-the-sky`?), voices' long-form courses |
| Viewers | `index.html` (one renderer) | port from tarot as needed: cards, timeline, tree (`dimension-engine.js` is DOM-free and portable) |
| Gate | `check.py` | extend as grammars multiply (tarot's `check_all.py` pattern) |
| App wiring | — | `_eco_ids.json` + recursive.eco channel (parent's `docs/RECURSIVE-ECO-INTEGRATION.md` §9–10) |

Standing rules carry over verbatim: **the creed is the spine · gate-not-fate · each tradition speaks
as itself, critique in the long form · name a school, not a living person · consolidate, don't
multiply · all colour in `theme.css`, light-only · never invent a citation · `check.py` green before
every commit.**

## 3. Phased roadmap (estimates in sessions; each phase ships alone)

- **Phase 0 — Founding** (½ session, HIGH confidence). Promote this folder to the repo root (§6
  prompt handles both fork-of-tarot and empty-repo starts), rebrand, Pages on, first commit. Done
  when the site is live and `check.py` is green.
- **Phase 1 — The research spine** (2–3 sessions, HIGH). Mirror the tarot accuracy drive: a
  `research/views/<slug>.md` dossier per view (claims cited `[@key]`, confidence-flagged) +
  `bibliography.bib`; then enrich each grammar item with a sourced "Research note". Dossiers are the
  source of truth; the grammar is the display. **This is the highest-value work and needs no images.**
- **Phase 2 — PD seeds in** (1–2 sessions, MEDIUM — provenance judgment). The §4 hunt: images +
  full-text links, each with license + source recorded. Honest gaps beat wrong pictures.
- **Phase 3 — The record grammars** (1–2 sessions). `figures-of-astrology` (Ptolemy, Vettius Valens,
  Abū Maʿshar, al-Bīrūnī, Lilly, Alan Leo, Rudhyar — all dead; generated from dossiers like tarot's
  people grammar) and `texts-of-astrology` (each item a PD-linkable primary text).
- **Phase 4 — Viewers** (1 session). Port the tarot timeline pointed at the views (era metadata is
  already on every item) — the transmission story (Mesopotamia → Alexandria → India/Islam → Europe →
  the modern turn) as a visible genealogy.
- **Phase 5 — recursive.eco wiring** (1 session, gated on the builder). Channel, publish, `_eco_ids`.

## 4. Public-domain seeds (concrete, with the traps named)

**The one killer image seed — Urania's Mirror (1824).** A PD *set of 32 constellation cards*
(Sidney Hall engravings) — astrology's closest thing to a deck, gorgeous, and fully on Wikimedia
Commons ("Urania's Mirror" category). This should be the first image-backed grammar or the cover
art of the views. Direct analog of a tarot deck: card-shaped, complete, PD.

**Other PD image sources (verify each file's page, record license + source per image):**
- Wikimedia Commons: *Zodiacal Man* (Très Riches Heures, Condé Museum scans), *Kitāb al-Bulhan*
  (Bodleian, open), Beit Alpha zodiac mosaic, Dendera zodiac, cuneiform astronomical tablets,
  Alfonso X *Libro del saber* plates.
- Celestial atlases (deck-quality plates): Bayer *Uranometria* (1603), Cellarius *Harmonia
  Macrocosmica* (1660) — many museum-released PD scans on Commons.
- Library/museum open access: BnF Gallica (`ark:` manuscripts), Yale Beinecke (IIIF, open — the
  tarot repo's proven unblock pathway), Met open access, LACMA (Islamic astrolabes/manuscripts).
- ⚠️ **British Museum trap (learned in the tarot repo):** BM releases at CC BY-**NC**-SA — usable for
  the free educational site, **never** for anything sold. Flag NC clearly if used at all.

**PD full texts (the astrology-specific trap: the ORIGINAL being ancient ≠ the TRANSLATION being PD.
Pre-1930 translations are the safe zone; check every translator + date):**
- Ptolemy *Tetrabiblos* — **Ashmand translation (1822)** is PD (sacred-texts, archive.org). The
  Robbins Loeb (1940) is NOT.
- William Lilly, *Christian Astrology* (1647) — PD, archive.org.
- Alan Leo (d. 1917) — his whole corpus is PD; the Theosophical-revival view can quote him directly.
- Manilius *Astronomica* — original PD; older verse translations PD, the Goold Loeb is not.
- Raphael's and Zadkiel's almanacs (19th c.) — PD, and vivid primary sources for the popular trade.
- al-Bīrūnī *Elements of Astrology* — R. Ramsay Wright translation (1934): **verify** before use.

**From the builder's own repos (check these FIRST in the new environment — ask the builder to attach
them or fetch raw if public):**
- **`recursive.eco-schemas`** — the grammar format already defines `astrology` and `birthchart`
  grammar types; the schemas repo likely holds sample astrology grammars/schemas worth adopting
  (consolidate, don't multiply — reuse their item shape for anything chart-shaped later).
- **`nara`** — the 0→1 course, template patterns, and possibly altar-grammar shapes; also the
  Rung 6 hand-off target this repo should link back to ("apprentice in an existing commons first").
- **`recursive-tarot`** — the parent: `dimension-engine.js`, timeline viewer, `research/SCHEMA.md`,
  `scripts/enrich_cards_from_research.py` pattern, `docs/RECURSIVE-ECO-INTEGRATION.md`. Fetch raw
  from GitHub when porting; don't re-derive.

## 5. What NOT to do (founding guardrails)

- No chart-casting engine, no ephemeris, no horoscope generator — that's a different project and it
  walks straight into the fate-not-gate trap. If casting ever comes, it comes as the app's oracle
  (gate framing), not as this repo's code.
- No modern deck/book imagery (Lo Scarabeo-style reproductions are copyrighted even when the
  original is ancient — same trap as tarot).
- No invented citations, no unflagged paraphrases (see the "stars incline" example already in the
  grammar — that's the standard).
- Don't multiply structures: a new idea becomes a **voice**, a **view**, a **pattern**, a
  **dossier**, or a **text/figure entry**. Nothing else.

## 6. PASTE-PROMPT for the first session in the new environment

> You are founding **recursive-astrology** — the astrology counterpart of the recursive-tarot
> project: same creed, same method, different domain. START by reading, in this order:
> `PLAN.md` (this plan — it is your roadmap), then the seed's `CLAUDE.md`,
> `README.md`, `voices.json`, and `grammars/historiographies-of-astrology/grammar.json`.
>
> **Phase 0 — Founding (do first).** Detect the starting shape: (a) if this repo is a fork/copy of
> recursive-tarot, promote the seed folder to the repo ROOT (git mv its contents up),
> then remove the tarot-specific content (tarot/, viewers/, pages/, course/, research/, print/,
> recording/, books/, the tarot scripts and docs — keep only what this plan's §2 architecture
> table names), and rewrite the repo README from the seed's README; (b) if the repo already
> contains only the seed at root, just verify it. Then: run `python check.py` (must pass), serve
> locally and confirm `index.html` renders 13 cards, ask the builder to turn on GitHub Pages
> (Settings → Pages → deploy from the default branch), commit in small logical units, push.
> Confirm with the builder which branch model to use (recommend: work on `dev`, publish via
> `dev`→`main`, matching the parent).
>
> **Then Phase 1 — the research spine** (PLAN §3): create `research/SCHEMA.md` +
> `research/bibliography.bib` + one dossier per view under `research/views/<slug>.md`, mirroring
> recursive-tarot's research pattern (fetch its `research/SCHEMA.md` raw from
> `https://raw.githubusercontent.com/PlayfulProcess/recursive-tarot/main/research/SCHEMA.md` as the
> model). Every load-bearing claim cited `[@key]`, confidence-flagged; NEVER invent a citation —
> hedge, attribute, or omit. Then enrich each grammar item with a sourced Research note pointing at
> its dossier.
>
> **Then the first PD seed** (PLAN §4): Urania's Mirror (1824) from Wikimedia Commons — verify each
> file's PD status on its Commons page, record source + license per image, and bring it in as the
> first image-backed grammar (32 constellation cards). Also check the builder's `recursive.eco-schemas`
> and `nara` repos for existing astrology/birthchart schemas and template patterns before inventing
> any new shape — consolidate, don't multiply.
>
> Hard floors from `CLAUDE.md`: gate-not-fate everywhere (never state a chart as prediction or
> command); each tradition speaks as itself, critique in the long form; name a school, not a living
> person; all colour in `theme.css`, light-only; pre-1930 translations only for quoted text unless
> you verify the license; British Museum images are NC — educational display only, flag clearly;
> `python check.py` green before every commit. Commit + push frequently. When Phase 0 and the first
> dossiers are done, write `plan/HANDOVER-next-session.md` in the tarot repo's handover style so the
> next session starts warm.

---

*Parent project: [PlayfulProcess/recursive-tarot](https://github.com/PlayfulProcess/recursive-tarot).
This seed was assembled from its `template/` starter (PR #35) and shipped in PR #36.*

---

## 7. Harmony with the tarot site — a reviewable plan (2026-07-15)

*Direction from the builder after the tablet round. This is a **plan to review, not
built work.** The through-line: bring this site's shape into line with
[tarot.recursive.eco](https://tarot.recursive.eco) (the `recursive-tarot` repo), make the
browse experience **item-level**, decide what "Grammars" in the header should mean, and
open a long content lane on **cross-cultural cosmology**.*

### 7a. Align structure/design with the tarot site

Both sites already share the seed's chrome (`site-header.js`, `theme.css`, the
`dimension-engine.js`/cards/tree/timeline viewers). The task is to diff the two live and
close the drift. **Deltas to confirm against tarot and reconcile** (audit both, then pick
one shape per row — prefer tarot's, since it's the proven parent):

| Surface | Astro today | Tarot pattern | Proposed reconciliation |
|---|---|---|---|
| Header nav | `Home · Views · Courses · Grammars · GitHub` | (verify tarot's exact set) | Match tarot's top-level labels + order; keep the astro-specific Views entries |
| Homepage hero | plate-left / text-right, one CTA (this round) | (verify) | Keep the single-CTA hero; align type scale + section order to tarot |
| "Ways in" / gallery | "Three ways in" + "Every view" + grammar decks | (verify tarot's gallery grouping) | Use the same section rhythm and card component as tarot |
| Detail popup | tarot-pattern chrome as of this round (X · arrows · SVG action row) | tarot card modal | **Done this round** — keep in lockstep going forward |
| Footer / eco-tree callout | present | present | Confirm identical copy structure |

**Action:** one audit session that opens both sites side by side, writes the exact per-row
decision, and lands the CSS/markup changes in `index.html` + `site-header.js` only (no new
components — reuse tarot's).

### 7b. Explorer should be item-level

Today `viewers/explorer.html` pivots *fields*, and the homepage decks list **grammars**
(cards → open one grammar). The builder wants the browse experience to list **items**
(planets, signs, houses, aspects) **across all grammars at once** — so the primary object a
visitor meets is "Mars" or "the 7th house," and *under* it, every voice's reading of it.

What the page becomes: a filterable index of **item archetypes** (the ~12 signs, ~10–13
planets/bodies, 12 houses, the aspects), each row expandable into the **per-grammar
readings** already loaded by the Lenses viewer (`viewers/lenses.html` is the working
"one entity, many traditions" engine — reuse it, don't reinvent). Effectively: promote
Lenses from a secondary view to the **default browse surface**, with an A–Z / by-category
item index in front of it. Grammar cards stay available (read one voice closely) but stop
being the front door.

### 7c. What should the header "Grammars" / "Browse every grammar" point at?

Three options:

1. **A history page** (the `historiographies-of-astrology` grammar as the canonical index) —
   grammars presented *as the transmission story*, era by era. Honest to this site's thesis;
   good for reading, weaker for "give me every voice fast."
2. **An internal channel page** — a single on-site catalog (the current `index.html#all-grammars`
   deck grid, promoted to its own route) grouping every grammar by branch
   (primary / synthesis / castings / readings). Simple, self-contained, no backend.
3. **The recursive.eco channel** — deep-link out to the live `astrology` channel on the
   platform (where these same grammars are published, per `ids.json`), so "Grammars" hands
   off to the app's catalog + oracle.

**Recommendation: (2) as the on-site default, with (1) and (3) as links *from* it.** Keep the
front door on-site and fast (an internal channel page = the item-level Explorer of §7b), and
let that page offer "read the transmission history →" (option 1) and "open in the Oracle →"
(option 3) as two clearly-labelled exits. Avoids sending first-time visitors off-site, but
still reciprocates with the platform.

### 7d. Content lane — cross-cultural cosmology grammars

A long research lane, following the existing dossier pattern (`research/views/<slug>.md`
cited `[@key]`, confidence-flagged, `research/bibliography.bib`; grammar = display, dossier =
source of truth). How different cultures read the planets, stars, and the Milky Way:

- **Babylonian / Mesopotamian** — already seeded (`mesopotamian-omens`); deepen with the
  MUL.APIN tradition (PD scholarly editions/translations — verify each).
- **Chinese** — the 28 mansions (Xiù), the Purple Forbidden Enclosure, planet–element mapping.
- **Vedic / Jyotiṣa** — already seeded (`jyotisha-brihat-jataka`); extend to nakṣatras + the
  navagraha as a full item set.
- **Mesoamerican** — Maya Venus/`Dresden Codex` cycles, the 260-day count (astronomical, not
  natal-fate — hold the gate-not-fate frame carefully).
- **Yoruba** — Ifá cosmology's sky/《òrìṣà》correspondences (living tradition → name the
  tradition, "inspired by," never a living teacher; sourcing care).
- **Polynesian navigation-star lore** — the star compass / zenith stars as a *wayfinding*
  reading of the sky (a strong "mirror and calendar, not command" exemplar).

**Guardrails (unchanged):** pre-1930 translations only for quoted text unless a license is
verified; no invented citations — hedge/attribute/omit; living traditions named as
traditions, not persons; honest gaps beat wrong pictures. Sequence after §7a–7c so the
item-level browse exists to *hold* these before they're written.
