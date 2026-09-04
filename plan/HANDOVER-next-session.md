# HANDOVER — next session (start here)

> **Update 2026-07-06 (tarot-level pass):** the repo is now channel-shaped. Added:
> `recursive-eco.json` (channel slug `astrology`) + `ids.json` (empty until first app import),
> `ICONS.md` (SVG-only; crescent+star primary, wheel glyph for castings),
> `CLAUDE-AI-INSTRUCTIONS.md`, `docs/RECURSIVE-ECO-INTEGRATION.md` (ownership/sync contract),
> `docs/APP-INTEGRATION-TODO.md` (the four app-side steps), the flagship
> `western-astrology-canonical` (43 items, adopted from recursive.eco-schemas), and **three
> castings whose draw is NEVER random** — every position resolves to an aspect of the querent's
> own chart: `casting-big-three`, `casting-twelve-houses` (rendered by the new `wheel.html`
> SVG wheel), `casting-single-aspect`. Branch model now mirrors tarot: work on `dev`,
> publish `dev`→`main`; GitHub Pages is live. `check.py` green with 8 grammars.
> The ephemeris boundary (real chart calc) is documented, not built — see the integration doc.

*Written 2026-07-05 by the founding session of recursive-astrology. This is the single entry
point for the next session. Read this, then `PLAN.md` (the founding roadmap — §3 phases, §4
PD seeds, §5 guardrails), then `research/SCHEMA.md` (the dossier contract).*

---

## 0. First moves (paste-prompt in §5)

1. **Branch state:** all work so far lives on **`claude/recursive-astrology-setup-q4ljsb`**
   (the designated setup branch; it is also the repo's first-pushed branch). The builder has
   not yet chosen a branch model — **ask, and recommend the parent's**: work on `dev`,
   publish `dev`→`main`. Until told, keep committing to the setup branch.
2. **Verify nothing is stranded:**
   ```bash
   git fetch --all --prune && git status && git branch -avv
   ```
3. **Run the gate before any commit:** `python check.py` (must end "OK: all checks passed").
4. **GitHub Pages is NOT on yet** — only the builder can flip it: **Settings → Pages →
   Deploy from a branch → (default branch) / root**. Ask them. Until then the site is
   local-only (`python -m http.server 8091`).

## 1. What this repo now has (done 2026-07-05, this session)

- **Phase 0 complete.** Seed promoted from `recursive-tarot@e3cf649
  seeds/recursive-astrology/` to the repo root; README rewritten from seed-framing to live
  repo; `index.html` de-startered; internal paths fixed. Verified: `check.py` green, page
  renders **13 cards** in headless Chromium.
- **Phase 1 substantially done — the research spine exists:**
  - `research/SCHEMA.md` — the dossier contract (adapted from the tarot's; `views/` now,
    `figures/` + `texts/` reserved for Phase 3).
  - `research/bibliography.bib` — 34 sources. The risky entries were **web-verified this
    session** and are marked with `% verified 2026-07-05` comments; PD status of every
    translation is noted per entry (the Robbins Loeb, Goold Loeb, Yamamoto–Burnett, CW 8,
    and Rudhyar are NOT PD; Ashmand 1822, Lilly 1647, and Leo 1913 are; **Wright 1934
    al-Bīrūnī existence verified but PD status still UNVERIFIED**).
  - `research/views/<slug>.md` × **10** — one dossier per view, all `status: drafting`,
    claims cited `[@key]`, contested points weighed, open corrections listed per dossier
    (§7 of each).
  - Grammar enriched: every view item now has a **Research note** section and a
    `metadata._research` pointer. One real correction landed: **Campion Vol. I is "The
    Ancient and Classical Worlds"**, not "The Ancient World".
- **The schemas/nara reuse check is DONE (same day, second pass).** Both repos were attached
  and reviewed:
  - **Three PD voice libraries imported** from `recursive.eco-schemas/schemas/astrology/`,
    items verbatim, one per voice: `grammars/tetrabiblos-ashmand/` (Ptolemy/Ashmand 1822, PG
    #70850 verified), `grammars/alan-leo/` (Leo's pre-1917 corpus), and
    `grammars/proctor-skeptical-astrology/` (Proctor 1896, PG #26556 verified). `check.py`
    green with 4 grammars; all four render (13/28/38/37 cards). `index.html` takes
    `?grammar=<slug>`; each voice's `course` in `voices.json` points at its library.
  - **Still available there for later adoption** (don't re-invent): canonical
    `grammar_type: "astrology"` grammars (western, jyotish, archetypal-cosmology,
    human-design) in `recursive.eco-schemas/astrology/`, plus `schemas/astrology/jyotish-vedic.json`
    and `L1-basic.json`.
  - **nara** (sibling: the tropical zodiac as the human-subjective sky) — its `course/` is
    the 0→1 founding course (the Rung 6/7 hand-off this repo instantiates) and its
    `library/` viewers (cards.html, grammar-loader.js) are candidates for the Phase 4 port.
    Linked from the README's "Where this connects".
- **Verification progress on the dossiers:** the 410 BCE Babylonian horoscope date is now
  verified against Rochberg's *Babylonian Horoscopes* (1998) [@rochberg1998 added]; Leo's
  1914/1917 trials web-corroborated (a £5-vs-£25 fine discrepancy is recorded, Curry check
  still owed); and **Shawn Carlson is living** — dropped as a Phase 3 figures candidate per
  the naming rule.

## 2. NEXT ACTIONS — in order of value

1. **Dossier verification pass (finish Phase 1).** Promote dossiers `drafting` → `verified`
   by web-checking each load-bearing claim. Every dossier's §7 lists exactly what it owes;
   the recurring ones: the c. 410 BCE Babylonian horoscope date [@rochberg2004], Leo's
   1914/1917 case details [@curry1992], Kepler's actual stance (decline dossier — currently
   omitted rather than half-told), Varāhamihira dates (jyotisha), Wright 1934 PD status.
2. **Phase 2 — the first PD image seed: Urania's Mirror (1824)** (PLAN §4). 32 constellation
   cards, Sidney Hall engravings, Wikimedia Commons category "Urania's Mirror". Verify each
   file's PD status **on its own Commons page**; record source + license per image; bring it
   in as the first image-backed grammar. Remember the trap ledger: British Museum = CC
   BY-NC-SA (educational display only, flag clearly); modern reproductions of ancient works
   are still copyrighted. **⚠ BLOCKED in this environment (2026-07-05): both
   commons.wikimedia.org and gutenberg.org return 403 through the proxy (curl AND WebFetch).
   Needs a session whose network policy allows those hosts, or the builder loosens this
   environment's policy. Do NOT fake per-file verification from search snippets.**
3. **Phase 3 — record grammars** (`figures-of-astrology`, `texts-of-astrology`) — generated
   from dossiers, tarot's people-grammar pattern (`scripts/build_people_grammar.py` in the
   parent is the model). The dossiers' §3 sections already name the candidate figures and
   flag which death-dates/facts still need verification.
4. **Phase 4 — port the tarot timeline viewer** pointed at the views (era metadata is
   already on every item; `viewers/dimension-engine.js` in the parent is DOM-free and
   portable).

## 3. Guardrails (unchanged — CLAUDE.md is the law)

- **Never invent a citation, quote, or URL.** Add to `bibliography.bib` BEFORE citing.
  Doubt → hedge, attribute, or omit.
- **Gate, not fate** everywhere; each tradition speaks as itself; critique in the long form.
- **Name a school, not a living person** — bites hardest on the contemporary-resurgence
  dossier (it names projects, not people; keep it that way).
- **Pre-1930 translations are the PD safe zone**; check every translator + date.
- All colour in `theme.css`, light-only. `python check.py` green before every commit.

## 4. Where things live (orientation)

- Roadmap: `PLAN.md` (§3 phases, §4 PD-seed hunt with traps named, §6 original paste-prompt).
- Dossier contract: `research/SCHEMA.md`. Sources: `research/bibliography.bib`.
- The library: `grammars/historiographies-of-astrology/grammar.json` (10 views, 3 patterns;
  each view → its dossier via `metadata._research`).
- The creed: `voices.json` → `shared_intention` (the spine of everything).
- Parent repo (fetch raw when porting; don't re-derive): `PlayfulProcess/recursive-tarot` —
  `research/SCHEMA.md`, `scripts/enrich_cards_from_research.py`,
  `viewers/dimension-engine.js`, `docs/RECURSIVE-ECO-INTEGRATION.md`.

## 5. PASTE-PROMPT for the next session

> Continue founding **recursive-astrology** (PlayfulProcess/Recursive-astrology). FIRST read
> `plan/HANDOVER-next-session.md` (this file), then `PLAN.md`, `CLAUDE.md`, and
> `research/SCHEMA.md`. Run `git fetch --all`, `git status`, and `python check.py` (must be
> green). Ask the builder: (a) which branch model — recommend work on `dev`, publish
> `dev`→`main` like the parent; (b) to turn on GitHub Pages (Settings → Pages → deploy from
> the default branch); (c) to attach `recursive.eco-schemas` and `nara` if reachable. THEN:
> finish the Phase 1 verification pass (each dossier's §7 lists what it owes — promote
> `drafting`→`verified` claim by claim, adding any web source to `bibliography.bib` as
> `@misc{web_…}` BEFORE citing it), and start Phase 2: **Urania's Mirror (1824)** from
> Wikimedia Commons as the first image-backed grammar — verify PD status on each file's own
> Commons page, record source + license per image. Hard floors: never invent a citation;
> gate-not-fate everywhere; name a school, not a living person; pre-1930 translations only
> unless license verified; `python check.py` green before every commit; commit + push
> frequently. Before ending, rewrite this handover for the session after you.
