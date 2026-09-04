# Working with recursive.eco from recursive-astrology

**What this is:** the contract between this open astrology repo and the recursive.eco app —
ownership, the sync rules, and how the chart-aspect castings plug into the oracle. Adapted from
`recursive-tarot/docs/RECURSIVE-ECO-INTEGRATION.md` (the fuller, battle-tested version — read it
for the drift war stories) and `nara/docs/RECURSIVE-ECO-INTEGRATION.md` (the sibling companion).

## 1. The shape (what makes this repo a channel)

- **`recursive-eco.json`** — the channel manifest (`channel.slug: "astrology"`). recursive.eco
  imports this repo as a channel by reading it from
  `raw.githubusercontent.com/PlayfulProcess/Recursive-astrology/<default_branch>/recursive-eco.json`.
- **`grammars/*/grammar.json`** — one folder per grammar (interpretation sets, voice libraries,
  the historiographies record, and the `casting-*` spread-grammars).
- **`ids.json`** — slug → recursive.eco grammar UUID; `_public_now` lists what's live. Keep it
  updated every time a grammar is created in the app (the MCP `create_grammar` returns the UUID).

## 2. Branch model (mirrors the tarot repo)

Work on **`dev`**; publish by merging **`dev` → `main`**. `main` is the app's read path (the
manifest's `default_branch`) and the target of any app→repo sync PRs. GitHub Pages deploys this
repo's site. Reconcile app write-backs on `main` back into `dev` — merge, never force.

## 3. Ownership — who's the source of truth for what

Same three buckets as the tarot contract:

- **A. App-owned fields** (database wins on write-back): `items`, `name`, `description`, publish
  state, `default_view`, `open_to_community`, and the app's roundtrip URLs (`_recursive_eco_url`
  etc.).
- **B. Repo-only fields** (repo tooling owns; a sync must never drop them): **`_grammar_commons`**
  (the license + attribution block — on every grammar here), **`_research`** pointers and
  **Research note** sections with `[@citation]` keys (from `research/`), the **`casting`** block
  on spread-grammars, and `provenance` fields. A write-back must merge onto the current repo file
  (`{...repoFile, ...appDocumentData}`), not replace it — see the tarot doc §5 for why (PR #28).
- **C. Generated / repo-canonical grammars**: none generated yet in this repo. When Phase 3's
  `figures-of-astrology` is generated from `research/figures/*.md`, stamp it `_generated: true`
  **and** `_source_of_truth: "research/figures/*.md"` so the app's sync skips it (the tarot repo
  learned to set both).

This channel binds as **`source_of_truth: 'repo'`** (channel-level), like nara/kali/tarot.

## 4. Castings as data — the spread-grammars

Per `recursive-eco/docs/future_plan/DESIGN-oracle-app-spreads-as-grammars.md`: **a spread IS a
grammar.** This repo defines three, in `grammars/casting-*/grammar.json`. Items are positions
(`{ position, maps_to, sections: { Position, Prompt } }`) plus a top-level `casting` block
(`{ draw, from, allow_reversed, requires }`).

**The astrology-defining constraint (the builder's rule): the draw is NEVER random.** Tarot draws
from a shuffled deck; astrology's "deck" is the querent's own chart, so every position **derives**
from an aspect of a given chart:

| casting | positions | `draw` | needs |
|---|---|---|---|
| `casting-big-three` | Sun · Moon · Ascendant | `derived` | date(+time+place for ASC) |
| `casting-twelve-houses` | the 12 houses, `layout: "wheel"` | `derived` | full chart calc |
| `casting-single-aspect` | any ONE chart feature | `choose` | none (querent knows it) or a calc |

`allow_reversed: false` everywhere — reversal is a card mechanic, not a chart one.

**The ephemeris boundary (what's data vs. what needs a calc):** position *definitions*, prompts,
and interpretation items are pure data in this repo. Resolving a real birth moment → house cusps,
sign placements, and exact aspects needs an ephemeris-backed engine, which the app owns — the
family already has one (the Skyfield backend noted in `nara/research/assets-inventory.md`, i.e.
recursive-eco's `calculate-chart.py`). Until it's wired: `fallback: "user_entered_placements"`
(the querent types placements they already know), which keeps every casting usable data-only from
day one. `wheel.html` in this repo renders `casting-twelve-houses` as a wheel without any calc.

## 5. Open a grammar in the app (once bound)

`https://flow.recursive.eco/play?id=<UUID>` (UUIDs in `ids.json`). In-app deep-links use the
`oracle:astro:<UUID>` scheme — **this channel's oracle kind is `astro`**, shared with nara. The
full preview-link set (Cards/Study/Tree on recursive.eco, Play/Edit on flow) is kept
machine-readable in `ids.json` → `_preview_links`.

## 6. The creed carries into the integration

Whatever surface a casting reaches, the autonomy floor travels with it: positions hand the querent
prompts about their own chart, never verdicts; the enriched AI reading must read this repo's item
sections as *mirror-prompts*, not predictions. If a path here stops matching the app, fix it here
first — the repo is the open contract.
