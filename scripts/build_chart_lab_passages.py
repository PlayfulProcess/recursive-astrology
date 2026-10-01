"""build_chart_lab_passages.py -- the retrieval shelf for pages/chart-lab.html (a mock-up).

Writes mock-data/passages.json: short passages the chart lab's Ask mode ranks client-side
(BM25), and that its Lens and Book modes show side by side per school. Three kinds:

  grammar  every planet / sign / house / aspect item of the school grammars in grammars/,
           keyed by metadata.source_item_id (the one cross-link key) plus a small alias table
           for the nodes and Chiron; archetypal-pairs L2 items keyed by their planet pair;
           aspects-commented split into its three school sections. Sections trimmed.
  book     short windows (<= 60 words) from the public-domain books in sources/public-domain,
           found through the keyword side of their search index (FTS5 bm25), each linked to its
           scanned PAGE on archive.org (/details/<id>/page/n<leaf>/mode/1up). One window per term
           per book. (Until Sep 29 2026 these were search-inside links, ?q="first eight words";
           archive.org's search often found nothing for a long OCR phrase, so they failed.)
  podcast  auto-caption snippets (<= 20 words) from a podcast transcript index, each linked to
           its YouTube moment and labelled auto-caption. Episode titles are NOT kept, and any
           snippet with a capitalised word outside a small astrology vocabulary is dropped, so
           no living person is named (the repo's rule: name schools, not living people).

Never stored: any sentence of Alice Bailey's Esoteric Astrology (under copyright; the Bailey
school here is grammars/esoteric-bailey-paraphrase, our own paraphrase plus the attributed
Tabulation VI ruler table). No chart, no birth data, nothing personal: this file is public.

The two search indexes are local SQLite files (same schema: passages + passages_fts), so their
paths are arguments, not defaults:

  python scripts/build_chart_lab_passages.py --books-db PATH --podcasts-db PATH --pages-lib DIR

Page links come from page_url(book_id, chunk_index, at=...) in scripts/astro_texts_pages.py, which
reads sources/public-domain/passage_pages.json (each indexed passage mapped to its scanned page from
the books' djvu.xml). Another copy can be given with --pages-lib DIR or ASTRO_PAGES_LIB. When a page
is unknown, a book passage links to the book's details page on archive.org: never to a search.

To swap only the book links in an existing mock-data/passages.json (nothing else changes):

  python scripts/build_chart_lab_passages.py --relink --books-db PATH --pages-lib DIR
"""
import argparse
import datetime
import json
import os
import re
import sqlite3
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'mock-data', 'passages.json')
SECTION_CHARS = 520
BOOK_WORDS = 60
POD_WORDS = 20

SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
         'sagittarius', 'capricorn', 'aquarius', 'pisces']
PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
           'pluto', 'chiron', 'northnode', 'southnode']
ASPECTS = ['conjunction', 'opposition', 'square', 'trine', 'sextile']
ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth',
       'tenth', 'eleventh', 'twelfth']
ORDN = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']

# grammar items that carry no link key
ALIASES = {'planet-north-node': 'planet-northnode', 'planet-south-node': 'planet-southnode',
           'planet-chiron': 'planet-chiron', 'graha-rahu': 'planet-northnode',
           'graha-ketu': 'planet-southnode', 'esoteric-vulcan': 'concept-vulcan',
           'esoteric-earth': 'concept-earth-ruler'}
QUAD = {'quadruplicity-cardinal': 'concept-cardinal', 'quadruplicity-fixed': 'concept-fixed',
        'quadruplicity-mutable': 'concept-mutable'}
# sections left out of the shelf: a 1920 source whose public-domain status is unconfirmed
SKIP_SECTION_RX = re.compile(r'Sepharial', re.I)

# the public-domain books: which school each speaks for (a scan listed second is a fallback)
BOOKS = [
    ('ptolemystetrabi00procgoog', 'ptolemy', 'Ptolemy, Tetrabiblos (tr. J. M. Ashmand, 1822)', None),
    ('wg1079', 'jyotisa', 'Varāhamihira, Bṛhat Jātaka (tr. N. Chidambaram Iyer, 1885)', None),
    ('brihatjatakaenglishtranslationchidambaramiyern.1885_202003_820_', 'jyotisa',
     'Varāhamihira, Bṛhat Jātaka (tr. N. Chidambaram Iyer, 1885), second scan', 'wg1079'),
    ('b30338724', 'lilly', 'William Lilly, Christian Astrology (1647)', None),
    ('ChristianAstrologyByWilliamLilly', 'lilly', 'William Lilly, Christian Astrology (1659 edition)', 'b30338724'),
    ('astrologyforall00leogoog', 'alan-leo', 'Alan Leo, Astrology for All (1899)', None),
    ('howtojudgenativi00leoa', 'alan-leo', 'Alan Leo, How to Judge a Nativity (1903; 1928 printing)', None),
    ('amanualastrolog00smitgoog', 'dignities-table', 'Raphael (R. C. Smith), A Manual of Astrology (1828)', None),
    ('TheVenusTabletsOfAmmizaduga1928', 'mesopotamian-omens',
     'S. Langdon and J. K. Fotheringham, The Venus Tablets of Ammizaduga (1928)', None),
]
# left out on purpose: christian-astrology-1647 (a 2003 transcription carrying its own copyright
# line) and Manilius (no school chip speaks for him yet).

PODCAST_SHOWS = {'The Astrology Podcast': 'The Astrology Podcast',
                 'Sophia Project (Sophia Centre lectures)': 'Sophia Centre lectures'}
# any other show is skipped (a show titled with a living person's name is not shown)

# words that may be capitalised inside a podcast snippet; anything else capitalised drops it
ALLOW_CAPS = set('''I I'm I've I'd I'll OK Okay Yeah So And But Or Now Then Well Right Yes No Oh
The A An It It's This That These Those There They We You He She His Her Our Your My When If
What Why How Which Who Where Because Also Just Like Even
Sun Moon Mercury Venus Mars Jupiter Saturn Uranus Neptune Pluto Chiron Earth
Aries Taurus Gemini Cancer Leo Virgo Libra Scorpio Sagittarius Capricorn Aquarius Pisces
Ascendant Midheaven Descendant MC IC ASC North South Node Nodes Rahu Ketu
Hellenistic Greek Greeks Roman Romans Babylonian Babylonians Mesopotamian Egyptian Egyptians
Indian Vedic Jyotish Western Medieval Renaissance Christian Christianity Arabic Persian Latin
English European God Gods Goddess Ptolemy Lilly Valens Dorotheus Firmicus Manilius Jung
T-square Grand Trine Mercury's Venus' Mars' Saturn's Jupiter's Moon's Sun's Neptune's Pluto's
Uranus' January February March April May June July August September October November December
Monday Tuesday Wednesday Thursday Friday Saturday Sunday
Every Some Many Most All Each Planets Planet Signs Sign Houses House Astrology Astrologers Astrologer
In On At For With To Of As Not Maybe Actually Basically Sometimes Usually Often Here Let's Let
Since While Although Though Once After Before During Both Either Neither One Two Three First Second
Third Another Other Only Still Yet Do Does Did Don't Is Are Was Were Be Been Have Has Had Can Could
Would Should Will Might Must There's That's What's Now Anyway Obviously Of Course Traditionally
Similarly Instead Otherwise However Therefore Thus Essentially Generally Typically Especially''' .split())


def slug_schools():
    g = json.load(open(os.path.join(ROOT, 'grammars', 'astrology-schools', 'grammar.json'), encoding='utf-8'))
    return g['_schools']


def trim(text, n=SECTION_CHARS):
    text = re.sub(r'\s+', ' ', str(text)).strip()
    if len(text) <= n:
        return text
    cut = text[:n]
    cut = cut[:cut.rfind(' ')] if ' ' in cut else cut
    return cut.rstrip(',;:') + ' …'


def grammar_passages(schools):
    by_slug = {}
    for s in schools:
        for g in s['grammar_slugs']:
            by_slug.setdefault(g, []).append(s)
    out = []
    for gslug, owners in sorted(by_slug.items()):
        path = os.path.join(ROOT, 'grammars', gslug, 'grammar.json')
        g = json.load(open(path, encoding='utf-8'))
        for it in g.get('items', []):
            md = it.get('metadata') or {}
            key = md.get('source_item_id')
            if key in QUAD:
                key = QUAD[key]
            if not key and it['id'] in ALIASES:
                key = ALIASES[it['id']]
            if not key and md.get('planets') and len(md['planets']) == 2:
                key = 'pair-' + '-'.join(sorted(p.lower() for p in md['planets']))
            if not key:
                continue
            if not re.match(r'^(planet|sign|house|aspect|pair|concept)-', key):
                continue
            secs = it.get('sections') or {}
            if gslug == 'aspects-commented':
                # one compilation, three schools: each school reads its own section
                for s in owners:
                    text = secs.get(s['section_label'])
                    if not text:
                        continue
                    out.append({'id': f'g:{gslug}:{it["id"]}:{s["slug"]}', 'kind': 'grammar',
                                'school': s['slug'], 'grammar': gslug, 'grammar_name': g.get('name'),
                                'item': it['id'], 'name': it['name'], 'keys': [key],
                                'sections': {s['section_label']: trim(text)}})
                continue
            kept = {k: trim(v if isinstance(v, str) else json.dumps(v, ensure_ascii=False))
                    for k, v in secs.items() if not SKIP_SECTION_RX.search(k)}
            if not kept:
                continue
            for s in owners:
                out.append({'id': f'g:{gslug}:{it["id"]}', 'kind': 'grammar', 'school': s['slug'],
                            'grammar': gslug, 'grammar_name': g.get('name'), 'item': it['id'],
                            'name': it['name'], 'keys': [key], 'sections': kept})
    return out


def terms():
    """(key, FTS query, regex that marks the term inside a window)"""
    T = []
    names = {'northnode': ('"north node" OR "dragons head" OR "dragon s head" OR rahu', r"north node|dragon.{0,2}s head|\brahu\b"),
             'southnode': ('"south node" OR "dragons tail" OR "dragon s tail" OR ketu', r"south node|dragon.{0,2}s tail|\bketu\b"),
             'uranus': ('uranus OR herschel', r'\buranus\b|\bherschel\b')}
    for p in PLANETS:
        q, rx = names.get(p, (f'"{p}"', rf'\b{p}\b'))
        T.append((f'planet-{p}', q, rx))
    for s in SIGNS:
        T.append((f'sign-{s}', f'"{s}"', rf'\b{s}'))
    for i in range(12):
        T.append((f'house-{i + 1}', f'"{ORD[i]} house" OR "{ORDN[i]} house"',
                  rf'\b({ORD[i]}|{ORDN[i]}) house'))
    asp = {'conjunction': ('conjunction', r'\bconjunct'), 'opposition': ('opposition', r'\bopposi'),
           'square': ('square OR quartile', r'\bsquare|\bquartile'), 'trine': ('trine OR trigon', r'\btrine|\btrigon'),
           'sextile': ('sextile', r'\bsextile')}
    for a in ASPECTS:
        q, rx = asp[a]
        T.append((f'aspect-{a}', q, rx))
    concepts = {
        'dispositor': ('dispositor', r'\bdisposit'),
        'final-dispositor': ('"final dispositor"', r'final dispositor'),
        'rulership': ('"lord of" OR ruler OR domicile', r'\blord of\b|\bruler\b|\bdomicile'),
        'exaltation': ('exaltation OR exalted', r'\bexalt'),
        'detriment': ('detriment', r'\bdetriment'),
        'fall': ('"his fall" OR "her fall" OR "in fall"', r'\b(his|her|in) fall\b'),
        'retrograde': ('retrograde', r'\bretrograd'),
        'temperament': ('choleric OR sanguine OR melancholic OR melancholy OR phlegmatic OR temperament',
                        r'\bcholer|\bsanguin|\bmelanchol|\bphlegm|\btemperament'),
        'elements': ('fiery OR earthy OR airy OR watery OR triplicity', r'\bfiery\b|\bearthy\b|\bairy\b|\bwatery\b|\btriplicit'),
        'cardinal': ('cardinal OR movable OR moveable', r'\bcardinal|\bmov(e)?able'),
        'fixed': ('"fixed signs" OR "fixed sign"', r'\bfixed sign'),
        'mutable': ('mutable OR "common signs" OR bicorporeal', r'\bmutable|\bcommon sign|\bbicorpor'),
        'horizon': ('horizon', r'\bhorizon'),
        'ascendant': ('ascendant OR "rising sign"', r'\bascendant|\brising sign'),
        'midheaven': ('midheaven OR "mid heaven" OR "medium coeli"', r'mid ?heaven|medium coeli'),
        'transit': ('transit OR transits', r'\btransit'),
        'stellium': ('stellium OR satellitium', r'\bstellium|\bsatellitium'),
        't-square': ('"t square" OR "t-square"', r'\bt[- ]?square'),
        'generation': ('generation OR generational', r'\bgeneration'),
        'night-birth': ('nocturnal OR "by night" OR diurnal OR sect', r'\bnocturnal|\bby night|\bdiurnal|\bsect\b'),
        'sidereal': ('sidereal OR ayanamsa OR precession', r'\bsidereal|\bayanam|\bprecession'),
        'vulcan': ('vulcan', r'\bvulcan'),
        'moon-phase': ('"new moon" OR "full moon" OR "quarter moon" OR lunation', r'new moon|full moon|quarter|lunation'),
    }
    for k, (q, rx) in concepts.items():
        T.append((f'concept-{k}', q, rx))
    return T


def clean_ocr(text):
    text = re.sub(r'-\s+(\w)', r'\1', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def window(words, rx, n):
    """the n-word window with the most term hits, starting near the first hit"""
    hits = [i for i, w in enumerate(words) if rx.search(' '.join(words[i:i + 3]).lower())]
    if not hits:
        return None
    best, best_score = None, -1
    for h in hits[:12]:
        start = max(0, h - n // 3)
        win = words[start:start + n]
        score = sum(1 for i in hits if start <= i < start + n)
        if score > best_score:
            best, best_score = (start, win), score
    return best


def junk_ratio(s):
    """share of tokens that look like OCR damage (stray symbols, digits inside words, mixed case)"""
    toks = s.split()
    bad = sum(1 for t in toks
              if re.search(r"[^A-Za-z.,;:!?'\"()\-’‘“”]", t) or re.search(r'[a-z][A-Z]', t)
              or re.search(r'[A-Za-z]\d|\d[A-Za-z]', t))
    return bad / max(1, len(toks))


PAGE_URL = None   # astro_texts_pages.page_url, when --pages-lib (or ASTRO_PAGES_LIB) is given


def load_page_url(lib):
    """Import page_url from the local research module; None when it is not available."""
    global PAGE_URL
    lib = lib or os.environ.get('ASTRO_PAGES_LIB') or os.path.dirname(os.path.abspath(__file__))
    if not lib:
        return None
    import sys
    sys.path.insert(0, lib)
    try:
        from astro_texts_pages import page_url
    except ImportError as e:
        print('page links unavailable, using details pages:', e)
        return None
    PAGE_URL = page_url
    return page_url


def book_page_url(ident, start, at):
    """The scanned page where this window starts; the book's details page when unknown."""
    details = f'https://archive.org/details/{urllib.parse.quote(ident)}'
    if PAGE_URL is None:
        return details
    try:
        url = PAGE_URL(ident, int(start), at=at)
    except Exception as e:  # noqa: BLE001
        print('page link failed for', ident, start, e)
        return details
    return url if isinstance(url, str) and url.startswith('https://archive.org/details/') and '?q=' not in url else details


def relink(books_db):
    """Swap only the book links of the existing shelf for page links; nothing else changes."""
    data = json.load(open(OUT, encoding='utf-8'))
    conn = sqlite3.connect(books_db)
    n = pages = 0
    for x in data['passages']:
        if x.get('kind') != 'book':
            continue
        _, ident, pid = x['id'].split(':', 2)
        row = conn.execute('SELECT start FROM passages WHERE id = ? AND video_id = ?', (int(pid), ident)).fetchone()
        words = x['text'].replace('…', ' ').split()
        x['url'] = book_page_url(ident, row[0], ' '.join(words[:12])) if row else f'https://archive.org/details/{ident}'
        n += 1
        pages += '/page/n' in x['url']
    data['_about'] = ABOUT
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'relinked {n} book passages: {pages} to a page, {n - pages} to the book\'s details page')


ABOUT = ('The retrieval shelf for pages/chart-lab.html (a mock-up). Built by '
         'scripts/build_chart_lab_passages.py from the school grammars in grammars/, short '
         'windows of the public-domain books in sources/public-domain (<= 60 words, each linked to its '
         'scanned page on archive.org) and podcast auto-caption snippets (<= 20 words, linked to the '
         'YouTube moment, no episode titles). No chart and no personal data. No text of Bailey\'s '
         'Esoteric Astrology: that school is our own paraphrase grammar.')


def book_passages(db):
    conn = sqlite3.connect(db)
    out, seen = [], set()
    have = {r[0] for r in conn.execute('SELECT video_id FROM episodes')}
    for key, q, rx in terms():
        crx = re.compile(rx, re.I)
        got_for = set()   # one window per term per school
        for ident, school, label, fallback_of in BOOKS:
            if ident not in have or school in got_for:
                continue
            rows = conn.execute(
                'SELECT p.id, p.start, p.text FROM passages_fts JOIN passages p ON p.id = passages_fts.rowid '
                'WHERE passages_fts MATCH ? AND p.video_id = ? ORDER BY bm25(passages_fts) LIMIT 6',
                (q, ident)).fetchall()
            for pid, start, text in rows:
                text = clean_ocr(text)
                w = window(text.split(' '), crx, BOOK_WORDS)
                if not w:
                    continue
                s = ' '.join(w[1])
                if junk_ratio(s) > 0.06 or (ident, pid) in seen:
                    continue
                seen.add((ident, pid))
                out.append({'id': f'b:{ident}:{pid}', 'kind': 'book', 'school': school, 'book': label,
                            'keys': [key], 'text': ('… ' if w[0] > 0 else '') + s + ' …',
                            'url': book_page_url(ident, start, ' '.join(w[1][:12])),
                            'note': 'public-domain OCR; old spellings and scan errors remain'})
                got_for.add(school)
                break
    return out


def mmss(t):
    t = int(t)
    return f'{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}' if t >= 3600 else f'{t // 60}:{t % 60:02d}'


def safe_snippet(words):
    """False when a capitalised word outside the small vocabulary appears (it may be a name)."""
    for w in words:
        core = w.strip('.,;:!?"“”‘’()[]—–-')
        core = re.sub(r"[’']s?$", '', core)
        if core and core[0].isupper() and core not in ALLOW_CAPS:
            return False
    return True


def podcast_passages(db, per_term=2):
    conn = sqlite3.connect(db)
    out, seen_rows, seen_vid_term = [], set(), set()
    for key, q, rx in terms():
        crx = re.compile(rx, re.I)
        rows = conn.execute(
            'SELECT p.id, p.video_id, p.show, p.start, p.end, p.text FROM passages_fts '
            'JOIN passages p ON p.id = passages_fts.rowid WHERE passages_fts MATCH ? '
            'ORDER BY bm25(passages_fts) LIMIT 60', (q,)).fetchall()
        kept = 0
        for pid, vid, show, start, end, text in rows:
            if kept >= per_term:
                break
            if show not in PODCAST_SHOWS or pid in seen_rows or (vid, key) in seen_vid_term:
                continue
            text = re.sub(r'>>|\[[^\]]*\]|\b[A-Z][A-Za-z]+:', ' ', text or '')
            words = re.sub(r'\s+', ' ', text).strip().split(' ')
            w = window(words, crx, POD_WORDS)
            if not w:
                continue
            snippet = w[1][:POD_WORDS]
            if not safe_snippet(snippet):
                continue
            # the moment: interpolate inside the caption chunk by word position
            try:
                s0, s1 = float(start or 0), float(end or start or 0)
                t = s0 + (s1 - s0) * (w[0] / max(1, len(words))) if s1 > s0 else s0
            except (TypeError, ValueError):
                t = 0
            t = int(t)
            seen_rows.add(pid)
            seen_vid_term.add((vid, key))
            out.append({'id': f'p:{vid}:{pid}', 'kind': 'podcast', 'school': 'podcasts',
                        'show': PODCAST_SHOWS[show], 'keys': [key],
                        'text': '… ' + ' '.join(snippet) + ' …', 'label': 'auto-caption',
                        'at': mmss(t), 'url': f'https://www.youtube.com/watch?v={vid}&t={t}s'})
            kept += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--books-db', required=True, help='SQLite index of the public-domain books')
    ap.add_argument('--podcasts-db', help='SQLite index of the podcast transcripts (not needed with --relink)')
    ap.add_argument('--pages-lib', help='folder holding astro_texts_pages.py (page links); '
                                        'default: ASTRO_PAGES_LIB, else this scripts folder')
    ap.add_argument('--relink', action='store_true',
                    help='only swap the book links of the existing mock-data/passages.json')
    a = ap.parse_args()
    load_page_url(a.pages_lib)
    if a.relink:
        relink(a.books_db)
        return
    if not a.podcasts_db:
        ap.error('--podcasts-db is required unless --relink')
    schools = slug_schools()
    g = grammar_passages(schools)
    b = book_passages(a.books_db)
    p = podcast_passages(a.podcasts_db)
    for x in b + p:
        n = len(x['text'].replace('…', '').split())
        lim = BOOK_WORDS if x['kind'] == 'book' else POD_WORDS
        assert n <= lim, (x['id'], n)
        assert 'bailey' not in x.get('book', '').lower()
    data = {
        '_about': ABOUT,
        '_built': datetime.date.today().isoformat(),
        'extra_groups': [{'slug': 'podcasts', 'label': 'Contemporary talk (podcast auto-captions)',
                          'family_label': 'Contemporary practice', 'default_on': True, 'zodiac': 'none'}],
        'counts': {'grammar': len(g), 'book': len(b), 'podcast': len(p)},
        'passages': g + b + p,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(json.dumps(data['counts']), os.path.getsize(OUT), 'bytes ->', os.path.relpath(OUT, ROOT))


if __name__ == '__main__':
    main()
