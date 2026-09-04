"""
Astrology Chart Calculator API
Calculates planetary positions, houses, and aspects for natal charts.
Uses Skyfield for high-precision astronomical calculations (JPL ephemeris).
"""

from http.server import BaseHTTPRequestHandler
import json
import math
from datetime import datetime, timezone, timedelta
import os

# Skyfield imports
import numpy as np
from skyfield.api import Loader
from skyfield import almanac
# The true ecliptic and equinox of date — the same frame ecliptic_latlon(epoch=t)
# reports the planets in. The node is built from vectors, so it needs the frame
# as a rotation rather than as a pair of angles.
from skyfield.framelib import ecliptic_frame

# Try to import timezone libraries for accurate conversion
try:
    from timezonefinder import TimezoneFinder
    import pytz
    TZ_AVAILABLE = True
    tf = TimezoneFinder()
except ImportError:
    TZ_AVAILABLE = False
    tf = None

# Initialize Skyfield - load ephemeris and timescale
# Use de421.bsp (smaller, ~17MB) or de440s.bsp for higher accuracy
# Skyfield will auto-download on first use
_eph = None
_ts = None

def get_ephemeris():
    """Load or return cached ephemeris and timescale."""
    global _eph, _ts
    if _eph is None:
        try:
            # Try to use a local cache directory for Vercel
            cache_dir = '/tmp/skyfield_cache'
            os.makedirs(cache_dir, exist_ok=True)

            # Create a Loader instance with custom cache directory
            loader = Loader(cache_dir, verbose=False)

            # Check if ephemeris already exists
            eph_path = os.path.join(cache_dir, 'de421.bsp')
            if os.path.exists(eph_path):
                print(f"Loading cached ephemeris from {eph_path}")
            else:
                print(f"Downloading ephemeris to {cache_dir}")

            _eph = loader('de421.bsp')  # ~17MB, covers 1900-2050
            _ts = loader.timescale()
            print("Ephemeris loaded successfully")
        except Exception as e:
            print(f"Error loading ephemeris: {e}")
            raise Exception(f"Failed to load ephemeris: {str(e)}")
    return _eph, _ts

# Zodiac signs in order
ZODIAC_SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

# Planet names mapped to Skyfield ephemeris names
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
    'pluto': 'pluto barycenter'
}

# Aspect definitions (angle, orb, name)
ASPECTS = [
    (0, 8, 'conjunction'),
    (60, 6, 'sextile'),
    (90, 8, 'square'),
    (120, 8, 'trine'),
    (180, 8, 'opposition'),
    (30, 2, 'semisextile'),
    (150, 2, 'quincunx')
]


# de421.bsp only spans 1899-07-29 .. 2053-10-09. Outside that the planet
# lookups raise, and a chart with no planets in it is worse than an error.
EPHEMERIS_MIN_YEAR = 1900
EPHEMERIS_MAX_YEAR = 2053


def mean_obliquity(jd_tt):
    """Mean obliquity of the ecliptic for the date, in degrees (IAU 1980).

    A fixed J2000 value drifts ~0.013 deg per century, which is small on its
    own but shows up in the angles for historical dates.
    """
    T = (jd_tt - 2451545.0) / 36525.0
    seconds = 21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))
    return 23.0 + (26.0 + seconds / 60.0) / 60.0


def _precession_in_longitude(T):
    """Accumulated general precession in longitude since J2000, in arcseconds."""
    return 5028.796195 * T + 1.1054348 * T * T + 0.00007964 * T * T * T


# A sidereal school is one number: where it fixes the sidereal zero point, said
# once, at one epoch. Everything after that is the same accumulated precession
# for every school — so an ayanamsa is (anchor JD in TT, ayanamsa in degrees
# there), which is how Swiss Ephemeris stores them too.
#
# ONLY schools listed here exist. There is deliberately no fallback: asking for
# an unimplemented ayanamsa is an error, not a quiet serving of Lahiri, because
# the schools sit nearly a degree apart and a silent substitution is the largest
# wrong number this API could hand back without saying anything.
AYANAMSAS = {
    # Lahiri (Chitrapaksha), the Indian government standard. Anchored the way
    # Swiss Ephemeris anchors SE_SIDM_LAHIRI: 22.460148 deg at JD 2415020.0
    # (J1900). Checked against Astro-Seek's Lahiri chart for 1990-06-15
    # 18:30 UT (23.7272 deg); this returns 23.7234 deg, 0.2 arcmin off.
    'lahiri': {
        'anchorJd': 2415020.0,
        'anchorDegrees': 22.460148,
        'label': 'Lahiri (Chitrapaksha)',
    },
    # Fagan-Bradley, the Western sidereal standard: 24 deg 02' 31.36" at
    # JD 2433282.5 (1950 Jan 0.5 ET), the figure Fagan and Bradley published
    # and the one Swiss Ephemeris carries as SE_SIDM_FAGAN_BRADLEY. It is NOT
    # a constant offset from Lahiri — it is its own anchor, and the two drift
    # apart, which is exactly why it has to be its own entry.
    'fagan-bradley': {
        'anchorJd': 2433282.5,
        'anchorDegrees': 24.042044444,
        'label': 'Fagan-Bradley',
    },
}

DEFAULT_AYANAMSA = 'lahiri'


def ayanamsa_degrees(jd_tt, name=DEFAULT_AYANAMSA):
    """Ayanamsa for the date, in degrees, for one of the implemented schools.

    Raises ValueError for any school this engine does not actually implement —
    see the note on AYANAMSAS about why there is no fallback.
    """
    school = AYANAMSAS.get(name)
    if school is None:
        raise ValueError(
            f"Unknown ayanamsa '{name}'. This engine implements only: "
            + ", ".join(sorted(AYANAMSAS)) + "."
        )
    T0 = (school['anchorJd'] - 2451545.0) / 36525.0
    T = (jd_tt - 2451545.0) / 36525.0
    return school['anchorDegrees'] + (
        _precession_in_longitude(T) - _precession_in_longitude(T0)
    ) / 3600.0


def lahiri_ayanamsa(jd_tt):
    """Lahiri (Chitrapaksha) ayanamsa for the date, in degrees."""
    return ayanamsa_degrees(jd_tt, 'lahiri')


def degrees_to_zodiac(degrees):
    """Convert ecliptic longitude to zodiac sign and degree."""
    degrees = degrees % 360
    sign_index = int(degrees / 30)
    sign_degree = degrees % 30
    return {
        'sign': ZODIAC_SIGNS[sign_index],
        'signIndex': sign_index,
        'degree': sign_degree,
        'totalDegrees': degrees
    }


def calculate_sidereal_time(t, longitude):
    """Calculate Local Sidereal Time in degrees."""
    # Skyfield gives us Greenwich Apparent Sidereal Time
    gast = t.gast  # in hours
    # Convert to degrees and add longitude
    lst = (gast * 15 + longitude) % 360
    return lst


def calculate_ascendant(lst, latitude, obliquity=23.4393):
    """Calculate the Ascendant (rising sign) from LST and latitude."""
    obl_rad = math.radians(obliquity)
    lat_rad = math.radians(latitude)
    lst_rad = math.radians(lst)

    # Calculate Ascendant using standard formula
    y = -math.cos(lst_rad)
    x = math.sin(obl_rad) * math.tan(lat_rad) + math.cos(obl_rad) * math.sin(lst_rad)

    asc = math.degrees(math.atan2(y, x)) + 180
    asc = asc % 360

    return asc


def calculate_midheaven(lst, obliquity=23.4393):
    """Calculate the Midheaven (MC) from LST."""
    obl_rad = math.radians(obliquity)
    lst_rad = math.radians(lst)

    mc = math.degrees(math.atan2(math.sin(lst_rad), math.cos(lst_rad) * math.cos(obl_rad)))
    if mc < 0:
        mc += 360

    return mc


# Beyond the polar circle part of the ecliptic never rises or sets, so a
# Placidus cusp has no semi-arc to trisect and the system is simply undefined.
# It also degrades badly on the approach, so stop short of 66 deg 33'.
PLACIDUS_MAX_LATITUDE = 66.0


def ecliptic_point_at_ra(ra_degrees, obliquity):
    """Ecliptic longitude of the point ON the ecliptic with the given RA."""
    ra = math.radians(ra_degrees)
    obl = math.radians(obliquity)
    return math.degrees(math.atan2(math.sin(ra) / math.cos(obl), math.cos(ra))) % 360


def declination_of_ecliptic_point(longitude, obliquity):
    """Declination of the point on the ecliptic at that longitude."""
    return math.degrees(math.asin(
        math.sin(math.radians(obliquity)) * math.sin(math.radians(longitude))
    ))


def semi_diurnal_arc(declination, latitude):
    """Half the time (as an arc, in degrees) the point spends above the horizon.

    None when the point is circumpolar or never rises there — which is exactly
    the case in which Placidus has nothing to divide.
    """
    x = -math.tan(math.radians(latitude)) * math.tan(math.radians(declination))
    if x <= -1.0 or x >= 1.0:
        return None
    return math.degrees(math.acos(x))


def placidus_cusp(ramc, latitude, obliquity, which):
    """One intermediate Placidus cusp (11, 12, 2 or 3), or None if it will not solve.

    Placidus divides each point's OWN semi-arc, not the ecliptic and not the
    equator: cusp 11 is the ecliptic degree standing one third of its own
    semi-diurnal arc past the MC, cusp 12 two thirds, the Ascendant three
    thirds (it is rising), and cusps 2 and 3 one and two thirds of their own
    semi-NOCTURNAL arc past that. In hour angle, with H = RAMC - RA:

        cusp 11: H = -SD/3          cusp 2: H = -(SD + SN/3)
        cusp 12: H = -2*SD/3        cusp 3: H = -(SD + 2*SN/3)

    SD depends on the cusp's own declination, which depends on the cusp, so
    this is solved by fixed-point iteration from the Porphyry-like first guess.
    """
    first_guess = {11: 30.0, 12: 60.0, 2: 120.0, 3: 150.0}[which]
    longitude = ecliptic_point_at_ra(ramc + first_guess, obliquity)

    for _ in range(100):
        sd = semi_diurnal_arc(declination_of_ecliptic_point(longitude, obliquity), latitude)
        if sd is None:
            return None
        sn = 180.0 - sd
        if which == 11:
            ra = ramc + sd / 3.0
        elif which == 12:
            ra = ramc + 2.0 * sd / 3.0
        elif which == 2:
            ra = ramc + sd + sn / 3.0
        else:
            ra = ramc + sd + 2.0 * sn / 3.0

        nxt = ecliptic_point_at_ra(ra, obliquity)
        moved = abs(((nxt - longitude + 180.0) % 360.0) - 180.0)
        longitude = nxt
        if moved < 1e-10:
            return longitude

    # Oscillating rather than settling — better to say so and fall back than to
    # return a cusp that only looks like a Placidus cusp.
    return None


def calculate_placidus_cusps(ramc, ascendant, midheaven, latitude, obliquity):
    """The twelve Placidus cusps, or None if Placidus does not apply here.

    Cusps 1 and 10 are the Ascendant and the MC themselves (the Ascendant is
    already the exact solution of the semi-arc condition for cusp 1), and
    Placidus cusps come in exact oppositions, so only 11, 12, 2 and 3 are solved.
    """
    if abs(latitude) > PLACIDUS_MAX_LATITUDE:
        return None

    solved = {}
    for which in (11, 12, 2, 3):
        value = placidus_cusp(ramc, latitude, obliquity, which)
        if value is None:
            return None
        solved[which] = value

    cusps = [0.0] * 12
    cusps[0] = ascendant % 360
    cusps[9] = midheaven % 360
    cusps[6] = (ascendant + 180) % 360
    cusps[3] = (midheaven + 180) % 360
    cusps[10] = solved[11]
    cusps[11] = solved[12]
    cusps[1] = solved[2]
    cusps[2] = solved[3]
    cusps[4] = (solved[11] + 180) % 360
    cusps[5] = (solved[12] + 180) % 360
    cusps[7] = (solved[2] + 180) % 360
    cusps[8] = (solved[3] + 180) % 360
    return cusps


def calculate_houses_porphyry(ascendant, midheaven):
    """Porphyry house cusps: trisect each quadrant of the ecliptic itself."""
    houses = []

    # Houses 1, 4, 7, 10 are the angles
    houses_cusps = [0] * 12
    houses_cusps[0] = ascendant  # 1st house = ASC
    houses_cusps[9] = midheaven  # 10th house = MC
    houses_cusps[6] = (ascendant + 180) % 360  # 7th house = DSC
    houses_cusps[3] = (midheaven + 180) % 360  # 4th house = IC

    # Trisect MC→ASC arc (counter-clockwise): MC → house 11 → house 12 → ASC
    # fraction 2/3 from ASC toward MC = closer to MC = house 11
    # fraction 1/3 from ASC toward MC = closer to ASC = house 12
    mc_to_asc = (ascendant - midheaven + 360) % 360
    cusp_11 = ascendant - (2.0 / 3.0) * mc_to_asc
    if cusp_11 < 0:
        cusp_11 += 360
    houses_cusps[10] = cusp_11 % 360  # House 11

    cusp_12 = ascendant - (1.0 / 3.0) * mc_to_asc
    if cusp_12 < 0:
        cusp_12 += 360
    houses_cusps[11] = cusp_12 % 360  # House 12

    # Trisect ASC→IC arc (counter-clockwise): ASC → house 2 → house 3 → IC
    # fraction 1/3 from ASC toward IC = house 2
    # fraction 2/3 from ASC toward IC = house 3
    ic = (midheaven + 180) % 360
    asc_to_ic = (ic - ascendant + 360) % 360
    cusp_2 = ascendant + (1.0 / 3.0) * asc_to_ic
    houses_cusps[1] = cusp_2 % 360  # House 2

    cusp_3 = ascendant + (2.0 / 3.0) * asc_to_ic
    houses_cusps[2] = cusp_3 % 360  # House 3

    # Houses 5, 6 are opposite of 11, 12
    houses_cusps[4] = (houses_cusps[10] + 180) % 360
    houses_cusps[5] = (houses_cusps[11] + 180) % 360

    # Houses 8, 9 are opposite of 2, 3
    houses_cusps[7] = (houses_cusps[1] + 180) % 360
    houses_cusps[8] = (houses_cusps[2] + 180) % 360

    for i in range(12):
        houses.append({
            'house': i + 1,
            'cusp': round(houses_cusps[i], 4),
            'sign': degrees_to_zodiac(houses_cusps[i])
        })

    return houses


def calculate_houses(ascendant, midheaven, latitude, house_system='placidus',
                     ramc=None, obliquity=23.4393, ayanamsa=0.0):
    """House cusps for the requested system.

    Returns (houses, actual_system, note). `actual_system` is what was really
    divided — it differs from `house_system` for the quadrant systems that are
    still served by Porphyry geometry, and for a Placidus request that could
    not be solved. `ascendant`/`midheaven` arrive already in the requested
    zodiac; `ramc` and `obliquity` are equatorial and so zodiac-independent,
    which is why Placidus solves tropically and subtracts the ayanamsa after.
    """
    houses = []
    note = None

    def wrap(cusps):
        return [{
            'house': i + 1,
            'cusp': round(cusps[i] % 360, 4),
            'sign': degrees_to_zodiac(cusps[i] % 360)
        } for i in range(12)]

    if house_system == 'whole-sign':
        asc_sign = int(ascendant / 30) * 30
        return wrap([(asc_sign + i * 30) % 360 for i in range(12)]), 'whole-sign', None

    if house_system == 'equal-house':
        return wrap([(ascendant + i * 30) % 360 for i in range(12)]), 'equal-house', None

    if house_system == 'placidus' and ramc is not None:
        cusps = calculate_placidus_cusps(
            ramc,
            (ascendant + ayanamsa) % 360,
            (midheaven + ayanamsa) % 360,
            latitude, obliquity
        )
        if cusps is not None:
            return wrap([(c - ayanamsa) % 360 for c in cusps]), 'placidus', None
        note = (
            'Placidus is undefined at this latitude (beyond about '
            f'{PLACIDUS_MAX_LATITUDE:g} degrees the ecliptic degrees a cusp would '
            'divide never rise or set), so Porphyry cusps were used instead.'
        )
        return calculate_houses_porphyry(ascendant, midheaven), 'porphyry', note

    if house_system in ('porphyry', 'placidus', 'koch', 'campanus',
                        'regiomontanus', 'topocentric'):
        # Porphyry proper, plus the quadrant systems this engine does not yet
        # implement separately. Named honestly rather than silently.
        if house_system != 'porphyry':
            note = (
                f'{house_system.capitalize()} is not implemented in this engine; '
                'Porphyry cusps were used instead.'
            )
        return calculate_houses_porphyry(ascendant, midheaven), 'porphyry', note

    return wrap([(ascendant + i * 30) % 360 for i in range(12)]), 'equal-house', None


def get_house_for_planet(longitude, houses):
    """Determine which house a planet is in."""
    for i in range(12):
        start = houses[i]['cusp']
        end = houses[(i + 1) % 12]['cusp']

        if start < end:
            if start <= longitude < end:
                return i + 1
        else:
            if longitude >= start or longitude < end:
                return i + 1
    return 1


def calculate_aspects(planets):
    """Calculate aspects between planets."""
    aspects = []
    planet_keys = list(planets.keys())

    for i, p1_key in enumerate(planet_keys):
        for p2_key in planet_keys[i+1:]:
            p1_lon = planets[p1_key]['longitude']
            p2_lon = planets[p2_key]['longitude']

            diff = abs(p1_lon - p2_lon)
            if diff > 180:
                diff = 360 - diff

            for aspect_angle, orb, aspect_name in ASPECTS:
                if abs(diff - aspect_angle) <= orb:
                    aspects.append({
                        'planet1': p1_key,
                        'planet2': p2_key,
                        'aspect': aspect_name,
                        'angle': aspect_angle,
                        'orb': round(abs(diff - aspect_angle), 2),
                        'exactDegrees': round(diff, 2)
                    })
                    break

    return aspects


def local_to_utc(year, month, day, hour, minute, latitude, longitude):
    """Convert local time at the birth PLACE to UTC.

    The incoming {year..minute} is wall-clock time as it was read off a clock
    at those coordinates. The zone is resolved from the coordinates, never from
    anything the caller says, and pytz's localize() picks the offset that was
    actually in force on that date — so historical DST rules apply.

    Returns (naive utc datetime, description of the zone that was used).
    """
    local_dt = datetime(year, month, day, hour, minute, 0)

    if TZ_AVAILABLE and tf:
        try:
            tz_name = tf.timezone_at(lat=latitude, lng=longitude)
            if tz_name:
                local_tz = pytz.timezone(tz_name)
                aware = local_tz.localize(local_dt)
                utc_dt = aware.astimezone(pytz.UTC).replace(tzinfo=None)
                offset = aware.utcoffset()
                return utc_dt, {
                    'name': tz_name,
                    'abbreviation': aware.tzname(),
                    'utcOffsetHours': round(offset.total_seconds() / 3600.0, 4),
                    'dst': bool(aware.dst()),
                    'source': 'resolved from birth coordinates (timezonefinder + pytz)',
                }
        except Exception as e:
            print(f"Timezone conversion error: {e}")

    # Fallback: estimate the zone from longitude alone. This ignores political
    # borders and DST, so say so rather than let it pass for a resolved zone.
    tz_offset_hours = round(longitude / 15)
    return local_dt - timedelta(hours=tz_offset_hours), {
        'name': None,
        'abbreviation': None,
        'utcOffsetHours': float(tz_offset_hours),
        'dst': None,
        'source': 'estimated from longitude — no timezone database available, '
                  'so DST and zone borders are not accounted for',
    }


# How far either side of the moment the node's motion is sampled, in days.
# The osculating node's speed swings through zero several times a month, so a
# wide baseline smooths a genuine stationary point into the wrong direction;
# an hour or two either side is stable to five decimals and still cheap.
NODE_RATE_HALF_STEP_DAYS = 0.05


def true_node_longitude(t, eph):
    """Osculating ('true') north node longitude in degrees, ecliptic of date.

    The node is not a body and has no ephemeris entry — it is a property of the
    plane the Moon is instantaneously orbiting in, so it comes straight out of
    the Moon's geocentric state vector in DE421:

        h = r x v          angular momentum, normal to the orbital plane
        n = zhat x h       the line where that plane cuts the ecliptic
        Omega = atan2(n_y, n_x) = atan2(h_x, -h_y)

    Both r and v are rotated into the true ecliptic and equinox of date FIRST —
    the same frame ecliptic_latlon(epoch=t) reports the planets in. Taking the
    cross product in ICRF and reading the answer as a longitude of date would
    leave the whole precession since J2000 in it.

    The vectors are geometric (no light-time, no aberration): the node is an
    orbital element of where the Moon actually is, not of where it is seen to
    be. This is what Swiss Ephemeris means by the true node, and it agrees with
    Swiss to about an arcsecond — versus the 3.5-5.9 arcmin of the truncated
    Meeus series this replaced, which never touched the ephemeris at all.
    """
    position, velocity = (eph['moon'] - eph['earth']).at(t).frame_xyz_and_velocity(
        ecliptic_frame
    )
    h = np.cross(position.au, velocity.au_per_d)
    return math.degrees(math.atan2(h[0], -h[1])) % 360


def calculate_lunar_nodes(t, eph, ts, ayanamsa=0.0):
    """True lunar nodes and the direction they are actually moving.

    Returns (north longitude, south longitude, degrees per day of the north
    node). The true node is usually retrograde but genuinely turns direct for
    short stretches, so the direction is measured rather than assumed.
    """
    north = true_node_longitude(t, eph)

    step = NODE_RATE_HALF_STEP_DAYS
    before = true_node_longitude(ts.tt_jd(t.tt - step), eph)
    after = true_node_longitude(ts.tt_jd(t.tt + step), eph)
    rate = (((after - before + 180.0) % 360.0) - 180.0) / (2.0 * step)

    north = (north - ayanamsa) % 360
    return north, (north + 180.0) % 360, rate


def calculate_chart(year, month, day, hour, minute, latitude, longitude,
                    house_system='equal-house', zodiac='tropical',
                    ayanamsa_name=DEFAULT_AYANAMSA):
    """
    Calculate a complete natal chart using Skyfield (JPL ephemeris).

    Args:
        year, month, day: Birth date
        hour, minute: Birth time (local time)
        latitude, longitude: Birth location coordinates
        house_system: 'equal-house', 'whole-sign', 'placidus', etc.
        zodiac: 'tropical' or 'sidereal'
        ayanamsa_name: which sidereal school, when zodiac is 'sidereal'.
            Ignored for tropical. Unknown names raise rather than fall back.

    Returns:
        Dictionary with planets, houses, aspects, and angles
    """
    # Get ephemeris and timescale
    eph, ts = get_ephemeris()

    # Convert local time at the birth place to UTC
    utc_dt, tz_used = local_to_utc(year, month, day, hour, minute, latitude, longitude)

    # Create Skyfield time object
    t = ts.utc(utc_dt.year, utc_dt.month, utc_dt.day,
               utc_dt.hour, utc_dt.minute, utc_dt.second)

    # Get Earth for geocentric observations
    earth = eph['earth']

    # Everything below is referred to the ecliptic OF THE DATE, which is what
    # astrology means by a zodiacal longitude. Skyfield's ecliptic_latlon()
    # defaults to the J2000 ecliptic; without epoch=t every planet comes out
    # displaced by the precession since 2000 (~0.014 deg per year).
    obliquity = mean_obliquity(t.tt)
    # Resolve the school even for a tropical chart, so an unimplemented name is
    # rejected up front instead of sitting unused and then surprising whoever
    # switches the same request to sidereal.
    ayanamsa_used = ayanamsa_name if ayanamsa_name in AYANAMSAS else None
    if ayanamsa_used is None:
        raise ValueError(
            f"Unknown ayanamsa '{ayanamsa_name}'. This engine implements only: "
            + ", ".join(sorted(AYANAMSAS)) + "."
        )
    ayanamsa = ayanamsa_degrees(t.tt, ayanamsa_used) if zodiac == 'sidereal' else 0.0

    # Calculate planetary positions
    planets_data = {}

    for name, eph_name in PLANET_NAMES.items():
        try:
            planet = eph[eph_name]

            # Calculate apparent position from Earth
            astrometric = earth.at(t).observe(planet)
            apparent = astrometric.apparent()

            # Get ecliptic coordinates (ecliptic of date)
            lat, lon, distance = apparent.ecliptic_latlon(epoch=t)
            longitude_deg = lon.degrees
            latitude_deg = lat.degrees

            # Apply ayanamsa for sidereal zodiac (Lahiri)
            if zodiac == 'sidereal':
                longitude_deg = (longitude_deg - ayanamsa) % 360

            zodiac_pos = degrees_to_zodiac(longitude_deg)

            planets_data[name] = {
                'name': name.capitalize(),
                'longitude': round(longitude_deg, 4),
                'latitude': round(latitude_deg, 4),
                'sign': zodiac_pos['sign'],
                'signIndex': zodiac_pos['signIndex'],
                'degree': round(zodiac_pos['degree'], 2),
                'isRetrograde': False  # Will calculate below
            }
        except Exception as e:
            print(f"Error calculating {name}: {e}")

    # A chart missing planets is not a chart. Say so rather than returning
    # houses and angles with an empty sky, which reads as a valid result.
    missing = [n for n in PLANET_NAMES if n not in planets_data]
    if missing:
        raise ValueError(
            "Could not place " + ", ".join(missing) +
            f". The DE421 ephemeris only covers roughly {EPHEMERIS_MIN_YEAR}-{EPHEMERIS_MAX_YEAR}; "
            f"{year} is outside it."
        )

    # Calculate retrograde status for planets (compare with position 1 day later)
    t_next = ts.utc(utc_dt.year, utc_dt.month, utc_dt.day + 1,
                    utc_dt.hour, utc_dt.minute, utc_dt.second)

    for name, eph_name in PLANET_NAMES.items():
        if name in ['sun', 'moon']:
            continue  # Sun and Moon don't go retrograde
        try:
            planet = eph[eph_name]
            # Both samples in the SAME frame, so the difference is motion only.
            pos_now = earth.at(t).observe(planet).apparent().ecliptic_latlon(epoch=t)[1].degrees
            pos_next = earth.at(t_next).observe(planet).apparent().ecliptic_latlon(epoch=t)[1].degrees

            # Handle wrap-around at 0/360
            diff = pos_next - pos_now
            if diff > 180:
                diff -= 360
            elif diff < -180:
                diff += 360

            planets_data[name]['isRetrograde'] = bool(diff < 0)
        except:
            pass

    # Calculate Lunar Nodes. The direction is measured, not assumed: the true
    # node is retrograde most of the time but does go direct, and a glyph that
    # always says R is simply wrong on those days.
    north_node_lon, south_node_lon, node_rate = calculate_lunar_nodes(
        t, eph, ts, ayanamsa
    )
    node_is_retrograde = bool(node_rate < 0)

    zodiac_pos = degrees_to_zodiac(north_node_lon)
    planets_data['northnode'] = {
        'name': 'North Node',
        'longitude': round(north_node_lon, 4),
        'latitude': 0.0,
        'sign': zodiac_pos['sign'],
        'signIndex': zodiac_pos['signIndex'],
        'degree': round(zodiac_pos['degree'], 2),
        'isRetrograde': node_is_retrograde,
        'speedLongitude': round(node_rate, 6)
    }

    zodiac_pos = degrees_to_zodiac(south_node_lon)
    planets_data['southnode'] = {
        'name': 'South Node',
        'longitude': round(south_node_lon, 4),
        'latitude': 0.0,
        'sign': zodiac_pos['sign'],
        'signIndex': zodiac_pos['signIndex'],
        'degree': round(zodiac_pos['degree'], 2),
        'isRetrograde': node_is_retrograde,
        'speedLongitude': round(node_rate, 6)
    }

    # Calculate angles (Ascendant, Midheaven)
    lst = calculate_sidereal_time(t, longitude)
    ascendant = calculate_ascendant(lst, latitude, obliquity)
    midheaven = calculate_midheaven(lst, obliquity)

    if zodiac == 'sidereal':
        ascendant = (ascendant - ayanamsa) % 360
        midheaven = (midheaven - ayanamsa) % 360

    # Calculate houses
    houses, house_system_actual, house_system_note = calculate_houses(
        ascendant, midheaven, latitude, house_system,
        ramc=lst, obliquity=obliquity, ayanamsa=ayanamsa
    )

    # Add house positions to planets
    for name in planets_data:
        planets_data[name]['house'] = get_house_for_planet(planets_data[name]['longitude'], houses)

    # Calculate aspects
    aspects = calculate_aspects(planets_data)

    return {
        'planets': planets_data,
        'houses': houses,
        'angles': {
            'ascendant': {
                'longitude': round(ascendant, 4),
                **degrees_to_zodiac(ascendant)
            },
            'midheaven': {
                'longitude': round(midheaven, 4),
                **degrees_to_zodiac(midheaven)
            },
            'descendant': {
                'longitude': round((ascendant + 180) % 360, 4),
                **degrees_to_zodiac((ascendant + 180) % 360)
            },
            'imumCoeli': {
                'longitude': round((midheaven + 180) % 360, 4),
                **degrees_to_zodiac((midheaven + 180) % 360)
            }
        },
        'aspects': aspects,
        'settings': {
            'houseSystem': house_system,
            # Be honest about what was actually divided: Placidus is really
            # Placidus now, but Koch/Campanus/Regiomontanus/Topocentric are
            # still served by Porphyry geometry, and Placidus itself falls back
            # to Porphyry beyond the polar circle.
            'houseSystemActual': house_system_actual,
            'houseSystemNote': house_system_note,
            'birthTime': {
                'local': f'{year:04d}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}',
                'utc': utc_dt.strftime('%Y-%m-%d %H:%M'),
                'timezone': tz_used,
            },
            'zodiac': zodiac,
            # What was ASKED for and what was USED are reported separately, and
            # for the ayanamsa they can never differ — an unimplemented school
            # is a 400, not a substitution.
            'ayanamsa': (ayanamsa_used if zodiac == 'sidereal' else None),
            'ayanamsaUsed': (ayanamsa_used if zodiac == 'sidereal' else None),
            'ayanamsaLabel': (AYANAMSAS[ayanamsa_used]['label']
                              if zodiac == 'sidereal' else None),
            'ayanamsaDegrees': (round(ayanamsa, 4) if zodiac == 'sidereal' else None),
            # The same school's value AT THIS MOMENT whether or not it was
            # applied — what a tropical chart would be shifted by if it were
            # read sidereally. The HD mandala's sidereal ring needs exactly
            # this, and used to carry a hardcoded 24.1 instead.
            'ayanamsaDegreesAtMoment': round(ayanamsa_degrees(t.tt, ayanamsa_used), 4),
            'ayanamsasAvailable': sorted(AYANAMSAS),
            'obliquity': round(obliquity, 6),
            # Which node is served. Deliberately the TRUE (osculating) node,
            # computed from the DE421 lunar state vector; the mean node is a
            # different body and is not offered.
            'nodeType': 'true',
            'node_type': 'true',
            'frame': 'ecliptic of date',
            'ephemeris': 'Skyfield (JPL DE421)'
        }
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle chart calculation requests."""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            # Extract parameters with validation
            try:
                year = int(data.get('year'))
                month = int(data.get('month'))
                day = int(data.get('day'))
                hour = int(data.get('hour', 12))
                minute = int(data.get('minute', 0))
                latitude = float(data.get('latitude'))
                longitude = float(data.get('longitude'))
            except (TypeError, ValueError) as e:
                raise ValueError(f"Invalid input parameters: {e}")

            house_system = data.get('houseSystem', 'placidus')
            zodiac = data.get('zodiac', 'tropical')
            # Accept either spelling; an omitted ayanamsa means Lahiri, said
            # out loud in the response rather than assumed silently.
            ayanamsa_name = (data.get('ayanamsa')
                             or data.get('ayanamsaName')
                             or DEFAULT_AYANAMSA)
            if not isinstance(ayanamsa_name, str):
                raise ValueError(f"Invalid ayanamsa: {ayanamsa_name!r}")
            ayanamsa_name = ayanamsa_name.strip().lower()
            if ayanamsa_name not in AYANAMSAS:
                raise ValueError(
                    f"Unknown ayanamsa '{ayanamsa_name}'. This engine implements "
                    "only: " + ", ".join(sorted(AYANAMSAS)) + ". It will not "
                    "silently serve a different one."
                )

            # Validate ranges
            if not (EPHEMERIS_MIN_YEAR <= year <= EPHEMERIS_MAX_YEAR):
                raise ValueError(
                    f"Year {year} is outside the DE421 ephemeris range "
                    f"({EPHEMERIS_MIN_YEAR}-{EPHEMERIS_MAX_YEAR})"
                )
            if not (1 <= month <= 12):
                raise ValueError(f"Invalid month: {month}")
            if not (1 <= day <= 31):
                raise ValueError(f"Invalid day: {day}")
            if not (0 <= hour <= 23):
                raise ValueError(f"Invalid hour: {hour}")
            if not (0 <= minute <= 59):
                raise ValueError(f"Invalid minute: {minute}")
            if not (-90 <= latitude <= 90):
                raise ValueError(f"Invalid latitude: {latitude}")
            if not (-180 <= longitude <= 180):
                raise ValueError(f"Invalid longitude: {longitude}")

            # Calculate chart
            result = calculate_chart(
                year, month, day, hour, minute,
                latitude, longitude,
                house_system, zodiac, ayanamsa_name
            )

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))

        except ValueError as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e),
                'message': f'Invalid input: {str(e)}'
            }).encode('utf-8'))
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Chart calculation error: {error_trace}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e),
                'traceback': error_trace,
                'message': f'Failed to calculate chart: {str(e)}'
            }).encode('utf-8'))

    def do_GET(self):
        """Handle GET requests (for testing and health check)."""
        try:
            # Pre-load ephemeris on GET request (useful for warming)
            eph, ts = get_ephemeris()
            ephemeris_loaded = eph is not None

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'ok',
                'ephemeris_loaded': ephemeris_loaded,
                'timezone_available': TZ_AVAILABLE,
                'message': 'Astrology Chart Calculator API (Skyfield/JPL DE421). Send POST request with birth data.',
                'ayanamsasAvailable': sorted(AYANAMSAS),
                'nodeType': 'true',
                'example': {
                    'year': 1990,
                    'month': 6,
                    'day': 15,
                    'hour': 14,
                    'minute': 30,
                    'latitude': 40.7128,
                    'longitude': -74.0060,
                    'houseSystem': 'placidus',
                    'zodiac': 'tropical',
                    'ayanamsa': 'lahiri'
                }
            }).encode('utf-8'))
        except Exception as e:
            import traceback
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'status': 'error',
                'error': str(e),
                'traceback': traceback.format_exc(),
                'message': f'Failed to initialize: {str(e)}'
            }).encode('utf-8'))
