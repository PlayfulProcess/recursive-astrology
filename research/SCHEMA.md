# Research Catalogue — Schema & Conventions

This is the **contract** for every research dossier in `research/`. It is written to be
read by **historians** (so they can scan, cite, and correct) and by **AI agents** (so a
machine pass can fill, link, and verify entries). One fact lives in **one place**; the
grammar (`grammars/historiographies-of-astrology/grammar.json`) is a *projection* of what
is established here. The dossier is the source of truth; the grammar is the display.

> **The discipline that makes this work:** a dossier never asserts a load-bearing claim
> without a citation key from `bibliography.bib`, and never invents a citation. If a claim
> can't be sourced, it is marked `confidence: low` and phrased as a question, not a fact.

Adapted from the parent project's `research/SCHEMA.md`
([recursive-tarot](https://github.com/PlayfulProcess/recursive-tarot)); same citation
system, catalogues renamed for this domain.

---

## 1. The catalogues

| Folder | One file per… | Frontmatter `type` | Drives |
|---|---|---|---|
| `research/views/` | historiographical view (one per grammar item) | `view` | the view's `sections` in `grammars/historiographies-of-astrology/grammar.json` |
| `research/figures/` *(Phase 3)* | person (all dead; see CLAUDE.md) | `figure` | the future `figures-of-astrology` grammar |
| `research/texts/` *(Phase 3)* | primary text (PD-linkable where possible) | `text` | the future `texts-of-astrology` grammar |

---

## 2. Frontmatter (YAML) — required on every file

```yaml
---
id: "hellenistic-synthesis"          # stable slug; matches the grammar item id minus the "view-" prefix
type: "view"                          # view | figure | text
title: "The Hellenistic Synthesis"
status: "drafting"                    # stub | drafting | verified | needs-review
confidence: "medium"                  # high | medium | low  (of the dossier as a whole)
last_updated: "2026-07-05"
maintainer_note: "AI-assisted; awaiting maintainer / historian review."
# view-only:
era: "c. 2nd century BCE – 2nd century CE"
region: "Greco-Roman Egypt & Mediterranean"
stance: "natural-philosophy"          # omen-craft | natural-philosophy | court-science | psychological | critical | contemporary
grammar_item: "view-hellenistic-synthesis"   # the id in the grammar this dossier drives
figures: []                           # ids from research/figures/ once Phase 3 exists
texts: []                             # ids from research/texts/ once Phase 3 exists
---
```

`status` ladder: **stub** (frontmatter + TODO) → **drafting** (prose, partial sources) →
**verified** (every load-bearing claim has a citation key, web-checked) → **needs-review**
(a flagged contradiction awaiting a human).

---

## 3. Citations — the dual-recognized system

- All sources live in **`research/bibliography.bib`** (BibTeX — recognized by academics and
  trivially parsed by tools).
- In prose, cite with **`[@citekey]`** (Pandoc/academic style; also unambiguous for AI),
  optionally with a locator: `[@campion2008, ch. 1]`.
- **Quote** the source where it carries weight, and only where the wording is certain;
  otherwise paraphrase *and say so* (the "stars incline" maxim in the grammar is the model:
  flagged as a later Latin tag, never quoted as Ptolemy's own words).
- A new source you actually consulted on the web is added to `bibliography.bib` as a
  `@misc{web_<short>, … url=…, urldate=YYYY-MM-DD}` entry **before** you cite it. Never cite
  a key that isn't in the .bib.
- **Confidence tags inline** where a single claim is shakier than the dossier overall:
  `(confidence: low — only one secondary source; primary not seen)`.

### What counts as a source (in rough order of weight)

1. **Primary texts & objects**: the tablets, papyri, and treatises themselves — in scholarly
   editions, or in **public-domain translations whose translator + date you have checked**
   (the astrology-specific trap: the original being ancient ≠ the translation being PD;
   pre-1930 translations are the safe zone — see `PLAN.md` §4).
2. **The academic spine**: Campion's two-volume history [@campion2008; @campion2009];
   Tester [@tester1987]; Rochberg [@rochberg2004]; Hunger–Pingree [@hungerpingree1999];
   Pingree [@pingree1997]; Barton [@barton1994]; Curry [@curry1989; @curry1992].
3. **Standard modern references**: Neugebauer–Van Hoesen [@neugebauer1959], Beck
   [@beck2007], Brennan [@brennan2017], Gutas [@gutas1998], Grafton [@grafton1999],
   Thomas [@thomas1971], the Yamamoto–Burnett Abū Maʿshar [@abumashar2019].
4. **Reputable web scholarship**: museum and library catalogue pages, journal sites,
   skyscript.co.uk source pages, translator's own pages (e.g. Riley's Valens).
5. **Weak / tertiary**: general Wikipedia, blogs — usable for orientation, but a
   load-bearing claim needs something from 1–4, or it's `confidence: low`.

---

## 4. Section structure — view dossier (`research/views/<slug>.md`)

1. **At a glance** — one honest paragraph: what this view is, when, where, why it matters.
2. **Chronology & geography** — what the documents actually show, dated with "c." where
   reconstructed.
3. **Key texts & figures** — the primary sources (with PD-translation status where known)
   and the people who carry the view. These become `research/texts/` and
   `research/figures/` links in Phase 3.
4. **What this view holds** — the faithful presentation, *in the tradition's own terms*,
   each load-bearing element sourced. This is the evidence behind the grammar's
   `What this view holds` and `In its own words` sections.
5. **The record vs. the claims** — the contested points, each stated fairly and weighed
   (transmission debates, dating disputes, retrospective myths). This is the evidence
   behind the grammar's `The record` section.
6. **The autonomy note** — how the creed reads this era: where the tradition itself
   distinguished sign from decree (or didn't), stated as history, never as endorsement.
7. **Open questions / corrections owed.**
8. **Sources** — the `[@…]` keys used.

---

## 5. Linking research → grammar (the integration contract)

When a dossier reaches `status: verified`, its facts flow into the grammar:

- The grammar item gains/updates a **`Research note`** section — one short paragraph noting
  that an evidence dossier exists, plus anything the dossier corrected.
- The grammar item's `metadata` gains **`_research: "research/views/<slug>.md"`** — the
  pointer back to the evidence.
- The grammar carries the **rendered, readable** text; the dossier carries the **evidence
  and quotes**. A correction is made in the dossier first, then projected into the grammar.

Run `python check.py` after every grammar edit — it must stay green.
