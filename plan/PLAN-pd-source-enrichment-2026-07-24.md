# PLAN — PD source-text enrichment of the astro grammars (Jul 24 2026)

Builder's goal: the original public-domain books' content, translated into the grammars so it
can be read/rendered in the chat (the app's astro oracle + get_birth_chart read interpretation
grammars; item `sections` text is what reaches the model and the reader).

## Hard rules (from this repo's CLAUDE.md — agents must re-read it)
- NEVER invent a citation, quote, or URL. Only text actually fetched from a real source.
  If a source can't be fetched, STOP that book and report — no paraphrasing from memory.
- Attribute every passage: author, translator, year, source title. Flag paraphrase as paraphrase.
- Hedge contested history (`metadata.confidence`), autonomy floor everywhere (mirror, not fate).
- `python check.py` must end "OK: all checks passed" after every edit.
- No images.

## Copyright triage (what "PD" means per book)
WAVE 1 — high confidence, clean sources, run now:
1. **Ptolemy, Tetrabiblos** — J.M. Ashmand translation (1822), full text on sacred-texts.com.
   Target grammar: the Ptolemy / Tetrabiblos interpretation set.
2. **Varāhamihira, Brihat Jataka** — N. Chidambaram Iyer translation (1885), archive.org.
   Target: jyotisa-brhat-jataka.
3. **Alan Leo** (died 1917 — all works PD) — e.g. "Astrology for All" / "How to Judge a
   Nativity", archive.org full texts. Target: the modern-psychological / planets-signs grammars.

WAVE 2 — worth doing, harder sources (next session / after Wave 1 review):
4. William Lilly, Christian Astrology (1647, PD) — OCR quality of 17th-c type is rough;
   needs the transcribed editions, careful per-passage checking. Target: william-lilly grammar.
5. Sepharial + Raphael (both PD) — archive.org.
6. Manilius, Astronomica — ONLY the Creech 1697 verse translation is PD (Goold/Loeb is NOT).
7. Mesopotamian omens — most scholarly translations are modern/copyrighted; only fragments in
   old PD sources (e.g. Thompson 1900 reports). Enrich sparsely or leave.
FLAG FOR BUILDER (not PD, "free" but licensed): Vettius Valens (Riley translation), Al-Biruni
(Ramsay Wright 1934), Firmicus Maternus (Bram 1975 — NO). Do not use without her call.

## Method (per book, one agent each)
1. Fetch the real text (WebFetch: sacred-texts.com / gutenberg.org / archive.org "full text" pages).
2. Map book structure → the target grammar's EXISTING items (planets/signs/houses/aspects/
   dignities). Do not restructure the grammar; enrich items' `sections` additively — add a
   section like "The record — <Author> (<year>)" holding faithful excerpts (trimmed for length,
   ~150-400 words per item, ellipses marked), plus `metadata.source` with author/translator/
   year/title. Keep the existing intention/voice sections untouched.
3. Where the book has no passage for an item, leave the item alone (honest gap beats filler).
4. `python check.py` green. NO git commands — the coordinator commits/pushes.

## Rendering in chat
The app reads grammars from the DB copies; repo enrichment reaches the app via the existing
import/sync (ids.json ↔ UUID maps already exist for these grammars — e.g. the Jul 20 "Import
them" mappings). After Wave 1 is pushed, re-import/sync the enriched grammars in-app (or via
the channel sync) so the oracle + get_birth_chart actually serve the new text.

## Budget plan (builder: "use all of my weekly tokens for this")
All agent work on Sonnet (All-models pool, 60% used at plan time; resets Mon 1PM).
- Wave 1: 3 parallel Sonnet agents (~1 book each). Coordinator (Fable, 98% used) stays terse.
- Wave 2: 2-4 more Sonnet agents after Wave 1 review + her copyright calls.
- If pool nears the cap, prefer finishing fewer books COMPLETELY over sampling all.
