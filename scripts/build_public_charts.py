#!/usr/bin/env python3
"""build_public_charts.py -- the curated PUBLIC charts for the Chart Lab's chart dropdown.

Writes mock-data/public-charts.json: an array of
  {id, group: "event"|"public-figure", label, date_label, place, place_basis, time_known,
   rating, source_url, note, tropical, sidereal}
where tropical and sidereal are one chart each in the shape pages/chart-lab.js normChart() reads
(the same shape as mock-data/example-chart.json, trimmed to the fields normChart uses; a false
boolean is left out, since normChart reads it with !!).

The choice (PlayfulProcess, Sep 30 2026): events first, people with care.

  events          AI moments, each with a source URL. A time is used only where the source
                  documents the moment; otherwise the chart is cast at local noon and says so.
  public figures  birth date and place from a source; a birth time only where a documented
                  source gives one, with its Astro-Databank Rodden rating (AA, A, B, C, DD, X).
                  A person whose DATE is disputed or undocumented is left out (see LEFT_OUT).

Time unknown -> planets at local noon, no houses, no Ascendant or Midheaven, and the Moon marked
approximate with the span it covers over that local day (it moves 12-15 degrees a day).
Place: where the place is a record (a hospital, a hotel, a summit), place_basis is "documented".
Where the event happened online (a paper, a blog post), the chart is cast for the publisher's
home city and place_basis is "convention": the houses then belong to a convention, not a record.

Nothing here states a chart as prediction or command. These charts are material for the lab's
reading-as-reflection (the creed in voices.json), and the notes only say where each datum came from.

Engine: this repo's own api/calculate_chart.py (Skyfield, JPL DE421, apparent geocentric, true
ecliptic and equinox of date, true node, zone resolved from the coordinates with historical DST),
called twice per chart: tropical with Placidus houses, sidereal (Lahiri) with whole-sign houses.
Speeds: api/transit_timeline.py's longitude functions, central difference. Chiron: JPL Horizons
(body 2060, quantity 31, observer ecliptic of date), the same source as the example chart; if
Horizons does not answer, that chart has no Chiron and the build prints why. Aspects and figures:
a port of pages/chart-lab.js computeAspects / computeFigures (the rules its ORB_NOTE states),
checked on Sep 30 2026 to give identical rows for all 30 charts when run through the page's own
functions in node.

Sources were read on Sep 30 2026. The Astro-Databank pages answer automated requests with a
browser check, so their data was read from Wayback Machine snapshots of the same pages
(Trump 2025-10-28, Musk 2025-11-27, Gates 2025-04-16, Altman 2024-10-03, Zuckerberg 2023-05-14,
Xi 2022-03-27); source_url is the Astro-Databank page itself. Each person's time zone is checked
against the one the source states (the build stops if the engine's zone lookup disagrees), and
each documented UTC moment against the engine's own conversion.

    python scripts/build_public_charts.py            # writes mock-data/public-charts.json
    python scripts/build_public_charts.py --no-chiron

Needs skyfield, numpy, timezonefinder, pytz (requirements.txt) and the de421.bsp kernel the
engine loads (it downloads it on first use).
"""
import argparse
import datetime as dt
import itertools
import json
import math
import os
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'api'))
import calculate_chart as ce  # noqa: E402
import transit_timeline as tt  # noqa: E402

OUT = os.path.join(ROOT, 'mock-data', 'public-charts.json')

# ───────────────────────── the list ─────────────────────────
# local: wall-clock time AT THE PLACE as the source gives it ("HH:MM"), or None (time unknown).
# utc:   the documented moment in UTC, for events whose source gives UTC. One of the two, or neither.
# zone:  the UTC offset the source states, checked against the engine's own zone lookup.
ENTRIES = [
    # ── AI events ──
    dict(id='attention-is-all-you-need', group='event', label='"Attention Is All You Need" on arXiv',
         date='2017-06-12', utc='17:57', place='Mountain View, California', lat=37.3861, lon=-122.0839,
         place_basis='convention', rating=None,
         source_url='https://arxiv.org/abs/1706.03762v1',
         note='arXiv records version 1 as submitted Mon, 12 Jun 2017 17:57:34 UTC (charted at 17:57). '
              'The paper was submitted online; the houses are cast for Mountain View, Google\'s home '
              'city (the paper\'s affiliations are Google Brain, Google Research and the University of '
              'Toronto), a convention, not a record.'),
    dict(id='openai-founded', group='event', label='OpenAI announced',
         date='2015-12-11', place='San Francisco, California', lat=37.7749, lon=-122.4194,
         place_basis='convention', rating=None,
         source_url='https://openai.com/index/introducing-openai/',
         note='"Introducing OpenAI" is dated December 11, 2015. Its time of publication is not documented '
              '(the Wayback Machine first archived it at 21:55 UTC that day), so this is a noon chart for '
              'San Francisco, where OpenAI is based.'),
    dict(id='alphago-lee-sedol-game-1', group='event', label='AlphaGo v. Lee Sedol, game 1',
         date='2016-03-09', local='13:00', zone=9, place='Four Seasons Hotel, Seoul', lat=37.5717, lon=126.9750,
         place_basis='documented', rating=None,
         source_url='https://en.wikipedia.org/wiki/AlphaGo_versus_Lee_Sedol',
         note='The match was played at the Four Seasons Hotel in Seoul, each game starting at 13:00 KST '
              '(04:00 GMT). This is the start of game 1, which AlphaGo won after Lee resigned.'),
    dict(id='chatgpt-launch', group='event', label='ChatGPT launched',
         date='2022-11-30', utc='18:00', place='San Francisco, California', lat=37.7749, lon=-122.4194,
         place_basis='convention', rating=None,
         source_url='https://openai.com/index/chatgpt/',
         note='The launch post\'s own metadata gives published_time 2022-11-30T18:00:07Z (as archived on '
              'launch day; the post was then at openai.com/blog/chatgpt). Houses are cast for San '
              'Francisco, OpenAI\'s home city: the post went out online, so the place is a convention.'),
    dict(id='gpt-4-release', group='event', label='GPT-4 released',
         date='2023-03-14', place='San Francisco, California', lat=37.7749, lon=-122.4194,
         place_basis='convention', rating=None,
         source_url='https://openai.com/index/gpt-4-research/',
         note='The GPT-4 post is dated March 14, 2023. Its time of release is not documented (the page was '
              'first archived at 16:54 UTC that day), so this is a noon chart for San Francisco.'),
    dict(id='bletchley-declaration', group='event', label='The Bletchley Declaration',
         date='2023-11-01', place='Bletchley Park, England', lat=51.9977, lon=-0.7407,
         place_basis='documented', rating=None,
         source_url='https://www.gov.uk/government/news/countries-agree-to-safe-and-responsible-development-of-frontier-ai-in-landmark-bletchley-declaration',
         note='Agreed at the AI Safety Summit at Bletchley Park and published by the UK government on '
              '1 November 2023. No time of agreement is documented: a noon chart.'),
    dict(id='hugging-face-incident-disclosure', group='event', label='Hugging Face discloses the agent intrusion',
         date='2026-07-16', place='Brooklyn, New York City', lat=40.7042, lon=-73.9867,
         place_basis='convention', rating=None,
         source_url='https://huggingface.co/blog/security-incident-july-2026',
         note='The first public report: Hugging Face\'s security incident disclosure for July 2026, '
              'published July 16, 2026. No time is documented: a noon chart for New York City, where '
              'Hugging Face is based.'),
    dict(id='eu-ai-act-in-force', group='event', label='The EU AI Act enters into force',
         date='2024-08-01', place='Brussels, Belgium', lat=50.8503, lon=4.3517,
         place_basis='convention', rating=None,
         source_url='https://commission.europa.eu/news-and-media/news/ai-act-enters-force-2024-08-01_en',
         note='The European Commission: "On 1 August 2024, the European Artificial Intelligence Act (AI Act) '
              'enters into force." It takes effect across the EU; this is a noon chart for Brussels, the '
              'Commission\'s seat, a convention.'),
    # ── public figures, with care ──
    dict(id='donald-trump', group='public-figure', label='Donald Trump',
         date='1946-06-14', local='10:54', zone=-4, place='Jamaica Hospital, Queens, New York',
         lat=40.7, lon=-73.8164, place_basis='documented', rating='AA',
         source_url='https://www.astro.com/astro-databank/Trump,_Donald',
         note='Astro-Databank: 10:54 EDT, rated AA (birth certificate). '
              "The Ascendant falls on the Leo-Virgo line: Astro-Databank gives 29°58' Leo, this "
              "engine 0°00' Virgo, so at this precision the rising sign is uncertain."),
    dict(id='elon-musk', group='public-figure', label='Elon Musk',
         date='1971-06-28', local='07:30', zone=2, place='Pretoria, South Africa',
         lat=-25.75, lon=28.1667, place_basis='documented', rating='B',
         source_url='https://www.astro.com/astro-databank/Musk,_Elon',
         note='Astro-Databank: 07:30 SAST, rated B (biography): Walter Isaacson\'s Elon Musk (2023) gives '
              'the birth at 7:30 in the morning.'),
    dict(id='bill-gates', group='public-figure', label='Bill Gates',
         date='1955-10-28', local='22:00', zone=-8, place='Seattle, Washington',
         lat=47.6, lon=-122.3333, place_basis='documented', rating='A',
         source_url='https://www.astro.com/astro-databank/Gates,_Bill',
         note='Astro-Databank: 22:00 PST, rated A (from memory): an astrologer quotes him, at a Microsoft '
              'function, as sure of 10:00 PM "or within the minute".'),
    dict(id='sam-altman', group='public-figure', label='Sam Altman',
         date='1985-04-22', local='05:00', zone=-6, place='Chicago, Illinois',
         lat=41.85, lon=-87.65, place_basis='documented', rating='A',
         source_url='https://www.astro.com/astro-databank/Altman,_Sam',
         note='Astro-Databank: 05:00 CST, rated A (from memory): in a 2023 email to an astrologer he gave '
              '"around 5 am central time". The Ascendant sits within about a degree of the Aries-Taurus '
              'line (Astro-Databank: at 04:58:30 or earlier it would be Aries), so the rising sign is '
              'uncertain.'),
    dict(id='mark-zuckerberg', group='public-figure', label='Mark Zuckerberg',
         date='1984-05-14', place='White Plains, New York', lat=41.0333, lon=-73.7667,
         place_basis='documented', rating='X',
         source_url='https://www.astro.com/astro-databank/Zuckerberg,_Mark',
         note='Astro-Databank: date without time, rated X. Rectified times circulate; none is used here.'),
    dict(id='demis-hassabis', group='public-figure', label='Demis Hassabis',
         date='1976-07-27', place='London, England', lat=51.5072, lon=-0.1276,
         place_basis='documented', rating=None,
         source_url='https://en.wikipedia.org/wiki/Demis_Hassabis',
         note='Date and place from Wikipedia. No Astro-Databank entry was found and no birth time is '
              'documented.'),
    dict(id='jensen-huang', group='public-figure', label='Jensen Huang',
         date='1963-02-17', place='Taipei, Taiwan', lat=25.0330, lon=121.5654,
         place_basis='documented', rating=None,
         source_url='https://en.wikipedia.org/wiki/Jensen_Huang',
         note='Date and place from Wikipedia (he moved to Tainan as a child). No Astro-Databank entry '
              'was found and no birth time is documented.'),
]

# Asked for, and deliberately not charted (reported by the build, not written to the file).
LEFT_OUT = [
    ('Xi Jinping', 'Astro-Databank rates the entry XX ("date in question"): most sources give 15 June '
                   '1953, some give 1 June. A disputed date is left out.'),
    ('Dario Amodei', 'Only the year (1983) is documented: Wikipedia gives the year alone, and the full date '
                     'on Wikidata is imported from Italian Wikipedia and an astrology site, with no primary '
                     'source. An undocumented date is left out.'),
    ('FLI pause letter (Mar 22 2023)', 'The date is documented but the letter was published online with no '
                                       'place given; left out rather than invent one.'),
]

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
          'October', 'November', 'December']

# ───────────────────────── chart-lab.js rules, ported ─────────────────────────
SIGNS = ce.ZODIAC_SIGNS
PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
BODIES = PLANETS + ['chiron', 'northnode', 'southnode']
POINT_LIKE = {'chiron', 'northnode', 'southnode', 'ascendant', 'midheaven'}
ORBS_PLANET = {'conjunction': 8, 'opposition': 8, 'square': 8, 'trine': 8, 'sextile': 6}
ORBS_POINT = {'conjunction': 5, 'opposition': 5, 'square': 5, 'trine': 5, 'sextile': 3}
ASPECT_DEFS = [('conjunction', 0, 0), ('sextile', 60, 2), ('square', 90, 3), ('trine', 120, 4), ('opposition', 180, 6)]
QUINCUNX_ORB = 3
FIG_SET = PLANETS + ['chiron', 'northnode', 'ascendant', 'midheaven']
ELEM = ['fire', 'earth', 'air', 'water']
MODE3 = ['cardinal', 'fixed', 'mutable']
NAKS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
        'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula',
        'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
        'Uttara Bhadrapada', 'Revati']
NAK_LORDS = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury']
ORB_NOTE = ("Planet-to-planet orbs are the engine's own (api/calculate_chart.py): 8 degrees (sextile 6); when either "
            "member is Chiron, a node, the Ascendant or the Midheaven, 5 (sextile 3). The South Node takes "
            "conjunctions only. Ascendant-Midheaven is the frame, not an aspect.")


def n360(x):
    # the same float operations as chart-lab.js (JS % is fmod), so orbs round identically there and here
    return (math.fmod(x, 360.0) + 360.0) % 360.0


def w180(x):
    return n360(x + 180.0) - 180.0


def sign_at(lon):
    return SIGNS[int(n360(lon) // 30)]


def js_round2(x):
    return math.floor(x * 100 + 0.5) / 100


def pos_text(lon):
    x = n360(lon)
    d = x % 30
    deg = int(d)
    mins = int((d - deg) * 60)
    return f"{deg}° {sign_at(x)} {mins:02d}'"


def nakshatra(lon):
    span = 360 / 27
    x = n360(lon)
    i = int(x // span)
    return {'name': NAKS[i], 'number': i + 1, 'pada': int((x - i * span) // (span / 4)) + 1, 'lord': NAK_LORDS[i % 9]}


def aspect_between(k1, l1, k2, l2):
    orbs = ORBS_POINT if (k1 in POINT_LIKE or k2 in POINT_LIKE) else ORBS_PLANET
    sep = abs(w180(l2 - l1))
    for name, angle, apart in ASPECT_DEFS:
        orb = abs(sep - angle)
        if orb <= orbs[name]:
            return {'name': name, 'angle': angle, 'orb': orb, 'apart': apart}
    return None


def compute_aspects(lons, speeds):
    keys = [k for k in FIG_SET if lons.get(k) is not None]
    rows = []
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            a, b = keys[i], keys[j]
            if {a, b} == {'ascendant', 'midheaven'}:
                continue
            hit = aspect_between(a, lons[a], b, lons[b])
            if hit:
                rows.append((a, b, hit))
    if lons.get('southnode') is not None:
        for a in keys:
            if a == 'northnode':
                continue
            hit = aspect_between(a, lons[a], 'southnode', lons['southnode'])
            if hit and hit['name'] == 'conjunction':
                rows.append((a, 'southnode', hit))
    out = []
    for a, b, h in rows:
        va, vb = speeds.get(a), speeds.get(b)
        applying = None
        if va is not None and vb is not None:
            diff = w180(lons[b] - lons[a])
            sep = abs(diff)
            dsep = math.copysign(1, diff) * (vb - va) if diff != 0 else 0
            s = math.copysign(1, sep - h['angle']) if sep != h['angle'] else 0
            applying = (s * dsep if sep != h['angle'] else 0) < 0
        dist = abs(int(n360(lons[a]) // 30) - int(n360(lons[b]) // 30)) % 12
        dist = min(dist, 12 - dist)
        row = {'a': a, 'b': b, 'aspect': h['name'], 'orb': js_round2(h['orb']), 'applying': applying}
        if dist != h['apart']:
            row['outOfSign'] = True
        if a in POINT_LIKE or b in POINT_LIKE:
            row['involvesPoint'] = True
        out.append(row)
    out.sort(key=lambda r: r['orb'])
    return out


def compute_figures(lons, aspects, house_of_planet):
    look = {'|'.join(sorted((r['a'], r['b']))): r for r in aspects}

    def kind(a, b):
        r = look.get('|'.join(sorted((a, b))))
        return r['aspect'] if r else None

    def orb_of(a, b):
        r = look.get('|'.join(sorted((a, b))))
        return r['orb'] if r else None

    def quinc(a, b):
        return abs(abs(w180(lons[a] - lons[b])) - 150) <= QUINCUNX_ORB

    keys = [k for k in FIG_SET if lons.get(k) is not None]

    def shared(ms, fn):
        v = {fn(sign_at(lons[m])) for m in ms}
        return v.pop() if len(v) == 1 else 'mixed'

    def modality_of(s):
        return MODE3[SIGNS.index(s) % 3]

    def element_of(s):
        return ELEM[SIGNS.index(s) % 4]

    def finish(fig, pairs, q=None):
        orbs = [o for o in (orb_of(a, b) for a, b in pairs) if o is not None]
        for a, b in fig.get('quincunxes', []):
            orbs.append(js_round2(abs(abs(w180(lons[a] - lons[b])) - 150)))
        fig['maxOrb'] = max(orbs) if orbs else None
        fig['allPlanets'] = all(m in PLANETS for m in fig['members'])
        if q:
            fig['quality'] = shared(fig['members'], q)
        return fig

    combos = lambda arr, k: [list(c) for c in itertools.combinations(arr, k)]  # noqa: E731
    figs = []
    for a, b in combos(keys, 2):
        if kind(a, b) != 'opposition':
            continue
        for c in keys:
            if c not in (a, b) and kind(a, c) == 'square' and kind(b, c) == 'square':
                figs.append(finish({'type': 'T-square', 'members': [a, b, c], 'apex': c, 'opposition': [a, b]},
                                   [[a, b], [a, c], [b, c]], modality_of))
    crosses = []
    for q in combos(keys, 4):
        ks = [kind(x, y) for x, y in combos(q, 2)]
        if ks.count('opposition') == 2 and ks.count('square') == 4:
            crosses.append(set(q))
            figs.append(finish({'type': 'grand cross', 'members': q[:]}, combos(q, 2), modality_of))
    for f in figs:
        if f['type'] == 'T-square' and any(all(m in c for m in f['members']) for c in crosses):
            f['partOfGrandCross'] = True
    trines = []
    for t in combos(keys, 3):
        if all(kind(x, y) == 'trine' for x, y in combos(t, 2)):
            trines.append(t)
            figs.append(finish({'type': 'grand trine', 'members': t[:]}, combos(t, 2), element_of))
    for t in trines:
        for d in keys:
            if d in t:
                continue
            for x in t:
                others = [y for y in t if y != x]
                if kind(d, x) == 'opposition' and all(kind(d, y) == 'sextile' for y in others):
                    figs.append(finish({'type': 'kite', 'members': t + [d], 'grandTrine': t[:], 'fourth': d, 'apex': x},
                                       combos(t, 2) + [[d, x]] + [[d, y] for y in others]))
    for a, b in combos(keys, 2):
        if kind(a, b) != 'sextile':
            continue
        for c in keys:
            if c not in (a, b) and quinc(a, c) and quinc(b, c):
                figs.append(finish({'type': 'yod', 'members': [a, b, c], 'apex': c, 'sextile': [a, b],
                                    'quincunxes': [[a, c], [b, c]]}, [[a, b]]))
    for q in combos(keys, 4):
        ks = [kind(x, y) for x, y in combos(q, 2)]
        if ks.count('opposition') == 2 and ks.count('trine') == 2 and ks.count('sextile') == 2:
            figs.append(finish({'type': 'mystic rectangle', 'members': q[:]}, combos(q, 2)))
    by_sign = {}
    for p in PLANETS:
        if lons.get(p) is not None:
            by_sign.setdefault(sign_at(lons[p]), []).append(p)
    for where, ms in by_sign.items():
        if len(ms) >= 3:
            figs.append({'type': 'stellium', 'scope': 'sign', 'where': where, 'members': ms,
                         'alsoThere': [k for k in ('chiron', 'northnode', 'southnode')
                                       if lons.get(k) is not None and sign_at(lons[k]) == where],
                         'allPlanets': True, 'note': '3+ planets; some traditions ask 4+'})
    by_house = {}
    for p in PLANETS:
        h = house_of_planet(p)
        if h:
            by_house.setdefault(h, []).append(p)
    for h in sorted(by_house):
        if len(by_house[h]) >= 3:
            figs.append({'type': 'stellium', 'scope': 'house', 'where': h, 'members': by_house[h],
                         'allPlanets': True, 'note': '3+ planets; some traditions ask 4+'})
    return figs


# ───────────────────────── the engine ─────────────────────────
def engine(local, lat, lon, zodiac, houses):
    return ce.calculate_chart(local.year, local.month, local.day, local.hour, local.minute, lat, lon,
                              house_system=houses, zodiac=zodiac, ayanamsa_name='lahiri')


def local_from_utc(utc, lat, lon):
    """The wall-clock time at the place for a UTC moment, by the same zone lookup the engine uses."""
    import pytz
    name = ce.tf.timezone_at(lat=lat, lng=lon)
    return pytz.UTC.localize(utc).astimezone(pytz.timezone(name)).replace(tzinfo=None)


def jd_tt_of(utc):
    eph, ts = ce.get_ephemeris()
    return ts.utc(utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second).tt


def speeds_at(utc):
    eph, ts = ce.get_ephemeris()
    jd = jd_tt_of(utc)
    out = {}
    for body in PLANETS + ['northnode', 'southnode']:
        out[body] = round(float(tt.make_speed_fn(tt.make_longitude_fn(eph, ts, body))(jd)), 5)
    return out


def chiron_at(utc):
    """(longitude, deg/day) from JPL Horizons: body 2060, observer ecliptic of date, geocentric."""
    jd_ut = 2440587.5 + (utc - dt.datetime(1970, 1, 1)).total_seconds() / 86400.0
    tlist = ','.join(f"'{jd_ut + d:.6f}'" for d in (-0.5, 0.0, 0.5))
    q = {'format': 'json', 'COMMAND': "'2060'", 'OBJ_DATA': "'NO'", 'MAKE_EPHEM': "'YES'",
         'EPHEM_TYPE': "'OBSERVER'", 'CENTER': "'500@399'", 'TLIST_TYPE': "'JD'", 'TIME_TYPE': "'UT'",
         'TLIST': tlist, 'QUANTITIES': "'31'", 'ANG_FORMAT': "'DEG'", 'CSV_FORMAT': "'YES'"}
    url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q, safe="',@")
    with urllib.request.urlopen(url, timeout=60) as r:
        res = json.load(r)['result']
    rows = res[res.index('$$SOE') + 5:res.index('$$EOE')].strip().splitlines()
    lons = [float(row.split(',')[3]) for row in rows]
    if len(lons) != 3:
        raise ValueError('Horizons returned %d rows' % len(lons))
    return lons[1], round(w180(lons[2] - lons[0]) / 1.0, 5)


def house_of(lon, cusps):
    return tt.house_of(lon, cusps)


def point(lon, house, retro, speed, sid, placidus_house=None):
    p = {'longitude': round(n360(lon), 4), 'sign': sign_at(lon), 'degreeInSign': round(n360(lon) % 30, 4),
         'position': pos_text(lon), 'house': house}
    if retro:
        p['retrograde'] = True
    if speed is not None:
        p['speedDegPerDay'] = speed
    if sid:
        p['nakshatra'] = nakshatra(lon)
        if placidus_house:
            p['placidusHouse'] = placidus_house
    return p


def angle(lon, sid):
    a = {'longitude': round(n360(lon), 4), 'sign': sign_at(lon), 'degreeInSign': round(n360(lon) % 30, 4),
         'position': pos_text(lon)}
    if sid:
        a['nakshatra'] = nakshatra(lon)
    return a


def one_chart(res, zodiac, time_known, speeds, chiron, tropical_houses=None, moon_span=None, place_basis=None, place=None):
    sid = zodiac == 'sidereal'
    s = res['settings']
    ayan = s['ayanamsaDegrees'] if sid else 0.0
    lons, retro = {}, {}
    for k, v in res['planets'].items():
        lons[k] = v['longitude']
        retro[k] = v['isRetrograde']
    if chiron:
        lons['chiron'] = n360(chiron[0] - ayan)
        retro['chiron'] = chiron[1] < 0
    order = [k for k in BODIES if k in lons]
    cusps = [h['cusp'] for h in res['houses']] if time_known else None
    points = {}
    for k in order:
        spd = chiron[1] if k == 'chiron' else speeds.get(k)
        h = (res['planets'][k]['house'] if k in res['planets'] else house_of(lons[k], cusps)) if time_known else None
        ph = tropical_houses.get(k) if (sid and tropical_houses) else None
        points[k] = point(lons[k], h, retro[k], spd, sid, ph)
    if not time_known and moon_span:
        points['moon']['approximate'] = True
        points['moon']['dayRange'] = moon_span
    all_lons = dict(lons)
    angles, houses = {}, []
    if time_known:
        all_lons['ascendant'] = res['angles']['ascendant']['longitude']
        all_lons['midheaven'] = res['angles']['midheaven']['longitude']
        angles = {'ascendant': angle(all_lons['ascendant'], sid), 'midheaven': angle(all_lons['midheaven'], sid)}
        houses = [{'house': h['house'], 'cusp': h['cusp'], 'sign': sign_at(h['cusp']), 'position': pos_text(h['cusp'])}
                  for h in res['houses']]
    aspects = compute_aspects(all_lons, dict(speeds, **({'chiron': chiron[1]} if chiron else {})))
    figures = compute_figures(all_lons, aspects, lambda p: points[p]['house'] if p in points else None)
    if not time_known:
        note = ('Time unknown: planets at local noon; no houses, no Ascendant or Midheaven. The Moon moves '
                '12-15 degrees a day, so its place is approximate (dayRange gives its span over that local '
                'date), and so are its aspects.')
        if moon_span and moon_span[0].split()[1] != moon_span[1].split()[1]:
            note += (f' Over that date the Moon moves from {moon_span[0].split()[1]} into '
                     f'{moon_span[1].split()[1]}, so its sign is uncertain.')
    elif sid:
        note = ('Whole-sign houses from the sidereal (Lahiri) Ascendant; each point keeps its Placidus house as '
                'placidusHouse. Nodes are true nodes.')
    else:
        note = ''
    if time_known and place_basis == 'convention':
        note = (note + ' ' if note else '') + (f'Houses and angles are cast for {place} by convention: the event '
                                                'happened online, so the place is not a record.')
    ch = {'zodiac': zodiac, 'houseSystem': (s['houseSystemActual'] if time_known else None), 'order': order,
          'points': points, 'angles': angles, 'houses': houses, 'aspects': aspects, 'figures': figures,
          'housesNote': note, 'orbs': {'note': ORB_NOTE}}
    if sid:
        ch['ayanamsa'] = {'name': 'lahiri', 'label': s['ayanamsaLabel'], 'degrees': s['ayanamsaDegrees']}
    return ch


def build(e, with_chiron):
    y, m, d = map(int, e['date'].split('-'))
    time_known = bool(e.get('local') or e.get('utc'))
    if e.get('utc'):
        hh, mm = map(int, e['utc'].split(':'))
        utc = dt.datetime(y, m, d, hh, mm)
        local = local_from_utc(utc, e['lat'], e['lon'])
    else:
        hh, mm = map(int, (e.get('local') or '12:00').split(':'))
        local = dt.datetime(y, m, d, hh, mm)
    trop = engine(local, e['lat'], e['lon'], 'tropical', 'placidus')
    sidr = engine(local, e['lat'], e['lon'], 'sidereal', 'whole-sign')
    tz = trop['settings']['birthTime']['timezone']
    utc_eng = dt.datetime.strptime(trop['settings']['birthTime']['utc'], '%Y-%m-%d %H:%M')
    if e.get('utc') and utc_eng != utc:
        raise SystemExit(f"{e['id']}: engine UTC {utc_eng} differs from the documented {utc}")
    if e.get('zone') is not None and abs(tz['utcOffsetHours'] - e['zone']) > 1e-6:
        raise SystemExit(f"{e['id']}: engine zone {tz['name']} UTC{tz['utcOffsetHours']:+g} differs from the "
                         f"source's UTC{e['zone']:+g}")
    speeds = speeds_at(utc_eng)
    chiron = None
    if with_chiron:
        try:
            chiron = chiron_at(utc_eng)
        except Exception as ex:  # noqa: BLE001
            print(f"  {e['id']}: Chiron left out ({ex})")
    moon_spans = {}
    if not time_known:
        for z, hs in (('tropical', 'placidus'), ('sidereal', 'whole-sign')):
            a = engine(dt.datetime(y, m, d, 0, 0), e['lat'], e['lon'], z, hs)['planets']['moon']['longitude']
            b = engine(dt.datetime(y, m, d, 23, 59), e['lat'], e['lon'], z, hs)['planets']['moon']['longitude']
            moon_spans[z] = [pos_text(a), pos_text(b)]
    t_chart = one_chart(trop, 'tropical', time_known, speeds, chiron, moon_span=moon_spans.get('tropical'),
                        place_basis=e['place_basis'], place=e['place'])
    t_houses = {k: v['house'] for k, v in t_chart['points'].items()}
    s_chart = one_chart(sidr, 'sidereal', time_known, speeds, chiron, tropical_houses=t_houses,
                        moon_span=moon_spans.get('sidereal'), place_basis=e['place_basis'], place=e['place'])
    day = f"{d} {MONTHS[m - 1]} {y}"
    off = f"UTC{tz['utcOffsetHours']:+g}"
    if e.get('utc'):
        when = f"{day}, {e['utc']} UTC ({local:%H:%M} local, {off})"
    elif e.get('local'):
        when = f"{day}, {e['local']} {tz['abbreviation']} ({off})"
    else:
        when = f"{day}, time unknown: no houses (planets at local noon, {off})"
    return {'id': e['id'], 'group': e['group'], 'label': e['label'], 'date_label': when, 'place': e['place'],
            'place_basis': e['place_basis'], 'time_known': time_known, 'rating': e['rating'],
            'source_url': e['source_url'], 'note': e['note'], 'tropical': t_chart, 'sidereal': s_chart}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--no-chiron', action='store_true', help='skip the JPL Horizons call for Chiron')
    ap.add_argument('--out', default=OUT)
    a = ap.parse_args()
    if not ce.TZ_AVAILABLE:
        raise SystemExit('timezonefinder + pytz are needed: the zone must be resolved, not estimated.')
    rows = []
    for e in ENTRIES:
        r = build(e, not a.no_chiron)
        rows.append(r)
        print(f"  {r['id']}: {r['date_label']} [{r['rating'] or '-'}]")
    with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        f.write('[\n' + ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows) + '\n]\n')
    print(f"wrote {os.path.relpath(a.out, ROOT)}: {len(rows)} charts, {os.path.getsize(a.out) // 1024} KB")
    for who, why in LEFT_OUT:
        print(f"  left out: {who}: {why}")


if __name__ == '__main__':
    main()
