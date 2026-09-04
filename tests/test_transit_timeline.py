#!/usr/bin/env python3
"""Accuracy gate for api/transit_timeline.py — run before you commit it.

The claim the endpoint makes is narrow and checkable: *at the instant it
reports, the geometry is actually exact*. So the tests do not compare against a
table of remembered dates. They take the endpoint's own answers back to the
ephemeris and ask whether they hold:

  * every aspect hit — recompute the transiting body's longitude at the reported
    second, through the SAME scalar call `api/calculate_chart.py` uses for a
    natal chart, and require the residual under one arcminute;
  * every station — the body's speed at the reported second must be within
    numerical noise of zero, and must have the opposite sign a day either side;
  * every ingress — the longitude at the reported second must be the boundary;
  * the natal half — longitudes must equal what the chart endpoint returns for
    the same birth data, or the two views of one chart disagree.

Needs skyfield, numpy and a DE421 kernel. Point SKYFIELD_CACHE_DIR at a
directory that already has de421.bsp to avoid re-downloading it.

    python tests/test_transit_timeline.py
"""

import math
import os
import sys
from datetime import datetime, timedelta, timezone

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'api'))

import calculate_chart as chart_engine          # noqa: E402
import transit_timeline as tl                   # noqa: E402


ARCMIN = 1.0 / 60.0

# A synthetic chart, not anyone's. Same birth data the repo's other spot checks
# use, so results can be laid beside them.
SYNTHETIC = {
    'year': 1990, 'month': 6, 'day': 15, 'hour': 14, 'minute': 30,
    'latitude': 40.7128, 'longitude': -74.0060,
    'houseSystem': 'placidus', 'zodiac': 'tropical',
}

_failures = []
_checks = 0


def check(condition, message):
    global _checks
    _checks += 1
    if not condition:
        _failures.append(message)


def section(title):
    print(f'\n--- {title}')


def scalar_longitude(body, jd_tt):
    """The chart engine's own scalar path, one time at a time.

    Deliberately NOT the endpoint's vectorised function: if the two ever drift,
    this is the test that catches it, and a test that reuses the code it is
    checking would not.
    """
    eph, ts = tl.get_ephemeris()
    t = ts.tt_jd(float(jd_tt))
    if body in ('northnode', 'southnode'):
        offset = 180.0 if body == 'southnode' else 0.0
        return (chart_engine.true_node_longitude(t, eph) + offset) % 360.0
    planet = eph[chart_engine.PLANET_NAMES[body]]
    apparent = eph['earth'].at(t).observe(planet).apparent()
    return apparent.ecliptic_latlon(epoch=t)[1].degrees % 360.0


def scalar_speed(body, jd_tt, half=tl.SPEED_HALF_STEP_DAYS):
    before = scalar_longitude(body, jd_tt - half)
    after = scalar_longitude(body, jd_tt + half)
    return float(tl.wrap180(after - before)) / (2.0 * half)


def iso_to_jd(iso):
    _, ts = tl.get_ephemeris()
    dt = datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
    return float(ts.utc(dt).tt)


def run():
    # ---------------------------------------------------------------- setup
    section('Building a two-month timeline for the synthetic chart')
    payload = dict(SYNTHETIC)
    payload.update({'start': '2026-07-15', 'end': '2026-09-15', 'orb': 1.0})
    result = tl.build_timeline(payload)
    print(f"    {result['counts']['hits']} hits, "
          f"{result['counts']['stations']} stations, "
          f"{result['counts']['ingresses']} ingresses")
    check(result['counts']['hits'] > 0, 'the window produced no aspect hits at all')
    check(result['counts']['ingresses'] > 0, 'the window produced no ingresses at all')

    # ------------------------------------------------- 1. natal agreement
    section('1. Natal longitudes agree with the chart endpoint')
    chart = chart_engine.calculate_chart(
        SYNTHETIC['year'], SYNTHETIC['month'], SYNTHETIC['day'],
        SYNTHETIC['hour'], SYNTHETIC['minute'],
        SYNTHETIC['latitude'], SYNTHETIC['longitude'],
        SYNTHETIC['houseSystem'], SYNTHETIC['zodiac'],
    )
    worst_natal = 0.0
    for key, point in result['natal']['points'].items():
        if key in chart['planets']:
            expected = chart['planets'][key]['longitude']
        elif key == 'ascendant':
            expected = chart['angles']['ascendant']['longitude']
        elif key == 'midheaven':
            expected = chart['angles']['midheaven']['longitude']
        else:
            continue
        delta = abs(float(tl.wrap180(point['longitude'] - expected)))
        worst_natal = max(worst_natal, delta)
        check(delta < 1e-6, f'natal {key} differs from the chart endpoint by {delta:.8f} deg')
    print(f'    worst natal disagreement: {worst_natal * 3600:.6f} arcsec')
    check(result['natal']['houses'] is not None, 'no natal houses came back')
    for i, house in enumerate(result['natal']['houses'] or []):
        delta = abs(float(tl.wrap180(house['cusp'] - chart['houses'][i]['cusp'])))
        check(delta < 1e-6, f"house {i + 1} cusp differs by {delta:.8f} deg")

    # ------------------------------------------- 2. every hit is exact
    section('2. Every aspect hit is exact at the instant it reports')
    worst = 0.0
    worst_label = ''
    for hit in result['hits']:
        jd = hit['exactJd']
        lon = scalar_longitude(hit['transiting'], jd)
        delta = abs(float(tl.wrap180(lon - hit['targetLongitude'])))
        if delta > worst:
            worst, worst_label = delta, hit['label']
        check(delta <= ARCMIN,
              f"{hit['label']} at {hit['exact']} is {delta * 60:.4f} arcmin off exact")
        check(hit['residualArcsec'] <= 60.0,
              f"{hit['label']} reports its own residual as {hit['residualArcsec']} arcsec")
        check(abs(iso_to_jd(hit['exact']) - jd) < 1.0 / 86400.0 * 2,
              f"{hit['label']}: the ISO time and the JD disagree")
    print(f'    worst residual across {len(result["hits"])} hits: '
          f'{worst * 3600:.4f} arcsec ({worst * 60:.6f} arcmin) — {worst_label}')
    check(worst <= ARCMIN, f'worst hit residual {worst * 60:.4f} arcmin exceeds one arcminute')

    # --------------------------------------- 3. the aspect really is that aspect
    section('3. Each hit really separates by its own aspect angle')
    for hit in result['hits']:
        lon = scalar_longitude(hit['transiting'], hit['exactJd'])
        separation = abs(float(tl.wrap180(lon - hit['natalLongitude'])))
        check(abs(separation - hit['angle']) <= ARCMIN,
              f"{hit['label']}: separation {separation:.6f} deg is not "
              f"{hit['angle']} deg")

    # ------------------------------------------------- 4. orb spans hold
    section('4. Applying and separating spans really bound the orb')
    spans_checked = 0
    for hit in result['hits']:
        for field, sign in (('enter', -1), ('leave', +1)):
            if not hit[field]:
                continue
            jd = iso_to_jd(hit[field])
            lon = scalar_longitude(hit['transiting'], jd)
            off = abs(float(tl.wrap180(lon - hit['targetLongitude'])))
            check(abs(off - hit['orb']) <= 2 * ARCMIN,
                  f"{hit['label']}: {field} boundary sits {off:.6f} deg from exact, "
                  f"not {hit['orb']}")
            check((jd - hit['exactJd']) * sign > 0,
                  f"{hit['label']}: {field} is on the wrong side of exact")
            spans_checked += 1
        if hit['enter'] and hit['leave']:
            mid_lon = scalar_longitude(hit['transiting'], hit['exactJd'])
            check(abs(float(tl.wrap180(mid_lon - hit['targetLongitude']))) < hit['orb'],
                  f"{hit['label']}: exact is not inside its own orb span")
    print(f'    {spans_checked} orb boundaries checked')

    # -------------------------------------------------- 5. stations
    section('5. Stations sit where the speed is zero')
    for station in result['stations']:
        speed = scalar_speed(station['transiting'], station['jd'])
        check(abs(speed) < 5e-4,
              f"{station['label']}: speed at the reported instant is {speed:.8f} deg/day")
        before = scalar_speed(station['transiting'], station['jd'] - 3.0)
        after = scalar_speed(station['transiting'], station['jd'] + 3.0)
        check(before * after < 0,
              f"{station['label']}: speed does not change sign across the station")
        if station['station'] == 'retrograde':
            check(before > 0 and after < 0,
                  f"{station['label']} is labelled retrograde but the speed goes "
                  f"{before:.5f} -> {after:.5f}")
        else:
            check(before < 0 and after > 0,
                  f"{station['label']} is labelled direct but the speed goes "
                  f"{before:.5f} -> {after:.5f}")
        lon = scalar_longitude(station['transiting'], station['jd'])
        check(abs(float(tl.wrap180(lon - station['longitude']))) <= ARCMIN,
              f"{station['label']}: reported degree is not where the body is")
        print(f"    {station['label']} ({station['datetime']}) — "
              f"speed {speed:+.7f} deg/day")

    # -------------------------------------------------- 6. ingresses
    section('6. Ingresses land on the boundary they name')
    sign_ingresses = [i for i in result['ingresses'] if i['scope'] == 'sign']
    house_ingresses = [i for i in result['ingresses'] if i['scope'] == 'house']
    check(len(sign_ingresses) > 0, 'no sign ingresses found in two months')
    check(len(house_ingresses) > 0, 'no natal-house ingresses found in two months')
    for ingress in result['ingresses']:
        lon = scalar_longitude(ingress['transiting'], ingress['jd'])
        delta = abs(float(tl.wrap180(lon - ingress['longitude'])))
        check(delta <= ARCMIN,
              f"{ingress['label']} at {ingress['datetime']} is {delta * 60:.4f} "
              f"arcmin off the boundary")
        check(ingress['from'] != ingress['to'],
              f"{ingress['label']}: from and to are the same")
        if ingress['scope'] == 'sign':
            check(abs(ingress['longitude'] % 30.0) < 1e-6,
                  f"{ingress['label']}: {ingress['longitude']} is not a sign boundary")
    print(f'    {len(sign_ingresses)} sign, {len(house_ingresses)} natal-house')

    # ------------------------------------------- 7. ordering and integrity
    section('7. The timeline is ordered and free of duplicates')
    keys = [e.get('exactJd', e.get('jd')) for e in result['timeline']]
    check(all(a <= b for a, b in zip(keys, keys[1:])), 'the timeline is not sorted')
    check(len(result['timeline'])
          == len(result['hits']) + len(result['stations']) + len(result['ingresses']),
          'the timeline is not the three lists merged')
    seen = set()
    for hit in result['hits']:
        key = (hit['transiting'], hit['natal'], hit['aspect'],
               round(hit['exactJd'] * 1440.0))
        check(key not in seen, f"duplicate hit: {hit['label']} at {hit['exact']}")
        seen.add(key)
    for hit in result['hits']:
        check(iso_to_jd(result['window']['start']) - 1e-6 <= hit['exactJd']
              <= iso_to_jd(result['window']['end']) + 1e-6,
              f"{hit['label']} perfects outside the window it was asked for")

    # --------------------------------- 8. retrograde multi-pass grouping
    section('8. Retrograde multi-passes group into one span')
    wide = dict(SYNTHETIC)
    # Mars retrogrades in early 2027; a nine-month window around it is the
    # cheapest reliable way to catch a real triple crossing rather than hoping
    # one falls inside the two-month window above.
    wide.update({'start': '2026-11-01', 'end': '2027-08-01', 'orb': 1.0,
                 'transitingBodies': ['mars', 'jupiter', 'saturn'],
                 'aspects': 'major'})
    wide_result = tl.build_timeline(wide)
    spans = {}
    for hit in wide_result['hits']:
        spans.setdefault(hit['spanId'], []).append(hit)
    multi = {k: v for k, v in spans.items() if len(v) > 1}
    print(f"    {len(wide_result['hits'])} hits in {len(spans)} spans, "
          f'{len(multi)} of them multi-pass')
    check(len(multi) > 0,
          'no multi-pass span found in nine months of Mars/Jupiter/Saturn — '
          'the grouping is untested')
    for span_id, group in multi.items():
        group = sorted(group, key=lambda h: h['exactJd'])
        check(all(h['passesInSpan'] == len(group) for h in group),
              f'{span_id}: passesInSpan does not match the group size')
        check([h['pass'] for h in group] == list(range(1, len(group) + 1)),
              f'{span_id}: pass numbers are not 1..n in time order')
        check(len({(h['enter'], h['leave']) for h in group}) == 1,
              f'{span_id}: a span has more than one pair of boundaries')
        check(len({h['natal'] for h in group}) == 1
              and len({h['aspect'] for h in group}) == 1,
              f'{span_id}: a span mixes different aspects or natal points')
        first = group[0]
        print(f"    {first['label']}: {len(group)} passes "
              f"({', '.join(h['exact'][:10] for h in group)})")

    # --------------------------------------------- 9. sidereal consistency
    section('9. A sidereal chart gets sidereal transits')
    sidereal = dict(SYNTHETIC)
    sidereal.update({'zodiac': 'sidereal', 'ayanamsa': 'lahiri',
                     'start': '2026-07-15', 'end': '2026-08-15',
                     'transitingBodies': ['sun', 'mars']})
    sid = tl.build_timeline(sidereal)
    check(sid['natal']['zodiac'] == 'sidereal', 'the sidereal echo is wrong')
    for hit in sid['hits']:
        tropical = scalar_longitude(hit['transiting'], hit['exactJd'])
        ayan = chart_engine.ayanamsa_degrees(hit['exactJd'], 'lahiri')
        delta = abs(float(tl.wrap180((tropical - ayan) - hit['targetLongitude'])))
        check(delta <= ARCMIN,
              f"sidereal {hit['label']}: {delta * 60:.4f} arcmin off exact")
    print(f"    {len(sid['hits'])} sidereal hits, all exact in the sidereal zodiac")

    # ------------------------------------------ 10. the precomputed path
    section('10. Precomputed natal input gives the same answer as birth data')
    precomputed = {
        'natal': {
            'points': {k: v['longitude'] for k, v in result['natal']['points'].items()},
            'houses': [h['cusp'] for h in result['natal']['houses']],
            'zodiac': 'tropical',
        },
        'start': '2026-07-15', 'end': '2026-09-15', 'orb': 1.0,
    }
    pre = tl.build_timeline(precomputed)
    check(pre['counts'] == result['counts'],
          f"precomputed counts {pre['counts']} != birth-data counts {result['counts']}")
    for a, b in zip(pre['hits'], result['hits']):
        check(abs(a['exactJd'] - b['exactJd']) < 1e-9,
              f"{a['label']} moved between the two input paths")
    print('    identical hit-for-hit')

    # --------------------------------------------- 11. presets and errors
    section('11. Window presets and refusals')
    preset = tl.build_timeline({**SYNTHETIC, 'preset': 'past-month',
                                'transitingBodies': ['sun']})
    span = preset['window']['days']
    check(abs(span - 30.0) < 0.01, f"'past-month' spanned {span} days")
    check(preset['window']['requested'] == 'past-month', 'preset not echoed')

    for bad, why in (
        ({**SYNTHETIC, 'preset': 'last-tuesday'}, 'unknown preset'),
        ({**SYNTHETIC, 'start': '2026-09-01', 'end': '2026-08-01'}, 'reversed window'),
        ({**SYNTHETIC, 'start': '2026-01-01', 'end': '2033-01-01'}, 'over-long window'),
        ({**SYNTHETIC, 'orb': 0}, 'zero orb'),
        ({**SYNTHETIC, 'aspects': 'sideways'}, 'unknown aspect set'),
        ({**SYNTHETIC, 'transitingBodies': ['nibiru']}, 'unknown body'),
        ({'start': '2026-07-01', 'end': '2026-08-01'}, 'no chart at all'),
        ({**SYNTHETIC, 'start': 'not-a-date'}, 'unreadable date'),
    ):
        try:
            tl.build_timeline(bad)
        except ValueError:
            pass
        except Exception as e:  # noqa: BLE001
            check(False, f'{why}: raised {type(e).__name__} rather than ValueError — {e}')
        else:
            check(False, f'{why}: was accepted silently')

    # ------------------------------------- 12. the Moon is opt-in, and works
    section('12. The Moon is excluded by default and available on request')
    check('moon' not in result['config']['transitingBodies'],
          'the Moon is in the default transiting set')
    lunar = tl.build_timeline({**SYNTHETIC, 'includeMoon': True,
                               'start': '2026-07-15', 'end': '2026-07-25',
                               'transitingBodies': ['moon']})
    check(len(lunar['hits']) > 20,
          f"ten days of Moon transits produced only {len(lunar['hits'])} hits")
    moon_worst = 0.0
    for hit in lunar['hits']:
        lon = scalar_longitude('moon', hit['exactJd'])
        moon_worst = max(moon_worst, abs(float(tl.wrap180(lon - hit['targetLongitude']))))
    check(moon_worst <= ARCMIN,
          f'worst Moon residual {moon_worst * 60:.4f} arcmin exceeds one arcminute')
    print(f"    {len(lunar['hits'])} Moon hits in ten days, worst residual "
          f'{moon_worst * 3600:.4f} arcsec')

    # --------------------------------- 13. the series the ephemeris draws
    section('13. The sampled series matches the ephemeris it claims to plot')
    check(result['series'] is None, 'a series came back without being asked for')
    drawn = tl.build_timeline({**SYNTHETIC, 'start': '2026-07-15',
                               'end': '2026-09-15', 'includeSeries': True,
                               'seriesPoints': 60})
    series = drawn['series']
    check(series is not None, 'includeSeries produced no series')
    check(len(series['jd']) == 60, f"asked for 60 samples, got {len(series['jd'])}")
    check(len(series['datetimes']) == 60, 'datetimes and jd disagree in length')
    check(set(series['bodies']) == set(drawn['config']['transitingBodies']),
          'the series does not cover exactly the transiting bodies')
    worst_series = 0.0
    for body, track in series['bodies'].items():
        check(len(track['longitude']) == 60, f'{body}: wrong number of samples')
        check(len(track['retrograde']) == 60, f'{body}: wrong number of speed flags')
        for i in (0, 17, 41, 59):
            expected = scalar_longitude(body, series['jd'][i])
            delta = abs(float(tl.wrap180(track['longitude'][i] - expected)))
            worst_series = max(worst_series, delta)
            check(delta < 1e-3,
                  f'{body} sample {i} is {delta:.6f} deg from the ephemeris')
        # The endpoint's own retrograde flags must agree with the sign of the
        # measured speed, or the ephemeris view would draw stations in the
        # wrong direction.
        for i in (0, 30, 59):
            speed = scalar_speed(body, series['jd'][i])
            check(track['retrograde'][i] == bool(speed < 0),
                  f'{body} sample {i}: retrograde flag disagrees with the speed')
    print(f"    every transiting body x 60 samples; worst sample error "
          f'{worst_series * 3600:.4f} arcsec')
    for bad, why in (({**SYNTHETIC, 'includeSeries': True, 'seriesPoints': 1},
                      'too few series points'),
                     ({**SYNTHETIC, 'includeSeries': True, 'seriesPoints': 5000},
                      'too many series points')):
        try:
            tl.build_timeline(bad)
        except ValueError:
            pass
        else:
            check(False, f'{why}: was accepted')

    # ------------------------------- 14. against an independent engine
    section('14. Spot checks against Astro-Seek (Swiss Ephemeris)')
    # Every other test above closes a loop with this engine: the solver is
    # checked against the positions it solved. These five are the outside
    # check — dates read off Astro-Seek, which is a Swiss Ephemeris front end
    # and therefore an INDEPENDENT implementation on a different JPL release.
    # They were captured 2026-08-04 from
    #   /retrograde-planets-astrology-calendar-2026  and
    #   /calculate-planet-ingresses-and-particular-degree-returns/
    # (the second takes a whole degree in a sign, which is why the probes below
    # sit on exact degrees). Astro-Seek prints whole minutes, so the tolerance
    # is two minutes of clock — at Saturn's rate that is under an arcsecond.
    #
    # No birth data was submitted anywhere: stations and degree crossings are
    # properties of the sky, not of a chart.
    tolerance_days = 2.0 / 1440.0

    stations_2026 = tl.build_timeline({
        'natal': {'points': {'probe': 0.0}, 'zodiac': 'tropical'},
        'natalPoints': ['probe'],
        'start': '2026-06-20', 'end': '2026-08-05',
        'transitingBodies': ['mercury', 'saturn', 'neptune'],
    })
    by_label = {s['label']: s for s in stations_2026['stations']}
    for label, expected in (
        ("Neptune stations retrograde at 4° Aries 25'", '2026-07-07T10:55:00Z'),
        ("Mercury stations direct at 16° Cancer 18'", '2026-07-23T22:58:00Z'),
        ("Saturn stations retrograde at 14° Aries 44'", '2026-07-26T19:56:00Z'),
    ):
        found = by_label.get(label)
        check(found is not None,
              f'Astro-Seek station not reproduced: {label} (got '
              f'{sorted(by_label)})')
        if found:
            gap = abs(found['jd'] - iso_to_jd(expected))
            check(gap < tolerance_days,
                  f'{label}: {found["datetime"]} vs Astro-Seek {expected} — '
                  f'{gap * 1440:.2f} minutes apart')
            print(f'    {label}\n      ours {found["datetime"]} · Astro-Seek '
                  f'{expected} · {gap * 1440:+.2f} min')

    # Saturn's slow triple crossing of one degree — the hardest case for a
    # root finder, because the curve is nearly flat where it turns.
    saturn = tl.build_timeline({
        'natal': {'points': {'probe': 14.0}, 'zodiac': 'tropical'},
        'natalPoints': ['probe'], 'orb': 0.5,
        'start': '2026-01-01', 'end': '2027-06-01',
        'transitingBodies': ['saturn'], 'aspects': 'major',
    })
    saturn_hits = [h['exactJd'] for h in saturn['hits'] if h['aspect'] == 'conjunction']
    expected_saturn = ['2026-06-26T22:55:00Z', '2026-08-25T21:33:00Z',
                       '2027-03-09T00:19:00Z']
    check(len(saturn_hits) == 3,
          f'Saturn should cross 14 Aries three times, got {len(saturn_hits)}')
    for jd, expected in zip(saturn_hits, expected_saturn):
        gap = abs(jd - iso_to_jd(expected))
        check(gap < tolerance_days,
              f'Saturn at 14 Aries: {gap * 1440:.2f} minutes from Astro-Seek '
              f'{expected}')
    print(f"    Saturn crosses 14°00' Aries {len(saturn_hits)}x; largest gap from "
          f'Astro-Seek '
          f'{max((abs(jd - iso_to_jd(e)) * 1440) for jd, e in zip(saturn_hits, expected_saturn)):.2f} min')

    venus = tl.build_timeline({
        'natal': {'points': {'probe': 0.0}, 'zodiac': 'tropical'},
        'natalPoints': ['probe'],
        'start': '2026-07-01', 'end': '2026-08-10',
        'transitingBodies': ['venus'], 'houseIngresses': False,
    })
    for label, expected in (('Venus enters Virgo', '2026-07-09T17:23:00Z'),
                            ('Venus enters Libra', '2026-08-06T19:13:00Z')):
        found = next((i for i in venus['ingresses'] if i['label'] == label), None)
        check(found is not None, f'Astro-Seek ingress not reproduced: {label}')
        if found:
            gap = abs(found['jd'] - iso_to_jd(expected))
            check(gap < tolerance_days,
                  f'{label}: {found["datetime"]} vs Astro-Seek {expected} — '
                  f'{gap * 1440:.2f} minutes apart')
            print(f'    {label}: ours {found["datetime"]} · Astro-Seek '
                  f'{expected} · {gap * 1440:+.2f} min')

    # ---------------------------------------------------------- summary
    print()
    if _failures:
        for message in _failures:
            print('FAIL: ' + message)
        print(f'\nFAILED: {len(_failures)} of {_checks} checks')
        return 1
    print(f'OK: all checks passed ({_checks} checks)')
    return 0


if __name__ == '__main__':
    raise SystemExit(run())
