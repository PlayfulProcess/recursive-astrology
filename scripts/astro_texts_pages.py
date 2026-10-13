"""Page links for the public-domain astrology passages indexed by astro_texts_index.py.

Why: the old links used archive.org "search inside" with a long OCR phrase (?q="..."). The search
index often finds nothing for such a phrase (its tokens differ from the djvu.txt words: the Manual of
Astrology example '"name 8 and when in opposition to that"' gets 0 matches from fulltext/inside.php),
and the viewer then reports an error. This script links each passage to its scanned PAGE instead,
which needs no search at all:

    https://archive.org/details/<id>/page/n<leaf>/mode/1up
    https://archive.org/details/<id>/<book>/page/n<leaf>/mode/1up    (items holding several books)

How the page is found (no form feeds exist in these *_djvu.txt files, so pages come from elsewhere):
  1. <book>_djvu.xml (archive.org, one <OBJECT> per scanned page) gives the words of every page.
     Its word stream is the same OCR the *_djvu.txt was made from, so a passage's first word can be
     located in it (exact token match; difflib alignment when the two streams differ).
  2. The OBJECT's PAGE value (<book>_0042.djvu) gives the scan leafNum; BookReader's own page list
     (BookReaderJSIA.php on the item's data server) maps leafNum -> the n-index the viewer uses in
     /page/n<N>, and gives the printed page number when archive.org has one.
  'leaf' in the output is that viewer n-index (0-based) of the page where the passage starts (or the
  next page, when fewer than 10 of its words sit at the foot of the first one). For a passage that
  runs over pages, 'leaf_end' is its last page and 'breaks' lists [offset, leaf] for each page it
  touches (offset = position in the passage's letters+digits only, so OCR hyphen/space clean-up does
  not move it); page_url(..., at=snippet) uses it. 'page' is the printed page label, when known.

Chunking is copied from astro_texts_index.passages() (150-word chunks, chunk index = 'start' in the
DB) and checked against every passage text in the DB before anything is written.

  python scripts/astro_texts_pages.py build    # downloads what is missing (cached in .cache/astro-pages)
  python scripts/astro_texts_pages.py url <book_id> <chunk_index> ["first words of a window"]

Paths: the books and the map live in sources/public-domain/. ASTRO_TEXTS_DB points at the local search
index of the books (default .cache/astrology-texts.sqlite); ASTRO_PAGES_CACHE at the download cache.

Output: sources/public-domain/passage_pages.json
        {book_id: {chunk_index: {"leaf": N, "url": "...", "page": "57"?, "leaf_end": M?, "breaks": [[0, N], [412, M]]?}}}
        (coverage per book: <cache>/coverage.json)
A book whose pages cannot be resolved gets {"leaf": null, "url": "https://archive.org/details/<id>"}.

Import:  sys.path.insert(0, 'scripts'); from astro_texts_pages import page_url
         (scripts/build_chart_lab_passages.py does this by itself)
         page_url('amanualastrolog00smitgoog', 190)                        # page where passage 190 is
         page_url('amanualastrolog00smitgoog', 190, at=' '.join(win[:12]))  # page where a window of it starts
"""
import bisect, difflib, gzip, json, os, re, sqlite3, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, 'sources', 'public-domain')       # the books (.txt) and texts.json
OUT = os.path.join(SRC, 'passage_pages.json')               # the page map this script writes
# The download cache (djvu.xml word lists, BookReader page lists, ~4 MB) is not committed.
CACHE = os.environ.get('ASTRO_PAGES_CACHE') or os.path.join(REPO, '.cache', 'astro-pages')
# The local search index of the books (built by astro_texts_index.py, same 150-word chunks);
# needed by `build`, and by page_url(..., at=...) for a passage that runs over two pages.
DB = os.environ.get('ASTRO_TEXTS_DB') or os.path.join(REPO, '.cache', 'astrology-texts.sqlite')
WORDS = 150
FOOT_WORDS = 10  # a passage (or window) with fewer words than this at the foot of a page links to the next page
UA ={'User-Agent': 'recursive-astrology research (PlayfulProcess)', 'Accept-Encoding': 'gzip'}
DETAILS = 'https://archive.org/details/'


# ---------- polite downloads (one at a time, cached) ----------

def get(url, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
                if r.headers.get('Content-Encoding') == 'gzip':
                    data = gzip.decompress(data)
            time.sleep(2)
            return data
        except Exception as e:  # noqa: BLE001
            print('  retry', k + 1, url[:120], e)
            time.sleep(5 * (k + 1))
    raise RuntimeError(f'download failed: {url}')


def meta(ident):
    p = f'{CACHE}/meta_{ident}.json'
    if not os.path.exists(p):
        open(p, 'wb').write(get(f'https://archive.org/metadata/{ident}'))
    return json.load(open(p, encoding='utf-8'))


def book_prefix(rec):
    """The file prefix of the book inside the item (text_file minus _djvu.txt)."""
    return rec['text_file'][:-len('_djvu.txt')]


def is_multibook(m):
    return sum(1 for f in m['files'] if f['name'].endswith('_djvu.xml')) > 1


def xml_pages(ident, prefix):
    """[(leafNum from the PAGE value, [words])] per <OBJECT> of <prefix>_djvu.xml (cached, raw xml deleted)."""
    cache = f'{CACHE}/{ident}.pagewords.json.gz'
    if os.path.exists(cache):
        return json.loads(gzip.decompress(open(cache, 'rb').read()))
    tmp = f'{CACHE}/{ident}_djvu.xml.part'
    if not os.path.exists(tmp):
        open(tmp, 'wb').write(get(f'https://archive.org/download/{ident}/' + urllib.parse.quote(prefix + '_djvu.xml')))
    pages = []
    try:
        for _, el in ET.iterparse(tmp, events=('end',)):
            if el.tag == 'OBJECT':
                pv = [p.get('value') for p in el.iter('PARAM') if p.get('name') == 'PAGE']
                mm = re.search(r'_(\d+)\.djvu$', pv[0] or '') if pv else None
                pages.append([int(mm.group(1)) if mm else None, [w.text or '' for w in el.iter('WORD')]])
                el.clear()
    except ET.ParseError:
        os.remove(tmp)  # a broken download: fetch again next run
        raise
    open(cache, 'wb').write(gzip.compress(json.dumps(pages).encode('utf-8')))
    os.remove(tmp)
    return pages


def br_pages(ident, prefix, m):
    """BookReader's page list for this book: [{'leafNum', 'pageNum'?}] in viewer order (n0, n1, ...)."""
    cache = f'{CACHE}/{ident}.bookreader.json'
    if os.path.exists(cache):
        return json.load(open(cache, encoding='utf-8'))
    q = urllib.parse.urlencode({'id': ident, 'itemPath': m['dir'], 'server': m['server'], 'format': 'json',
                                'subPrefix': prefix, 'requestUri': f'/details/{ident}'})
    d = json.loads(get(f"https://{m['server']}/BookReader/BookReaderJSIA.php?{q}"))
    flat = [{'leafNum': p.get('leafNum'), 'pageNum': p.get('pageNum')}
            for spread in d['data']['brOptions']['data'] for p in spread]
    json.dump(flat, open(cache, 'w', encoding='utf-8'))
    return flat


# ---------- chunking (must equal astro_texts_index.passages) ----------

def chunk_starts(raw):
    """Char offsets (in raw.replace('\\r','')) where each 150-word chunk starts, plus the chunk texts."""
    text = raw.replace('\r', '')
    # astro_texts_index does re.sub(r'-\n(\w)', r'\1', text); rebuild that text while keeping an offset map
    out, omap, pos = [], [], 0
    for mm in re.finditer(r'-\n(?=\w)', text):
        out.append(text[pos:mm.start()]); omap.extend(range(pos, mm.start())); pos = mm.end()
    out.append(text[pos:]); omap.extend(range(pos, len(text)))
    proc = ''.join(out)
    starts, chunks = [], []
    # word offsets in proc, in order; paragraphs only split at whitespace, so words = \S+ runs
    offs = [(mm.start(), mm.group()) for mm in re.finditer(r'\S+', proc)]
    n_full = len(offs) // WORDS
    for i in range(n_full):
        starts.append(omap[offs[i * WORDS][0]])
        chunks.append(' '.join(w for _, w in offs[i * WORDS:(i + 1) * WORDS]))
    rest = offs[n_full * WORDS:]
    if len(rest) > 20:
        starts.append(omap[rest[0][0]]); chunks.append(' '.join(w for _, w in rest))
    return text, starts, chunks


def norm(w):
    return re.sub(r'[^0-9a-z]', '', w.lower())


# ---------- alignment ----------

def resolve_book(rec, db_chunks):
    ident = rec['id']
    m = meta(ident)
    prefix = book_prefix(rec)
    raw = open(f'{SRC}/{ident}.txt', encoding='utf-8', errors='replace').read()
    text, starts, chunks = chunk_starts(raw)
    if chunks != db_chunks:
        bad = next((i for i, (a, b) in enumerate(zip(chunks, db_chunks)) if a != b), min(len(chunks), len(db_chunks)))
        raise RuntimeError(f'{ident}: chunking differs from the DB at chunk {bad} ({len(chunks)} vs {len(db_chunks)})')

    # txt tokens -> normalized stream index
    raw_tok = [(mm.start(), norm(mm.group())) for mm in re.finditer(r'\S+', text)]
    tok_starts = [s for s, _ in raw_tok]
    t_norm, raw2norm = [], []
    for _, t in raw_tok:
        raw2norm.append(len(t_norm))
        if t:
            t_norm.append(t)

    pages = xml_pages(ident, prefix)
    x_norm, page_first = [], []
    for _, ws in pages:
        page_first.append(len(x_norm))
        x_norm.extend(t for t in (norm(w) for w in ws) if t)

    if t_norm == x_norm:
        method = 'exact'
        to_x = lambda i: i  # noqa: E731
    else:
        sm = difflib.SequenceMatcher(None, t_norm, x_norm, autojunk=True)
        blocks = [b for b in sm.get_matching_blocks() if b.size]
        matched = sum(b.size for b in blocks)
        method = f'aligned ({matched / max(1, len(t_norm)):.1%} of txt words matched)'
        a_starts = [b.a for b in blocks]

        def to_x(i):
            k = bisect.bisect_right(a_starts, i) - 1
            if k < 0:
                return blocks[0].b if blocks else 0
            b = blocks[k]
            if i < b.a + b.size:
                return b.b + (i - b.a)
            return blocks[k + 1].b if k + 1 < len(blocks) else b.b + b.size

    br = br_pages(ident, prefix, m)
    leaf2n = {p['leafNum']: n for n, p in enumerate(br)}
    same_leaves = [lf for lf, _ in pages] == [p['leafNum'] for p in br]

    multibook = is_multibook(m)
    base = DETAILS + ident + ('/' + urllib.parse.quote(prefix) if multibook else '')

    def page_of(xi):  # the last page whose first word is <= xi (skips pages without words)
        return bisect.bisect_right(page_first, min(xi, len(x_norm) - 1)) - 1

    def viewer_n(p_idx):
        n = leaf2n.get(pages[p_idx][0])
        return p_idx if n is None and same_leaves else n

    nis = []  # each chunk's first word, as an index into t_norm
    for off in starts:
        ri = bisect.bisect_left(tok_starts, off)
        nis.append(min(raw2norm[ri] if ri < len(raw2norm) else len(t_norm) - 1, len(t_norm) - 1))
    res, missing = {}, 0
    for ci, n0 in enumerate(nis):
        n1 = max(n0 + 1, nis[ci + 1] if ci + 1 < len(nis) else len(t_norm))  # chunk = t_norm[n0:n1]
        spans, off, cur = [], 0, None  # [alnum offset in the chunk, page index, word index]
        for i in range(n0, n1):
            p = page_of(to_x(i))
            if p != cur:
                spans.append([off, p, i]); cur = p
            off += len(t_norm[i])
        k0 = 1 if len(spans) > 1 and spans[1][2] - n0 < FOOT_WORDS else 0
        n = viewer_n(spans[k0][1])
        if n is None:
            missing += 1
            res[str(ci)] = {'leaf': None, 'url': DETAILS + ident}
            continue
        e = {'leaf': n, 'url': f'{base}/page/n{n}/mode/1up'}
        pn = br[n].get('pageNum')
        if pn not in (None, '', 'n/a'):
            e['page'] = str(pn)
        if len(spans) > 1:
            e['leaf_end'] = viewer_n(spans[-1][1])
            e['breaks'] = [[o, viewer_n(p)] for o, p, _ in spans]
        res[str(ci)] = e
    info = {'method': method, 'chunks': len(starts), 'resolved': len(starts) - missing,
            'xml_pages': len(pages), 'viewer_pages': len(br), 'leaves_match': same_leaves,
            'multibook': multibook, 'book': prefix}
    return res, info


def build():
    os.makedirs(CACHE, exist_ok=True)
    recs = [r for r in json.load(open(f'{SRC}/texts.json', encoding='utf-8')) if 'chars' in r]
    conn = sqlite3.connect(DB)
    out, report = {}, {}
    for rec in recs:
        ident = rec['id']
        db_chunks = [t for (t,) in conn.execute(
            'SELECT text FROM passages WHERE video_id=? ORDER BY start', (ident,))]
        print('==', ident, len(db_chunks), 'passages', flush=True)
        try:
            res, info = resolve_book(rec, db_chunks)
        except Exception as e:  # noqa: BLE001  fallback: the book's details page, no q
            res = {str(i): {'leaf': None, 'url': DETAILS + ident} for i in range(len(db_chunks))}
            info = {'method': f'FALLBACK: {e}', 'chunks': len(db_chunks), 'resolved': 0}
        out[ident] = res
        report[ident] = info
        print('  ', json.dumps(info), flush=True)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(report, open(f'{CACHE}/coverage.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('wrote', OUT)


# ---------- import API ----------

_MAP = None


def alnum(s):
    return re.sub(r'[^0-9a-z]', '', s.lower())


def page_entry(book_id, chunk_index):
    """The full record {leaf, url, leaf_end?, breaks?, page?} or None."""
    global _MAP
    if _MAP is None:
        try:
            _MAP = json.load(open(OUT, encoding='utf-8'))
        except FileNotFoundError:
            _MAP = {}
    return _MAP.get(book_id, {}).get(str(int(chunk_index)))


def page_url(book_id, chunk_index, at=None):
    """Viewer URL of the page where passage `chunk_index` of `book_id` is.
    at: optional piece of that passage's text (e.g. the first words of a window cut from it, OCR
        hyphens/whitespace cleaned or not). For a passage that runs over two pages, the link then
        goes to the page where that piece starts. Needs the local index DB to read the passage.
    Falls back to the book's details page (no q) when the page is unknown."""
    e = page_entry(book_id, chunk_index)
    if not e:
        return DETAILS + book_id
    if at and e.get('breaks'):
        row = None
        try:
            with sqlite3.connect(DB) as conn:
                row = conn.execute('SELECT text FROM passages WHERE video_id=? AND start=?',
                                   (book_id, int(chunk_index))).fetchone()
        except sqlite3.Error:
            pass
        needle = alnum(at)[:60]
        c = alnum(row[0]).find(needle) if row and needle else -1
        if c >= 0:
            br = e['breaks']
            k = max(j for j, (o, _) in enumerate(br) if o <= c)
            if k + 1 < len(br) and br[k + 1][0] - c < FOOT_WORDS * 4:  # ~ the last few words of a page
                k += 1
            if br[k][1] is not None:
                return re.sub(r'/page/n\d+/', f'/page/n{br[k][1]}/', e['url'])
    return e['url']


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'build':
        build()
    elif len(sys.argv) in (4, 5) and sys.argv[1] == 'url':
        print(page_url(sys.argv[2], int(sys.argv[3]), at=sys.argv[4] if len(sys.argv) == 5 else None))
    else:
        print(__doc__)
