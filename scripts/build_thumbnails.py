# -*- coding: utf-8 -*-
"""Build the GENERIC thumbnail set in img/thumbs/: small 256x256 cards any grammar can use
as an item image, for aspects, figures, placements, houses and a few chart-lab ideas.

Nothing here is about any one chart. Every card is generic: "Sun square Mars" is the same
picture for everyone who has it, so the set is public and reusable (CC-BY-SA-4.0, like the
rest of the repo's content).

    python scripts/build_thumbnails.py           # writes img/thumbs/**
    python scripts/build_thumbnails.py --out DIR # somewhere else

Writes:
  aspects/<a>-<aspect>-<b>.png + .svg   every unordered pair of the 12 bodies x 5 aspects;
                                        <a> and <b> are the slugs in ALPHABETICAL order, so
                                        a pair has one filename. The picture and the words
                                        use the traditional order (Sun, Moon, Mercury ...).
  figures/<figure>.png                  t-square, grand-trine, grand-cross, yod, kite,
                                        stellium, mystic-rectangle
  placements/<planet>-in-<sign>.png     12 bodies x 12 signs
  houses/house-<n>.png                  1-12: the wheel glyph with that house lit
  chain.png temperament.png generation.png season.png
  index.json                            filename -> {kind, bodies, aspect, sign, house, ...}
  (README.md is hand-written and is not touched.)

Style, from the repo's own rules:
  - colours are read from theme.css (the one place colours live); the aspect colours are
    the chart lab's wheel (pages/chart-lab.css .asp-*: squares and oppositions --bad,
    trines --good, sextiles --c, conjunctions --cash, quincunxes --occult) and the
    element tints are the wheel's sign segments (fire --bad, earth --good, air --cash,
    water --c);
  - glyphs are monochrome outlines, never colour emoji (ICONS.md). Planet and sign glyphs
    come from DejaVu Sans (free licence; matplotlib ships a copy): rasterised by Pillow for
    the PNG, and taken as outline paths with fontTools for the SVG, so an SVG shows the
    same glyph whatever fonts the reader has. Aspect glyphs are drawn here as lines.
  - PNGs are palette-quantised to stay small.

Needs Pillow and fontTools. Deterministic: same inputs, same bytes.
"""
import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SIZE = 256          # output px (the drawing is in these units)
SS = 4              # supersampling for the PNG

# ─────────────────────────────── the vocabulary ───────────────────────────────
BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus',
          'neptune', 'pluto', 'chiron', 'north-node']
NAME = {'sun': 'Sun', 'moon': 'Moon', 'mercury': 'Mercury', 'venus': 'Venus', 'mars': 'Mars',
        'jupiter': 'Jupiter', 'saturn': 'Saturn', 'uranus': 'Uranus', 'neptune': 'Neptune',
        'pluto': 'Pluto', 'chiron': 'Chiron', 'north-node': 'North Node'}
GLYPH = {'sun': '\u2609', 'moon': '\u263D', 'mercury': '\u263F', 'venus': '\u2640',
         'mars': '\u2642', 'jupiter': '\u2643', 'saturn': '\u2644', 'uranus': '\u2645',
         'neptune': '\u2646', 'pluto': '\u2647', 'chiron': '\u26B7', 'north-node': '\u260A'}
SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces']
SIGN_GLYPH = {s: chr(0x2648 + i) for i, s in enumerate(SIGNS)}
ELEMENT = ['fire', 'earth', 'air', 'water']
MODALITY = ['cardinal', 'fixed', 'mutable']
ASPECTS = ['conjunction', 'opposition', 'square', 'trine', 'sextile']
ANGLE = {'conjunction': 0, 'sextile': 60, 'square': 90, 'trine': 120, 'opposition': 180,
         'quincunx': 150}
HOUSE_KIND = ['angular', 'succedent', 'cadent']

# ─────────────────────────────── colours ───────────────────────────────
DEFAULTS = {'thumb-bg': '#faf8f3', 'ink': '#221f1a', 'ink-soft': '#4a4439', 'mut': '#6b6457',
            'faint': '#8a8273', 'line': '#d8d2c6', 'line-soft': '#cfc8ba', 'accent': '#2f5d8a',
            'bad': '#c0473b', 'good': '#3f7a5c', 'c': '#5b7fc0', 'cash': '#c8932f',
            'occult': '#9b6dc9'}


def read_theme():
    """Colour tokens from theme.css (the one place colours live); defaults if absent."""
    tok = dict(DEFAULTS)
    css = ROOT / 'theme.css'
    if css.exists():
        for name, val in re.findall(r'--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\b', css.read_text(encoding='utf-8')):
            if name in tok:
                tok[name] = val.lower()
    return tok


T = read_theme()
BG, INK, INK_SOFT, MUT = T['thumb-bg'], T['ink'], T['ink-soft'], T['mut']
LINE, LINE_SOFT, ACCENT = T['line'], T['line-soft'], T['accent']
ASPECT_COLOUR = {'square': T['bad'], 'opposition': T['bad'], 'trine': T['good'],
                 'sextile': T['c'], 'conjunction': T['cash'], 'quincunx': T['occult']}
ELEMENT_COLOUR = {'fire': T['bad'], 'earth': T['good'], 'air': T['cash'], 'water': T['c']}


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(fg, bg, a):
    """fg over bg at opacity a, as a flat hex (no alpha in the files)."""
    f, b = rgb(fg), rgb(bg)
    return '#%02x%02x%02x' % tuple(round(b[i] + (f[i] - b[i]) * a) for i in range(3))


# ─────────────────────────────── fonts ───────────────────────────────
def find_font(names, extra_dirs=()):
    dirs = list(extra_dirs)
    try:
        import matplotlib
        dirs.append(Path(matplotlib.__file__).parent / 'mpl-data' / 'fonts' / 'ttf')
    except Exception:  # noqa: BLE001
        pass
    dirs += [Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts',
             Path('/usr/share/fonts/truetype/dejavu'), Path('/usr/share/fonts/TTF'),
             Path('/Library/Fonts'), Path.home() / 'Library' / 'Fonts']
    for n in names:
        for d in dirs:
            p = Path(d) / n
            if p.exists():
                return p
    return None


GLYPH_FONT = find_font(['DejaVuSans.ttf'])
if not GLYPH_FONT:
    sys.exit('DejaVuSans.ttf not found: pip install matplotlib (it ships a copy), or install DejaVu fonts.')
TEXT_FONT = find_font(['segoeui.ttf', 'Inter-Regular.ttf', 'DejaVuSans.ttf'])
TEXT_FONT_BOLD = find_font(['seguisb.ttf', 'Inter-SemiBold.ttf', 'DejaVuSans-Bold.ttf']) or TEXT_FONT
SVG_SANS = "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"

_TT = TTFont(str(GLYPH_FONT))
_GS = _TT.getGlyphSet()
_CMAP = _TT.getBestCmap()
_UPM = _TT['head'].unitsPerEm
_FONTS = {}


def font(path, px):
    key = (str(path), px)
    if key not in _FONTS:
        _FONTS[key] = ImageFont.truetype(str(path), px)
    return _FONTS[key]


def text_width(s, size, bold=False):
    return font(TEXT_FONT_BOLD if bold else TEXT_FONT, size * SS).getlength(s) / SS


# ─────────────────────────────── a tiny scene ───────────────────────────────
# Every card is a list of primitives in 256-unit coordinates; two back ends draw it.
#   ('line', x1, y1, x2, y2, colour, width)                round caps
#   ('poly', [(x, y)...], stroke, width, fill, closed)
#   ('circle', cx, cy, r, stroke, width, fill)
#   ('dashcircle', cx, cy, r, colour, width, n)            n dashes
#   ('glyph', ch, cx, cy, px, colour)                      ink box centred on (cx, cy)
#   ('text', s, cx, baseline, px, colour, bold)            centred


def pt(cx, cy, r, deg):
    """Point on a circle; deg counter-clockwise from 3 o'clock (screen y points down)."""
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy - r * math.sin(a))


def fit_label(words, max_w=232, big=21, small=15):
    """One line if it fits at >= 17px, else two balanced lines. Returns (lines, px)."""
    s = ' '.join(words)
    for px in range(big, 16, -1):
        if text_width(s, px, True) <= max_w:
            return [s], px
    best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        w = max(text_width(a, 20, True), text_width(b, 20, True))
        if best is None or w < best[0]:
            best = (w, [a, b])
    lines = best[1]
    for px in range(20, small - 1, -1):
        if max(text_width(x, px, True) for x in lines) <= max_w:
            return lines, px
    return lines, small


def label(scene, words, sub=None):
    lines, px = fit_label(words)
    if len(lines) == 1:
        scene.append(('text', lines[0], 128, 190, px, INK, True))
    else:
        scene.append(('text', lines[0], 128, 181, px, INK, True))
        scene.append(('text', lines[1], 128, 181 + px + 4, px, INK, True))
    if sub:
        scene.append(('text', sub, 128, 234, 12, MUT, False))
    return ' '.join(words)


# ─────────────────────────────── PNG back end ───────────────────────────────
def _glyph_png(img, ch, cx, cy, px, colour):
    f = font(GLYPH_FONT, round(px * SS))
    pad = round(px * SS)
    tmp = Image.new('L', (pad * 3, pad * 3), 0)
    ImageDraw.Draw(tmp).text((pad, pad), ch, font=f, fill=255)
    bb = tmp.getbbox()
    if not bb:
        raise SystemExit(f'glyph U+{ord(ch):04X} renders empty in {GLYPH_FONT.name}')
    mask = tmp.crop(bb)
    x = round(cx * SS - mask.width / 2)
    y = round(cy * SS - mask.height / 2)
    img.paste(Image.new('RGB', mask.size, rgb(colour)), (x, y), mask)


def _palette(scene, steps=9):
    """A palette of ramps: background (and every fill) toward every colour the scene uses.
    Anti-aliased edges land on their own ramp, so hues stay true (a free median-cut palette
    spends its few colours on the background and turns small red lines brown)."""
    cols, bases = set(), {BG}
    for p in scene:
        k = p[0]
        if k == 'line':
            cols.add(p[5])
        elif k == 'poly':
            cols.update(c for c in (p[2], p[4]) if c)
            if p[4]:
                bases.add(p[4])
        elif k == 'circle':
            cols.update(c for c in (p[4], p[6]) if c)
            if p[6]:
                bases.add(p[6])
        elif k in ('dashcircle', 'glyph'):
            cols.add(p[4] if k == 'dashcircle' else p[5])
        elif k == 'text':
            cols.add(p[5])
    seen = []
    for b in sorted(bases):
        for c in sorted(cols | bases):
            for t in range(steps + 1):
                v = rgb(mix(c, b, t / steps))
                if v not in seen:
                    seen.append(v)
    return seen[:256]


def _to_palette(img, colours):
    """Exact nearest-colour mapping (Pillow's own palette lookup rounds, and nudged the
    background off --thumb-bg by a shade or two)."""
    flat = [x for v in colours for x in v] + [0] * (768 - 3 * len(colours))
    try:
        import numpy as np
    except ImportError:
        pal = Image.new('P', (1, 1))
        pal.putpalette(flat)
        return img.quantize(palette=pal, dither=Image.Dither.NONE)
    px = np.asarray(img, dtype=np.int32).reshape(-1, 3)
    keys, inv = np.unique((px[:, 0] << 16) | (px[:, 1] << 8) | px[:, 2], return_inverse=True)
    uniq = np.stack([keys >> 16, (keys >> 8) & 255, keys & 255], axis=1)
    pc = np.asarray(colours, dtype=np.int32)
    near = ((uniq[:, None, :] - pc[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
    out = Image.fromarray(near[inv.reshape(-1)].astype(np.uint8).reshape(img.height, img.width), 'P')
    out.putpalette(flat)
    return out


def render_png(scene, path):
    W = SIZE * SS
    img = Image.new('RGB', (W, W), rgb(BG))
    d = ImageDraw.Draw(img)
    S = lambda v: v * SS  # noqa: E731
    for p in scene:
        k = p[0]
        if k == 'line':
            _, x1, y1, x2, y2, c, w = p
            d.line([(S(x1), S(y1)), (S(x2), S(y2))], fill=rgb(c), width=round(S(w)))
            r = S(w) / 2
            for x, y in ((x1, y1), (x2, y2)):
                d.ellipse([S(x) - r, S(y) - r, S(x) + r, S(y) + r], fill=rgb(c))
        elif k == 'poly':
            _, pts, stroke, w, fill, closed = p
            q = [(S(x), S(y)) for x, y in pts]
            if fill:
                d.polygon(q, fill=rgb(fill))
            if stroke:
                seq = q + [q[0]] if closed else q
                d.line(seq, fill=rgb(stroke), width=round(S(w)), joint='curve')
                r = S(w) / 2
                for x, y in (q if closed else (q[0], q[-1])):
                    d.ellipse([x - r, y - r, x + r, y + r], fill=rgb(stroke))
        elif k == 'circle':
            _, cx, cy, r, stroke, w, fill = p
            box = [S(cx - r), S(cy - r), S(cx + r), S(cy + r)]
            d.ellipse(box, fill=rgb(fill) if fill else None,
                      outline=rgb(stroke) if stroke else None, width=round(S(w)) if stroke else 0)
        elif k == 'dashcircle':
            _, cx, cy, r, c, w, n = p
            box = [S(cx - r), S(cy - r), S(cx + r), S(cy + r)]
            step = 360 / n
            for i in range(n):
                d.arc(box, i * step, i * step + step * 0.55, fill=rgb(c), width=round(S(w)))
        elif k == 'glyph':
            _, ch, cx, cy, px, c = p
            _glyph_png(img, ch, cx, cy, px, c)
        elif k == 'text':
            _, s, cx, base, px, c, bold = p
            f = font(TEXT_FONT_BOLD if bold else TEXT_FONT, round(px * SS))
            d.text((S(cx), S(base)), s, font=f, fill=rgb(c), anchor='ms')
        else:
            raise ValueError(k)
    out = img.resize((SIZE, SIZE), Image.LANCZOS)
    out = _to_palette(out, _palette(scene))
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, optimize=True)


# ─────────────────────────────── SVG back end ───────────────────────────────
_GLYPH_PATHS = {}


def _glyph_outline(ch):
    if ch not in _GLYPH_PATHS:
        name = _CMAP.get(ord(ch))
        if not name:
            raise SystemExit(f'U+{ord(ch):04X} is not in {GLYPH_FONT.name}')
        pen = SVGPathPen(_GS)
        _GS[name].draw(pen)
        bp = BoundsPen(_GS)
        _GS[name].draw(bp)
        _GLYPH_PATHS[ch] = (pen.getCommands(), bp.bounds)
    return _GLYPH_PATHS[ch]


def _n(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def render_svg(scene, path, title):
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}" '
         f'role="img" aria-label="{esc(title)}" color="{INK_SOFT}">',
         f'<title>{esc(title)}</title>',
         f'<rect width="{SIZE}" height="{SIZE}" fill="{BG}"/>']
    for p in scene:
        k = p[0]
        if k == 'line':
            _, x1, y1, x2, y2, c, w = p
            o.append(f'<line x1="{_n(x1)}" y1="{_n(y1)}" x2="{_n(x2)}" y2="{_n(y2)}" stroke="{c}" '
                     f'stroke-width="{_n(w)}" stroke-linecap="round"/>')
        elif k == 'poly':
            _, pts, stroke, w, fill, closed = p
            tag = 'polygon' if closed else 'polyline'
            ps = ' '.join(f'{_n(x)},{_n(y)}' for x, y in pts)
            st = f' stroke="{stroke}" stroke-width="{_n(w)}" stroke-linejoin="round" stroke-linecap="round"' if stroke else ''
            o.append(f'<{tag} points="{ps}" fill="{fill or "none"}"{st}/>')
        elif k == 'circle':
            _, cx, cy, r, stroke, w, fill = p
            st = f' stroke="{stroke}" stroke-width="{_n(w)}"' if stroke else ''
            o.append(f'<circle cx="{_n(cx)}" cy="{_n(cy)}" r="{_n(r)}" fill="{fill or "none"}"{st}/>')
        elif k == 'dashcircle':
            _, cx, cy, r, c, w, n = p
            dash = 2 * math.pi * r / n
            o.append(f'<circle cx="{_n(cx)}" cy="{_n(cy)}" r="{_n(r)}" fill="none" stroke="{c}" '
                     f'stroke-width="{_n(w)}" stroke-dasharray="{_n(dash * .55)} {_n(dash * .45)}"/>')
        elif k == 'glyph':
            _, ch, cx, cy, px, c = p
            cmds, (x0, y0, x1, y1) = _glyph_outline(ch)
            s = px / _UPM
            tx, ty = cx - s * (x0 + x1) / 2, cy + s * (y0 + y1) / 2
            fill = 'currentColor' if c == INK_SOFT else c
            o.append(f'<path fill="{fill}" transform="translate({_n(tx)} {_n(ty)}) scale({s:.5f} {-s:.5f})" d="{cmds}"/>')
        elif k == 'text':
            _, s, cx, base, px, c, bold = p
            weight = ' font-weight="600"' if bold else ''
            o.append(f'<text x="{_n(cx)}" y="{_n(base)}" text-anchor="middle" font-family="{SVG_SANS}" '
                     f'font-size="{_n(px)}"{weight} fill="{c}">{esc(s)}</text>')
    o.append('</svg>')
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(o) + '\n')


# ─────────────────────────────── aspect glyphs (drawn) ───────────────────────────────
def aspect_glyph(scene, kind, cx, cy, c, w=3.2, r=16):
    if kind == 'conjunction':           # circle with a short stroke rising to the right
        scene.append(('circle', cx - 4, cy + 5, 9, c, w, None))
        a, b = pt(cx - 4, cy + 5, 9, 45), pt(cx - 4, cy + 5, 25, 45)
        scene.append(('line', a[0], a[1], b[0], b[1], c, w))
    elif kind == 'opposition':          # two circles joined on a diagonal
        (x1, y1), (x2, y2) = pt(cx, cy, 12, 225), pt(cx, cy, 12, 45)
        scene.append(('circle', x1, y1, 5.6, c, w, None))
        scene.append(('circle', x2, y2, 5.6, c, w, None))
        a, b = pt(x1, y1, 5.6, 45), pt(x2, y2, 5.6, 225)
        scene.append(('line', a[0], a[1], b[0], b[1], c, w))
    elif kind == 'square':
        h = r * 0.72
        scene.append(('poly', [(cx - h, cy - h), (cx + h, cy - h), (cx + h, cy + h), (cx - h, cy + h)], c, w, None, True))
    elif kind == 'trine':
        pts = [pt(cx, cy + 2, r, a) for a in (90, 210, 330)]
        scene.append(('poly', pts, c, w, None, True))
    elif kind == 'sextile':
        for a in (90, 30, 150):
            p1, p2 = pt(cx, cy, r, a), pt(cx, cy, r, a + 180)
            scene.append(('line', p1[0], p1[1], p2[0], p2[1], c, w))
    elif kind == 'quincunx':
        scene.append(('line', cx - 9, cy - 10, cx, cy + 3, c, w))
        scene.append(('line', cx + 9, cy - 10, cx, cy + 3, c, w))
        scene.append(('line', cx, cy + 3, cx, cy + 12, c, w))
        scene.append(('line', cx - 8, cy + 12, cx + 8, cy + 12, c, w))


# ─────────────────────────────── the cards ───────────────────────────────
GY = 92   # the glyph row


def card_aspect(a, kind, b):
    """a, b in traditional order (the picture reads left to right: 'Sun square Mars')."""
    c = ASPECT_COLOUR[kind]
    s = []
    xl, xr, gap = 52, 204, 26
    s += [('line', xl + 32, GY, 128 - gap, GY, c, 3), ('line', 128 + gap, GY, xr - 32, GY, c, 3)]
    aspect_glyph(s, kind, 128, GY, c)
    s += [('glyph', GLYPH[a], xl, GY, 62, INK_SOFT), ('glyph', GLYPH[b], xr, GY, 62, INK_SOFT)]
    title = label(s, [NAME[a], kind, NAME[b]], f'aspect  \u00b7  {ANGLE[kind]}\u00b0')
    return s, title


def card_placement(p, sign):
    i = SIGNS.index(sign)
    el, mo = ELEMENT[i % 4], MODALITY[i % 3]
    s = [('circle', 186, GY, 40, mix(ELEMENT_COLOUR[el], BG, .55), 2, mix(ELEMENT_COLOUR[el], BG, .14)),
         ('glyph', GLYPH[p], 70, GY, 62, INK_SOFT),
         ('glyph', SIGN_GLYPH[sign], 186, GY, 50, INK_SOFT)]
    title = label(s, [NAME[p], 'in', sign.capitalize()], f'{el}  \u00b7  {mo}')
    return s, title


def house_angle(k):
    """Chart angle of cusp k (0 = Ascendant at 9 o'clock, houses run counter-clockwise)."""
    return 180 + 30 * k


def card_house(n):
    cx, cy, r = 128, 94, 70
    s = []
    a0, a1 = house_angle(n - 1), house_angle(n)
    arc = [pt(cx, cy, r, a0 + (a1 - a0) * t / 24) for t in range(25)]
    s.append(('poly', [(cx, cy)] + arc, None, 0, mix(ACCENT, BG, .22), True))
    for k in range(12):
        if k % 3:
            x, y = pt(cx, cy, r, house_angle(k))
            s.append(('line', cx, cy, x, y, LINE, 1.6))
    s.append(('poly', [(cx, cy)] + arc, ACCENT, 2.4, None, True))
    for k in (0, 3):  # the horizon and the meridian: the ICONS.md wheel's cross
        (x1, y1), (x2, y2) = pt(cx, cy, r, house_angle(k)), pt(cx, cy, r, house_angle(k) + 180)
        s.append(('line', x1, y1, x2, y2, INK_SOFT, 2.6))
    s.append(('circle', cx, cy, r, INK_SOFT, 2.6, None))
    tx, ty = pt(cx, cy, r * 0.66, (a0 + a1) / 2)
    s.append(('text', str(n), tx, ty + 6, 17, ACCENT, True))
    title = label(s, ['House', str(n)], HOUSE_KIND[(n - 1) % 3])
    return s, title


def ring(s, cx, cy, r):
    s.append(('circle', cx, cy, r, LINE_SOFT, 1.6, None))
    for k in range(12):
        (x1, y1), (x2, y2) = pt(cx, cy, r, k * 30), pt(cx, cy, r + 6, k * 30)
        s.append(('line', x1, y1, x2, y2, LINE, 1.4))


FIGURES = {
    # points (degrees on the ring), aspects between point indices, sub-line
    't-square': ([180, 0, 90], [(0, 1, 'opposition'), (2, 0, 'square'), (2, 1, 'square')],
                 'one opposition  \u00b7  two squares', 270),
    'grand-trine': ([90, 210, 330], [(0, 1, 'trine'), (1, 2, 'trine'), (2, 0, 'trine')],
                    'three trines', None),
    'grand-cross': ([45, 135, 225, 315], [(0, 2, 'opposition'), (1, 3, 'opposition'), (0, 1, 'square'),
                                          (1, 2, 'square'), (2, 3, 'square'), (3, 0, 'square')],
                    'two oppositions  \u00b7  four squares', None),
    'yod': ([90, 240, 300], [(1, 2, 'sextile'), (0, 1, 'quincunx'), (0, 2, 'quincunx')],
            'one sextile  \u00b7  two quincunxes', None),
    'kite': ([90, 210, 330, 270], [(0, 1, 'trine'), (1, 2, 'trine'), (2, 0, 'trine'), (0, 3, 'opposition'),
                                   (3, 1, 'sextile'), (3, 2, 'sextile')],
             'a grand trine  \u00b7  an opposition  \u00b7  two sextiles', None),
    'stellium': ([62, 78, 94, 110], [], 'three or more bodies together', None),
    'mystic-rectangle': ([30, 150, 210, 330], [(0, 2, 'opposition'), (1, 3, 'opposition'), (0, 1, 'trine'),
                                               (2, 3, 'trine'), (1, 2, 'sextile'), (3, 0, 'sextile')],
                         'two oppositions  \u00b7  two trines  \u00b7  two sextiles', None),
}
FIGURE_NAME = {'t-square': 'T-square', 'grand-trine': 'Grand trine', 'grand-cross': 'Grand cross',
               'yod': 'Yod', 'kite': 'Kite', 'stellium': 'Stellium', 'mystic-rectangle': 'Mystic rectangle'}


def card_figure(fig):
    degs, lines, sub, empty = FIGURES[fig]
    cx, cy, r = 128, 94, 66
    s = []
    ring(s, cx, cy, r)
    P = [pt(cx, cy, r, d) for d in degs]
    if fig == 'stellium':
        arc = [pt(cx, cy, r, degs[0] - 8 + (degs[-1] - degs[0] + 16) * t / 20) for t in range(21)]
        s.append(('poly', arc, ASPECT_COLOUR['conjunction'], 7, None, False))
    for i, j, kind in lines:
        s.append(('line', P[i][0], P[i][1], P[j][0], P[j][1], ASPECT_COLOUR[kind], 3))
    if empty is not None:
        ex, ey = pt(cx, cy, r, empty)
        s.append(('dashcircle', ex, ey, 6, ASPECT_COLOUR['square'], 1.8, 6))
    dot = 7.2 if fig == 'stellium' else 6.2
    for x, y in P:
        s.append(('circle', x, y, dot, BG, 2.2, INK_SOFT))
    title = label(s, FIGURE_NAME[fig].split(' '), sub)
    return s, title


def arrow(s, x1, y, x2, c, w=2.6):
    s.append(('line', x1, y, x2 - 3, y, c, w))
    s.append(('poly', [(x2, y), (x2 - 9, y - 6), (x2 - 9, y + 6)], c, 1.2, c, True))


def card_chain():
    s = []
    trio = ['mercury', 'venus', 'mars']
    xs = [38, 128, 218]
    for x, k in zip(xs, trio):
        s.append(('glyph', GLYPH[k], x, GY, 46, INK_SOFT))
    arrow(s, 62, GY, 102, ACCENT)
    arrow(s, 152, GY, 192, ACCENT)
    return s, label(s, ['Dispositor', 'chain'], 'each body to the ruler of its sign')


def card_temperament():
    s = []
    heights = [64, 42, 86, 54]
    base, bw, gap = 136, 30, 16
    x0 = 128 - (4 * bw + 3 * gap) / 2
    s.append(('line', x0 - 8, base, x0 + 4 * bw + 3 * gap + 8, base, LINE, 1.6))
    for i, (el, h) in enumerate(zip(ELEMENT, heights)):
        x = x0 + i * (bw + gap)
        s.append(('poly', [(x, base - h), (x + bw, base - h), (x + bw, base), (x, base)], None, 0,
                  mix(ELEMENT_COLOUR[el], BG, .85), True))
        s.append(('text', el, x + bw / 2, base + 16, 11, MUT, False))
    return s, label(s, ['Temperament'], 'fire  \u00b7  earth  \u00b7  air  \u00b7  water')


def card_generation():
    cx, cy, r = 128, 96, 62
    s = []
    ring(s, cx, cy, r)
    for k, d in (('uranus', 150), ('neptune', 90), ('pluto', 30)):
        x, y = pt(cx, cy, r, d)
        s.append(('circle', x, y, 21, LINE_SOFT, 1.6, BG))
        s.append(('glyph', GLYPH[k], x, y, 30, INK_SOFT))
    return s, label(s, ['Generation'], 'the slow planets, shared by a cohort')


def card_season():
    s = []
    x0, x1, y = 24, 232, 100
    s.append(('line', x0, y, x1, y, LINE, 2))
    for m in range(13):
        x = x0 + (x1 - x0) * m / 12
        s.append(('line', x, y - 5, x, y + 5, LINE, 1.4))
    s.append(('line', 78, y, 176, y, ACCENT, 7))
    s.append(('poly', [(127, y - 22), (136, y - 13), (127, y - 4), (118, y - 13)], None, 0, INK_SOFT, True))
    s.append(('text', 'exact', 127, y - 28, 11, MUT, False))
    return s, label(s, ['Season'], 'a transit across its months')


# ─────────────────────────────── build ───────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out', default=str(ROOT / 'img' / 'thumbs'))
    out = Path(ap.parse_args().out)
    index = {}

    def emit(rel, scene, title, meta, svg=False):
        render_png(scene, out / rel)
        row = {'kind': meta.get('kind'), 'bodies': meta.get('bodies', []), 'aspect': meta.get('aspect'),
               'sign': meta.get('sign'), 'house': meta.get('house'), 'figure': meta.get('figure'),
               'label': title}
        if svg:
            srel = rel[:-4] + '.svg'
            render_svg(scene, out / srel, title)
            row['svg'] = srel
        index[rel] = row

    for i, a in enumerate(BODIES):
        for b in BODIES[i + 1:]:
            lo, hi = sorted([a, b])
            for kind in ASPECTS:
                scene, title = card_aspect(a, kind, b)
                emit(f'aspects/{lo}-{kind}-{hi}.png', scene, title,
                     {'kind': 'aspect', 'bodies': [a, b], 'aspect': kind}, svg=True)
    for fig in FIGURES:
        scene, title = card_figure(fig)
        emit(f'figures/{fig}.png', scene, title, {'kind': 'figure', 'figure': fig})
    for p in BODIES:
        for sign in SIGNS:
            scene, title = card_placement(p, sign)
            emit(f'placements/{p}-in-{sign}.png', scene, title, {'kind': 'placement', 'bodies': [p], 'sign': sign})
    for n in range(1, 13):
        scene, title = card_house(n)
        emit(f'houses/house-{n}.png', scene, title, {'kind': 'house', 'house': n})
    for name, fn, bodies in (('chain', card_chain, ['mercury', 'venus', 'mars']),
                             ('temperament', card_temperament, []),
                             ('generation', card_generation, ['uranus', 'neptune', 'pluto']),
                             ('season', card_season, [])):
        scene, title = fn()
        emit(f'{name}.png', scene, title, {'kind': 'card', 'bodies': bodies})

    about = ('Generic thumbnails (see README.md). Keys are paths relative to this folder. Aspect '
             'filenames put the two body slugs in alphabetical order; "bodies" and "label" keep the '
             'traditional order.')
    rows = [f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in sorted(index.items())]
    with open(out / 'index.json', 'w', encoding='utf-8', newline='\n') as fh:  # one file per line
        fh.write('{\n "_about": ' + json.dumps(about) + ',\n "files": {\n' + ',\n'.join(rows) + '\n }\n}\n')

    kinds = {}
    for row in index.values():
        kinds[row['kind']] = kinds.get(row['kind'], 0) + 1
    total = sum(f.stat().st_size for f in out.rglob('*') if f.is_file())
    biggest = max((f for f in out.rglob('*.png')), key=lambda f: f.stat().st_size)
    print('PNG per kind:', kinds, '| SVG:', sum(1 for r in index.values() if 'svg' in r))
    print(f'total {total / 1024:.0f} KB; largest PNG {biggest.relative_to(out)} {biggest.stat().st_size} B')


if __name__ == '__main__':
    main()
