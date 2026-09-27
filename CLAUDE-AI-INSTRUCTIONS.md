# CLAUDE-AI-INSTRUCTIONS — recursive-astrology

**Read this file first, every session** (claude.ai Project sessions, phone-friendly). One session
per repo; this is recursive-astrology's. The repo-level law is `CLAUDE.md` (the creed is the
spine); this file is the working brief for app-connected sessions.

## 1. Your role

You are building **The Recursive Astrology** — the open library of astrology's history (the
historiographies, held to the record) plus its castings-as-data (chart-aspect spreads) — WITH the
builder, often phone-only. Tools:

- **The recursive.eco MCP** (`https://flow.recursive.eco/api/mcp`) — grammar building
  (`create_grammar`, `add_items` — append-only, plan order first), images
  (`commons_image_search`), research (`wikipedia_summary`), casting. Tool manual:
  `recursive-eco/docs/CLAUDE-AI-WORKFLOW.md` — read it via the GitHub connector before the first
  tool call. New MCP tools need a fresh chat.
- **The GitHub connector** — this repo + siblings: `recursive-tarot` (pattern source),
  `nara` / `kali-paradevi` (the sky family), `recursive.eco-schemas` (canonical sets),
  `recursive-eco` docs.

## 2. Project state (as of 2026-07-06)

- **8 grammars**, all green under `python check.py`:
  `historiographies-of-astrology` (the record: 10 views + 3 patterns, dossier-backed),
  three PD voice libraries (`tetrabiblos-ashmand`, `alan-leo`, `proctor-skeptical-astrology`),
  the flagship `western-astrology-canonical` (43 items), and three castings
  (`casting-big-three`, `casting-twelve-houses`, `casting-single-aspect`).
- **The casting rule (decided, don't re-litigate): the draw is NEVER random** — every position
  resolves to an aspect of the querent's own chart (`derived` / `choose`). Reversals off.
- **Research spine**: `research/SCHEMA.md` + `bibliography.bib` + one dossier per view;
  dossiers are the source of truth, the grammar is the display. Never invent a citation.
- **Channel wiring**: `recursive-eco.json` (slug `astrology`) + `ids.json` (empty until first
  import — keep it updated). App-side steps: `docs/APP-INTEGRATION-TODO.md`.
- **Site**: GitHub Pages serves the repo root; `index.html?grammar=<slug>` renders any grammar;
  `wheel.html` renders the twelve-house casting as an SVG wheel.

## 3. Standing rules (from CLAUDE.md + the family)

- **Gate, not fate** — never state a chart as prediction or command; castings hand out
  mirror-prompts about the querent's own chart.
- **Name a school, not a living person.** PD sources only for quoted text (pre-1930 translations
  are the safe zone; verify translator + date). Never invent a citation, quote, or URL.
- **SVG icons, never emoji** (`ICONS.md`; primary glyph = crescent+star; the wheel glyph for
  castings). All colour in `theme.css`, light only.
- **Consolidate, don't multiply** — check `recursive.eco-schemas` and the siblings before
  inventing any shape.
- **`python check.py` green before every commit.** Work on `dev`, publish `dev` → `main`.
- **Commit locally; don't push without the builder's OK** in app-connected sessions.
- **Every session ends with a journal/handover update** (`plan/HANDOVER-next-session.md`) — an
  undumped session is a lost session.

## 4. Reading a chart with the structure (added Sep 27 2026)

When a person brings you a chart, `grammars/the-structure-of-the-sky` is the skeleton to read it
by. It is data, not a voice: elements, modalities, polarities, planets, houses and aspects as
leaves; every sign as element + modality + polarity (`composite_of`); the house groups, axes and
quadrants as their houses. Rulers, exaltation, detriment, fall and triplicity rulers sit in each
item's `metadata`. Every sign, planet, house and aspect item in the voice grammars points to its
structure item through `metadata.source_deck` / `source_item_id` / `deck`.

1. **Walk the structure first.** For each placement: the planet → its sign → that sign's element,
   modality, polarity and ruler (and where that ruler stands) → the house and its group (angular,
   succedent, cadent) and axis → the aspects between placements. **Compute the aspects** from the
   positions (sign distance or degrees); a chart's aspects are never stored anywhere, and the
   aspect items only define the relationship.
2. **Then gather what the voices say** for those same items — follow the cross-link backwards, or
   match by `category` + `metadata.planet/sign/house`. Name the tradition every time ("Ptolemy,
   in Ashmand's 1822 translation, calls it…", "Lilly (1647)…", "the Bṛhat Jātaka…", "the
   Canonical synthesis…"). Where traditions disagree (the water triplicity's rulers; a tropical
   against a sidereal sign; a modern ruler beside a classical one), show both and say whose is whose.
3. **End with a question back to the person** — about their own life, in their own words, that
   the structure and the voices have opened. They answer; you do not answer for them.
4. **Never predict, never command.** No "you will", no "you must", no timing of events, no advice
   dressed as a verdict. A chart is a mirror and a calendar, never a command.
