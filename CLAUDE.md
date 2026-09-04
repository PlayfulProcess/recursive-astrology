# CLAUDE.md — The Recursive Astrology

*This is the astrology counterpart of [The Recursive Tarot](https://tarot.recursive.eco) — the same
creed and method, a different domain. This file is what Claude reads first when working in this repo.*

## What this is

A small, mostly-static website for a **library about the historiography of astrology** — the eras and
stances through which humans have read meaning into the sky, each presented faithfully in its own
terms and held honestly to the record. **(Exception, Jul 19 2026: the library side stays static, but
`viewer/astrology-viewer.html` is a ported chart calculator that flow embeds — the old "no app code"
rule is reversed for that one page. See [`docs/APP-INTEGRATION-TODO.md`](docs/APP-INTEGRATION-TODO.md).)** Built on the recursive.eco grammar format. It is **not** a
manual for casting charts and **not** a verdict on whether the sky speaks; it is a record of a
five-thousand-year practice of meaning-making. The data is public JSON; the site is thin HTML; the
point is that the **data**, not the platform, is what lasts.

## The one rule — the creed is the spine

The whole project turns on `voices.json` → `shared_intention`:

> **Read the sky to know yourself, not to be told your fate. A chart is a mirror and a calendar, not
> a command. Relate to the symbol; never obey it.**

That creed is the container shown above every voice and every view. The one hard floor everywhere:
**stay autonomy-preserving — never state a chart as prediction or as something to obey.** Astrology's
history is the record of humans reading meaning *into* the sky; that history is the subject here.

- **Gate, not fate — and let each tradition speak as itself.** Under the creed, present each stance
  *faithfully, in its own terms* — a voice's `how` should sound like Ptolemy (or Jung, or the
  skeptics), not like us editorializing about it. Render any *disagreement* with a tradition in the
  long form (its **course** / the grammar's "The record" section), never in the short **intention**.
- **Name a school, not a living person.** Only dead, eponymous figures carry their own name (Ptolemy,
  Jung). A stance drawn from living teachers is titled by its tradition and says "inspired by." The
  Skeptical School is named as a *tradition of critique*, not as any one person.
- **Consolidate, don't multiply.** Prefer turning a new idea into something we already have — a
  **voice** (`voices.json`), a **view** (an item in the grammar), or a **pattern** (an L2
  `composite_of` grouping) — over a parallel structure.

## Sources & honesty (hard guardrails)

- **Never invent a citation, quote, or URL.** Doubt → hedge, attribute ("Campion argues…"), or omit.
  Name only books and studies you are certain exist; no page-level citations; no fake links.
- **Hedge contested claims.** Use `metadata.confidence: "medium"` or `"low"` where the history is
  disputed (e.g. the Hellenistic→Jyotiṣa transmission). Date with "c." where dates are reconstructed.
- **Flag paraphrase as paraphrase.** Where you give a famous line, quote verbatim only if certain of
  the wording; otherwise paraphrase and *say so* (see the Ptolemy item — the "stars incline, they do
  not compel" tag is flagged as a later Latin maxim, not a *Tetrabiblos* quotation).
- **Illustrations: public-domain only, sourced and recorded** (builder, Jul 26 2026 — this
  REPLACES the former "No images" rule, which held that honest sourcing of public-domain
  plates was a later job. That job is now open). An item may carry `image_url` only when the
  image is genuinely public domain (Wikimedia Commons or an equivalent host that states the
  status), and the item records where it came from and why it is PD. Never hotlink an image
  whose status you have not checked, never reuse one generic picture across unrelated items,
  and an honest gap still beats a wrong or decorative picture.
- **Autonomy floor everywhere:** nothing states a chart as prediction or command.

## Architecture (don't change without reason)

- **Grammars** live in `grammars/<slug>/grammar.json`. One file per library. The main one is
  `grammars/historiographies-of-astrology/grammar.json`. See [`GRAMMAR_FORMAT.md`](GRAMMAR_FORMAT.md)
  for the canonical shape.
- **All colour lives in `theme.css`** — one `:root` of tokens, linked by every page. Never redeclare
  colour tokens in a page, and never add a dark-mode block. Light only. To change a colour, edit
  `theme.css` once.
- **`index.html`** reads one grammar and renders it. Add pages the same way — thin, self-contained,
  linking `theme.css`.
- **A leaf** is an item with `sections`. **A pattern** is an item with `composite_of: [ids]` — that's
  how the historiographical structure emerges without a database.

## Before you commit

Run `python check.py` — it must end **"OK: all checks passed"**. It validates every grammar against
the format and catches the mistakes that stop a grammar from loading.

## Connecting to recursive.eco (optional)

Grammars here can also open in the recursive.eco app — for the live oracle, AI readings, and
community editing. See the integration reference in the parent project
(`docs/RECURSIVE-ECO-INTEGRATION.md`) for how a repo wires to a channel.
