# Changelog — The Recursive Astrology

## August 6, 2026 — Two layers, and only two, on the bodygraph

Tapping a gate turned the rest of the board into a scatter of coloured smudges. Red, gold and
lavender dots at seemingly arbitrary strengths, some activated and some not, numbers gone, and no
rule a reader could infer. The reported symptom was "the highlights are inconsistent"; the cause
was that **two different facts were being written into the same visual property.**

A bodygraph says two things at once, and they are independent:

- **Activation** — which side of the chart switched a gate on (Design red, Personality accent,
  both sides gold), and whether a channel or a centre is defined. This is a fact about the chart.
- **Selection** — what the reader has just tapped. This is a fact about the reader.

Activation is now carried **only as hue**, and it is never removed. Selection is carried **only as
strength**, and it never changes a hue. Every gate is tagged `data-act`, every channel and centre
`data-def`, and one small block of CSS decides how far each class is allowed to recede. Outside the
selection an **activated gate keeps its colour at half strength and swaps its numeral to ink** so it
stays readable; a **defined channel keeps its full weight** at a third strength; only the **dormant
background falls away** to a tenth. Inside the selection everything is at full strength with its
true colours intact.

What was there before was a single flat `opacity: 0.16` on every gate, channel and centre — which
is why nothing could be told apart.

### Four defects behind it

- **The dimming multiplied.** The mandala's gate fills carried their own alpha (`rgba(…,0.4)`), so
  the selection layer's `0.16` landed on top of them and a 0.4 fill became **0.064**. Hue and
  transparency are separate properties now: `fill-opacity` carries the wash, `opacity` is left free
  for the selection layer alone.
- **The numerals disappeared.** An activated gate's number is white, correct on a saturated disc.
  Dimmed to 0.16, white on cream is nothing at all. The receded numeral now switches to ink.
- **A dead rule was overriding a live one.** `.hd-channel { stroke-width: 3 }`, left behind by a
  renderer that no longer exists, outranked the presentation attribute the current renderer
  writes — a CSS declaration always beats a presentation attribute — so **every channel drew at
  3px** and the deliberate 3.4-vs-1.2 weight that says "defined" had never once reached the glass.
  Removed along with the rest of the dead block.
- **Selecting an undefined channel made it look defined.** Every selected channel was painted the
  same thick solid line. A selected channel your chart has *not* lit is now **dashed** — the
  selection marks it either way, but it cannot claim a definition the chart does not have.

### The drawings and the page now agree about the theme

The bodygraph palette hung off `body.theme-light`, a class only the `?theme=light` embed adds. The
viewer resolves its own theme onto `html[data-theme]`. So a plain visit to the standalone page drew
the **dark instrument palette on a light plate** — near-black centres, near-black dormant gates.
Bound to `[data-theme]` now, with the old class kept alongside for the embed.

The mandala was retinted to the same three tokens (it had been mixing its own red, its own gold and
its own purple), lost its dark backdrop circle, and its legend swatches — Tailwind's purple-500,
red-500, yellow-500 — now show the colours the ring above them actually uses. The gates list had
the same drift: a both-sides row was marked with `--astro-gold`, a *chrome* token whose value is
blue. One activation, one colour, wherever it is shown.

### Verified, cell by cell

Every combination of {no selection · gate · channel · centre} × {By Activation · By Center} was
walked in the browser against a real chart, and every rendered gate's activation class was checked
against the API's own activation list: **zero mismatches**, on both the bodygraph and the mandala.
The legend gained a second row that appears only while something is selected and names the
selection layer, so the dimming rule no longer has to be guessed from the dimming.

## August 5, 2026 — The Human Design words are ours now

The structure was always public record: 64 gates on the King Wen hexagram sequence, 36 channels,
nine centres, and arithmetic rules that turn a chart into a type, an authority and a profile. Any
two correct implementations agree about all of it, the way two ephemerides agree. **The prose was
not.** Until today the viewer shipped Jovian Archive's gate-name list and channel-name list more or
less verbatim — *The Creative*, *The Money Line*, *Perfected Form* — in a public repository. That is
Ra Uru Hu's writing, and it is his.

Worse, in one place it broke the creed as well as the licence. The strategies read **"Wait to
respond"**, **"Inform before acting"**. Those are commands. This site's one hard floor is that a
chart is a mirror and a calendar, never an instruction.

**Everything descriptive is rewritten.** 311 pieces of prose:

| | rewritten |
|---|---|
| Gate name + keynote + description | 64 × 3 = 192 |
| Channel name + description | 36 × 2 = 72 |
| Centre label + description | 9 × 2 = 18 |
| Line themes (new — the built-in path had nothing to say about a line) | 6 × 2 = 12 |
| Type strategy + note | 5 × 2 = 10 |
| Authority notes (new) | 7 |

**Anchored, not invented.** Each gate now carries its I Ching hexagram — Chinese title and pinyin
read from the Zhouyi grammar in the sibling `recursive-iching` repo, whose English reference is
James Legge's 1882 translation, public domain — and the description is written *from* that
hexagram and from the centre the gate sits in. Gate 42 is 益 *yì*, increase, so it reads "energy for
finishing what was begun, and impatience with things left half-done." A reader who distrusts us can
go to a source older and freer than any of us and check.

**The register is reporting, not prophecy.** "People with this configuration often report…", never
"you are…" or "you must…". The strategy line is now labelled in the interface as *an experiment
worth running, not an instruction*, and phrased as a noun: "letting something show up to respond
to."

**One provenance note**, under the Human Design tab row, says all of this in the open: what is
structure and what is authorship, that the system was synthesised by Ra Uru Hu from 1987 onward,
that no description here is quoted or adapted from Human Design publications, and that the whole
section is to be read as a mirror.

### The bodygraph joined the bus

Phase 2 built a linked-views bus for the wheel — tap a planet, its aspects light up in every view.
The bodygraph now rides the same bus, with the join keys the structure already provides: a gate is
its number, a channel is its gate pair (`20-34`), a centre is its id. Tap a gate on the bodygraph
or the mandala and it dims everything else, lights the gate, its partner gates, the channels it can
complete and the centres at both ends, switches to the matching list and scrolls the row into view.
Tap a row in Gates, Channels or Centers and the drawing lights up the same way.

A **selection strip** under the drawing names what is selected — *Gate 42 · Completion · Sacral ·
1 channel* — and carries the way into the full card. A first tap on the drawing selects; a second
tap on the same thing, or the strip's button, opens the card. Tapping the empty board clears.

The gate card gained a **Channels this gate belongs to** section, each one saying whether it is
completed in this chart or waiting on its partner gate, and each one tappable onto the bus.

### Smaller

- **Ayanamsa, confirmed.** The mandala's sidereal ring asks the engine for the real figure at the
  chart's own moment (23.6535° for a 1985 chart, verified in the browser). The only surviving
  `24.1` is the named fallback constant used when no chart is loaded at all.
- **Two hardcoded arcs removed.** The mandala drew gate segments with literal `5.625` and `2.8125`
  instead of `HD_GATE_ARC`. Same numbers; now nothing in the file can disagree with the constant.
- **As / Ds / Mc / Ic are back in bi-wheel mode.** AstroChart deliberately deletes the radix axis
  group when a transit ring is added — the ring is drawn over the band the labels occupied — so
  switching transits on used to remove the one mark that says which way up the chart is. Rather
  than fork the vendored file, the viewer now draws its own four labels outside the transit ring,
  reading cx/cy/radius/shift straight off the Radix instance so the geometry is AstroChart's own,
  not a second guess at it. The transit-mode margin grew to hold them.
- **A centre card told a small lie.** It said activated gates were "making it defined". Definition
  comes from a *completed channel*; a centre with four lit gates and no channel is open. It now
  says which.

## August 4, 2026 — Asking the sky about a stretch of time

The chart endpoint answers "where is everything at this moment". Nothing here could answer the
question people actually ask — *"things shifted about a month ago"* — because that question is
about a **window**, and a wheel has no time axis. `api/transit_timeline.py` is the other half of
the engine: give it a chart and two dates, and it returns every aspect that **perfects** in
between, every **station**, and every **ingress** into a sign or into a natal house, in order,
each with the instant it happens.

**Exact means exact.** A hit is not "the day Mars was closest"; it is the second at which the
geometry is true, root-found against the same Skyfield/DE421 positions the wheel is drawn from.
Across the two-month test window the worst residual over 78 hits is **0.0001 arcseconds** — the
answer is decided by the ephemeris, not by where the search stopped.

**And checked from outside.** Every other test closes a loop with our own engine. Five do not:
they compare against Astro-Seek, a Swiss Ephemeris front end, and they are now permanent
regressions in `tests/test_transit_timeline.py`.

| | Astro-Seek | Ours | Apart |
|---|---|---|---|
| Neptune stations retrograde | Jul 7 2026, 10:55 | 10:54:56 | 4 s |
| Mercury stations direct | Jul 23 2026, 22:58 | 22:57:50 | 10 s |
| Saturn stations retrograde | Jul 26 2026, 19:56 | 19:56:14 | 14 s |
| Venus enters Virgo | Jul 9 2026, 17:23 | 17:22:07 | 53 s |
| Saturn crosses 14°00′ Aries, all three times | Jun 26 / Aug 25 / Mar 9 | same three | ≤ 1.4 min |

That last row is the hard case: three passes over one degree, two of them either side of a
station where the curve is nearly flat and a root finder has least to grip.

**A retrograde triple pass is one span with three dates, not three bars.** A planet that crosses
the same degree three times without ever leaving the orb between crossings is doing one thing,
and the response says so — `spanId`, `pass`, `passesInSpan` — so a timeline can draw one bar and
mark three exact dates on it.

**Fast enough to be a request.** The naive shape of this — step a day, ask the ephemeris, bisect —
costs thousands of sequential calls. Skyfield takes vector times, so every stage is batched: one
call builds a body's whole sample grid, crossings against *every* target longitude at once are
pure numpy, and then a single vectorised bisection settles all of that body's roots together.
The default two-month window is about 2 seconds; a full year with minor aspects, a thousand hits,
about 7. Aspect degrees, orb edges, sign boundaries and natal cusps are all the same question —
"the longitude equals this constant" — so they are all solved in that one pass.

**The Moon is not in the default set,** and that is a judgement, not an oversight: it aspects
everything every other day, and including it turns a season into 1,600 rows of noise. Ask for it
(`includeMoon`) when the question is really about days.

**A graphic ephemeris, on the Transits tab.** Collapsed by default, and d3 is only fetched when
it is opened. Time runs left to right; the zodiac runs up the side folded by 360°, 90°, 45° or
30°, so at a 90° fold every conjunction, square and opposition lands on the same line and a
transit perfecting one *is* a crossing. Natal positions are dashed horizontals labelled `n☉`,
`nMC`; retrograde stretches are dashed; stations are circles, filled for turning retrograde.
Beside it, the same events as a list — and the two are wired to each other, so touching a
crossing lights its row and touching a row lights its crossing. Changing the fold is a
re-projection of data already in hand and asks the server nothing.

**One real defect fixed on the way.** Positions now truncate minutes rather than rounding them.
Rounding 29° 59.7′ of Leo produced "30° Leo 00′" — a degree that does not exist, and which reads
as Virgo.

Nothing here forecasts. It is a calendar of geometry: when the angles are true, and nothing about
what that is supposed to mean or what anyone should do about it.

## August 4, 2026 — A shared wheel, and every view pointing at the same thing

The wheel is no longer ours. It is [AstroChart](https://github.com/AstroDraw/AstroChart)
(MIT, zero dependencies, ~97 KB), vendored into `viewer/assets/js/vendor/` because this is
a static site with no build step. About 350 lines of hand-rolled SVG geometry retired.

**The gate it had to pass first.** The condition set in the plan was legibility *as a
raster*, because `requestChartImage` hands a PNG of the wheel to the AI and to anything
else that wants a picture. So before committing to anything: vendor the library, render the
same synthetic chart (1990-06-15 14:30 New York) from our own engine at 500 px, 900 px and
340 px, push it through the *actual* capture path — `XMLSerializer` → data URL → 2× canvas
— and look at the result beside the old wheel at the same size. **Pass, and not narrowly.**
AstroChart draws signs and planets as stroked SVG paths, so they stay sharp at every scale
and every planet carries its degree, sign and ℞ mark. The old wheel drew zodiac signs as
emoji codepoints, which the font renders as filled tiles: at 500 px the outer ring read as
twelve coloured blobs, and rasterised it read as twelve coloured blobs. That difference,
not aesthetics, is what decided it.

**It draws; we still do the maths.** Every position, cusp and aspect handed to AstroChart
comes from `api/calculate_chart.py` (Skyfield/DE421). Its own aspect calculator is bypassed
entirely — `aspects()` takes a precomputed list, and ours is the one already on screen in
the Aspects tab, so the wheel and the list cannot disagree. (Bypassing it was also forced:
`Radix.aspects()` ignores `settings.ASPECTS` and always uses the library defaults, which
paint conjunctions transparent and omit sextiles.) Theming is by CSS custom property rather
than resolved colour, so the wheel follows light/dark with no re-render and the existing
capture path keeps working untouched.

**Transits are a real bi-wheel now** — AstroChart's `Transit` class, natal ring inside,
transiting bodies outside, read against the natal houses. Both webs are drawn: the natal
aspects (solid) and the transit-to-natal ones (dashed). The transiting end of each transit
line is name-prefixed so the two can never be confused — "Sun square Mars" and "*transiting*
Sun square natal Mars" are different claims and must not share a key.

**Linked views.** Tap a planet on the wheel and its row lights up in the Planets list; tap a
row and the planet and all its aspect lines light up on the wheel; tap an aspect line or an
aspect row and both ends light up. One ~100-line bus, one selection at a time. The part
worth naming is not the bus but the **join key**, which no charting library supplies: a
planet is its engine key (`mars`), an aspect is its two planet keys sorted and joined
(`mars-sun`), a pattern is its type plus its sorted members. Every view addresses everything
by those strings.

**Named patterns, computed not eyeballed.** A strip above the wheel names the Grand Trines,
T-Squares and Stelliums in the chart; tapping one dims everything else and leaves the figure
standing — the Grand Trine really does draw itself as a triangle. These are computable
predicates over the aspect graph the engine already produced, which is the whole point: the
red triangles astrologers draw are a *rendering* of a fact about angles, and the model
should be handed the fact, not asked to read shapes out of pixels. The viewer knows three
figures so it stands alone; the flow app's pattern engine knows twenty-one and can post them
in wholesale via a documented `astrology-set-patterns` message.

**Two small truths fixed on the way.** `Midheaven` was read in three places and populated in
none, so the wheel guessed the MC as ASC+270° and every saved chart recorded
`midheaven: undefined`; the engine had been returning it all along. And `?form=open` now
keeps the birth-info form expanded on first render — flow sends it when the viewer *is* the
edit-chart modal, where collapsing the form hides the only thing the user came for.

## August 4, 2026 — One fullscreen, and every control either works or is gone

A control-by-control walk of the chart viewer on 3 August found the word "fullscreen"
meaning four different things in a single flow — and the only one that meant "expand this"
was broken. This is the fix wave. Nothing here changes a number; it is all about controls
telling the truth.

**The fullscreen bug.** `#chart-display-section.css-fullscreen` is a flex column pinned to
the viewport. Flex items default to `flex-shrink: 1`, so whenever the column's content was
taller than the screen — always — the browser compressed the children to fit, and
`.chart-container` was the one that gave: 581px of content squashed into **50px**. The
wheel stayed in layout, overflowed its 50px parent, and painted behind `#chart-details`.
Fullscreen showed the view tabs, the transit toggle and the entire planet list, and no
chart. One line — the children keep their natural height and the column scrolls instead.
Verified on all three views: wheel 514×475, mandala 514×574, bodygraph 328×547, where all
three were previously invisible.

**The three impostors are gone.** The embedded chart's ⛶ opened a *new tab* — an icon that
says "expand in place" performing a redirect. It is removed, along with its branch: inside
**any** frame — the sidebar embed and the Create/Edit Chart modal alike — there is now no ⛶
at all, because a fixed overlay inside a frame can only ever fill the frame's own box, and
the flow app deliberately ignores the request to grow it. The host page's "Open full chart
↗" is the redirect, and it says so. The Astro-Context box's "Full" button pointed at
`/pages/astrology-viewer.html`, which 404s on this host — the viewer lives at `/viewer/`,
and `vercel.json` only builds `viewer/**` — while passing a `viewContext` flag nothing read
and writing a localStorage key nothing read. Button, function and orphan key all removed.

**A paid button stopped losing its own clicks.** The ⛶ sat bodily inside the "Interpret
with AI" button and won the hit test at its centre, so clicking the middle of the AI action
opened a tab instead. The controls row is now a *sibling* of the wheel stage rather than a
child of its positioning context — structural separation, not a z-index patch — and the row
wraps instead of overflowing its own centred flex box on narrow screens.

**"Interpret with AI" sent a chart with no chart in it.** It read `currentChart.planets`
and `currentChart.Ephemeris`; neither has ever existed, because the placements live under
`horoscope.CelestialBodies`. The loop body never ran, so what reached the model was a
header and a birth date. It now carries all twelve placements with degree-in-sign, house
and retrograde flag, the Ascendant, the full aspect list with orbs, whether the chart is
tropical or sidereal and on which house system, and the selected grammar's reading for each
planet, sign, house and aspect — 1,980 characters where there had been a stub. Its guard
tested the same non-existent field, so it could refuse with a chart plainly on screen; it
now asks whether there are placements to describe. And it always redirected to
**production** flow, because it inferred the environment from `chart.recursive.eco`, which
carries no `dev.` prefix; it now learns the environment from whoever opened or embedded it,
validates that origin against a list, and remembers it.

**The chosen interpretation set survives the hop.** Picking "Western Astrology — Canonical"
in flow and opening the full chart used to land on "Default Interpretations". The selection
is now remembered and restored on the standalone page, and honoured from `?schema=`.
Verified end to end: a set chosen in the embedded chart under `dev.flow.recursive.eco` was
carried into a fresh `chart.recursive.eco` tab.

**"My Charts" printed `undefined-undefined-undefined`** for every row — it read
`birthData.year/.month/.day`, and the saved shape has `.date`. Six charts now read their
real birth dates, and the raw geocoder string ("Bloemfontein, Mangaung Metropolitan
Municipality, Free State, 9310, South Africa") is cut to place and country.

**"By Activation" / "By Center" rendered byte-identical SVG.** They now mean what they say.
*By activation* colours each active gate by which side switched it on — Design red,
Personality accent, both sides gold, the standard Human Design reading and the same colours
the gates list already used — and names it in the tooltip. *By centre* drops the activation
colouring and reads the board as nine centres in one accent, so what stands out is which
centres are lit. The legend follows the mode. The never-called `setBodygraphHighlight` and
its never-read filter are gone.

**Also swept:** the Human Design "Interpret with AI" button, which `updateHDSummary()`
overwrote on every render so it was never on screen — and would have thrown, calling
`.join()` on a string profile; the gates filter re-binding its click listeners on every
render, so each click re-rendered the lists N times; the interpretation-set dropdown's 33
options carrying eleven duplicate titles, one plain and one suffixed "(Altar)" — now
deduplicated by title, with the retired vocabulary retired (28 distinct options, no
duplicates); "Sign in to save your chart" rendering directly above "✓ Signed in as …"; the
transit date button being visible but blank until transits were switched on; and leaving
fullscreen shrinking the bodygraph to 400px, below the 560px it had before entering.

**LICENSE.** The repository was public with no licence file at all, which in law means all
rights reserved — the opposite of what it is for. Now split the way the sibling repos split
it: **MIT** on the code (`LICENSE`), **CC-BY-SA-4.0** on the grammars and research
(`LICENSE-CONTENT.txt`), with the boundary set out in the README. MIT on the code because
the engine is built on Skyfield and JPL's DE421 rather than the Swiss Ephemeris, so it
inherits no copyleft — which was the point of building it that way.


## August 4, 2026 — The lunar node comes from the ephemeris, and the ayanamsa selector works

An independent accuracy benchmark run on 3 August found the engine's planets, houses,
angles and timezone handling correct to about an arc-second against Swiss Ephemeris. It
found two things that were not. Both are fixed here.

**The node is now a real osculating node.** `calculate_lunar_nodes` used to compute the
true node from a five-term periodic series out of Meeus, bind the ephemeris objects at the
top of the function, and then never use them — the node never touched DE421. It landed
3.5′ to 5.9′ from the Swiss true node, sign-varying: the signature of a truncated series.
The node is not a body, so it is now derived the way it is defined — from the Moon's
geocentric position and velocity in DE421. The orbital angular momentum **h = r × v** is
normal to the plane the Moon is instantaneously orbiting in; the ascending node is where
that plane cuts the ecliptic, **n = ẑ × h**, and its longitude is `atan2(h_x, −h_y)`. Both
vectors are rotated into the true ecliptic and equinox of date — the same frame the planets
are reported in — before the cross product, or the whole precession since J2000 would sit
in the answer. Measured against Swiss Ephemeris on the benchmark's five moments, the node
now agrees to **0.36″ – 1.44″**, down from 3.5′ – 5.9′: roughly a 250-fold improvement.

This matters in Human Design, where 384 slices of 56′ each mean a 6′ error flips a line
near a boundary. It did: the São Paulo design chart read node 41.5 / 31.5 where every other
calculator said 41.4 / 31.4. It now reads 41.4 / 31.4, and the other 50 activations across
the two benchmark charts are unchanged.

**The node's direction is measured, not assumed.** Both nodes carried a hardcoded
`isRetrograde: True`. The true node genuinely turns direct for stretches — it was direct at
the benchmark's transit moment, and Swiss said so — so the flag now comes from the actual
d(node)/dt, and the node reports its `speedLongitude` in degrees per day. We serve the
**true** node deliberately, not the mean node; the response says `nodeType: "true"`.

**The Ayanamsa dropdown did nothing at all.** It offered Lahiri, Raman, Krishnamurti and
Fagan-Bradley. The control was never read on submit, the value was never sent, the API had
no such parameter, and every choice silently produced Lahiri — for a 1972 chart, picking
Fagan-Bradley left a Vedic reader nearly a degree (53′) out with no warning. It is wired
end to end now: the viewer reads it, sends it, saves it with the chart and restores it on
reopening; the API applies it and reports `ayanamsaUsed` and `ayanamsaDegrees` back.

Fagan-Bradley is implemented properly, as its own anchor — 24°02′31.36″ at JD 2433282.5,
the figure Fagan and Bradley published — and not as a constant offset from Lahiri, which
would drift. Verified against Astro-Seek's Fagan-Bradley chart for 1990-06-15 18:30 UT: all
ten planets and the Ascendant agree to a uniform **+12.0″ to +12.8″**, so the entire residual
is the ayanamsa constant itself, slightly tighter than the 14.3″ already measured for Lahiri.

**Raman and Krishnamurti are gone from the dropdown**, because this engine does not compute
them and a menu entry that quietly serves something else is worse than a shorter menu. The
API now *rejects* an unimplemented ayanamsa rather than substituting one, and reports
`ayanamsasAvailable`. The HD mandala's sidereal ring also stops using a hardcoded 24.1° —
neither Lahiri nor any other school at any particular date — and asks the engine for the
real value at that chart's moment. Charts saved before today carry no ayanamsa; they were
all cast with Lahiri, so that is what they reopen as, stated rather than inferred.

Also: the location picker no longer offers the same city twice ("New York" and "São Paulo"
each came back from Nominatim as two identical rows a user could not tell apart).

## August 2, 2026 — The chart engine divides Placidus, and says what time it used

**Placidus is now Placidus.** `api/calculate_chart.py` used to answer a Placidus request
with Porphyry cusps — it said so in `houseSystemActual`, which was honest, but it was not
the system anyone selected. The real thing is implemented now: each intermediate cusp is
solved by iteration for the ecliptic degree standing one or two thirds of the way through
its **own** semi-arc, diurnal for cusps 11 and 12, nocturnal for cusps 2 and 3. Verified
three ways — against an independently written solver, against a separately authored
implementation (`circular-natal-horoscope-js`), and against the defining property itself,
which the cusps satisfy to within a rounding error rather than approximately. At the
equator it reduces exactly to equal division of right ascension, as it must.

Beyond about 66° of latitude the degrees a Placidus cusp would divide never rise or set,
so the system has nothing to divide. There the engine falls back to Porphyry and **says
so** — `houseSystemActual` reports `porphyry` and a new `houseSystemNote` explains why.
Porphyry is also a selectable system in its own right now (asking for it used to hand back
equal houses), and Koch, Campanus, Regiomontanus and Topocentric remain served by Porphyry
geometry, still named as such rather than passed off.

**The timezone was never wrong — the interface said otherwise.** An audit read the
calculator as sending birth times unconverted, because the location picker fetched a
reverse-geocode, threw the answer away, and wrote the literal string `UTC` into a hidden
field that nothing ever read. The engine has always resolved the zone from the birth
coordinates (timezonefinder + pytz), including the DST rule in force on that date. The
vestigial field and the wasted request are gone, and the API now returns the local time,
the UTC time and the zone it used — displayed under Chart Settings, so a mis-picked city
is visible instead of silent.

Also: the sign-in modal is loaded relative to its own script rather than to the page, so
it stops 404-ing on the root-served viewer; `grammars/_collection.json` is fetched once per
page instead of three or four times; `viewers/lenses.html` is titled *Lenses* rather than
*Lens prototypes*; and the ten `_recursive_eco_url` fields still pointing at the retired
`/play?id=` shape now use the `/g/<id>?view=reading` resolver.

## July 27, 2026 — New grammar: The Dwarf Planets (`grammars/dwarf-planets`)

The twentieth library, and the only one whose subject is **unfinished**. Every other
grammar here reads a tradition whose assembly is already behind it; this one takes the
IAU's 2006 reclassification as a meaning-making event and watches a symbol set being
built in real time — Pluto demoted, Ceres promoted (having been a planet from 1801 until
the 1860s), Eris named for the discord it had already caused, and Haumea and Makemake
given the names of gods from living cultures by astronomers in California.

**Nine items:** six L1 — Pluto, Ceres, Eris, Haumea, Makemake, and one consolidated item
for the four candidates the IAU has never added (Sedna, Quaoar, Gonggong, Orcus) — under
two L2 patterns (`the vote`, `borrowed names`) and one L3 root (`watching a symbol form`).
Four sections each: *The astronomy* (sourced inline), *The name, and who chose it*,
*The symbolism so far*, *A question*.

**The confidence gradient is the content.** `metadata.confidence` is high for Pluto
(c. 95 years of use, and no new reading is asserted — the item points at the existing
Pluto entries in `western-astrology-canonical` and `archetypal-pairs` and asks what the
demotion did to them), medium for Ceres (c. 50 years, from the 1973 asteroid ephemeris,
not the nineteenth century as is often assumed), and low for Eris, Haumea and Makemake
(c. 20 years, no canon, meanings visibly read off the names). The candidates item offers
**no** symbolic reading at all rather than manufacture one.

**Care taken with the borrowed names.** Haumea, Makemake, Sedna, Quaoar and Gonggong come
from living traditions. The grammar reports the naming as something *astronomers did*,
records that the Quaoar team asked living Tongva people for permission and that the record
shows no equivalent for the others, refuses to upgrade "the record does not show a
consultation" into "none occurred", reproduces no sacred imagery, and points readers to
each tradition's own keepers.

**Images:** four public-domain, one deliberate gap. Pluto — New Horizons true-colour mosaic
(NASA). Ceres — Occator on the limb, Dawn (NASA PIA21078). Eris — Jordaens's *Golden Apple
of Discord* (Prado, PD-old-100), because Eris has never been resolved as a disk. Makemake —
the Hubble moon discovery frame. **Haumea and the candidates carry no image on purpose:**
there is no public-domain picture of them because there is no picture of them, and the
alternative — an image of a Hawaiian deity — is exactly the borrowing the item is about.
Cover is STScI's April 2006 size comparison, four months before the vote, in which three of
these worlds are still catalogue numbers.

Not added to `scripts/build_meta_astro.py`. That meta stacks voices per shared entity across
the seven classical planets, twelve signs and twelve houses; none of these bodies is in that
set (Pluto included — it is not one of the seven), so every item would carry exactly one
section and prove nothing. No UUID invented: the slug sits in `ids.json` → `_missing_ids`
until the app assigns one. `python check.py` → **OK, 20 grammars.**

## July 15, 2026 — Chart snapshot for AI interpretation (the "KEY")

The Flow app can now attach an **image of the chart wheel** to its AI-interpretation
prompt. When the reader asks for an AI reading, Flow's `AstrologyOracle` posts
`{ type: 'astrology-request-chart-image' }` into the viewer iframe and waits (3s) for
`{ type: 'astrology-chart-image', imageDataUrl }` back — `viewer/astrology-viewer.html`
now answers that request by rasterizing the live chart to a PNG data URL. The protocol
matches the Flow side exactly (it reads `event.data.imageDataUrl || null`); we add a
harmless `view` field and, on any failure, an `error` string plus `imageDataUrl: null`
so Flow degrades to a text-only reading instead of timing out.

**What it captures.** The currently-*visible* chart view — the birth-chart **wheel**, or
the **HD Mandala** / **HD Bodygraph** sub-views (whichever container isn't `.hidden`).
One generic serializer handles all three.

**Pitfalls handled (the previous stub got all of these wrong).**
- **CSS custom properties don't exist in a standalone rasterized SVG.** The wheel paints
  itself with `var(--v-fire-rgb)`, `var(--astro-gold)`, etc.; serialize it naïvely and
  every themed fill collapses to **black**. Fix: enumerate every `--*` property the page
  defines, resolve each against the *current* theme via `getComputedStyle(<html>)`, and
  inline them onto the cloned SVG root (custom properties inherit, so descendant
  presentation-attribute `var()` calls resolve).
- **Transparent PNG of a dark chart is unreadable.** We paint a solid backing colour
  (`--v-surface` — white in light, `#1a1a2e` in dark) onto the canvas before drawing.
- **Grabbing the wrong SVG.** The view *container* also holds toolbar `<svg>` icon buttons
  (fullscreen), so `container.querySelector('svg')` returned an 18×18 button icon. We query
  the inner render target (`#chart-wheel svg` / `#hd-mandala svg` / `#hd-bodygraph svg`).
- **Legibility vs. payload.** Rendered at **~2×** (capped at 1400px/side), then the data
  URL is downscaled if it would exceed ~1.5 MB.

**Verified with headless Chromium** (`/opt/pw-browsers/chromium`): loaded the viewer from
a local `http.server`, injected a synthetic wheel using the same CSS-var fills the real
renderer uses, simulated the parent's `postMessage` request, decoded the returned data
URL to a **1000×1000 PNG (114 KB)**, and read the image — a clean white-background wheel
with the four element-coloured zodiac segments, gold accent ring, purple ASC line, and
legible glyphs/text. The colours prove the var-inlining path works (not a black square).

## July 15, 2026 — Round 2: homepage hero, grammar-switch fix, tarot-pattern detail chrome, one fullscreen

Tablet round from the builder's live test. Five build items in `index.html` +
`viewer/astrology-viewer.html`, plus a harmony-with-tarot plan appended to `PLAN.md`.

**1 — Homepage hero cleanup + tablet layout.** The hero kept a single CTA
("Chart viewer — cast & read your own chart"); the two ghost buttons ("The Wheel",
"Browse every grammar") are removed. The tablet range (~800–1260px) was showing a
*giant* Flammarion engraving next to an unreadable sliver of text. Fixed with two
breakpoints: ≤1260px shrinks the plate (`clamp(230px,30vh,340px)`) so the text column
gets real room while staying side-by-side; ≤900px stacks the text full-width *under* the
image, centered. Verified with headless Chromium at 1250×2000 (row, ~590px text column)
and 800×1280 (clean vertical stack).

**2 — Grammar selector actually changes the detail now (root-caused).** Switching the
primary grammar — from the wheel picker OR the in-modal "Primary Grammar" dropdown — and
the compare carousel *appeared to do nothing* for the main text. Root cause: the detail
templates render the biggest sections as `x.story || x.description`, and **every built-in
default (`PLANETS`/`ZODIAC_SIGNS`/`HOUSES`) always defines `.story`**, while a grammar's
narrative section ("Story", "Interpretation", …) maps to the **`description`** role via
`flattenSections`, never `story`. So after `mergeNonEmpty` the default's `.story` always
won and the grammar's own words were invisible in *The Symbol / In This Sign / In This
House* — only fields the default lacked (shadow, archetype) visibly changed. One-line fix
in `flattenSections`: mirror the narrative into `story` when it's empty, so the grammar's
text takes precedence. Verified by running the **real edited `normalizeAstrologyData` +
`mergeNonEmpty`** against the live Western-Canonical Sun item: the resolved "The Symbol"
text now returns the grammar's narrative and masks the default. Compare (the carousel that
pages one grammar at a time) now shows genuinely different content per grammar for the
same reason.

**3 — Detail popup follows the tarot item-detail pattern (SVG, not glyphs).** The modal X
is now an SVG `#close` (was `&times;`). The old loud floating purple "book" circle and the
bright gradient AI button are gone; every detail's actions live in **one quiet SVG icon row
pinned at the bottom** (`detailActionRow` — grammar/compare `#book` + a calm `#star` for
"Interpret with AI"), matching the tarot chrome (X top-right · ‹ › arrows flank · action row
below). Reflection-question bullets are now a small `#star` SVG instead of a bold `?` glyph;
the AI-context header `🤖`/`↗` emoji became `#chat`/`#expand` SVGs; the chart-controls
"Interpret with AI" button lost its strong purple→indigo gradient for a quiet outlined style.

**4 — One fullscreen control, and it fullscreens the WHOLE viewer.** Consolidated the
per-view fullscreen entry points into a single `toggleActiveFullscreen()`, and — after the
builder's follow-up ("now I just get the wheel and not the whole list") — it fullscreens
**`#chart-display-section`**, a new wrapper around the view tabs (Astrology / HD Mandala /
HD Bodygraph) + the active chart + the item lists/tabs below, as a scrollable full-viewport
column (the active chart is enlarged inside it, capped at 85vh so the tabs and a peek of the
list stay visible). The redundant embed-header "Fullscreen" button and the three dead
per-view toggle functions are removed. The `astrology-request-fullscreen` postMessage to
the parent now fires whenever the viewer is iframed (`window.parent !== window`) on both
enter and exit — so the flow app can expand the iframe to the full viewport instead of the
chart only filling the iframe box. Standalone keeps the CSS overlay; X top-right + Esc exit
in both.

Verified with headless Chromium against the local build (external hosts — Supabase, the
chart API, CDNs, the live site — are blocked by this environment's egress policy, so the
full click-through-with-real-data flow was checked at the function/DOM level, not live):
JS parses clean, the grammar-switch precedence resolves to grammar text, the modal shows the
SVG X + star action row + star reflection marks + prev/next arrows, and
`toggleActiveFullscreen` enters/exits fullscreen on the active view with the embed-header
button gone.

## July 14, 2026 — Chart viewer: CSS fullscreen, X-close, item detail prev/next

Three long-standing bugs in `viewer/astrology-viewer.html` (the chart viewer the app
embeds as an iframe in the Astro oracle tab, tested on phone), fixed at the root in this
repo — earlier flow-side attempts couldn't help because the UI lives here.

**1 — Detail popup now renders ON TOP of a fullscreen chart (stacking-context fix).**
The chart previously went fullscreen via the native Fullscreen API. A natively-fullscreened
element lives in the browser *top layer*, so any modal appended to `document.body` renders
*behind* it no matter how high its z-index — hence the desperate `z-index: 2147483647` and
the "reparent the modal into `document.fullscreenElement`" hacks, neither of which was
robust (and native `requestFullscreen()` is a no-op on non-video elements on iOS Safari
anyway). Replaced the native Fullscreen API with a **CSS-based fullscreen**: the container
gets `position: fixed; inset: 0; z-index: 9000`, and detail modals sit at `z-index: 10000`,
so ordinary stacking puts the popup above the chart with **no reparenting**. All four
entry points (chart wheel, HD mandala, HD bodygraph, embed-header) now use it; the dead
`:fullscreen .modal-overlay` rule, the `2147483647` values, and every `document.fullscreenElement`
reparent block are gone.

**2 — "Exit Fullscreen" text button → a top-right X (the app pattern).** While any view is
fullscreen a single round **X** button (SVG `#close`) is pinned top-right; clicking it (or
pressing **Esc**) exits. The old embed-header toggle that flipped its label to "⛶ Exit
Fullscreen" is retired; enter affordances keep an SVG expand icon (added `#expand` to
`viewer/icons.svg`) and, where they had one, a "Fullscreen" label.

**3 — Prev/next navigation in the item detail popup.** The planet / house / aspect detail
popup now has **‹ ›** arrows (SVG chevrons) flanking the content — step through sibling
items without closing, matching the flow app's tarot-card modal. **X** top-right closes,
**Esc** closes, **←/→** keys navigate, **horizontal swipe** navigates on mobile, tap-outside
closes. Arrows auto-hide when there's only one sibling. Siblings are rebuilt live from the
loaded horoscope (planets in wheel order, houses 1–12, aspects in the aspect-list order).

`viewers/cards.html` was checked — its only "fullscreen" references are YouTube-iframe
`allow` attributes and it already has a prev/next detail footer, so it needed no change.

Verified locally with headless Chromium at a 390×844 mobile viewport against a synthetic
chart: in fullscreen, tapping a planet paints the detail as the top element (modal z 10000 >
chart z 9000); the X hit-tests as the top element and exits fullscreen; the arrows hit-test
as the top element over the near-full-width popup and step Sun→Moon→Sun and across aspects.

## July 11, 2026 — Grammar format docs consolidation

`GRAMMAR_FORMAT.md` re-synced from the canonical `recursive.eco-schemas` copy
(which gained `ref_item_id`, `performance.words`, and `_category_roles`/
`_section_roles` documentation this round — all three were already-shipped,
undocumented fields; `_category_roles`/`_section_roles` in particular are the
exact custom-Vedic-category-name mechanism this repo's astrology viewer reads).
The header note is now standardized: *"Mirrored copy — canonical version lives
in recursive.eco-schemas; if they differ, that one wins."* (Previously pointed
at `recursive-tarot` as authoritative — repointed to `recursive.eco-schemas`,
where the format doc actually originates and is kept current.) Also synced the
one added line in `docs/HOW-TO-WRITE-A-COURSE.md` (identical across
tarot/astrology/starter): courses should link to `GRAMMAR_FORMAT.md` for field
shapes, not restate them.

## July 9, 2026 — Astro enrichment lane: aspects + dignities commented grammars

The parked "astro enrichment lane" from the builder's I Ching plan (recursive-starter
`docs/PLAN-iching-channel.md` §5): aspects and dignities/rulerships now have their own
commented grammars, same PD-source discipline as `renaissance-lilly`.

**New grammar `grammars/aspects-commented/grammar.json`** — the five classical (Ptolemaic)
aspects, each an item with three clearly-labeled commentary sections: `Ptolemy (Tetrabiblos)`
(Ashmand 1822 PD quotes reused verbatim from this repo's already-verified
`tetrabiblos-ashmand` aspect items), `Lilly (1647)` (the "imperfect enmity" / "perfect
hatred" / "arguments of Love, Unity and Friendship" doctrine — corroborated this session only
via a secondary reproduction, so marked ○; unverifiable wording is paraphrased and marked
low-confidence, never fabricated), and a contemporary `Canonical` synthesis in the
western-astrology-canonical register. The Ptolemy/Lilly sections use the lens `[attribution]`
prefix so the Provenance Ribbon dates them (1822/1647). Matcher keys documented in the
grammar description: `category:'aspect'`, `metadata.aspect` (capitalized, matching
western-astrology-canonical), `metadata.angle`, `metadata.nature` ('soft'/'hard'/'neutral'),
`metadata.orb` (contemporary convention, explicitly NOT a traditional claim — Ptolemy is
sign-based, Lilly puts orbs on planets/moieties). Description carries the reality note: orbs
and minor aspects vary by tradition; five classical ones to start; contributors welcome.

**New grammar `grammars/dignities-rulerships/grammar.json`** — essential dignities as a lens:
7 planet items (domicile(s), exaltation + traditional degree, detriment, fall; sections
`Dignities table` / `What dignity means` (Lilly's +5/+4/+3/+2/+1, −5/−4 scoring + the "lord
of his own house" doctrine via Zadkiel's 1852 PD abridgment) / `Canonical`) and 12 sign items
stating the same table from the sign's side (`metadata.sign`), with modern outer-planet
co-rulerships (Uranus/Neptune/Pluto) ONLY in Canonical sections, clearly marked as modern
additions. `metadata.planet` on every planet item → federates automatically into lenses,
wheel, and archetypal stacks. Machine-readable dignity keys ride in metadata
(domicile[]/exaltation/exaltation_degree/detriment[]/fall; ruler/modern_co_ruler on signs).
**Exaltation-degree verification**: direct fetches of primary scans were network-blocked this
session (proxy 403 on archive.org/gutenberg/wikipedia), so the degrees (Sun 19° Aries, Moon
3° Taurus, Mercury 15° Virgo, Venus 27° Pisces [some tables 28°], Mars 28° Capricorn, Jupiter
15° Cancer, Saturn 21° Libra) were cross-checked via multiple independently-phrased web
searches whose results (Wikipedia's Exaltation article, renaissanceastrology.com, al-Biruni's
Book of Instruction and Dorotheus's Carmen as reported by secondary scholarship) all agree;
the only variance found anywhere is Venus 27° vs 28°, noted honestly in the grammar. Sign
statements double-anchored to already-verified in-repo quotes (Ptolemy: "Capricorn is the
house of Saturn and exaltation of Mars", "Pisces is the house of Jupiter and exaltation of
Venus"; Lilly: Virgo "the house and exaltation of Mercury").

**Wiring**: both registered in `scripts/build_collection.py` (synthesis branch — multi-voice
compilations, not single primary sources), `_collection.json` regenerated (19 grammars, 328
items); both added to `ids.json` `_public_now` + `ids` (new UUIDs
`dee46a22-3848-433e-a793-8c7a2206e8cb` aspects, `1ab72d9f-f283-475e-951a-1841215e1274`
dignities) + `preview_links` — the orchestrator inserts the Supabase rows. `check.py` passes
on all 19. **Playwright-verified** (chromium, local server): lenses.html picker lists both
new voices; Synopsis on Saturn stacks the dignities card ("Domicile: Capricorn, Aquarius ·
Exaltation: Libra (21°)") with the picker highlighting it as having Saturn; Synopsis on
Square stacks the aspects-commented column incl. Lilly's "imperfect enmity"; archetypal.html
single-tap on Saturn auto-discovers the dignities voice in the every-voice stack — 10/10
checks pass.

## July 9, 2026 — Assistant/header z-index fix + grammar picker on `wheel.html` and `lenses.html`

**Bug fix: the site's own sticky header was painting over the assistant panel's top content.**
Builder reported (screenshot on a course page, mid-chat-response) the header covering the
first lines of the assistant's reply while scrolling. Root cause, confirmed by reading the
actual shared source (`recursive-eco/apps/landing/js/assistant-launcher.js`, fetched via the
GitHub API since `recursive.eco` is network-blocked from this sandbox): `.rec-assistant-shell`
is `z-index:45` — LOWER than this site's own sticky `<site-header>` (`site-header.js`,
`z-index:50`). Both are `position:fixed`/`sticky` elements competing directly at the document
root, so the bigger number simply wins — no stacking-context trap, no missing
`scroll-margin-top`. `site-header.js` also **auto-hides on scroll-down and reveals on
scroll-up** (a normal reading gesture), which re-plants the header at `top:0` while the
assistant panel (fixed, unaffected by page scroll) is open — that's the exact moment the
header's opaque background paints over the panel's top ~129px.
- **Reproduced deterministically** with Playwright: a repro page with the real
  `site-header.js` + the real `.rec-assistant-shell`/`.rec-open` CSS (values copied from the
  fetched source), scrolled down then up (triggering the reveal), then
  `document.elementFromPoint()` at the overlap band's midpoint returned `SITE-HEADER` before
  the fix and the assistant's own message `DIV` after — the same coordinate-overlap technique
  `TourRunner.tsx`'s `?tour-debug=1` uses in the sibling flow app.
- **Fix** (`assistant.js`): after loading the shared launcher, inject one override rule —
  `.rec-assistant-shell{z-index:2147483000!important}` — forcing the panel to always sit above
  any page chrome regardless of the shared launcher's current or future z-index. The proper
  long-term fix is bumping the z-index in the shared launcher itself (it's meant to be the
  topmost layer on every recursive.eco family site) — that file lives in the private
  `recursive-eco` repo and needs its own session/approval; this is the safe, self-contained
  stopgap on this repo's side. (`recursive-tarot`'s own header is also `z-index:50` — worth a
  matching stopgap there if/when it adopts this same shared launcher.)

**Feature: a user-curated, multi-select grammar picker for the "every voice" stack.**
Builder: *"in the astro viewers I want the flexibility to pull different grammars. we could
recon grammars with houses and render there and highlight the ones for which they populate.
maybe we can multiselect and stack several grammars."* Before this, `wheel.html` (and
`archetypal.html`) auto-loaded and stacked EVERY public grammar with no reader control.
- **New shared module `grammar-picker.js`** (repo root, alongside `site-header.js`/`icons.js`
  — no bundler, so a plain shared `<script>` is this family's existing pattern for
  cross-page code): loads `grammars/_collection.json` + every `grammar.json` once, detects
  what each grammar "has" (`house`/`planet`/`sign` — by `category` OR `metadata.<shape>`,
  the same data-shape inference `findHouseItem`/`findPlanetItem` already use — never a
  `document_type`/slug check), and renders a chip checklist: chips that populate the
  current view stay full-ink and highlighted when selected; chips that don't are shown
  de-emphasized (dimmed, italic) but **never hidden** — the family's honesty convention is
  to show gaps, not hide them. Every toggle fires `onChange` immediately — no page reload,
  no "Load" button. Selection persists per-viewer via `localStorage`.
- **`wheel.html`**: replaced its hardcoded `loadTraditions()` (fetch-all, filter by
  `category==='house'`, stack unconditionally) with `GrammarPicker.create({shape:'house', ...})`.
  Default selection = every house-bearing grammar (byte-identical stack to before: 5 voices —
  Ptolemy, Proctor, Alan Leo, Astro-of-all-astros, Western Astrology Canonical), so nothing
  regresses for a reader who never touches the picker; narrowing the selection now narrows
  the stack live, including while a house dialog is later reopened.
- **`viewers/lenses.html`**: it already had its own working live multi-select ("Grammars"
  panel) — the gap was purely "highlight which ones populate the current view." Added
  `currentEntityKey` tracking (the entity resolved by whichever entity-scoped lens —
  Synopsis/Ribbon/Small-multiples — is active; null for Matrix/Reader, which aren't
  entity-scoped) and a `dp-has`/`dp-gap` highlight in the existing deck panel, plus a count
  line ("8 of 17 grammars have 'Saturn'"). Fixed in passing: the deck-button click handler
  only toggled the panel's `open` class without rebuilding it, so opening the panel after
  picking a new entity showed stale (unhighlighted) content — now rebuilds on open.
  `archetypal.html` intentionally left untouched per the builder's explicit "always on"
  every-voice design for that page.
- **Playwright-verified** at 390×844 (headless Chromium, local `python3 -m http.server`):
  `wheel.html` picker lists all 17 grammars, exactly 5 highlighted as house-bearing
  (cross-checked against the page's own data, matched); default selection stacks 5 voice
  cards (no regression); selecting 2 stacks 2; deselecting one and reopening a house shows 1
  — live, no navigation. `lenses.html`'s picker highlight for "Saturn" matched the page's own
  `ITEMS` data exactly (8 of 17); unchecking one has-Saturn grammar dropped the Synopsis
  column count from 8 to 7 live, no reload. No console/page errors from either page's own
  code (only the sandbox's expected network blocks on the assistant launcher script).

## July 8, 2026 (2) — Archetypal Astrology: planetary pairs, after Tarnas (`archetypal.html`)

New grammar + its own dedicated UI, per the builder's direction: "Archetypal astrology of
Richard Tarnas gets its own UI (just planets relationships) ... it is itself a meta grammar
of just the planets over time coming from different grammars — since his impetus was to
find what is common across all traditions by looking at what the traditions themselves kept
agreeing to look at (planetary relationships)."

- **`grammars/archetypal-pairs/grammar.json`** (25 items) — new grammar, `branch: synthesis`.
  - **3 authored base items** for the outer planets the classical/historical voice grammars
    in this repo lack (`planet-uranus`, `planet-neptune`, `planet-pluto`), each with an
    "Archetype" section written from Tarnas's characterizations (Uranus: the Promethean;
    Neptune: dissolution/the oceanic; Pluto: the underworld drive), framed explicitly as
    interpretation, not Tarnas's own words.
  - **7 thin local stubs** for the classical planets (Sun…Saturn) — carry only
    `metadata.source_grammars` provenance + a one-line pointer to
    `western-astrology-canonical`, so `composite_of` below resolves *locally* per
    `GRAMMAR_FORMAT.md`'s hard rule and `check.py`'s enforcement of it. No content is
    duplicated; the real multi-voice reading stacks live in the UI (see below). This is the
    "Base items ... copies the entity item(s) ... records provenance in
    `metadata.source_grammars`" pattern from `docs/DESIGN-wheel-frames.md`, its first use.
  - **15 authored pair items** (`category: "archetypal-pair"`, `composite_of: [planet-a,
    planet-b]`): the 10 outer/social-planet complexes Tarnas actually treats in *Cosmos and
    Psyche* (Saturn–Pluto, Uranus–Pluto, Jupiter–Uranus, Uranus–Neptune, Saturn–Neptune,
    Saturn–Uranus, Jupiter–Saturn, Jupiter–Neptune, Jupiter–Pluto, Neptune–Pluto) plus 5
    personal-planet pairs (Sun–Saturn, Sun–Pluto, Venus–Mars, Moon–Saturn, Mercury–Uranus).
    Each has "The complex" (~100-150 words), "In history" (2-3 real correlations, "Tarnas
    correlates..."; the 5 personal pairs honestly note that fast personal-planet cycles fall
    outside the book's own historical dataset instead of inventing a citation), and "A
    question."
  - **Honesty frame** — non-negotiable, present in the grammar `description`, a
    `_synthesis_note`, a dedicated `_honesty_frame` field, AND visible on the UI: "Inspired
    by Richard Tarnas's archetypal astrology (*Cosmos and Psyche*, 2006; *The Passion of the
    Western Mind*). These readings are PlayfulProcess's interpretation, written with an AI
    from its knowledge of his work — NOT Tarnas's words, not his endorsement. Go to the
    source: https://cosmosandpsyche.com/" (verified findable via search this session).
- **`archetypal.html`** — new page. Ten planets (Sun…Pluto) on a ring; tap two → a chord
  line highlights between them and the reading stacks below: (a) the pair's authored
  complex from `archetypal-pairs` if one exists, or an honest "no authored complex yet — the
  parents speak below" note if not; (b) each parent planet's own entry from *every other*
  voice grammar in the repo (Planetary Myths, Ptolemy, Lilly, Jyotiṣa, Alan Leo, Canonical),
  matched live via `grammars/_collection.json` — the same cross-grammar matcher
  `viewers/lenses.html` uses. **This live parent-stacking IS the meta layer** — no second
  generator script, per the design note in `docs/DESIGN-archetypal.md`.
  Mobile-first (verified at 390px with Playwright): ring renders, labels don't clip at the
  viewBox edge (dynamic text-anchor by angle), tapping Saturn+Pluto renders the authored
  synthesis + 20 voice cards (10 traditions × 2 planets), tapping an unauthored pair
  (Mars–Neptune) renders the honest gap note.
- **Wired in**: `ids.json` (`_public_now` + a placeholder UUID, `preview_links` entry),
  `scripts/build_collection.py` (`BRANCH_OF["archetypal-pairs"] = "synthesis"`, re-run —
  `grammars/_collection.json` now 17 grammars / 304 items), `site-header.js` Views menu
  ("Archetypal — planet pairs", `?v=45`), `index.html` gallery card. `astro-of-all-astros`
  intentionally NOT extended to include this grammar — it's not a per-entity voice, it's its
  own synthesis; the design note explains why.
- Validated every grammar in the repo with `python3 check.py` (17/17 pass, including the new
  one) both before and after wiring.

## July 8, 2026 — Lilly's twelve zodiac signs, sourced (`grammars/renaissance-lilly/`)

Fills the gap the Jul 7 session flagged: `renaissance-lilly` covered only the seven
planets; the app's own AI (no web research) had tried to fill signs and produced one
generic, unsourced "Taurus" draft. This pass adds all twelve signs as William Lilly
actually describes them in *Christian Astrology* (1647), Book I.

- **12 new items** in `grammars/renaissance-lilly/grammar.json` (`sign-aries` …
  `sign-pisces`, `category: "sign"`, `metadata.sign` canonical-cased), each with an
  "In the text" section (the sourced quote/summary, book+chapter ref, confidence marker)
  and a "What this lens reads" one-liner comparing Lilly's formula to
  `western-astrology-canonical`'s light/shadow archetypes (and occasionally Ptolemy/
  Jyotiṣa). These `id`/`name`/`metadata.sign` values match the app's canonical shape, so
  they supersede the two AI-drafted placeholder items cleanly on next reindex rather than
  duplicating.
- **WebFetch was 403'd on every source again this session** (archive.org, skyscript.co.uk,
  sacred-texts.com, astroamerica.com) — same session-wide proxy block as Jul 7. All twelve
  quotes rest on WebSearch synthesis, each cross-corroborated via at least two independently
  worded queries. **9 of 12 signs: medium confidence** (Aries, Taurus, Gemini, Cancer, Leo,
  Virgo, Libra, Sagittarius, Pisces — identical wording surfaced across independent secondary
  mirrors). **3 of 12: low/○** (Scorpio — only a short paraphrase locatable, presented as
  "summarized from," not quoted; Capricorn and Aquarius — full formula from a single
  secondary source, with the constituent facts but not the whole sentence independently
  corroborated). Full per-sign table in `research/why-astrology/06-genealogy-grammars.md`
  §3b.
- **`grammars/astro-of-all-astros/grammar.json` regenerated** — Lilly now covers signs
  (12/12, up from the Jul 7 build's 4/6 sources on signs), so every sign item in the
  meta-voice grammar gains a `"Lilly (1647)"` section alongside Canonical/Ptolemy/Jyotiṣa/
  Alan Leo. `grammars/_collection.json` regenerated too (16 grammars, 279 items, up from
  267 — the +12 Lilly sign items).
- Validated with `python3 -c "import json;json.load(...)"` before and after both generator
  runs.

## July 7, 2026 (2) — "Astro of All Astros": a generated meta-voice grammar

Proves out the Oracle Trinity design (`docs/DESIGN-oracle-trinity.md`, "Astro of all Astros" /
"the same mechanism as Tarot of All Tarots + the lenses matcher") as an actual artifact, not
just a plan.

- **New generator** `scripts/build_meta_astro.py`, mirroring
  `recursive-tarot/scripts/build_meta_grammar.py`'s pattern (generated projection over the
  repo's own grammar files, idempotent, `_do_not_hand_edit`). Reads all six voice grammars
  (`western-astrology-canonical`, `tetrabiblos-ashmand`, `renaissance-lilly`,
  `jyotisha-brihat-jataka`, `alan-leo`, `planetary-myths`), canonicalizes each source item's
  planet/sign/house identity (name matching + `metadata.planet`/`metadata.sign`/
  `metadata.western_equivalent` + the same id-pattern house-number heuristic
  `astrology.types.ts`'s `extractHouseNumber` uses, kept in sync on purpose), and produces
  one item per shared entity — 7 classical planets + 12 signs + 12 houses (aspects excluded;
  out of scope for this pass) — with a `sections` entry per source that actually covers that
  entity: `"Canonical"`, `"Ptolemy (Tetrabiblos)"`, `"Lilly (1647)"`, `"Jyotiṣa (Bṛhat Jātaka)"`,
  `"Alan Leo"`, `"Planetary Myths"`. No fabricated coverage — e.g. Lilly (planets only) never
  gets a sign/house section; Jyotiṣa (planets + signs) never gets a house section.
- **New output** `grammars/astro-of-all-astros/grammar.json` — 31 items total (7 planets ×
  6/6 sources, 12 signs × 4/6 sources — Lilly + Planetary Myths don't cover signs, 12 houses ×
  2–3/6 sources — only Canonical, Ptolemy, and Alan Leo cover houses in this repo today).
  `grammar_type: "astrology"`, `category: "planet"/"sign"/"house"` + matching
  `metadata.planet`/`metadata.sign`/`metadata.house` on every item, so it reads as a
  first-class astro voice everywhere the app/viewers already look for one (unlike the tarot
  companion task this same day, which needed a caveat — this grammar's items get the
  *category* the matcher expects, not metadata alone). `_generated: true` +
  `_rebuild_note` pointing back at the generator; `_sources` records which six grammars fed it
  and their display names, for traceability.
- **Registered in the collection**: added `astro-of-all-astros` → `synthesis` branch in
  `scripts/build_collection.py`'s `BRANCH_OF` (cosmetic — it would have landed in
  `synthesis` by default anyway via the glob, since the script has no hardcoded slug list to
  fall out of date) and reran the script — `grammars/_collection.json` now lists 16 grammars
  (267 items total, up from 15/236). No site-header edit needed: `site-header.js`'s Grammars
  dropdown fetches `_collection.json` live and groups by branch, so the new voice already
  appears there and in every ported viewer (`cards.html`, `explorer.html`, `lenses.html`,
  `tree-viewer.html`, `timeline.html`) without any hardcoded menu to touch.

## July 7, 2026 — The Great Port: tarot's viewers, homepage, and header, adapted for astrology

Ported the whole "family pattern" from `recursive-tarot` (the flagship sibling site) into
this repo, per the builder's repeated directive: copy tarot's working files and adapt
paths/branding/content, don't rebuild in parallel. Full file-by-file record in
`docs/PORT-NOTES.md`.

- **Collection layer**: new `scripts/build_collection.py` scans `grammars/*/grammar.json`
  and writes `grammars/_collection.json` in the same schema `tarot/_collection.json`
  uses — the index every ported viewer reads to discover the whole library. Glob-driven
  (no hardcoded slug list), so it survived two new grammars landing mid-port without
  going stale. Curates 4 branches (primary sources / synthesis / castings / readings) and
  years only where a grammar has a genuine historical anchor (Ptolemy, Alan Leo, Proctor,
  the Vedic/Mesopotamian/Renaissance additions) — everything else is honestly undated
  rather than assigned a fabricated date.
- **Five viewers ported** into `viewers/`: `cards.html`, `explorer.html`, `tree-viewer.html`
  (near-verbatim — already generic, `grammar_type`-driven, not tarot-hardcoded),
  `lenses.html` (real logic rewrite: matches entities across grammars by normalized
  NAME — "Saturn" is "Saturn" in every voice library — instead of tarot's stamped
  `trump_key`, since deck names don't apply here), and `timeline.html` (data source
  rewritten to read the collection directly and the descent-rail genealogy feature
  removed — astro's grammars don't derive from one another the way tarot's decks do).
  Supporting files copied too: `dimension-engine.js`, `grammar-loader.js`,
  `deck-picker.js`, `eco-links.js`, `icons.js`, `view-switcher.js`.
- **Homepage rebuilt** (`index.html`): the old single-grammar `?grammar=` dialog viewer
  is gone, replaced by tarot's gallery-of-real-links pattern — every grammar and every
  view links to its own page, never a popup. Astro's own hero copy (from
  `recursive-eco.json`) is kept verbatim; added a Courses section (History of Astrology,
  The Right Size, Three Doors) and an honesty-checked "How to hold a chart" section
  (looser than tarot's dated arc, since astrology's history doesn't have as clean a
  single turning point as tarot's 1781 occult reframing).
- **Header rebuilt** (`site-header.js`): Home / Views (Cards, Explorer, Lenses, Tree,
  Timeline, Genealogy, Chart Wheel, Chart Viewer, All grammars) / Courses / Grammars /
  GitHub. The Grammars menu is **not hardcoded** — it fetches
  `grammars/_collection.json` live, so it can't go stale as grammars are added. Verified
  with Playwright that the dropdown hover/gap-fix (commit 84934e6's pattern) survives
  the cursor actually crossing the gap toward a menu item, not just a hover snapshot.
- **Blue theme**: `theme.css`'s accent tokens (`--gold`/`--accent`/`--grammar-accent`/
  `--tree-accent`) retoned from tarot's gold (`#9a7322`) to a sky/indigo blue
  (`#2f5d8a`, darker `#1f4468` for hovers). Every purple accent swept out of the ported
  files EXCEPT the recursive.eco wayfinding links/buttons and the shared assistant star
  — purple stays eco-redirect-only. `genealogy.html` and `wheel.html` needed no direct
  color fixes (already 100% theme.css-token-driven); `viewer/astrology-viewer.html`'s own
  local token layer was retoned in both its light and dark-mode blocks, leaving the
  Human Design bodygraph sub-view's colors untouched (already marked out-of-scope by its
  own header comment).
- Old astro `lenses.html` (the 4-tab lens page) renamed to `lenses-legacy.html`, no
  longer linked — the header/homepage now point at the ported `viewers/lenses.html`.
- Verified with Playwright (chromium, local static server): all 12 touched pages return
  HTTP 200 with zero same-origin 404s (caught and fixed 3 viewer scripts that were
  referenced but not copied on the first pass: `grammar-loader.js`, `deck-picker.js`,
  `eco-links.js`). Cover images / Tailwind / d3 / the Supabase CDN / the shared assistant
  script all fail to load in this sandbox's network-restricted environment
  (`ERR_TUNNEL_CONNECTION_FAILED`) — a sandbox limitation, not a new bug; needs a real
  network (Vercel preview or unblocked egress) to confirm the fully-dressed visual pass.

## July 7, 2026 — The ONE shared recursive.eco assistant sidebar on every page

- New `assistant.js`: loads the shared shell from `recursive.eco/js/assistant-launcher.js`,
  which iframes the flow app's `/assistant` embed — the exact same star FAB and tabbed
  sidebar (Chat · Tarot · I Ching · Astro · Story) every recursive.eco page mounts. One
  source, zero drift; auth carries because astro.recursive.eco is a `.recursive.eco`
  subdomain. Included on index, wheel, lenses, genealogy, course, course-viewer, and the
  chart viewer (where it no-ops when iframed by the flow app, which has its own assistant).
- `pages/course-viewer.html` drops the hand-rolled `course/course-assistant.js` chat widget
  (a pattern-copy of recursive-tarot's) in favor of the shared sidebar, matching
  recursive.eco's own course viewer. The old widget file stays in the repo one round for
  easy rollback.

## July 7, 2026 — New reading course "The Right Size" + multi-course viewer

- New thematic course **"The Right Size"** (`course/the-right-size.mdx` → generated
  `grammars/the-right-size/grammar.json`), analogous to recursive-tarot's "How the Cards
  Can Work": not whether the stars decide fate, but what happens when we agree to relate
  to the visible sky as though it were alive — grounded in solid science (the sun as
  life-driver, the sunflower's internal clock, lunar-cued coral spawning, tides, synchrony
  → cooperation), honest about the null result on lunar effects on human behavior and the
  metaphysics we cannot know, and framed as a shared "secondary world" / social contract
  we choose to coordinate by. Voice: PlayfulProcess. Threads Wallis (deity as a form
  consciousness takes), Mīmāṃsā (ritual value without metaphysics), Friedman's "as if,"
  Harari's shared fictions, Chwe's common knowledge, and the "right size" theme (scale
  between hubris and despair).
- **Multi-course viewer**: `pages/course-viewer.html` now reads `?course=<slug>` (default
  stays History of Astrology, all existing links unchanged); each course's manifest names
  its own `sourceGrammar`, so adding a course = one manifest + one grammar, no viewer edit.
- Views menu: "Course" → "History of Astrology" + new "The Right Size (a reading)".
- Research dossiers backing the course live in `research/why-astrology/` (Wallis/devotion,
  empirical hooks, imaginative threads) with ✔/○/◆ confidence markers.

