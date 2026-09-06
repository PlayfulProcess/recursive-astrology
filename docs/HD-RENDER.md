# `viewer/hd-render.js` — one bodygraph renderer, exported

*Written 6 September 2026, for the sibling repos that consume this drawing.*

## Why it exists

The Human Design bodygraph and mandala used to live inline in `viewer/astrology-viewer.html`,
eleven thousand lines down, with their framework tables beside them. The sibling
[recursive-iching](https://iching.recursive.eco) site wanted sixty-four "gate N lit" glyphs,
could not import anything out of an HTML file, and so **copied the tables out and redrew the
board**. The copy drifted: its centres and its channel routing stopped being the ones here, which
took a long time to get right.

A copy always drifts. So the tables and both drawings now live in one module, and everything
consumes it:

| Consumer | What it does |
|---|---|
| `viewer/astrology-viewer.html` | the live chart. Thin wrappers; `renderHDBodygraph()` / `renderHDMandala()` keep their names and call sites |
| `viewer/bodygraph.html` | the standalone page — `?gates=`, Export SVG / PNG |
| `scripts/export-glyphs.js` | writes `img/hd/gate-01.svg` … `gate-64.svg` under Node |
| recursive-iching | consumes those files; deletes `scripts/build_hd_glyphs.py` |

**There is exactly one copy of every table in this repo.** If you find a second, that is the bug.

## Loading it

It is a UMD file — no build step, no bundler, nothing to install.

```html
<!-- browser: assigns window.HDRender -->
<script src="/viewer/hd-render.js"></script>
```

```js
// Node
const HD = require('./viewer/hd-render.js');
```

## The two functions

```js
renderBodygraph(activations, opts) → SVG string
renderMandala(activations, opts)   → SVG string
```

Both are **pure**: no `document`, no `window`, no module-scope chart state. They take arguments and
return a string. That is the whole contract.

They return **SVG and nothing else**. The mandala's legend is HTML (utility classes and a real
`<button>`), so it is a third export rather than markup smuggled into an SVG string:

```js
mandalaLegendHTML(opts) → HTML string   // swatches; plus the zodiac button when opts.interactive
```

The bodygraph's legend is genuinely SVG and stays inside the drawing (`opts.legend`).

## `activations` — what is lit

The shape the viewer already holds. Pass it `hdChart` unchanged:

```js
{
  activatedGates: Map<number, { personality: boolean, design: boolean, planets: [...] }>,
  definedChannels: [ { id: '20-34', ... } ],
  definedCenters:  Set<'sacral' | 'throat' | …>
}
```

Looser shapes are accepted, because a caller holding one gate number should not have to build a
chart:

| Field | Also accepted as | Notes |
|---|---|---|
| `gates` / `activatedGates` | `Map`, `Set`, `number[]`, `[{gate, personality, design}]`, or an object keyed by gate | a bare gate number reads as **Personality** (the accent hue) — a gate has to be lit by something |
| `channels` / `definedChannels` | `string[]`, `Set<string>`, `[{id}]` | **omit it and it is derived**: a channel is defined when both its gates are lit |
| `centers` / `definedCenters` | `string[]`, `Set<string>` | **omit it and it is derived**: a centre is defined when a defined channel touches it |

The derivation is the same rule the chart itself uses, so a caller with a whole chart and a caller
with `{ gates: [29] }` cannot disagree about the drawing. `HDRender.normalize(activations)` returns
the resolved `{ gates, channels, centers }` if you want to read it (the standalone page uses it for
its "N gates lit · N channels defined" caption).

The **Design / Personality distinction** is the `personality` and `design` booleans on each gate:
both true reads as `both` (gold), design alone as `design` (red), personality alone as
`personality` (accent). It is emitted as `data-act` on every gate element and is what the selection
CSS reads.

## `opts` — the presentation choices

Every default is the viewer's old behaviour, so `renderBodygraph(hdChart)` with no opts at all
draws exactly what the viewer drew when this code lived inline.

| Option | Default | What it does |
|---|---|---|
| `interactive` | `true` | emit the `onclick` handlers (`selectHDGate`, `selectHDChannel`, `selectHDCenter`, `setChartSelection`) and `cursor:pointer`. **An exported file or a page with no selection bus must pass `false`** — those functions only exist in the viewer |
| `legend` | `true` | the bodygraph's legend strip. `false` also shortens the viewBox from `400×692` to `400×638`: the 54 units below `y=638` exist only to hold the legend |
| `legendMode` | `'activation'` | `'activation'` colours each lit gate by the side that lit it; `'center'` drops that hue so what stands out is which centres are lit. The viewer's two pills |
| `zodiacMode` | `'tropical'` | mandala. `'sidereal'` turns the zodiac back by `ayanamsaDegrees` |
| `ayanamsaDegrees` | `0` | **the caller supplies it** — this module does not know what moment it is drawing. The viewer passes the real figure for the chart's moment and school |
| `size` | `520` | the mandala's square side |
| `viewBox` | derived | `{ w, h }` override for the bodygraph board |
| `planets` | `null` | mandala only — see below |
| `embedStyle` | `false` | write the `--bgc-*` palette into the SVG itself |
| `theme` | `'auto'` | with `embedStyle`: `'auto'` (light, dark under `prefers-color-scheme`), or `'light'` / `'dark'` to pin one |

### `opts.planets` — the one thing that is not derivable

Where the planets sit is a fact about a chart, not about the system, so it arrives ready-made:

```js
planets: [
  { key: 'sun', lon: 12.5, symbol: '☉', type: 'personality' },
  { key: 'sun', lon: 284.6, symbol: '☉', type: 'design' }
]
```

`lon` is ecliptic longitude in degrees. Hue is decided inside the module from `type`, so the
mandala and the bodygraph cannot end up calling Design two different reds. `null` draws a bare
wheel. (The viewer builds this list in `hdMandalaPlanets()` — the birth chart's longitudes first,
then the 88°-earlier design cast.)

## Colour

The drawings paint in `--bgc-*` custom properties and follow the host page's theme. A standalone
`.svg` file has no host page, so `opts.embedStyle` writes the palette into the SVG itself.
`HDRender.PALETTE` (`.light` / `.dark`) and `HDRender.paletteCSS(theme)` hand the same values out
if you want to set them yourself — `viewer/bodygraph.html` does exactly that rather than restating
them, because a restated palette is a palette that drifts.

## What is deliberately NOT in the module

The **selection layer**. What the reader has tapped is stamped onto the finished DOM as
`.hd-focus` / `.focused` by the viewer's `applySelectionToHD()`, and read by CSS. It never touches
the SVG string, so a tap never rebuilds the drawing — and the module never has to know about it.

The hooks it hangs off *are* emitted here and are part of the contract. Don't rename them without
the CSS:

- classes `hd-gate`, `hd-channel`, `hd-center`, `hd-hit`, `hd-layer-channels`, `hd-legend-sel`
- attributes `data-hd-gate`, `data-hd-channel`, `data-hd-center`, `data-ch`, `data-act`, `data-def`

`hd-legend-sel` is the legend's second row and is hidden in CSS off `.hd-focus`. An exported file
carries `.hd-legend-sel{display:none}` in its own `<style>` for the same reason.

## Also exported

```js
HDRender.tables            // HD_GATE_ORDER, HD_WHEEL_START, HD_GATE_ARC, HD_LINE_ARC,
                           // HD_GATE_SEQUENCE, HD_CENTERS, HD_GATE_TO_CENTER,
                           // HD_CHANNELS, HD_GATE_MEANINGS, HD_ACT_WORDS
HDRender.gateFromLongitude(lon)   // → { gate, line }; the wheel geometry, derived not tabulated
HDRender.gateActivation(A, gate)  // → 'design' | 'personality' | 'both' | 'none'
HDRender.normalize(activations)   // → { gates, channels, centers }
HDRender.PALETTE, HDRender.paletteCSS(theme)
```

`HD_GATE_MEANINGS` carries the gate names and one-sentence readings. The `hex` / `pinyin` fields
are the King Wen hexagram as titled in the Zhouyi — structure and public record, transcribed from
recursive-iching's own `grammars/zhouyi`, whose English reference is Legge 1882. The `name`,
`theme` and `text` fields are this project's writing, in this project's register: what the
tradition reads there, never what will happen to the reader. If you consume them, keep them under
the same creed.

## The sixty-four glyphs

```
node scripts/export-glyphs.js
```

Writes `img/hd/gate-01.svg` … `img/hd/gate-64.svg` — the whole board with exactly one gate lit,
`interactive: false`, `legend: false`, `legendMode: 'center'`, `embedStyle: true`, `theme: auto`.
Flags: `--legend`, `--theme=light|dark`, `--out=<dir>`.

Each file is about 51 KB uncompressed (roughly 7 KB over the wire, gzipped) and carries a `viewBox`
of `0 0 400 638` with `width="100%" height="100%"` — so it has an aspect ratio but no intrinsic
pixel size. **Size it from the consuming page**, e.g. `img{width:220px;height:auto}`.

## Changing the drawing

Change it here, once, and rerun `node scripts/export-glyphs.js`. If you are refactoring rather than
redesigning, prove it: render a fixed sample activation set before and after and diff the strings.
They must be identical. That check is the reason this file exists.
