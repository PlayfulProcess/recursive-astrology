# Future plans — logged 6 September 2026 (from the author, in the books session)

## Bugs seen on dev.flow.recursive.eco (astro tab), 6 Sep, console

1. **The chart does not render.** `POST /api/calculate-chart` → **405** (Method Not Allowed) on
   dev.flow, from `astrology-viewer.html:4308 calculateChart` on both `loadSavedChart` and the form
   submit. That is a flow route problem (method not exported / wrong path on the deployed branch), not
   the viewer. Fix in `recursive-eco/apps/flow/src/app/api/calculate-chart/route.ts` (or wherever it
   lives) — confirm `export async function POST` and that the dev deployment carries it.
2. `rpc/astrology_grammar_options` → **500** from Supabase ("Error loading user astrology grammars").
   A broken RPC or a missing grant on dev.
3. `site-shell-inline.js:511 Mobile menu elements not found` — harmless, but noisy.
4. `cdn.tailwindcss.com should not be used in production` — the viewer still loads Tailwind's play
   CDN; replace with a built stylesheet.

## Product

5. **The toggle of past charts** must be far more visible in the hero section — today it is buried.
6. **The genealogy must populate with all the schools** (it renders a subset).
7. **One bodygraph renderer, exported, no drift.** Today the bodygraph and mandala live inline in
   `astrology-viewer.html` (`renderHDBodygraph` ~L9748, `renderHDMandala` ~L9486) with the framework
   tables (`HD_GATE_ORDER`, `HD_CENTERS`, `HD_CHANNELS`, `GATE_POSITIONS`) in the same file. The I Ching
   site needed 64 "gate N lit" glyphs and, lacking an export, redrew them from copied tables — the
   centres and channel routing do not match the real drawing, which the author spent a long time
   getting right, and copies drift. Wanted:
   - `viewer/hd-render.js` — a pure module: `renderBodygraph(activations, opts) → SVG string` and
     `renderMandala(activations, opts) → SVG string`, with the framework tables inside it as the single
     source of truth; the viewer imports it; no DOM needed (so Node can run it).
   - `viewer/bodygraph.html?gates=29&mode=gate` — a pretty standalone page (same model as the spiral
     in recursive.eco) with **Export SVG / PNG**, later `?planets=…` to overlay planetary activations.
   - `scripts/export-glyphs.js` — writes `gate-01..64.svg` from the module; the I Ching repo consumes
     those files (or fetches them) instead of drawing its own. Delete `recursive-iching/scripts/build_hd_glyphs.py`
     once this exists.
   - Planets later: the same module takes an activation map keyed by planet (Design/Personality) —
     the viewer already computes it.

## Prompt to paste into a fresh chat opened in `recursive-astrology` (and `recursive-eco` for items 1–2)

```
Read docs/FUTURE-PLANS-2026-09-06.md. Do items 5, 6 and 7 here in recursive-astrology:
(5) make the past-charts toggle prominent in the hero; (6) populate the genealogy with every school in
grammars/historiographies-of-astrology; (7) extract the Human Design bodygraph + mandala renderers and
their framework tables from viewer/astrology-viewer.html into viewer/hd-render.js as pure functions
returning SVG strings, make the viewer use the module, add viewer/bodygraph.html with ?gates= and Export
SVG/PNG, and add scripts/export-glyphs.js that writes 64 gate-lit SVGs to img/hd/ — then tell me the
file names so the I Ching repo can switch to them. Run python check.py before committing. Do NOT push
recursive-eco to production; for items 1–2 (405 on /api/calculate-chart, 500 on
rpc/astrology_grammar_options on dev.flow) diagnose in recursive-eco on a branch and report.
```
