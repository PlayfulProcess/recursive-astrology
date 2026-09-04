# The Recursive Astrology

The astrology counterpart of [The Recursive Tarot](https://tarot.recursive.eco) — the **same creed
and method, a different domain**. A static, backend-free site that turns a folder of JSON into a
browsable library of the *historiographical views of astrology*: the eras and stances through which
humans have read meaning into the sky, each presented faithfully in its own terms and held honestly
to the record.

Where the tarot library asks you to *relate to the card, never obey it*, this one asks you to **read
the sky to know yourself, not to be told your fate** — a chart is a mirror and a calendar, never a
command. And the subject here is not how to cast a chart but the **history of the practice**: the
five-thousand-year record of humans reading meaning *into* the sky.

> **This repo is itself a Rung 6/7 move.** In the parent project's contribution ladder, Rung 6
> teaches you to make your own *grammars* and Rung 7 to make your own *site* to show them. This
> whole commons was **founded from** the tarot one — the method taken home and pointed at a new
> subject. The founding seed shipped in the parent's PR #36; the roadmap it travels with is
> [`PLAN.md`](PLAN.md).

## What's here

```
recursive-astrology/
├── index.html                                       reads any grammar (?grammar=<slug>) as cards
├── wheel.html                                       the twelve-house casting as an SVG wheel
├── theme.css                                        the single source of colour (light only)
├── voices.json                                      the creed — shared_intention + 3 voices
├── grammars/
│   ├── historiographies-of-astrology/               the record: 10 views + 3 pattern groupings
│   ├── tetrabiblos-ashmand/                         Ptolemy in his own (PD) words — 28 items
│   ├── alan-leo/                                    the Theosophical revival, PD — 38 items
│   ├── proctor-skeptical-astrology/                 the Victorian skeptic, PD — 37 items
│   ├── western-astrology-canonical/                 the flagship interpretation set — 43 items
│   ├── casting-big-three/                           casting: Sun · Moon · Ascendant (derived, never random)
│   ├── casting-twelve-houses/                       casting: the chart wheel (12 house positions)
│   └── casting-single-aspect/                       casting: any ONE aspect of your chart
├── research/                                        the evidence wing (dossiers are the source of truth)
│   ├── SCHEMA.md                                    how a dossier is written
│   ├── bibliography.bib                             every citable source, one place
│   └── views/<slug>.md                              one dossier per view, claims cited [@key]
├── recursive-eco.json                               the channel manifest (slug: astrology)
├── ids.json                                         slug → recursive.eco UUID map
├── docs/
│   ├── RECURSIVE-ECO-INTEGRATION.md                 the app↔repo contract (ownership, sync, castings)
│   └── APP-INTEGRATION-TODO.md                      hand-off notes for the recursive.eco side
├── check.py                                         the pre-commit gate, zero dependencies
├── PLAN.md                                          the founding plan & phased roadmap
├── CLAUDE.md                                        the rules of this commons (the creed is the spine)
├── CLAUDE-AI-INSTRUCTIONS.md                        the standing brief for app-connected sessions
├── ICONS.md                                         SVG glyph set — never emoji
├── GRAMMAR_FORMAT.md                                mirrored grammar-JSON reference (canonical: recursive.eco-schemas)
└── README.md                                        this file
```

**Castings are never random.** Where tarot draws from a shuffled deck, astrology's "deck" is your
own chart: every casting position derives from an aspect of a given chart (your Sun, your houses,
one aspect you choose). See `wheel.html` and `grammars/casting-*/`.

Everything is plain HTML, one CSS file, and JSON. No build step, no framework, no server in
production. GitHub Pages serves it as-is.

**No images, on purpose (for now).** Every item is imageless. Honest sourcing of public-domain star
charts and plates is a later, separate phase (`PLAN.md` §4 — Urania's Mirror first) — an honest gap
beats a wrong picture. See `CLAUDE.md` for the full sourcing guardrails (never invent a citation,
hedge contested claims, flag paraphrase as paraphrase).

## The first hour

**1. See it work (2 min).** Browsers block `file://` fetches, so open it over a tiny local server:

```bash
python -m http.server 8091
# now visit http://localhost:8091/
```

You'll see the library — the major historiographical views (Mesopotamian omen-craft, the Hellenistic
synthesis, Jyotiṣa, the Islamic golden age, and on through the modern test tradition and the
contemporary resurgence) plus a few *patterns* that group them — rendered as cards you can open.

**2. Read the grammar (15 min).** Open `grammars/historiographies-of-astrology/grammar.json`. Each
item is one **view**: an `id`, a `name`, and `sections` — `What this view holds` (faithful, in the
tradition's own terms), sometimes `In its own words` (a verifiable line or a flagged paraphrase),
`The record` (the honest, hedged history), and `Reading` (2–3 standard scholarly works as pointers,
no page numbers). The last three items are **patterns** — they hold no view of their own; they have
`composite_of: [ids]` and make a historiographical shape visible across several views.

**3. Read a dossier (10 min).** Each view has an evidence file under `research/views/`. The dossier
is the source of truth; the grammar is the display. Claims are cited `[@key]` into
`research/bibliography.bib` and confidence-flagged. `research/SCHEMA.md` explains the format.

**4. Add or improve a view (20 min).** Copy an existing item, give it a new `id`, and fill the
sections for a tradition or era you know. Keep the creed: read the record, don't predict; hedge
what's contested (`metadata.confidence: "low"`); name only sources you're sure of. Reload the page.

**5. Check it (1 min).**

```bash
python check.py
# → OK: all checks passed (1 grammar)
```

`check.py` catches the handful of mistakes that stop a grammar from loading. Keep it green — it must
pass before every commit.

## The three voices

`voices.json` mirrors the tarot's `shared_intention` structure exactly (same keys, so tooling ports),
then seeds three orientations you can read a sky through — each a genuine stance, presented faithfully:

- **Ptolemy** — natural-philosophy astrology: celestial influence as the physics of its age, and
  explicitly hedged (as Ptolemy himself hedged the *Tetrabiblos*) as a fallible, conjectural art.
- **Jung** — the archetypal mirror: the chart as a map of the psyche, meaningful by synchronicity
  (correspondence, not cause). An *inspired-by* framing, not the man's endorsement.
- **The Skeptical School** — from Pico della Mirandola to the modern controlled test: the view that
  astrology's effects are supplied by the reader, not the sky — presented as *its own* tradition of
  critique, not as our verdict on the rest.

Any disagreement a voice has with the record lives in the long form (its `course` pointer / the
grammar's `The record`), never in the short `intention`. Every voice obeys the one creed.

## The two rules worth keeping

1. **All colour lives in `theme.css`.** One `:root` of tokens, linked everywhere, light only. Never
   redeclare a colour in a page, never add a dark-mode block. To recolour the whole site, edit that
   one file.
2. **The data outlives the platform.** The viewer is deliberately thin. If this site vanished
   tomorrow, `grammars/*.json` and `research/` would still be a clean, portable, public record of
   the subject. That's the point.

## Where this connects

- **The parent project:** [The Recursive Tarot](https://tarot.recursive.eco) — this repo's sibling,
  same creed, and the source of the grammar format and the theme.
- **The schemas commons:** [recursive.eco-schemas](https://github.com/PlayfulProcess/recursive.eco-schemas)
  — where the three imported voice libraries come from (Ashmand's Ptolemy, Alan Leo, Proctor),
  plus canonical `astrology`-type grammars (western, jyotish, archetypal) available for later
  adoption. Consolidate, don't multiply: check there before inventing a shape.
- **The sibling sky projects:** [nara](https://github.com/PlayfulProcess/nara) (the tropical
  zodiac reframed honestly as the human-subjective sky — and home of the 0→1 founding course
  this repo is itself an instance of) and its objective-sky twin
  [kali-paradevi](https://github.com/PlayfulProcess/kali-paradevi).
- **The ladder you're on:** [Ways to Contribute](https://tarot.recursive.eco/pages/course-viewer.html?course=how-to-contribute)
  — Rungs 1–5 tend an existing commons; Rung 6 makes your own grammars; Rung 7 makes your own site.
- **Go further — the live app:** grammars here can also open in [recursive.eco](https://recursive.eco)
  for a live oracle, AI readings, and community editing. The parent's
  `docs/RECURSIVE-ECO-INTEGRATION.md` shows how a repo wires to a channel.

Take the method home. Found your own.

## Licensing — software vs. content

This repo is dual-licensed, deliberately:

| What | License |
|------|---------|
| **Code** — `viewer/`, `viewers/`, `api/`, `scripts/`, `course/`, any HTML/CSS/JS/Python | **MIT** — see [`LICENSE`](LICENSE) |
| **Content** — `grammars/`, `research/`, `docs/`, `plan/`, `voices.json`, and the prose in the Markdown files | **CC-BY-SA-4.0** — see [`LICENSE-CONTENT.txt`](LICENSE-CONTENT.txt) |

MIT on the code because the calculation engine is the part worth passing on freely: it is built on
[Skyfield](https://rhodesmill.org/skyfield/) and JPL's DE421 rather than the Swiss Ephemeris, so it
carries no copyleft obligation inherited from a dependency — a rare thing in open astrology
software, and more useful to everyone unencumbered. CC-BY-SA on the content because a commons of
readings should stay a commons: reuse it, adapt it, keep it open, and keep the attribution.

One third-party library is vendored into the code: **AstroChart** (AstroDraw/AstroChart 3.0.2,
MIT, Copyright © 2015-2025 Arthur Fücher) draws the Western chart wheel, at
[`viewer/assets/js/vendor/astrochart.js`](viewer/assets/js/vendor/astrochart.js), with its licence
beside it. It is vendored rather than installed because this is a static site with no build step.
It draws only; every position, house cusp and aspect it renders comes from our own Skyfield/DE421
engine.

The graphic ephemeris on the Transits tab uses **d3** (BSD-3-Clause), loaded from a CDN the first
time that panel is opened rather than vendored, since it is the only view that needs it. Its form —
time on one axis, the zodiac folded by a modulus on the other, natal positions as horizontal lines —
follows standard graphic-ephemeris practice; `katelouie/stellium`'s `ephemeris.py` was read as a
*specification* for the details (the wrap-around break, the station markers) and none of its
AGPL code is used here.

Third-party material referenced by the grammars carries its own status: the source texts
(Ashmand's Ptolemy, Alan Leo, Proctor) and the illustrations are **public domain**, each recorded
with its provenance in the item that uses it. Astronomical data comes from JPL's DE421 ephemeris.
Human Design terminology describes a system originated by Ra Uru Hu; the calculations here are our
own and the prose is being rewritten in our own words.

Author: **PlayfulProcess**. Built with [Claude](https://claude.com/claude-code) for recursive.eco.
