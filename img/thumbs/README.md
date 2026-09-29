# Thumbnails — a generic set

Small 256×256 cards that any grammar can use as an item image: one for every aspect between
two bodies, every body in every sign, every house, the named figures, and four cards for ideas
the chart lab uses. **They are generic.** "Sun square Mars" is the same picture for everyone
who has it; no card is drawn from, or says anything about, any one person's chart.

They are built by [`scripts/build_thumbnails.py`](../../scripts/build_thumbnails.py). Do not
edit the images by hand: change the script and run it again.

```
python scripts/build_thumbnails.py
```

## What is here

| Folder / file | Count | What each shows |
|---|---|---|
| `aspects/<a>-<aspect>-<b>.png` and `.svg` | 66 pairs × 5 = 330 | two body glyphs joined by the aspect's glyph, the words ("Sun square Mars") and the angle |
| `figures/<figure>.png` | 7 | the figure's shape on a plain ring, its lines in the aspect colours |
| `placements/<body>-in-<sign>.png` | 12 × 12 = 144 | the body's glyph, the sign's glyph on its element's tint, the words and the sign's element and modality |
| `houses/house-<n>.png` | 12 | the wheel (circle, horizon and meridian, as in [`ICONS.md`](../../ICONS.md)) with the twelve cusps and house *n* lit; angular, succedent or cadent |
| `chain.png`, `temperament.png`, `generation.png`, `season.png` | 4 | a dispositor chain, the four elements as bars, the slow planets on a ring, a transit on a time bar |
| `index.json` | | every file, with what it shows |

## Filenames

- **Bodies** (12): `sun moon mercury venus mars jupiter saturn uranus neptune pluto chiron north-node`.
- **Signs** (12): `aries` … `pisces`, lower case.
- **Aspects** (5): `conjunction opposition square trine sextile`.
- **Figures** (7): `t-square grand-trine grand-cross yod kite stellium mystic-rectangle`.
- **An aspect's two bodies are in alphabetical order in the filename**, so each pair has exactly
  one name: Sun square Mars is `aspects/mars-square-sun.png`. To find a file, sort the two slugs.
  The picture and the words keep the traditional order (Sun, Moon, Mercury … North Node), so
  that file still reads "Sun square Mars".

`index.json` has one line per image under `files`, mapping each PNG path (relative to this folder) to
`{kind, bodies, aspect, sign, house, figure, label}`, plus `svg` for the aspects. `bodies` and
`label` are in the traditional order; a field that does not apply is `null` (or `[]`).

## How they look, and why

- **Colours come from [`theme.css`](../../theme.css)** and the chart lab's wheel
  ([`pages/chart-lab.css`](../../pages/chart-lab.css)): squares and oppositions `--bad`, trines
  `--good`, sextiles `--c`, conjunctions `--cash`, quincunxes (the yod) `--occult`; the sign
  tints are the wheel's element tints (fire `--bad`, earth `--good`, air `--cash`, water `--c`).
  The background is `--thumb-bg` and the words are `--ink`. Change a colour in `theme.css`, run
  the script, and the set follows.
- **Glyphs are monochrome outlines, never colour emoji** ([`ICONS.md`](../../ICONS.md)). Body
  and sign glyphs are drawn from the DejaVu Sans font; in the SVGs they are outline paths, so
  they look the same whatever fonts a reader has, and they take `currentColor`. Aspect glyphs are
  drawn as lines.
- **Small.** Each PNG is palette-quantised (a few KB).

## Licence

The images are content: **CC-BY-SA-4.0**, like the rest of this repo's content (see
[`LICENSE-CONTENT.txt`](../../LICENSE-CONTENT.txt)). The script that builds them is code,
Apache-2.0. The body and sign glyph shapes come from DejaVu Sans (Bitstream Vera licence; the
DejaVu changes are public domain).
