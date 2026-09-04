# Design — the Oracle Trinity: every casting is (source × spread × voice)

Builder's synthesis (Jul 2026), built on. This generalizes TarotCaster to every tradition
and fixes the misclassification she spotted (Three Doors offered as an astro interpretation
set, which it is not).

## The trinity

Every oracle act decomposes into three roles, each fulfilled by a GRAMMAR:

1. **SOURCE — what gets drawn.** Tarot: a deck. I Ching: the 64. Astro: **your own chart** —
   the aspects/placements you already hold are the "cards"; casting selects among them.
   Eastern contemplative caster: Dao De Jing chapters as a deck. Human Design: a BRIDGE
   source — its gates carry BOTH a hexagram number AND a zodiac degree, so the same grammar
   is drawable in the I Ching oracle and readable on the astro wheel. (HD is the proof case
   that sources cross traditions.)
2. **SPREAD — positions to cast through.** Already shape-inferred (`isSpreadGrammar`:
   items with position+prompt, or a casting block). casting-big-three etc. ARE this.
3. **VOICE — who speaks about what landed.** The interpretation grammars (Ptolemy, Lilly,
   Jyotiṣa, Alan Leo, planetary myths…). The lenses viewer already cross-matches these.

And a fourth thing that is NOT an oracle role: a **READING** (Three Doors, The Right Size) —
chapters to be read in order. Belongs in Courses, never in oracle pickers.

## Classification: infer by AFFORDANCE, declare only at the offering

Per recursive-eco doctrine (types rot; every runtime type-gate eventually comes down):
- **Spread**: inferred (already shipped — `isSpreadShaped`).
- **Voice**: inferred — items carry matchable entity keys (metadata.planet/sign/house/graha,
  hexagram number, trump key). "Can this grammar answer a placement query?" = yes → voice.
- **Reading**: inferred by exclusion — sectioned items with NO matchable entity keys.
  → Three Doors drops out of the astro interpretation dropdown automatically. FIX NOW.
- **Where inference is genuinely ambiguous, the CHANNEL OFFERING declares the role** — the
  tools row (the submission), not the grammar. "Astro publishes a deck AS a spread" is a fact
  about the offering; workflow state lives in `tools` (the validated architecture). A grammar
  can be offered to the iching channel as a source and to tarot as a deck — one grammar,
  many roles, no stamp on the document.

## AstroCaster (the concrete next build)

In the astro oracle, a third toggle beside Wheel and Human Design: **Cast**. Flow:
pick a spread (casting-* grammars, shape-inferred) → the caster DRAWS from your chart's
aspects/placements (not random: a selection over the real sky you were given — Aparā, the
given) → each landed aspect renders through the chosen VOICE grammar → AI interpretation
inline, save to journal, exactly the TarotOracle loop. Reuses `castThroughSpread` (it is
deck-shape-agnostic by design — the deck items are opaque; chart aspects are just items).

**Astro of all Astros**: a meta-voice aggregating every voice's entry per entity (the same
mechanism as Tarot of All Tarots + the lenses matcher) — one draw, all traditions answering.

## The federation rule (her "channels publish across")

Channels offer grammars to OTHER channels' oracles via the existing offering flow. The
oracle infra stays ONE implementation (the simpler current one she prefers); what travels
is the grammar + its offered role. Eastern seeds in recursive.eco-schemas → contemplative
caster spreads/texts that are not-exactly-iching, offered wherever they play well.

## Order of work
1. DONE: exclude readings from the astro interpretation picker (affordance inference).
2. SUPERSEDED (builder ruling, Jul 2026): the AstroCaster/Frame does NOT live in flow.
   Flow is the minimum common denominator; frames are this repo's own instrument —
   see docs/DESIGN-wheel-frames.md. The flow implementation is removed.
3. HD bridge keys (hexagram number + zodiac degree on gate items).
4. DONE: Astro-of-all-astros meta-voice. Next: aspects/dignities commented grammars.
5. Offering-role plumbing (tools row field) only when inference genuinely fails in practice.

## Refinement (builder, same day): keys live on ITEMS; the dropdown queries affordances

- **Voice inference is ITEM-level metadata** — already true in the app (astro matches
  metadata.planet/sign/house). So the Golden Dawn deck becomes an astro voice by ADDING
  astro keys to its items (each card already has decan/planet correspondences in Book T) —
  the same grammar reads as tarot AND as astro. Grammar-level "type" only for spreads
  (a shape fact), item-level keys for everything matchable. I Ching likewise: hexagram
  number on items.
- **How HD-in-the-iching-repo appears in the astro dropdown**: the picker must stop
  filtering by channel and instead query "public grammars whose items answer THIS oracle's
  keys" (planet/sign/degree for astro; hexagram number for iching). Channel = where it's
  offered; affordance = where it can speak. One indexed query (or a summary-column flag
  maintained by trigger) makes this cheap.
- **Personal chart grammars (the synastry path)**: a chart saved as a grammar — items =
  placements/aspects, keyed like any voice (metadata.planet/sign/house + degree). Make one
  for me, my husband, my daughter → the oracle lists all three as SOURCES; casting another
  person's journey auto-fills their aspects (chart×chart = synastry for free, because both
  sides speak the same item keys). "Save reading as grammar" already points this direction;
  the chart-as-grammar is its completion.
