# How to Write a Course (Recursive method)

This is the pipeline used to write **"The Right Size"** (astro) and **"How the Cards Can Work"** (tarot). It exists so the next course — by the builder, by Claude, or by a contributor — is made the same careful way. The same doc lives in `recursive-tarot/docs/` and `recursive-astrology/docs/`.

The goal is courses that are **honest, grounded, in the builder's voice, and non-repetitive** — a reading you'd trust, not a sales pitch for a belief.

## The four phases

### 1. Research first — with adversarial honesty
Never write from memory. Spin up focused research agents (one per theme), and hold them to one rule: **verify every factual or attributed claim by actually fetching/finding the source before it goes in.** Each dossier marks confidence explicitly:

- ✔︎ verified (title + author + venue + year, with DOI/URL)
- ○ real source but paraphrased / partial
- ◆ contested or could-not-verify

Dossiers live in `research/why-<topic>/`. Rules learned the hard way:
- **Exclude contested claims.** The tarot research caught a *retracted* paper (Brooks 2016) and dropped it; the astro course dropped the "wood-wide-web" because the mycorrhizal "mother tree" claims are contested (Karst et al. 2023). If the record is mixed, either leave it out or **show both sides** — never launder a contested claim into a confident sentence.
- **Report against yourself.** Where the evidence undercuts the course's own thesis, say so in the course. (The astro course states plainly that the lunar-behavior effect — the claim closest to astrology's own — mostly isn't there.)
- **Don't overclaim a person's view.** Wallis has no stated position on astrology, so the course uses him only to ground deity/devotion, never implying he endorses astrology.

### 2. Thesis + outline — proposed, then confirmed
Synthesize the dossiers into **one-sentence thesis** + a **section outline**, and get the builder's sign-off before writing. Two hard constraints:
- **Distinct but rhyming.** Each course must stand on its own spine, not repeat a sibling. Tarot grounds in *Tolkien* (made-up pictures carry real seeing); the astro reading grounds in *devotion / relationship / right-size* (the sky as a shared secondary world). Same honesty spine ("real X, yes; prediction, no"), different body. If your opening reads like another course's opening, rewrite it.
- **The honesty spine is non-negotiable.** The course never claims the practice predicts. It claims something truer and more interesting.

### 3. Write the prose — in the builder's voice
Author the course as a single `course/<slug>.mdx` (source of truth). Voice: **first-person, warm, humble, literary, willing to argue against itself, no AI-ish bullet sprawl.** Read the builder's own writing (her books repo, prior courses) to match register and borrow her load-bearing ideas *in her words* ("you just relate; the moon is relationship"; "right size" between hubris and despair). Close the loop: the final section should call back to the opening image so the whole reads as one gesture.

**If a course needs to explain a grammar JSON field's shape** (what `composite_of` means, what `sections` are, what `ref_document_id` does), **don't restate it from memory** — link to [`GRAMMAR_FORMAT.md`](https://github.com/PlayfulProcess/recursive.eco-schemas/blob/main/GRAMMAR_FORMAT.md) and show only the minimal example the course's narrative actually needs. A restated field table drifts out of sync with the real schema the moment the schema changes; a link never does.

### 4. Deliver + verify + review
- **Tarot:** the course-viewer renders MDX directly (`?course=<slug>`). Regenerate the compiled anthology + grammar mirrors (`scripts/course_to_grammar.py`, `scripts/build_reading_course.py`).
- **Astro:** the course-viewer is grammar-driven. Convert the MDX into `grammars/<slug>/grammar.json` (each `##` section → one chapter item, prose in a `Reading` section), add `course/<slug>.manifest.json` naming its `sourceGrammar`, and register it in the `COURSES` map in `pages/course-viewer.html` + the Views menu in `site-header.js`. Default course (no `?course=`) must keep working.
- **Verify** with Playwright at 390×844 against a local `python3 -m http.server`: the course renders, TOC works, no page errors, and the default course still loads.
- **Review for flow:** read the whole thing start to finish and check it doesn't contradict itself or repeat a sibling course. This step is not optional.

## Voice guardrails (added Jul 8 2026 — read before touching any published course prose)

Learned from a live editing pass on "How the Cards Can Work." Apply these on every future
edit to any course in the family (tarot, astro, I Ching, and whatever comes after):

- **Thesis first, short.** The subtitle and the opening paragraph must fit in two or three
  sentences a reader can hold before diving in. If the opening runs past ~120 words before
  it makes its point, cut it down.
- **Fate is pattern, not prediction — say so plainly, once.** The house thesis, for every
  practice this project reads (tarot, astrology, I Ching): *a reading doesn't tell you your
  fate — it might help you create it.* Never write command-shaped absolutes about what a
  reader must or must never do with a reading ("never obey," "gate not fate," etc.) — state
  the honest relationship once, plainly, and move on.
- **Don't open on a borrowed hero.** Ground the opening in the recursive.eco idea itself —
  we make belief in order to make meaning; a meaning is at best a map, never the whole
  territory; when a map stops serving us (not a failure — just a map meeting new territory),
  we draw a new one, not truer, just better suited to where we actually are now — *before*
  reaching for an external authority (Tolkien, Tarnas, Wallis, whoever). The authority earns
  their place later, in their own section, credited and linked to the source — never as the
  reason the reader should start caring in the first place. (Correction, Jul 9 2026: an
  earlier version of this rule said "truer for having crashed" — the builder caught that this
  still smuggles in a claim of progress/solidity the map metaphor is supposed to avoid. A new
  map isn't truer than the old one; it's just what currently serves. Don't say "solid" and
  "not solid" about the same belief in the same paragraph, either — pick one honest frame
  (a map, never solid, always partial) and hold it.)
- **Cut throat-clearing.** Delete meta-narration like "here is the shape of it, so you can
  see where we're headed before we walk through it line by line" — say the thing; don't
  announce that you're about to say the thing.
- **Honesty is a chapter, not the opening line.** "There is no evidence X predicts anything"
  belongs in its own honest section (Phase 1's research discipline, above) — stated once,
  squarely. Don't lead the whole piece with a negative claim; warmth and thesis come first.

## Post-draft audit checklist (added Jul 9 2026)

Once a course reads as finished, run this pass before calling it done — these are the specific
failure modes a live editing session on "How the Cards Can Work" caught after the fact:

- **Absolutist statements.** Grep your own draft for "never," "always," "cannot," "impossible,"
  "the only," "no one has ever." For each hit, ask: is this actually warranted, or is it a
  rhetorical flourish that oversells the claim? "There is no reliable evidence X" is fine and
  sourced; "X cannot happen" usually isn't earned by the evidence you actually have. Prefer
  the honest, weaker claim — "no one has shown it" — over the stronger, false-precise one
  ("it's impossible") unless you can actually source the stronger claim.
- **Feeling tags.** Watch for adverbs and asides that tell the reader how to react instead of
  just presenting the thing — "remarkably," "strikingly," "beautifully," "it's worth noting
  that," "importantly." If the fact is genuinely striking, the reader will feel that without
  being told to. Cut the tag; keep the fact.
- **Don't assume a source's self-awareness.** Don't claim a cited author "knew" or "didn't
  know" what they were doing, or attribute intent beyond what the text itself supports. Say
  what the text argues, not what was going on in the writer's head.
- **Don't invent authority through age.** Avoid rhetorical moves that treat "ancient" as a
  synonym for "wise" or "true" (the tarot-Egyptian-origin myth is the canonical example of
  this going wrong — a fabricated 18th-century backstory, not history). Age is not evidence.
- **A list of examples isn't a numbered sequence.** If a source names several things without
  claiming they're ordered or exhaustive (Tolkien's gifts of fantasy are the recurring case),
  don't impose false rigor — "not a closed list, not a strict sequence" is more honest than
  building an argument on an order the source didn't actually assert.
- **One negative-then-positive pass per critique, not a back-and-forth.** When rebutting a
  common criticism (e.g. "fiction/fantasy is just escapism, and escapism is cowardly"), state
  the critique once, then land the reframe once. Don't alternate between the negative and
  positive framing more than that — it reads as flip-flopping, not as argument.

## The principle under all of it

> The metaphysics we cannot know; the relating we can.

A Recursive course never asks you to believe the practice works by magic. It grounds what is real, is honest about what isn't, and offers the rest as a secondary world we may *choose* to relate through — held lightly, with room for the cracks. That honesty is the reason the courses are worth trusting.
