"""
Transit Timeline API — every exact hit in a date window.

`api/calculate_chart.py` answers "where is the sky at one moment". This answers
the other question: **when, across a stretch of time, does the sky touch this
chart** — the one a wheel structurally cannot ask.

Output is a chronological list of three kinds of event:

  * **aspect hits** — a transiting body perfecting an aspect to a natal point,
    with the exact instant root-found to the second, plus the moment the orb
    opened and the moment it closed (the applying and separating spans). A
    retrograde body that crosses the same degree three times produces three
    hits, not one, because that is what actually happens.
  * **stations** — the instant a body's ecliptic speed passes through zero,
    turning retrograde or direct, with the degree it turned on.
  * **ingresses** — a body crossing into a new sign, or into a new NATAL house
    (the houses of the chart being transited, not of the transit moment).

Everything is solved against the same Skyfield/DE421 positions the chart
endpoint serves, so a hit's reported instant is exact *in this engine's own
terms*: at the reported time the longitude difference is under an arcsecond, not
under a day. Nothing here is a prediction. It is a calendar of geometry.

METHOD, and why it is fast enough to be a request

The naive version — step a day at a time and ask the ephemeris for a position
each time — costs one ephemeris call per sample and per bisection step, and a
two-month window over ten bodies runs into thousands of calls. Skyfield takes
*vector* times, so every stage here is batched instead:

  1. one vectorised call per body builds the whole sample grid of longitudes;
  2. crossings are detected in numpy against ALL target longitudes at once —
     a target being an aspect's exact degree, an orb edge, a sign boundary or a
     natal cusp, which are all the same thing: "the longitude equals a constant";
  3. every bracket found for a body is then refined by ONE vectorised bisection
     — 24 rounds of `lo/hi` arrays, so 24 ephemeris calls settle hundreds of
     roots simultaneously, to well under a second of time.

That last step is the wall-clock/bisection craft from the Human Design design-
date search, moved server-side and turned sideways: there it was ~15 sequential
HTTP round-trips to find one root; here it is 24 array evaluations to find them
all.
"""

from http.server import BaseHTTPRequestHandler
import json
import math
import os
import sys
from datetime import datetime, timedelta, timezone

import numpy as np
from skyfield.api import Loader
from skyfield.framelib import ecliptic_frame

# The chart engine is a sibling module, not a package: importing it needs this
# directory on the path, because a Vercel function's entrypoint is not
# necessarily imported from its own directory. It is used for ONE thing — the
# convenience path where a caller sends birth data instead of a precomputed
# natal chart — so the import is soft: if it is unavailable, the precomputed
# path (which is what the app actually uses) still works and the birth-data path
# says plainly that it cannot serve.
_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
try:
    import calculate_chart as chart_engine
except Exception as _e:  # noqa: BLE001
    chart_engine = None
    _chart_engine_error = str(_e)
else:
    _chart_engine_error = None


ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

PLANET_NAMES = {
    'sun': 'sun',
    'moon': 'moon',
    'mercury': 'mercury',
    'venus': 'venus',
    'mars': 'mars',
    'jupiter': 'jupiter barycenter',
    'saturn': 'saturn barycenter',
    'uranus': 'uranus barycenter',
    'neptune': 'neptune barycenter',
    'pluto': 'pluto barycenter',
}

# The transiting set, in the order a hit list reads best. The Moon is
# deliberately NOT here: it aspects every natal point roughly every other day,
# so including it turns a two-month window from ~150 events into ~1,600 and
# buries every slow transit that actually characterises a season. Ask for it
# explicitly (`includeMoon: true`) when the question is genuinely about days.
DEFAULT_TRANSITING = [
    'sun', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northnode',
]

DEFAULT_NATAL_POINTS = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
    'northnode', 'ascendant', 'midheaven',
]

MAJOR_ASPECTS = [
    (0.0, 'conjunction'),
    (60.0, 'sextile'),
    (90.0, 'square'),
    (120.0, 'trine'),
    (180.0, 'opposition'),
]

MINOR_ASPECTS = [
    (30.0, 'semisextile'),
    (45.0, 'semisquare'),
    (135.0, 'sesquiquadrate'),
    (150.0, 'quincunx'),
    (72.0, 'quintile'),
    (144.0, 'biquintile'),
]

# Sampling step per body, in days. The rule: a step must be small enough that
# the body cannot pass a target degree and come back between two samples, and
# small enough that the wrap test below (a jump of more than 90 deg is the
# -180/+180 seam, not a crossing) can never misfire. Even Mercury at its fastest
# (~2.2 deg/day) moves 0.55 deg per step here.
BODY_STEP_DAYS = {
    'moon': 0.125,
    'sun': 0.25,
    'mercury': 0.25,
    'venus': 0.25,
    'mars': 0.5,
    'jupiter': 1.0,
    'saturn': 1.0,
    'uranus': 1.0,
    'neptune': 1.0,
    'pluto': 1.0,
    # The osculating node is not a body and does not move like one: its
    # longitude wobbles by a degree or more within a month around a slow mean
    # retrograde drift, so it needs a finer step than its mean rate suggests.
    'northnode': 0.5,
}

# How far OUTSIDE the window each body is sampled, in days. Only hits that
# perfect inside the window are reported — but a bar on a timeline needs to know
# when the orb opened, and for a slow planet that can be weeks before the window
# starts. Pluto covers one degree in about twenty-five days, and rather longer
# when it is near a station, so its margin is the widest. Without this the
# outer-planet transits — the ones that actually characterise a season — would
# all report an unknown start.
BODY_PAD_DAYS = {
    'moon': 1.0,
    'sun': 4.0,
    'mercury': 10.0,
    'venus': 10.0,
    'mars': 25.0,
    'jupiter': 35.0,
    'saturn': 50.0,
    'uranus': 70.0,
    'neptune': 70.0,
    'pluto': 70.0,
    'northnode': 35.0,
}

# Bodies whose stations are reported. The Sun and Moon never station. The node
# is excluded on purpose: the OSCULATING node's rate passes through zero several
# times a month, so "stations" for it would be a page of noise describing a
# mathematical wobble rather than anything a tradition ever named.
STATION_BODIES = ['mercury', 'venus', 'mars', 'jupiter', 'saturn',
                  'uranus', 'neptune', 'pluto']

# Half-step for the central difference that measures speed, in days. Wide enough
# to be numerically stable against ephemeris round-off, narrow enough that a
# station's own curvature does not smear the zero.
SPEED_HALF_STEP_DAYS = 0.05

# Bisection rounds, before the closing linear step. Twelve halvings take the
# coarsest grid step (one day) down to about twenty seconds, over which a
# longitude curve is straight to far better than an arcsecond — so the last
# refinement is one inverse-linear interpolation between the two bracket ends
# rather than another twelve halvings. That is worth doing rather than simply
# bisecting further: each round is a real ephemeris evaluation, and halving the
# round count roughly halves the response time.
BISECTION_ROUNDS = 12

DEFAULT_ORB = 1.0          # degrees, the "exact window" listing orb
MAX_ORB = 10.0
DEFAULT_WINDOW_BACK_DAYS = 30
DEFAULT_WINDOW_FORWARD_DAYS = 30
MAX_WINDOW_DAYS = 1830     # about five years
MAX_EVENTS = 2000

EPHEMERIS_MIN_YEAR = 1900
EPHEMERIS_MAX_YEAR = 2053


_eph = None
_ts = None


def get_ephemeris():
    """Load or return the cached ephemeris and timescale.

    A copy of the chart endpoint's loader rather than an import of it: these are
    two separate serverless functions with two separate /tmp caches, so sharing
    the code would not share the download, and a hard dependency here would make
    the timeline endpoint fail to start for a reason that has nothing to do with
    it.
    """
    global _eph, _ts
    if _eph is None:
        # SKYFIELD_CACHE_DIR is how the test suite points at an already
        # downloaded kernel instead of pulling 17 MB per run; unset in
        # production, where /tmp is the only writable path a function has.
        cache_dir = os.environ.get('SKYFIELD_CACHE_DIR') or '/tmp/skyfield_cache'
        try:
            os.makedirs(cache_dir, exist_ok=True)
        except OSError:
            cache_dir = os.path.join(_HERE, '.skyfield_cache')
            os.makedirs(cache_dir, exist_ok=True)
        loader = Loader(cache_dir, verbose=False)
        _eph = loader('de421.bsp')
        _ts = loader.timescale()
    return _eph, _ts


def wrap180(x):
    """Signed angular difference folded into (-180, 180]."""
    return (np.asarray(x, dtype=float) + 180.0) % 360.0 - 180.0


def degrees_to_zodiac(degrees):
    degrees = float(degrees) % 360.0
    index = int(degrees // 30)
    return {
        'sign': ZODIAC_SIGNS[index],
        'signIndex': index,
        'degree': round(degrees % 30.0, 4),
        'totalDegrees': round(degrees, 4),
    }


def format_position(degrees):
    """`14° Leo 27'` — how an astrologer reads a longitude aloud.

    Minutes are TRUNCATED, not rounded, which is the field's convention and the
    only safe choice: rounding 29 deg 59.7' of Leo produces "30 Leo 00", a
    degree that does not exist and that reads as Virgo. Truncating costs at most
    an arcminute of display precision on a number the response also carries in
    full.
    """
    degrees = float(degrees) % 360.0
    index = int(degrees // 30)
    within = degrees % 30.0
    d = int(within)
    m = int((within - d) * 60.0)
    return f"{d}° {ZODIAC_SIGNS[index]} {m:02d}'"


def house_of(longitude, cusps):
    """Which house a longitude falls in, given twelve cusp longitudes."""
    longitude = float(longitude) % 360.0
    for i in range(12):
        start = cusps[i] % 360.0
        end = cusps[(i + 1) % 12] % 360.0
        if start < end:
            if start <= longitude < end:
                return i + 1
        else:
            if longitude >= start or longitude < end:
                return i + 1
    return 1


# ---------------------------------------------------------------------------
# Vectorised longitude functions
# ---------------------------------------------------------------------------

def make_longitude_fn(eph, ts, body, ayanamsa_school=None):
    """A function jd_tt(array) -> ecliptic longitudes in degrees, vectorised.

    The frame is the true ecliptic and equinox OF DATE — `epoch=t`, exactly as
    the chart endpoint reports it. Without that, every longitude here would be
    displaced from every longitude there by the precession since J2000, and the
    two endpoints would quietly disagree about where Saturn is.

    When `ayanamsa_school` is given, longitudes come back sidereal, with the
    ayanamsa evaluated AT EACH SAMPLE rather than once for the window: over five
    years it drifts about four arcminutes, which is four times the accuracy this
    solver claims, so freezing it would be the largest avoidable error in the
    file.
    """
    earth = eph['earth']

    if body == 'northnode' or body == 'southnode':
        moon_rel = eph['moon'] - eph['earth']
        offset = 180.0 if body == 'southnode' else 0.0

        def longitudes(jd):
            t = ts.tt_jd(np.asarray(jd, dtype=float))
            position, velocity = moon_rel.at(t).frame_xyz_and_velocity(ecliptic_frame)
            h = np.cross(position.au, velocity.au_per_d, axis=0)
            lon = np.degrees(np.arctan2(h[0], -h[1])) + offset
            return _apply_ayanamsa(lon, jd, ayanamsa_school)
    else:
        target = eph[PLANET_NAMES[body]]

        def longitudes(jd):
            t = ts.tt_jd(np.asarray(jd, dtype=float))
            apparent = earth.at(t).observe(target).apparent()
            lon = apparent.ecliptic_latlon(epoch=t)[1].degrees
            return _apply_ayanamsa(lon, jd, ayanamsa_school)

    return longitudes


def _apply_ayanamsa(lon, jd, school):
    lon = np.asarray(lon, dtype=float)
    if school:
        if chart_engine is None:
            raise RuntimeError(
                'Sidereal longitudes need the chart engine for the ayanamsa, '
                'and it could not be imported: ' + str(_chart_engine_error)
            )
        ayan = np.array([chart_engine.ayanamsa_degrees(float(j), school)
                         for j in np.atleast_1d(jd)], dtype=float)
        lon = lon - ayan.reshape(np.shape(lon))
    return lon % 360.0


def make_speed_fn(longitude_fn, half_step=SPEED_HALF_STEP_DAYS):
    """Degrees per day, by central difference on the longitude function."""
    def speeds(jd):
        jd = np.asarray(jd, dtype=float)
        before = longitude_fn(jd - half_step)
        after = longitude_fn(jd + half_step)
        return wrap180(after - before) / (2.0 * half_step)
    return speeds


# ---------------------------------------------------------------------------
# The universal root finder
# ---------------------------------------------------------------------------

def find_brackets(jd_grid, longitudes, targets):
    """Every grid interval in which a longitude crosses a target longitude.

    `targets` is a (T,) array of constant longitudes; `longitudes` a (N,) array
    sampled at `jd_grid`. Returns (target_index, jd_lo, jd_hi) arrays.

    A crossing is a sign change of `wrap180(longitude - target)` — but the
    wrapped difference also flips sign when the body passes the point OPPOSITE
    the target, jumping from +180 to -180. That seam is rejected by requiring
    the step-to-step change to be small; every sampling step in this file keeps
    real motion under a degree or so, so 90 degrees is a wide, safe threshold.
    """
    targets = np.asarray(targets, dtype=float)
    if targets.size == 0:
        empty = np.empty(0)
        return np.empty(0, dtype=int), empty, empty

    f = wrap180(np.asarray(longitudes, dtype=float)[None, :] - targets[:, None])
    left, right = f[:, :-1], f[:, 1:]
    seam = np.abs(right - left) > 90.0

    # A sample landing exactly on a target has f == 0 and no sign change on
    # either side; attribute it to the interval starting there.
    crossed = ((np.sign(left) * np.sign(right)) < 0) | (left == 0.0)
    hit = crossed & ~seam

    ti, gi = np.nonzero(hit)
    return ti, np.asarray(jd_grid)[gi], np.asarray(jd_grid)[gi + 1]


def _bisect(signed_fn, jd_lo, jd_hi, rounds):
    """Vectorised bisection, closed by one inverse-linear step.

    Every bracket in the arrays moves together, so one vectorised ephemeris
    evaluation per round settles every root a body has in the window at once.
    The final `lo + width * f_lo / (f_lo - f_hi)` is where the straight line
    between the two ends crosses zero — over a twenty-second interval the curve
    IS that line to well past the precision anything downstream can use.
    """
    jd_lo = np.array(jd_lo, dtype=float)
    jd_hi = np.array(jd_hi, dtype=float)
    if jd_lo.size == 0:
        return jd_lo

    f_lo = np.asarray(signed_fn(jd_lo), dtype=float)
    f_hi = np.asarray(signed_fn(jd_hi), dtype=float)
    for _ in range(rounds):
        mid = 0.5 * (jd_lo + jd_hi)
        f_mid = np.asarray(signed_fn(mid), dtype=float)
        same_side = np.sign(f_mid) == np.sign(f_lo)
        jd_lo = np.where(same_side, mid, jd_lo)
        f_lo = np.where(same_side, f_mid, f_lo)
        jd_hi = np.where(same_side, jd_hi, mid)
        f_hi = np.where(same_side, f_hi, f_mid)

    spread = f_lo - f_hi
    fraction = np.where(spread == 0.0, 0.5, f_lo / np.where(spread == 0.0, 1.0, spread))
    fraction = np.clip(fraction, 0.0, 1.0)
    return jd_lo + (jd_hi - jd_lo) * fraction


def refine_crossings(longitude_fn, jd_lo, jd_hi, targets, rounds=BISECTION_ROUNDS):
    """The instant each bracketed longitude crossing actually happens."""
    targets = np.asarray(targets, dtype=float)
    return _bisect(lambda jd: wrap180(longitude_fn(jd) - targets),
                   jd_lo, jd_hi, rounds)


def refine_zeros(value_fn, jd_lo, jd_hi, rounds=BISECTION_ROUNDS):
    """The instant a plain signed function crosses zero (speed, for stations)."""
    return _bisect(value_fn, jd_lo, jd_hi, rounds)


# ---------------------------------------------------------------------------
# Window and natal input
# ---------------------------------------------------------------------------

WINDOW_PRESETS = {
    'past-month': (-30, 0),
    'past-3-months': (-91, 0),
    'past-6-months': (-183, 0),
    'past-year': (-365, 0),
    'this-month': (-15, 15),
    'next-month': (0, 30),
    'next-3-months': (0, 91),
    'next-6-months': (0, 183),
    'next-year': (0, 365),
    'around-now': (-30, 30),
}


def parse_datetime(value, field):
    """An ISO date or datetime, read as UTC. Anything else is an error."""
    if isinstance(value, (int, float)):
        raise ValueError(f"'{field}' must be an ISO date string, not a number")
    text = str(value).strip().replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        raise ValueError(
            f"Could not read '{field}' as a date: {value!r}. "
            "Use YYYY-MM-DD or an ISO 8601 datetime."
        )
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def resolve_window(data):
    """(start, end) as timezone-aware UTC datetimes, plus what was asked for."""
    now = datetime.now(timezone.utc)
    anchor = parse_datetime(data['anchor'], 'anchor') if data.get('anchor') else now

    preset = data.get('preset') or data.get('window')
    if isinstance(preset, str) and preset.strip():
        key = preset.strip().lower()
        if key not in WINDOW_PRESETS:
            raise ValueError(
                f"Unknown window preset '{preset}'. Known presets: "
                + ', '.join(sorted(WINDOW_PRESETS))
                + " — or send explicit 'start' and 'end' dates."
            )
        back, forward = WINDOW_PRESETS[key]
        start = anchor + timedelta(days=back)
        end = anchor + timedelta(days=forward)
        requested = key
    else:
        start = (parse_datetime(data['start'], 'start') if data.get('start')
                 else anchor - timedelta(days=DEFAULT_WINDOW_BACK_DAYS))
        end = (parse_datetime(data['end'], 'end') if data.get('end')
               else anchor + timedelta(days=DEFAULT_WINDOW_FORWARD_DAYS))
        requested = 'explicit' if (data.get('start') or data.get('end')) else 'default'

    if end <= start:
        raise ValueError('The window ends before it starts.')
    span_days = (end - start).total_seconds() / 86400.0
    if span_days > MAX_WINDOW_DAYS:
        raise ValueError(
            f'Window of {span_days:.0f} days is longer than this endpoint will '
            f'solve ({MAX_WINDOW_DAYS} days). Ask for a shorter stretch, or '
            'several.'
        )
    for label, dt in (('start', start), ('end', end)):
        if not (EPHEMERIS_MIN_YEAR <= dt.year <= EPHEMERIS_MAX_YEAR):
            raise ValueError(
                f'Window {label} {dt.year} is outside the DE421 ephemeris range '
                f'({EPHEMERIS_MIN_YEAR}-{EPHEMERIS_MAX_YEAR}).'
            )
    return start, end, requested


def resolve_natal(data):
    """The chart being transited: longitudes, house cusps, and its zodiac.

    Two ways in. Either `natal` carries points and cusps already (what the app
    sends — it has just drawn the chart and there is no reason to recompute it),
    or birth data does, and the chart engine is asked for it.
    """
    natal = data.get('natal')
    if isinstance(natal, dict) and natal.get('points'):
        points = {}
        for key, value in natal['points'].items():
            if isinstance(value, dict):
                value = value.get('longitude')
            if value is None:
                continue
            points[str(key).strip().lower()] = float(value) % 360.0
        if not points:
            raise ValueError("'natal.points' had no usable longitudes.")

        cusps = natal.get('houses') or natal.get('cusps')
        house_cusps = None
        if cusps:
            values = []
            for c in cusps:
                values.append(float(c['cusp'] if isinstance(c, dict) else c) % 360.0)
            if len(values) != 12:
                raise ValueError(
                    f"'natal.houses' needs twelve cusps, got {len(values)}."
                )
            house_cusps = values

        return {
            'points': points,
            'houses': house_cusps,
            'zodiac': (natal.get('zodiac') or 'tropical'),
            'ayanamsa': natal.get('ayanamsa'),
            'source': 'supplied',
            'chart': None,
        }

    required = ('year', 'month', 'day', 'latitude', 'longitude')
    if not all(k in data for k in required):
        raise ValueError(
            "Send either 'natal' (points, and houses for house ingresses) or "
            "birth data (year, month, day, hour, minute, latitude, longitude)."
        )
    if chart_engine is None:
        raise RuntimeError(
            'This endpoint can only compute a natal chart from birth data when '
            'the chart engine is importable; it was not (' +
            str(_chart_engine_error) + '). Send a precomputed "natal" instead.'
        )

    chart = chart_engine.calculate_chart(
        int(data['year']), int(data['month']), int(data['day']),
        int(data.get('hour', 12)), int(data.get('minute', 0)),
        float(data['latitude']), float(data['longitude']),
        data.get('houseSystem', 'placidus'),
        data.get('zodiac', 'tropical'),
        (data.get('ayanamsa') or chart_engine.DEFAULT_AYANAMSA),
    )
    points = {k: float(v['longitude']) for k, v in chart['planets'].items()}
    points['ascendant'] = float(chart['angles']['ascendant']['longitude'])
    points['midheaven'] = float(chart['angles']['midheaven']['longitude'])
    points['descendant'] = float(chart['angles']['descendant']['longitude'])
    points['imumcoeli'] = float(chart['angles']['imumCoeli']['longitude'])
    return {
        'points': points,
        'houses': [h['cusp'] for h in chart['houses']],
        'zodiac': chart['settings']['zodiac'],
        'ayanamsa': chart['settings'].get('ayanamsaUsed'),
        'source': 'computed from birth data',
        'chart': chart,
    }


# ---------------------------------------------------------------------------
# The solve
# ---------------------------------------------------------------------------

def build_timeline(data):
    eph, ts = get_ephemeris()

    start, end, window_requested = resolve_window(data)
    natal = resolve_natal(data)

    sidereal_school = None
    if str(natal['zodiac']).lower() == 'sidereal':
        sidereal_school = natal.get('ayanamsa') or (
            chart_engine.DEFAULT_AYANAMSA if chart_engine else None
        )
        if not sidereal_school:
            raise ValueError(
                'A sidereal natal chart needs its ayanamsa named, so the transits '
                'can be put in the same zodiac.'
            )

    orb = float(data.get('orb', DEFAULT_ORB))
    if not (0.0 < orb <= MAX_ORB):
        raise ValueError(f'Orb must be between 0 and {MAX_ORB} degrees.')

    aspect_set = str(data.get('aspects', 'major')).strip().lower()
    if aspect_set in ('major', 'majors'):
        aspects = list(MAJOR_ASPECTS)
    elif aspect_set in ('all', 'minor', 'minors'):
        aspects = list(MAJOR_ASPECTS) + list(MINOR_ASPECTS)
        aspect_set = 'all'
    else:
        raise ValueError("'aspects' must be 'major' or 'all'.")

    transiting = data.get('transitingBodies') or list(DEFAULT_TRANSITING)
    transiting = [str(b).strip().lower() for b in transiting]
    if data.get('includeMoon') and 'moon' not in transiting:
        transiting = ['moon'] + transiting
    for body in transiting:
        if body not in PLANET_NAMES and body not in ('northnode', 'southnode'):
            raise ValueError(f"Unknown transiting body '{body}'.")

    natal_keys = data.get('natalPoints') or list(DEFAULT_NATAL_POINTS)
    natal_keys = [str(k).strip().lower() for k in natal_keys]
    natal_points = {k: natal['points'][k] for k in natal_keys if k in natal['points']}
    if not natal_points:
        raise ValueError(
            'None of the requested natal points are in the chart. Available: '
            + ', '.join(sorted(natal['points']))
        )

    # The event list answers "when". A graphic ephemeris also needs "along what
    # path", which is a sampled curve per body — asked for separately because
    # the Gantt view has no use for it and it is the bulk of the response.
    want_series = bool(data.get('includeSeries'))
    series_points = int(data.get('seriesPoints', 240))
    if not (2 <= series_points <= 1200):
        raise ValueError('seriesPoints must be between 2 and 1200.')

    want_stations = bool(data.get('stations', True))
    want_sign_ingress = bool(data.get('signIngresses', True))
    want_house_ingress = bool(data.get('houseIngresses', True)) and bool(natal['houses'])

    jd_start = ts.utc(start).tt
    jd_end = ts.utc(end).tt

    def to_iso(jd):
        return ts.tt_jd(float(jd)).utc_strftime('%Y-%m-%dT%H:%M:%SZ')

    hits, stations, ingresses = [], [], []
    # One display grid shared by every body, so the folded ephemeris can draw
    # all the curves against a single x scale without interpolating.
    series_jd = (np.linspace(jd_start, jd_end, series_points) if want_series
                 else None)
    series = {} if want_series else None

    for body in transiting:
        step = BODY_STEP_DAYS.get(body, 1.0)
        pad = BODY_PAD_DAYS.get(body, 30.0)
        grid_lo = jd_start - pad
        grid_hi = jd_end + pad
        n = int(math.ceil((grid_hi - grid_lo) / step)) + 1
        grid = grid_lo + step * np.arange(n + 1, dtype=float)
        longitude_fn = make_longitude_fn(eph, ts, body, sidereal_school)
        grid_lon = longitude_fn(grid)

        if want_series:
            series_lon = longitude_fn(series_jd)
            series_speed = make_speed_fn(longitude_fn)(series_jd)
            series[body] = {
                'longitude': [round(float(v) % 360.0, 4) for v in series_lon],
                'retrograde': [bool(s < 0) for s in series_speed],
            }

        # --- everything that is "the longitude equals a constant" ---------
        # An aspect's exact degree, its two orb edges, a sign boundary and a
        # natal cusp are all the same kind of question, so they are asked in ONE
        # pass and refined by ONE bisection: the round count, not the number of
        # targets, is what a request costs. Reading each exact crossing's
        # applying and separating edges off the same sorted list is also what
        # makes a retrograde triple pass come out as one span with three exact
        # dates rather than three smeared bars.
        target_lons, target_meta = [], []
        for natal_key, natal_lon in natal_points.items():
            for angle, aspect_name in aspects:
                if angle == 0.0:
                    centers = [natal_lon]
                elif angle == 180.0:
                    centers = [(natal_lon + 180.0) % 360.0]
                else:
                    centers = [(natal_lon + angle) % 360.0,
                               (natal_lon - angle) % 360.0]
                for center in centers:
                    center_id = len(target_meta)
                    for role, value in (('exact', center),
                                        ('edge', (center - orb) % 360.0),
                                        ('edge', (center + orb) % 360.0)):
                        target_meta.append({
                            'role': role,
                            'centerId': center_id,
                            'natal': natal_key,
                            'natalLongitude': natal_lon,
                            'aspect': aspect_name,
                            'angle': angle,
                            'center': center,
                        })
                        target_lons.append(value)

        if want_sign_ingress:
            for k in range(12):
                target_meta.append({'role': 'ingress', 'scope': 'sign'})
                target_lons.append(k * 30.0)
        if want_house_ingress:
            for i, cusp in enumerate(natal['houses']):
                target_meta.append({'role': 'ingress', 'scope': 'house',
                                    'house': i + 1})
                target_lons.append(float(cusp) % 360.0)

        ti, lo, hi = find_brackets(grid, grid_lon, target_lons)
        if ti.size:
            solved = refine_crossings(
                longitude_fn, lo, hi, np.asarray(target_lons)[ti]
            )
        else:
            solved = np.empty(0)

        by_center = {}
        ingress_found = []
        for index, jd in zip(ti, solved):
            meta = target_meta[int(index)]
            if meta['role'] == 'ingress':
                if jd_start <= jd <= jd_end:
                    ingress_found.append((meta, float(jd),
                                          float(target_lons[int(index)])))
                continue
            bucket = by_center.setdefault(meta['centerId'], {'meta': meta,
                                                            'exact': [],
                                                            'edges': []})
            (bucket['exact'] if meta['role'] == 'exact'
             else bucket['edges']).append(float(jd))

        # A retrograde planet crosses the same exact degree three times without
        # ever leaving the orb between crossings, so the honest shape is ONE
        # continuous in-orb span carrying up to three exact dates — not three
        # identical bars. Exacts are therefore grouped by the (enter, leave)
        # pair that encloses them, and each carries its place in that span.
        exact_jds, exact_rows = [], []
        for center_id, bucket in by_center.items():
            meta = bucket['meta']
            edges = sorted(bucket['edges'])
            spans = {}
            for jd in sorted(bucket['exact']):
                if not (jd_start <= jd <= jd_end):
                    continue
                before = [e for e in edges if e < jd]
                after = [e for e in edges if e > jd]
                enter = before[-1] if before else None
                leave = after[0] if after else None
                spans.setdefault((enter, leave), []).append(jd)
            for span_index, ((enter, leave), jds_in_span) in enumerate(
                    sorted(spans.items(),
                           key=lambda kv: kv[1][0])):
                for pass_index, jd in enumerate(jds_in_span):
                    exact_jds.append(jd)
                    exact_rows.append((meta, jd, enter, leave,
                                       f'{body}-{center_id}-{span_index}',
                                       pass_index + 1, len(jds_in_span)))

        if exact_rows:
            exact_arr = np.array(exact_jds, dtype=float)
            speed_at_exact = make_speed_fn(longitude_fn)(exact_arr)
            lon_at_exact = longitude_fn(exact_arr)
            for (meta, jd, enter, leave, span_id, pass_index, passes), speed, lon in zip(
                    exact_rows, np.atleast_1d(speed_at_exact),
                    np.atleast_1d(lon_at_exact)):
                delta_arcsec = float(
                    abs(wrap180(lon - meta['center'])) * 3600.0
                )
                row = {
                    'kind': 'aspect',
                    'transiting': body,
                    'natal': meta['natal'],
                    'aspect': meta['aspect'],
                    'angle': meta['angle'],
                    'exact': to_iso(jd),
                    'exactJd': round(float(jd), 8),
                    'transitingLongitude': round(float(lon) % 360.0, 6),
                    'transitingPosition': format_position(lon),
                    'natalLongitude': round(float(meta['natalLongitude']), 6),
                    'natalPosition': format_position(meta['natalLongitude']),
                    'targetLongitude': round(float(meta['center']), 6),
                    'residualArcsec': round(delta_arcsec, 4),
                    'transitingSpeed': round(float(speed), 6),
                    'retrograde': bool(speed < 0),
                    'orb': orb,
                    'enter': to_iso(enter) if enter is not None else None,
                    'leave': to_iso(leave) if leave is not None else None,
                    'enterBeforeWindow': bool(enter is not None and enter < jd_start),
                    'leaveAfterWindow': bool(leave is not None and leave > jd_end),
                    'applyingDays': (round(float(jd - enter), 4)
                                     if enter is not None else None),
                    'separatingDays': (round(float(leave - jd), 4)
                                       if leave is not None else None),
                    # One continuous in-orb span, which a retrograde body can
                    # cross exactly three times. The Gantt draws one bar per
                    # spanId and marks `passesInSpan` exact dates on it.
                    'spanId': span_id,
                    'pass': pass_index,
                    'passesInSpan': passes,
                    'label': (
                        f"transiting {body.capitalize()} {meta['aspect']} "
                        f"natal {meta['natal'].capitalize()}"
                        + (f" (pass {pass_index} of {passes})" if passes > 1 else '')
                    ),
                }
                if natal['houses']:
                    row['natalHouse'] = house_of(lon, natal['houses'])
                hits.append(row)

        # --- stations ----------------------------------------------------
        if want_stations and body in STATION_BODIES:
            speed_fn = make_speed_fn(longitude_fn)
            grid_speed = speed_fn(grid)
            sign_change = np.nonzero(
                np.sign(grid_speed[:-1]) * np.sign(grid_speed[1:]) < 0
            )[0]
            if sign_change.size:
                jds = refine_zeros(speed_fn, grid[sign_change], grid[sign_change + 1])
                lons = longitude_fn(jds)
                for jd, lon, i in zip(np.atleast_1d(jds), np.atleast_1d(lons),
                                      sign_change):
                    if not (jd_start <= jd <= jd_end):
                        continue
                    turning_retro = bool(grid_speed[i] > 0)
                    row = {
                        'kind': 'station',
                        'transiting': body,
                        'station': 'retrograde' if turning_retro else 'direct',
                        'datetime': to_iso(jd),
                        'jd': round(float(jd), 8),
                        'longitude': round(float(lon) % 360.0, 6),
                        'position': format_position(lon),
                        'sign': degrees_to_zodiac(lon)['sign'],
                        'label': (
                            f"{body.capitalize()} stations "
                            f"{'retrograde' if turning_retro else 'direct'} at "
                            f"{format_position(lon)}"
                        ),
                    }
                    if natal['houses']:
                        row['natalHouse'] = house_of(lon, natal['houses'])
                    stations.append(row)

        # --- ingresses ---------------------------------------------------
        # Which side is "from" and which "to" is decided by looking a few
        # minutes either side of the crossing rather than by assuming forward
        # motion — a body can and does cross a cusp backwards.
        if ingress_found:
            nudge = 0.01
            jds = np.array([jd for _, jd, _ in ingress_found], dtype=float)
            lon_before = np.atleast_1d(longitude_fn(jds - nudge))
            lon_after = np.atleast_1d(longitude_fn(jds + nudge))
            for (meta, jd, boundary), lb, la in zip(ingress_found,
                                                    lon_before, lon_after):
                if meta['scope'] == 'sign':
                    frm = degrees_to_zodiac(lb)['sign']
                    to = degrees_to_zodiac(la)['sign']
                    if frm == to:
                        continue
                    label = f"{body.capitalize()} enters {to}"
                else:
                    frm = house_of(lb, natal['houses'])
                    to = house_of(la, natal['houses'])
                    if frm == to:
                        continue
                    label = f"{body.capitalize()} enters natal house {to}"
                ingresses.append({
                    'kind': 'ingress',
                    'scope': meta['scope'],
                    'transiting': body,
                    'from': frm,
                    'to': to,
                    'datetime': to_iso(jd),
                    'jd': round(float(jd), 8),
                    'longitude': round(boundary, 6),
                    'position': format_position(boundary),
                    'retrograde': bool(wrap180(la - lb) < 0),
                    'label': label,
                })

    def sort_key(event):
        return event.get('exactJd', event.get('jd', 0.0))

    hits.sort(key=sort_key)
    stations.sort(key=sort_key)
    ingresses.sort(key=sort_key)

    timeline = sorted(hits + stations + ingresses, key=sort_key)
    truncated = len(timeline) > MAX_EVENTS
    if truncated:
        timeline = timeline[:MAX_EVENTS]

    natal_echo = {
        'points': {k: {'longitude': round(v, 6), 'position': format_position(v),
                       **degrees_to_zodiac(v)}
                   for k, v in natal_points.items()},
        'houses': ([{'house': i + 1, 'cusp': round(c, 6),
                     'position': format_position(c)}
                    for i, c in enumerate(natal['houses'])]
                   if natal['houses'] else None),
        'zodiac': natal['zodiac'],
        'ayanamsa': natal['ayanamsa'],
        'source': natal['source'],
    }

    series_block = None
    if want_series:
        series_block = {
            'jd': [round(float(j), 6) for j in series_jd],
            'datetimes': [to_iso(j) for j in series_jd],
            'bodies': series,
        }

    return {
        'window': {
            'start': start.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'end': end.strftime('%Y-%m-%dT%H:%M:%SZ'),
            'days': round((end - start).total_seconds() / 86400.0, 3),
            'requested': window_requested,
        },
        'config': {
            'orb': orb,
            'aspectSet': aspect_set,
            'aspects': [{'angle': a, 'name': n} for a, n in aspects],
            'transitingBodies': transiting,
            'natalPoints': list(natal_points),
            'stations': want_stations,
            'signIngresses': want_sign_ingress,
            'houseIngresses': want_house_ingress,
        },
        'natal': natal_echo,
        'hits': hits,
        'stations': stations,
        'ingresses': ingresses,
        'timeline': timeline,
        'series': series_block,
        'counts': {
            'hits': len(hits),
            'stations': len(stations),
            'ingresses': len(ingresses),
            'timeline': len(timeline),
        },
        'truncated': truncated,
        'engine': {
            'ephemeris': 'Skyfield (JPL DE421)',
            'frame': 'ecliptic of date',
            'nodeType': 'true',
            'method': 'vectorised bracket-and-bisect on the same positions the '
                      'chart endpoint serves',
            'bisectionRounds': BISECTION_ROUNDS,
            'note': 'A calendar of geometry, not a forecast. Nothing here says '
                    'what a transit means or what to do about it.',
        },
    }


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def _send(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length).decode('utf-8')) if length else {}
            if not isinstance(data, dict):
                raise ValueError('Request body must be a JSON object.')
            self._send(200, build_timeline(data))
        except ValueError as e:
            self._send(400, {'error': str(e), 'message': f'Invalid input: {e}'})
        except Exception as e:  # noqa: BLE001
            import traceback
            trace = traceback.format_exc()
            print(f'Transit timeline error: {trace}')
            self._send(500, {'error': str(e), 'traceback': trace,
                             'message': f'Failed to build timeline: {e}'})

    def do_GET(self):
        try:
            get_ephemeris()
            self._send(200, {
                'status': 'ok',
                'message': 'Transit Timeline API (Skyfield/JPL DE421). POST a '
                           'natal chart and a window; get back every exact hit, '
                           'station and ingress in it, in order.',
                'chartEngineImported': chart_engine is not None,
                'presets': sorted(WINDOW_PRESETS),
                'defaults': {
                    'orb': DEFAULT_ORB,
                    'aspects': 'major',
                    'window': f'-{DEFAULT_WINDOW_BACK_DAYS} to '
                              f'+{DEFAULT_WINDOW_FORWARD_DAYS} days from now',
                    'transitingBodies': DEFAULT_TRANSITING,
                    'natalPoints': DEFAULT_NATAL_POINTS,
                    'moon': 'excluded unless includeMoon is true',
                },
                'example': {
                    'year': 1990, 'month': 6, 'day': 15,
                    'hour': 14, 'minute': 30,
                    'latitude': 40.7128, 'longitude': -74.0060,
                    'houseSystem': 'placidus',
                    'preset': 'around-now',
                    'orb': 1.0,
                },
            })
        except Exception as e:  # noqa: BLE001
            import traceback
            self._send(500, {'status': 'error', 'error': str(e),
                             'traceback': traceback.format_exc()})
