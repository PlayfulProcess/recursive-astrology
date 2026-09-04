# App integration — the astro repo now hosts the chart calculator

**Direction change (Jul 19 2026, builder).** The old rule in this repo's docs —
*"this repo builds no app code, it is a thin static library site"* — is **reversed for the
chart calculator**. recursive.eco (flow) will **embed a page served from here**. The
grammar/library side keeps its static, no-backend character; the calculator is the one
deliberate exception.

## What was ported

`viewer/astrology-viewer.html` — the working birth-chart calculator, copied **wholesale**
from recursive-eco `apps/landing/pages/astrology-viewer.html` (read-only clone; that repo
was not edited). The ephemeris math was **not** rewritten — see the critical finding below.

## Critical finding the original port brief did not capture

**The chart math is not in the page — it is a backend API.** The calculator POSTs to
`/api/calculate-chart` (Skyfield / JPL DE421, server-side). There is no client-side
ephemeris to "copy."

### RESOLVED (Jul 20 2026) — the API is self-hosted here now, no CORS

The earlier blocker ("must call flow's API cross-origin; needs CORS config that lives in
the off-limits recursive-eco repo") is **gone.** The chart math turned out to be **two
portable files**, not buried config: `calculate-chart.py` + `requirements.txt`. They were
copied into **this repo's own `/api/`** (`api/calculate_chart.py` — underscore, so it's a
valid Python module name for Vercel's runtime; the public route stays `/api/calculate-chart`
via a `vercel.json` rewrite — plus `requirements.txt` at root), so the astro origin serves
`/api/calculate-chart` itself. `CHART_API_URL` is now the
**root-relative** path `'/api/calculate-chart'` — same-origin, **no CORS, no dependency on
recursive-eco.** (Source of the two files + the pipeline reference: the builder-supplied
`ASTROMATHEPITOME.md`.)

**Deploy target — calculator-only on Vercel (builder's call, Jul 20 2026):** the library
site keeps deploying via **GitHub Pages** exactly as before. Only the **calculator + its
API** go to **Vercel** (Python serverless — Vercel builds `api/*.py` with `requirements.txt`
and serves the viewer statically; same platform the I Ching repo uses). To keep the library
from being duplicated onto Vercel, a **`.vercelignore`** excludes every grammar/library/tool
file, so the Vercel build contains only `viewer/`, `api/`, `requirements.txt`, and
`vercel.json`. `vercel.json` rewrites `/` → `/viewer/astrology-viewer.html` so flow can embed
the Vercel domain root. The relative `/api/calculate-chart` resolves same-origin on that
Vercel deploy. **Setup:** create a Vercel project from this repo (root directory = repo root);
no build command needed; it auto-detects the Python function. Flow embeds the resulting
Vercel URL for the calculator; the Pages URL stays canonical for the library. **Cold-start caveat carried from the epitome:**
the function auto-downloads `de421.bsp` (~17 MB) to `/tmp` on first call — keep the
`get_ephemeris()` cache, warm via the GET health-check, or commit the `.bsp` if cold-start
latency bites. DE421 covers **1900–2050**; births outside fail (swap to `de440s.bsp`).

Two embed-contract requirements from the brief were **already implemented in the source**
and are preserved by the copy:
- **Step 2** — on calculation, `postMessage({type:'astrology-chart-calculated', …})` to the
  parent (source line ~3210).
- **Step 3** — the wheel-image responder: on `{type:'astrology-request-chart-image'}` it
  serializes the wheel SVG → canvas → `toDataURL('image/png')` → replies
  `{type:'astrology-chart-image', imageDataUrl}` (source ~2678). Still true after the
  AstroChart swap (Aug 4 2026): the library renders into a `<div>` inside `#chart-wheel`,
  so the `#chart-wheel svg` selector this responder relies on still matches, and the
  wheel's colours are CSS custom properties, which the responder already inlines.

Two later additions to the same contract (Aug 4 2026):
- **`?form=open`** — flow appends it when it opens the viewer as the *edit-chart* modal.
  The viewer then skips its render-time form collapse; the toggle button is still offered.
- **`{type:'astrology-set-patterns', patterns:[…]}`** (parent → viewer) — hands the viewer
  named chart patterns computed by flow's `lib/astro/pattern-engine.ts`, replacing the
  viewer's own three-figure detection. Each entry is
  `{ type, members: [engine planet keys], aspects?: ['a-b', …], detail? }`; an empty array
  hands detection back to the viewer. Tapping a pattern highlights it on the wheel and in
  the Planets/Aspects lists. Full contract beside `renderChartPatterns()` in the viewer.

## What the port changed (surgical, low-risk)

- **Asset base → flow; API base → self.** App-shell deps that only exist on flow
  (`/config.js`, `/assets/…`, `/style.css`, `/icons.svg`, `/spiral/…`, `/js/…`,
  `/favicon.png`) still resolve against `https://flow.recursive.eco` (or `dev.flow.…`), so
  the page loads its Tailwind/auth/icon shell. **`CHART_API_URL`, by contrast, is now the
  root-relative `'/api/calculate-chart'`** served by this repo's own `api/calculate-chart.py`
  (see the RESOLVED note above) — the math no longer depends on flow at all.
- **`RecursiveAuth.init()` guarded** so a missing/blocked auth shell can't hard-crash the page.
- **Step 4 — theme=light honored.** An appended override reads `?theme=light` and applies a
  light surface / dark text / purple-accent skin (the source was dark-only; dark slabs in
  the light app were the reported bug).
- **Step 5 — fullscreen is a CSS overlay, not the native API.** The native
  `requestFullscreen()` calls (`toggleFullscreen`, `toggleChartWheelFullscreen`,
  `toggleMandalaFullscreen`, `toggleBodygraphFullscreen`) are overridden to toggle a
  `position:fixed; inset:0` overlay with an ✕ / Esc exit — works inside the iframe and on iOS.

## Verification status — HONEST

This page **cannot be verified in the build sandbox**: it needs Tailwind's CDN, flow's
app-shell assets, and the remote `/api/calculate-chart` — all outside the sandbox's network.
It must be verified on a **Vercel preview deploy** against live flow, at mobile width, in
**light and dark**, checking: (a) the form renders and a calculation returns a wheel;
(b) `theme=light` shows light surfaces with no dark slabs; (c) fullscreen expands as an
in-page overlay, not a clipped native box; (d) the parent receives `astrology-chart-calculated`
and answers `astrology-request-chart-image`. Ship order per the brief: 1–3, then 4–5.

## Step 6 — HD Bodygraph (PROPOSAL ONLY, not built, awaiting approval)

Proposed redraw of the Human Design bodygraph so the nine centers read as clean geometric
primitives instead of the current busy rendering:

- **Center shapes (canonical HD geometry):** Head = triangle (apex up); Ajna = triangle
  (apex down); Throat = square; G/Identity = diamond (rotated square); Heart/Ego = small
  triangle; Sacral = square; Solar Plexus = triangle; Spleen = triangle; Root = square.
- **State:** *defined* = filled with the center's canonical colour; *undefined/open* =
  white fill, 2px outline in the same colour. One stroke weight everywhere (2px), one corner
  radius (2px) — consistency over ornament.
- **Channels:** straight lines snapped to fixed gate anchor points on each center's edge;
  a channel both of whose gates are active renders solid, a hanging gate renders as a short
  stub. No curves, no gradients.
- **Layout:** the standard vertical bodygraph proportions (~400×580), centers on the
  traditional grid so it reads as a Human Design chart at a glance.
- **Deliverable first:** a static mockup (SVG) for one sample chart, for approval, before any
  wiring to real gate/channel data.

## Not touched
`ids.json` UUIDs; the grammar/library side; recursive-eco (read-only). Secondary in-page
links to `grammar-viewer.html` still point at flow-relative paths — fine inside the embed,
flagged for a follow-up if the page is used standalone.

## Deploy topology (recorded 2026-08-06 — this cost a session to rediscover)

- **astro.recursive.eco** = GitHub Pages (this repo, main, legacy deploy-from-branch) — the LIBRARY site (index, lenses, viewers).
- **chart.recursive.eco** = Vercel project `recursive-astrology` — the CALCULATOR (viewer/astrology-viewer.html) + the Python API (api/calculate_chart.py, api/transit_timeline.py).
- One push to main deploys BOTH (Pages directly; Vercel via its Git integration).

