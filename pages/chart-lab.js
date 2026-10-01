/* pages/chart-lab.js — the chart lab mock-up: one chart, read through the schools, in four modes.

   Reads only this site's own files:
     grammars/astrology-schools/grammar.json     the schools, their families, the rulership sets
     grammars/the-structure-of-the-sky/grammar.json   traditional + modern rulers, dignities
     grammars/esoteric-bailey-paraphrase/grammar.json Bailey's Tabulation VI rulers (facts, attributed)
     mock-data/passages.json                     the retrieval shelf (scripts/build_chart_lab_passages.py)
     mock-data/example-chart.json                an invented, public-safe chart (tropical, sidereal, 90 days)
   and, only when served from localhost, the owner's private files (gitignored, never committed):
     mock-data/my-chart.local.json, my-sidereal.local.json, my-transits.local.json, my-readings.local.json
   ?chart=example skips the private files.

   ?from=viewer: a chart handed over by the calculator (viewer/astrology-viewer.html, "Open in Chart
   Lab"). The calculator sends only positions (planets, angles, house cusps, the ayanamsa it used),
   never a birth date, time or place, by postMessage to this tab (the two pages live on different
   origins in production); this page keeps it in sessionStorage for reloads and computes the rest
   itself: aspects, figures, the sidereal chart, rulers and chains, and, if the chart server answers,
   90 days of transits (api/transit-timeline, sent the same positions).

   The chart dropdown (Sep 30 2026), reflected in ?chart=:
     saved:<id>   one of your saved charts on recursive.eco (user_documents, tool_slug birth-chart). Signed
                  in on the shared .recursive.eco cookie, the page loads supabase-js (pinned), viewer/config.js
                  and viewer/assets/js/auth-init.js as the calculator does, lists your rows (id and name only),
                  reads the picked row under RLS, and POSTs its birth data to chart.recursive.eco
                  api/calculate-chart (tropical and sidereal), then api/transit-timeline (positions only) for
                  Today. Only the id is ever in the URL. No recursive-eco change.
     public:<id>  mock-data/public-charts.json: AI events and public figures, each with its source and, for
                  people, the Astro-Databank rating. A chart with no documented time has no houses, Ascendant
                  or Midheaven, and the page leaves out every reading that needs them, and says why. Today is
                  left out for public charts: nothing here forecasts anything about anyone.
     example      the invented example.   local   (localhost only) the owner's local files, as before.
   ?stubauth=1 (localhost only, ignored elsewhere): a stub Supabase client with invented rows, to exercise
   the saved-charts code path off recursive.eco.

   Two ways out, both only on a click: "Interpret with AI" (by the wheel for the whole chart, and on each
   selection) shows the message in an edit box first, and "Send to the assistant" hands it to the shared
   recursive.eco assistant (../assistant.js) by postMessage, or, where recursive.eco does not answer
   that, types it into the assistant's chat box for the reader to send; "Ask the assistant to build my
   grammar" opens the assistant with a request for a PRIVATE grammar, sent only when they tap Send there.
   There is no direct save from this page. ../ids.json gives the switched-on schools' public grammar ids
   to the assistant's page context.

   URL: ?mode=ask|today|lens|book  ?schools=slug,slug (mirrors tarot's ?decks=)  ?rulers=traditional|modern|
   esoteric|colour  ?zodiac=tropical|sidereal  ?sel=planet:mars|figure:0|house:5  ?day=YYYY-MM-DD  ?q=...

   Wording rule: every reading is a possibility ("this could mean X; it could also mean Y; what does it
   mean to you?"), every reading carries its school label and its source, nothing is stated as fate. */
(function () {
  'use strict';

  // ───────────────────────── helpers ─────────────────────────
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  const low = s => String(s || '').toLowerCase().replace(/^the\s+/, '').trim();
  const n360 = x => ((x % 360) + 360) % 360;
  const ord = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const trim = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n); return c.slice(0, c.lastIndexOf(' ')) + ' …'; };
  const VS = '︎';   // text presentation: glyphs never render as colour emoji
  async function getJSON(url) {
    try { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); }
    catch (e) { return null; }
  }

  // ───────────────────────── constants ─────────────────────────
  const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const BODIES = PLANETS.concat(['chiron', 'northnode', 'southnode']);
  const NAME = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
    uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', chiron: 'Chiron', northnode: 'North Node', southnode: 'South Node',
    ascendant: 'Ascendant', midheaven: 'Midheaven', vulcan: 'Vulcan', earth: 'Earth', vesta: 'Vesta' };
  const GLYPH = { sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆',
    pluto: '♇', chiron: '⚷', northnode: '☊', southnode: '☋', earth: '♁' };
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const SIGN_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const ELEM = ['fire', 'earth', 'air', 'water'];
  const MODE3 = ['cardinal', 'fixed', 'mutable'];
  const elementOf = s => ELEM[SIGNS.indexOf(s) % 4];
  const modalityOf = s => MODE3[SIGNS.indexOf(s) % 3];
  const polarityOf = s => (SIGNS.indexOf(s) % 2 === 0 ? 'masculine' : 'feminine');
  const signAt = lon => SIGNS[Math.floor(n360(lon) / 30)];
  const WEIGHT = { sun: 9, moon: 7, ascendant: 5, mercury: 5, venus: 5, mars: 5, jupiter: 3, saturn: 3, uranus: 1, neptune: 1, pluto: 1, chiron: 1 };
  const PERSONAL = new Set(['sun', 'moon', 'mercury', 'venus', 'mars']);
  const SOCIAL = new Set(['jupiter', 'saturn']);
  const SLOW = new Set(['uranus', 'neptune', 'pluto', 'chiron']);
  const ANGLE = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180, quincunx: 150 };
  const AKIND = {
    personal: 'Personal with personal',
    mixed: 'Personal with slower (the slower planet acts on the personal one)',
    slow: 'Slow with slow (shared by many people born near this time)',
    point: 'To a point (Ascendant, Midheaven, the nodes)',
  };
  // the planet is the function, the sign qualifies it, the house says where (the method's rule)
  const FUNC = { sun: 'conscious purpose', moon: 'needs and instinct', mercury: 'thinking and exchange', venus: 'valuing and relating',
    mars: 'drive and defence', jupiter: 'growth and meaning', saturn: 'form and limits', uranus: 'change and awakening',
    neptune: 'longing and dissolving', pluto: 'depth and transformation', chiron: 'the wound that teaches',
    northnode: 'the direction you lean toward', southnode: 'what is already familiar', ascendant: 'the way you meet the world',
    midheaven: 'your public path' };
  const VERB = { Aries: 'I am', Taurus: 'I have', Gemini: 'I think', Cancer: 'I feel', Leo: 'I will', Virgo: 'I analyse',
    Libra: 'I balance', Scorpio: 'I desire', Sagittarius: 'I aspire', Capricorn: 'I use', Aquarius: 'I know', Pisces: 'I believe' };
  const AREA = ['self, body and first impressions', 'resources and what you value', 'talk, siblings and nearby places', 'home, roots and family',
    'play, creation and children', 'work, health and daily care', 'partners and open others', 'shared resources, depth and endings',
    'travel, belief and study', 'vocation and public life', 'friends, groups and hopes', 'retreat, the hidden and the unconscious'];
  const NATURE = { conjunction: 'a blend', opposition: 'a see-saw', square: 'friction asking for action', trine: 'an easy flow',
    sextile: 'an opening', quincunx: 'an awkward adjustment' };
  // Today: title + note templates (mock wording)
  const TT = { pluto: 'Depth', neptune: 'The tide', uranus: 'A jolt', saturn: 'Time', jupiter: 'Widening', chiron: 'The healer',
    northnode: 'The path', mars: 'Heat', sun: 'Light', venus: 'Tenderness', mercury: 'A message', moon: 'A mood' };
  const AV = { conjunction: 'meets', opposition: 'faces', square: 'presses on', trine: 'flows toward', sextile: 'opens a door to' };
  const NT = { sun: 'your purpose', moon: 'your needs', mercury: 'your mind', venus: 'what you love', mars: 'your drive',
    jupiter: 'your faith', saturn: 'your structures', uranus: 'your restlessness', neptune: 'your dreams', pluto: 'your depths',
    chiron: 'an old wound', northnode: 'your direction', ascendant: 'the way you meet the world', midheaven: 'your public path' };
  const AX = { conjunction: 'blending with', opposition: 'pulling against', square: 'pressing on', trine: 'moving easily with', sextile: 'offering an opening to' };
  const AY = { conjunction: 'a fresh start in that part of life, hard to see from inside', opposition: 'meeting this in someone else before noticing it in yourself',
    square: 'effort that slowly builds something', trine: 'a gift that is easy to take for granted', sextile: 'a small chance that only counts if taken up' };
  const BODYW = { pluto: 10, neptune: 9, uranus: 8, saturn: 7, chiron: 6, jupiter: 5, northnode: 4, mars: 3.5, sun: 3, venus: 2.5, mercury: 2 };

  // fallbacks, used only if a grammar fails to load (the grammars are the source)
  const FALLBACK_TRAD = { Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon', Leo: 'sun', Virgo: 'mercury', Libra: 'venus',
    Scorpio: 'mars', Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter' };
  const FALLBACK_MOD = Object.assign({}, FALLBACK_TRAD, { Scorpio: 'pluto', Aquarius: 'uranus', Pisces: 'neptune' });
  const SETS = [
    { id: 'rulers-traditional', short: 'traditional', label: 'Traditional (the seven visible planets)' },
    { id: 'rulers-modern', short: 'modern', label: 'Modern (outer planets added)' },
    { id: 'rulers-bailey-esoteric', short: 'esoteric', label: 'Esoteric (Bailey school, the esoteric column)' },
    { id: 'rulers-colour-system', short: 'colour', label: 'Colour-horoscope notes (Vesta, Chiron)' },
  ];
  const UNCOMPUTED = { vulcan: 'Vulcan was proposed in 1859 and never found: a symbol with no position, so the chain pauses here.',
    vesta: 'Vesta is an asteroid this mock does not compute, so the chain pauses here.' };

  // ───────────────────────── state ─────────────────────────
  const S = {
    schools: [], schoolBy: {}, families: {}, passages: [], byKey: new Map(),
    RULERS: {}, BAILEY: {}, DIGN: {},
    charts: { tropical: null, sidereal: null }, transits: null, readings: null, readById: new Map(),
    source: 'example', exampleNote: '', gids: {}, gidsPublic: new Set(),
    zodiac: 'tropical', mode: 'lens', on: new Set(), rulers: 'rulers-traditional', sel: null, dayIdx: 0, q: '', synBy: 'link',
  };
  let CH = null;          // the chart on the wheel (tropical or sidereal)
  let WHEEL = null;
  let IDX = null;         // BM25 index, built on first ask
  let bookObserver = null;

  // ───────────────────────── chart model ─────────────────────────
  function normChart(raw) {
    if (!raw || !raw.points) return null;
    const pts = {};
    for (const k of (raw.order || Object.keys(raw.points))) {
      const p = raw.points[k]; if (!p) continue;
      pts[k] = { key: k, name: p.name || NAME[k], lon: +p.longitude, sign: p.sign, deg: p.degreeInSign, pos: p.position, house: p.house,
        retro: !!p.retrograde, speed: p.speedDegPerDay, nak: p.nakshatra || null, placidusHouse: p.placidusHouse,
        approx: !!p.approximate, dayRange: Array.isArray(p.dayRange) ? p.dayRange : null };
    }
    const A = raw.angles || {};
    const ang = a => a ? { lon: +a.longitude, sign: a.sign, pos: a.position, nak: a.nakshatra || null } : null;
    return {
      zodiac: raw.zodiac || 'tropical', houseSystem: raw.houseSystem, pts, asc: ang(A.ascendant), mc: ang(A.midheaven),
      houses: (raw.houses || []).map(h => ({ n: h.house, cusp: +h.cusp, sign: h.sign, pos: h.position })),
      aspects: (raw.aspects || []).map(a => ({ a: a.a, b: a.b, type: a.aspect, orb: a.orb, applying: a.applying, outOfSign: !!a.outOfSign, pt: !!a.involvesPoint })),
      figures: raw.figures || [], ayan: raw.ayanamsa || null, housesNote: raw.housesNote || '', orbsNote: raw.orbs && raw.orbs.note,
    };
  }
  // ───────────────────────── a chart handed over by the calculator: computed here ─────────────────────────
  // The rules are the ones the example chart was built with (and they say so in orbs.note): the engine's
  // own planet orbs, tighter orbs for points, the South Node by conjunction only, Ascendant-Midheaven
  // left out as the frame. Figures: T-squares, grand crosses, grand trines, kites, yods, mystic
  // rectangles, and stelliums (3+ of the ten planets in one sign or one house).
  const HANDOFF_KIND = 'recursive-astrology-chart';
  const HANDOFF_KEY = 'chart-lab:viewer-chart';
  const POINT_LIKE = new Set(['chiron', 'northnode', 'southnode', 'ascendant', 'midheaven']);
  const ORBS_PLANET = { conjunction: 8, opposition: 8, square: 8, trine: 8, sextile: 6 };
  const ORBS_POINT = { conjunction: 5, opposition: 5, square: 5, trine: 5, sextile: 3 };
  const ASPECT_DEFS = [['conjunction', 0, 0], ['sextile', 60, 2], ['square', 90, 3], ['trine', 120, 4], ['opposition', 180, 6]];
  const QUINCUNX_ORB = 3;
  const FIG_SET = PLANETS.concat(['chiron', 'northnode', 'ascendant', 'midheaven']);
  const w180 = x => n360(x + 180) - 180;
  const NAKS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
    'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
    'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const NAK_LORDS = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'];
  function nakshatra(lon) {
    const span = 360 / 27, x = n360(lon), i = Math.floor(x / span);
    return { name: NAKS[i], number: i + 1, pada: Math.floor((x - i * span) / (span / 4)) + 1, lord: NAK_LORDS[i % 9] };
  }
  function posText(lon) {
    const x = n360(lon), d = x % 30, deg = Math.floor(d), min = Math.floor((d - deg) * 60);
    return `${deg}° ${signAt(x)} ${String(min).padStart(2, '0')}'`;
  }
  function aspectBetween(k1, l1, k2, l2) {
    const orbs = POINT_LIKE.has(k1) || POINT_LIKE.has(k2) ? ORBS_POINT : ORBS_PLANET;
    const sep = Math.abs(w180(l2 - l1));
    for (const [name, angle, apart] of ASPECT_DEFS) { const orb = Math.abs(sep - angle); if (orb <= orbs[name]) return { name, angle, orb, apart }; }
    return null;
  }
  function computeAspects(lons, speeds) {
    const keys = FIG_SET.filter(k => lons[k] != null), rows = [];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j];
      if ((a === 'ascendant' && b === 'midheaven') || (a === 'midheaven' && b === 'ascendant')) continue;
      const hit = aspectBetween(a, lons[a], b, lons[b]); if (hit) rows.push([a, b, hit]);
    }
    if (lons.southnode != null) for (const a of keys) {
      if (a === 'northnode') continue;
      const hit = aspectBetween(a, lons[a], 'southnode', lons.southnode);
      if (hit && hit.name === 'conjunction') rows.push([a, 'southnode', hit]);
    }
    return rows.map(([a, b, h]) => {
      const va = speeds[a], vb = speeds[b];
      let applying = null;
      if (va != null && vb != null) {
        const diff = w180(lons[b] - lons[a]), sep = Math.abs(diff);
        const dsep = diff !== 0 ? Math.sign(diff) * (vb - va) : 0;
        applying = (sep !== h.angle ? Math.sign(sep - h.angle) * dsep : 0) < 0;
      }
      let dist = Math.abs(Math.floor(n360(lons[a]) / 30) - Math.floor(n360(lons[b]) / 30)) % 12; dist = Math.min(dist, 12 - dist);
      return { a, b, aspect: h.name, angle: h.angle, orb: Math.round(h.orb * 100) / 100, applying, outOfSign: dist !== h.apart,
        involvesPoint: POINT_LIKE.has(a) || POINT_LIKE.has(b) };
    }).sort((x, y) => x.orb - y.orb);
  }
  function combos(arr, k) {
    const out = [], pick = (s, acc) => { if (acc.length === k) { out.push(acc.slice()); return; } for (let i = s; i < arr.length; i++) { acc.push(arr[i]); pick(i + 1, acc); acc.pop(); } };
    pick(0, []); return out;
  }
  function computeFigures(lons, aspects, houseOfPlanet) {
    const look = new Map(aspects.map(r => [[r.a, r.b].sort().join('|'), r]));
    const kind = (a, b) => { const r = look.get([a, b].sort().join('|')); return r ? r.aspect : null; };
    const orbOf = (a, b) => { const r = look.get([a, b].sort().join('|')); return r ? r.orb : null; };
    const quinc = (a, b) => Math.abs(Math.abs(w180(lons[a] - lons[b])) - 150) <= QUINCUNX_ORB;
    const keys = FIG_SET.filter(k => lons[k] != null);
    const shared = (ms, fn) => { const v = new Set(ms.map(m => fn(signAt(lons[m])))); return v.size === 1 ? [...v][0] : 'mixed'; };
    const finish = (fig, pairs, q) => {
      const orbs = pairs.map(([a, b]) => orbOf(a, b)).filter(x => x != null);
      if (fig.quincunxes) fig.quincunxes.forEach(([a, b]) => orbs.push(Math.round(Math.abs(Math.abs(w180(lons[a] - lons[b])) - 150) * 100) / 100));
      fig.maxOrb = orbs.length ? Math.max(...orbs) : null;
      fig.allPlanets = fig.members.every(m => PLANETS.includes(m));
      if (q) fig.quality = shared(fig.members, q);
      return fig;
    };
    const figs = [];
    for (const [a, b] of combos(keys, 2)) {
      if (kind(a, b) !== 'opposition') continue;
      for (const c of keys) if (c !== a && c !== b && kind(a, c) === 'square' && kind(b, c) === 'square')
        figs.push(finish({ type: 'T-square', members: [a, b, c], apex: c, opposition: [a, b] }, [[a, b], [a, c], [b, c]], modalityOf));
    }
    const crosses = [];
    for (const q of combos(keys, 4)) {
      const ks = combos(q, 2).map(([x, y]) => kind(x, y));
      if (ks.filter(x => x === 'opposition').length === 2 && ks.filter(x => x === 'square').length === 4) {
        crosses.push(new Set(q)); figs.push(finish({ type: 'grand cross', members: q.slice() }, combos(q, 2), modalityOf));
      }
    }
    figs.forEach(f => { if (f.type === 'T-square' && crosses.some(c => f.members.every(m => c.has(m)))) f.partOfGrandCross = true; });
    const trines = [];
    for (const t of combos(keys, 3)) if (combos(t, 2).every(([x, y]) => kind(x, y) === 'trine')) {
      trines.push(t); figs.push(finish({ type: 'grand trine', members: t.slice() }, combos(t, 2), elementOf));
    }
    for (const t of trines) for (const d of keys) {
      if (t.includes(d)) continue;
      for (const x of t) {
        const others = t.filter(y => y !== x);
        if (kind(d, x) === 'opposition' && others.every(y => kind(d, y) === 'sextile'))
          figs.push(finish({ type: 'kite', members: t.concat([d]), grandTrine: t.slice(), fourth: d, apex: x }, combos(t, 2).concat([[d, x]], others.map(y => [d, y]))));
      }
    }
    for (const [a, b] of combos(keys, 2)) {
      if (kind(a, b) !== 'sextile') continue;
      for (const c of keys) if (c !== a && c !== b && quinc(a, c) && quinc(b, c))
        figs.push(finish({ type: 'yod', members: [a, b, c], apex: c, sextile: [a, b], quincunxes: [[a, c], [b, c]] }, [[a, b]]));
    }
    for (const q of combos(keys, 4)) {
      const ks = combos(q, 2).map(([x, y]) => kind(x, y));
      if (ks.filter(x => x === 'opposition').length === 2 && ks.filter(x => x === 'trine').length === 2 && ks.filter(x => x === 'sextile').length === 2)
        figs.push(finish({ type: 'mystic rectangle', members: q.slice() }, combos(q, 2)));
    }
    const bySign = {};
    for (const p of PLANETS) if (lons[p] != null) (bySign[signAt(lons[p])] = bySign[signAt(lons[p])] || []).push(p);
    for (const [where, ms] of Object.entries(bySign)) if (ms.length >= 3)
      figs.push({ type: 'stellium', scope: 'sign', where, members: ms, alsoThere: ['chiron', 'northnode', 'southnode'].filter(k => lons[k] != null && signAt(lons[k]) === where),
        allPlanets: true, note: '3+ planets; some traditions ask 4+' });
    const byHouse = {};
    for (const p of PLANETS) { const h = houseOfPlanet(p); if (h) (byHouse[h] = byHouse[h] || []).push(p); }
    for (const [h, ms] of Object.entries(byHouse).sort((x, y) => x[0] - y[0])) if (ms.length >= 3)
      figs.push({ type: 'stellium', scope: 'house', where: +h, members: ms, allPlanets: true, note: '3+ planets; some traditions ask 4+' });
    return figs;
  }
  const ORB_NOTE = "Computed in this page from the chart's positions (handed over by the calculator, or recomputed from a saved chart by the chart server). Planet-to-planet orbs are the recursive-astrology engine's own (api/calculate_chart.py): 8° (sextile 6°); when either member is Chiron, a node, the Ascendant or the Midheaven, 5° (sextile 3°). The South Node takes conjunctions only. Ascendant-Midheaven is the frame, not an aspect. Applying or separating is shown only where speeds are known.";
  // one zodiac's chart, in the shape normChart reads (the same shape as mock-data/example-chart.json)
  function rawFromLongitudes({ lons, retro, speeds, cusps, zodiac, houseSystem, ayan, housesNote, placidusOf }) {
    const houseOf = lon => {
      for (let i = 0; i < 12; i++) { const a = cusps[i], b = cusps[(i + 1) % 12]; if (n360(lon - a) < n360(b - a)) return i + 1; }
      return 1;
    };
    const sid = zodiac === 'sidereal';
    const order = BODIES.filter(k => lons[k] != null);
    const points = {};
    for (const k of order) {
      points[k] = { key: k, name: NAME[k], longitude: lons[k], sign: signAt(lons[k]), degreeInSign: n360(lons[k]) % 30, position: posText(lons[k]),
        house: houseOf(lons[k]), retrograde: !!retro[k], speedDegPerDay: speeds[k] != null ? speeds[k] : null };
      if (sid) { points[k].nakshatra = nakshatra(lons[k]); if (placidusOf) points[k].placidusHouse = placidusOf(k); }
    }
    const angle = lon => lon == null ? null : Object.assign({ longitude: lon, sign: signAt(lon), degreeInSign: n360(lon) % 30, position: posText(lon) }, sid ? { nakshatra: nakshatra(lon) } : {});
    const allLons = Object.assign({}, lons, { ascendant: lons.ascendant, midheaven: lons.midheaven });
    const aspects = computeAspects(allLons, speeds);
    const figures = computeFigures(allLons, aspects, p => points[p] && points[p].house);
    return {
      zodiac, houseSystem, order, points, angles: { ascendant: angle(lons.ascendant), midheaven: angle(lons.midheaven) },
      houses: cusps.map((c, i) => ({ house: i + 1, cusp: c, sign: signAt(c), position: posText(c) })),
      aspects, figures, ayanamsa: ayan || null, housesNote: housesNote || '', orbs: { note: ORB_NOTE },
    };
  }
  // the calculator's hand-over -> { tropical, sidereal } (either zodiac can arrive; the other is derived)
  function chartsFromHandoff(v) {
    if (!v || v.kind !== HANDOFF_KIND || !v.points || !v.angles || !Array.isArray(v.cusps) || v.cusps.length !== 12) return null;
    const ay = v.ayanamsa && typeof v.ayanamsa.degrees === 'number' ? v.ayanamsa.degrees : null;
    const fromSid = v.zodiac === 'sidereal';
    if (fromSid && ay == null) return null;
    const toTrop = x => fromSid ? n360(x + ay) : n360(x);
    const lonsT = {}, retro = {}, speeds = {};
    for (const [k0, p] of Object.entries(v.points)) {
      const k = String(k0).toLowerCase().replace(/[\s_-]/g, '');
      if (!BODIES.includes(k) || !p || typeof p.longitude !== 'number') continue;
      lonsT[k] = toTrop(p.longitude); retro[k] = !!p.retrograde; if (typeof p.speed === 'number') speeds[k] = p.speed;
    }
    if (!PLANETS.every(k => lonsT[k] != null)) return null;
    lonsT.ascendant = toTrop(+v.angles.ascendant); lonsT.midheaven = toTrop(+v.angles.midheaven);
    const cuspsT = v.cusps.map(c => toTrop(+c));
    const hs = String(v.houseSystem || 'placidus');
    const tropical = rawFromLongitudes({ lons: lonsT, retro, speeds, cusps: cuspsT, zodiac: 'tropical', houseSystem: hs });
    let sidereal = null;
    if (ay != null) {
      const lonsS = {}; for (const k in lonsT) lonsS[k] = n360(lonsT[k] - ay);
      const ascSign = Math.floor(lonsS.ascendant / 30);
      const whole = Array.from({ length: 12 }, (_, i) => ((ascSign + i) % 12) * 30);
      const label = v.ayanamsa.label || (v.ayanamsa.name ? cap(String(v.ayanamsa.name)) : 'Lahiri');
      sidereal = rawFromLongitudes({ lons: lonsS, retro, speeds, cusps: whole, zodiac: 'sidereal', houseSystem: 'whole-sign',
        ayan: { name: v.ayanamsa.name || 'lahiri', label, degrees: ay },
        housesNote: `Whole-sign houses from the sidereal Ascendant (computed in this page); the ${hs} house of each planet is kept as a note.`,
        placidusOf: k => tropical.points[k] && tropical.points[k].house });
    }
    return { tropical, sidereal };
  }
  // the calculator hands the chart to this tab by postMessage; kept in sessionStorage so a reload keeps it
  const VIEWER_ORIGIN = o => o === location.origin || o === 'https://chart.recursive.eco' || /^https:\/\/recursive-astrology[a-z0-9-]*\.vercel\.app$/.test(o);
  // (same origin, e.g. localhost: the calculator also leaves it in sessionStorage, which a tab it opens
  // starts with a copy of). ?h= is the hand-over's one-time nonce: only that hand-over is taken.
  function receiveHandoff(nonce) {
    const fits = v => v && v.kind === HANDOFF_KIND && (!nonce || v.nonce === nonce);
    let v = null;
    try { v = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || 'null'); } catch (e) { v = null; }
    if (fits(v)) return Promise.resolve(v);
    const op = window.opener;
    if (!op) return Promise.resolve(null);
    return new Promise(resolve => {
      let timer = null;
      const done = x => { window.removeEventListener('message', on); clearTimeout(timer); resolve(x); };
      const on = e => {
        if (e.source !== op || !VIEWER_ORIGIN(e.origin)) return;
        const d = e.data;
        if (!d || d.type !== 'chart-lab:chart' || !fits(d.chart)) return;
        try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(d.chart)); } catch (err) { /* private mode: this visit only */ }
        done(d.chart);
      };
      window.addEventListener('message', on);
      timer = setTimeout(() => done(null), 6000);
      // the "ready" ping carries nothing, so it may go to any origin; the chart only comes back from an allowed one
      try { op.postMessage({ type: 'chart-lab:ready' }, '*'); } catch (e) { done(null); }
    });
  }

  // ───────────────────────── transits for a handed-over chart (the chart server, on request) ─────────────────────────
  // POST /api/transit-timeline with the natal POSITIONS only (no birth data): a daily series of the
  // transiting bodies over 90 days from today, plus the exact hits. Built into the same shape as the
  // example's transits90d, so Today and the Book's season chapter work unchanged.
  const TRANSIT_API = () => (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? '' : 'https://chart.recursive.eco') + '/api/transit-timeline';
  const TR_BODIES = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northnode'];
  const TR_NATAL = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northnode', 'ascendant', 'midheaven'];
  async function transitsFor(raw) {
    const day0 = new Date().toLocaleDateString('en-CA'), N = 90;
    const addDays = (s, n) => new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
    const natalLon = {};
    for (const k of TR_NATAL) { const lon = k === 'ascendant' ? raw.angles.ascendant && raw.angles.ascendant.longitude : k === 'midheaven' ? raw.angles.midheaven && raw.angles.midheaven.longitude : raw.points[k] && raw.points[k].longitude; if (lon != null) natalLon[k] = lon; }
    let res = null;
    try {
      const r = await fetch(TRANSIT_API(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        natal: { points: natalLon, houses: raw.houses.map(h => h.cusp), zodiac: 'tropical' }, natalPoints: Object.keys(natalLon),
        start: day0 + 'T12:00:00Z', end: addDays(day0, N - 1) + 'T12:00:00Z', includeSeries: true, seriesPoints: N, orb: 1,
        stations: true, signIngresses: true, houseIngresses: false }) });
      if (!r.ok) return null;
      res = await r.json();
    } catch (e) { return null; }
    const ser = res && res.series && res.series.bodies; if (!ser) return null;
    const dates = Array.from({ length: N }, (_, i) => addDays(day0, i));
    const hits = (res.hits || []).filter(h => h.kind === 'aspect' || h.exact);
    const spans = [], byDay = dates.map(() => []);
    for (const b of TR_BODIES) {
      const s = ser[b]; if (!s || !s.longitude) continue;
      for (const n of Object.keys(natalLon)) for (const [asp, ang] of ASPECT_DEFS.map(x => [x[0], x[1]])) {
        const orbAt = i => Math.abs(Math.abs(w180(s.longitude[i] - natalLon[n])) - ang);
        let i = 0;
        while (i < N) {
          if (orbAt(i) > 1) { i++; continue; }
          const a0 = i; while (i < N && orbAt(i) <= 1) i++;
          const a1 = i - 1;
          const ex = hits.filter(h => h.transiting === b && h.natal === n && h.aspect === asp && h.exact && h.exact.slice(0, 10) >= addDays(dates[a0], -1) && h.exact.slice(0, 10) <= addDays(dates[a1], 1))
            .map(h => ({ utc: h.exact.slice(0, 10), local: h.exact.slice(0, 10) }));
          const label = `${nm(b)} ${asp} natal ${nm(n)}`;
          const weight = Math.round(((BODYW[b] || 1) * (1 + (a1 - a0 + 1) / 30)) * 10) / 10;
          spans.push({ transiting: b, natal: n, aspect: asp, label, firstDay: dates[a0], lastDay: dates[a1], exacts: ex, weight });
          for (let d = a0; d <= a1; d++) {
            const orb = orbAt(d), next = d + 1 < N ? orbAt(d + 1) : orb;
            byDay[d].push({ transiting: b, natal: n, aspect: asp, label, orb: Math.round(orb * 100) / 100, applying: next < orb,
              exactToday: ex.some(e => e.utc === dates[d]), exacts: ex, transitingSign: signAt(s.longitude[d]), lon: s.longitude[d],
              transitingRetrograde: !!(s.retrograde && s.retrograde[d]), score: Math.round(((BODYW[b] || 1) * (1.5 - orb)) * 100) / 100 });
          }
        }
      }
    }
    const evs = dates.map(() => []);
    const dayIdx = iso => dates.indexOf(String(iso || '').slice(0, 10));
    for (const ev of (res.stations || []).concat(res.ingresses || [])) {
      const i = dayIdx(ev.datetime); if (i < 0 || !ev.transiting) continue;
      evs[i].push({ transiting: ev.transiting, label: ev.label || (ev.kind === 'station' ? `${nm(ev.transiting)} stations ${ev.station || ''}` : `${nm(ev.transiting)} enters ${ev.to || ''}`).trim() });
    }
    return {
      window: { startDate: dates[0], endDate: dates[N - 1], days: N },
      config: { orb: 1, scoring: { intent: 'slow planets first, then exactness' },
        note: 'Computed from the chart server (api/transit-timeline), sent this chart\'s positions only. A calendar of geometry, not a forecast.' },
      spans: spans.sort((a, b) => b.weight - a.weight),
      days: dates.map((date, i) => ({ date, top3: byDay[i].sort((a, b) => b.score - a.score).slice(0, 6), events: evs[i] })),
      computed: true,
    };
  }

  // ───────────────────────── the chart dropdown: public charts, your saved charts ─────────────────────────
  const ON_LOCALHOST = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const ON_RECURSIVE = /(^|\.)recursive\.eco$/.test(location.hostname);
  const CHART_API = () => (ON_LOCALHOST ? '' : 'https://chart.recursive.eco') + '/api/calculate-chart';
  const SIGN_IN_URL = 'https://flow.recursive.eco/?signin=1';
  // supabase-js, pinned with its SRI hash (the calculator loads @2, which resolved to 2.117.2 on Sep 30 2026)
  const SUPABASE_JS = { src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.min.js',
    integrity: 'sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF' };
  // Astro-Databank's Rodden ratings, in a few words
  const RATING = { AA: 'a birth record', A: 'from memory', B: 'a biography', C: 'no source given', DD: 'conflicting sources', X: 'no time recorded', XX: 'date in question' };
  // a person with no Astro-Databank entry says so, and where the date came from, rather than showing no rating at all
  const ratingText = c => c.rating ? `Astro-Databank rating ${c.rating}${RATING[c.rating] ? ': ' + RATING[c.rating] : ''}`
    : `no Astro-Databank entry, so no Rodden rating; date and place from ${hostOf(c.source_url)}${c.time_known ? '' : ', no birth time'}`;
  const ratingShort = c => c.rating ? `Astro-Databank ${c.rating}` : 'no Rodden rating';
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'source'; } };
  const yearOf = c => (/\b(\d{4})\b/.exec(c.date_label || '') || [])[1] || '';
  const dayOf = c => { const m = /(\d{1,2}) ([A-Za-z]+) (\d{4})/.exec(c.date_label || ''); const t = m ? Date.parse(`${m[2]} ${m[1]}, ${m[3]} UTC`) : NaN; return isNaN(t) ? Infinity : t; };
  const surname = c => String(c.label || '').trim().split(/\s+/).pop();
  const pubLabel = c => c.group === 'event' ? `${c.label} (${yearOf(c)}${c.time_known ? '' : ', time unknown'})` : `${c.label}${c.time_known ? '' : ' (no birth time)'}`;
  const isEvent = () => !!(S.pub && S.pub.group === 'event');
  const momentWord = () => isEvent() ? 'at this moment' : 'at birth';
  const hasHouses = (ch = CH) => !!(ch && ch.houses && ch.houses.length === 12);
  const inHouse = p => (p && p.house ? `, house ${p.house}` : '');
  const hsName = (ch = CH) => String((ch && ch.houseSystem) || 'placidus').replace(/-house$/, '');   // 'equal-house' -> 'equal'
  // ?chart= : saved:<id> | public:<id> | example | local | viewer
  function parseChartParam(v) {
    const s = String(v || ''); let m;
    if (s === 'example' || s === 'local' || s === 'viewer') return { kind: s };
    if ((m = /^public:([a-z0-9-]{1,80})$/.exec(s))) return { kind: 'public', id: m[1] };
    if ((m = /^saved:([0-9a-f-]{8,64})$/i.exec(s))) return { kind: 'saved', id: m[1].toLowerCase() };
    return { kind: null };
  }
  function loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.async = false;
      for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
      s.onload = () => resolve(); s.onerror = () => reject(new Error('could not load ' + src));
      document.head.appendChild(s);
    });
  }
  // Sign-in, the calculator's way: viewer/config.js + viewer/assets/js/auth-init.js, whose client keeps its session
  // in the shared cookie (recursive-eco-auth on .recursive.eco). With no such cookie there is no session, so a
  // signed-out visitor never loads supabase-js. Resolves to { state: 'in' | 'out' | 'error', client, user }.
  async function initAuth(stub) {
    try {
      await loadScript('../viewer/config.js');
      await loadScript('../viewer/assets/js/auth-init.js');
      const RA = window.RecursiveAuth;
      if (!RA) return { state: 'error' };
      if (!stub && !RA.readSessionFromCookies()) return { state: 'out' };
      await loadScript(SUPABASE_JS.src, { integrity: SUPABASE_JS.integrity, crossorigin: 'anonymous' });
      if (!(window.supabase && window.supabase.createClient)) return { state: 'error' };
      const client = stub || RA.init();
      if (!client) return { state: 'error' };
      const { data } = await client.auth.getSession();
      const user = data && data.session && data.session.user;
      return user ? { state: 'in', client, user, stub: !!stub } : { state: 'out' };
    } catch (e) { return { state: 'error', error: String((e && e.message) || e) }; }
  }
  // your charts: the calculator's own query (user_documents, tool_slug birth-chart), id and name only for the list
  async function listSaved(auth) {
    const { data, error } = await auth.client.from('user_documents').select('id, name:document_data->>name, created_at')
      .eq('user_id', auth.user.id).eq('tool_slug', 'birth-chart').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => ({ id: String(r.id), name: r.name || 'Unnamed chart' }));
  }
  // one chart, under RLS, and only your own (RLS would also show someone else's public chart)
  async function readSaved(auth, id) {
    const { data, error } = await auth.client.from('user_documents').select('id, user_id, document_data')
      .eq('id', id).eq('tool_slug', 'birth-chart').eq('user_id', auth.user.id).maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const AYANAMSAS = ['lahiri', 'fagan-bradley'];
  // POST the saved birth data to the chart server, as the calculator does (the body goes in a POST, never a URL)
  async function calcAt(b, st, zodiac) {
    const dm = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(b.date || '')), tm = /^(\d{1,2}):(\d{2})/.exec(String(b.time || ''));
    if (!dm || !tm) throw new Error('this saved chart has no date or time the chart server can read');
    const ay = AYANAMSAS.includes(st.ayanamsaUsed) ? st.ayanamsaUsed : AYANAMSAS.includes(st.ayanamsa) ? st.ayanamsa : 'lahiri';
    const r = await fetch(CHART_API(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      year: +dm[1], month: +dm[2], day: +dm[3], hour: +tm[1], minute: +tm[2], latitude: +b.latitude, longitude: +b.longitude,
      houseSystem: st.houseSystem || 'placidus', zodiac, ayanamsa: ay }) });
    if (!r.ok) throw new Error('the chart server answered ' + r.status);
    return r.json();
  }
  // a saved row -> { tropical, sidereal }: the engine's tropical positions and the sidereal cast's ayanamsa go through
  // the same adapter as the calculator's hand-over, so aspects, figures and the sidereal chart come out the same way
  async function chartsFromSaved(doc) {
    const b = doc.birthData || {}, st = doc.settings || {};
    const [T, D] = await Promise.all([calcAt(b, st, 'tropical'), calcAt(b, st, 'sidereal')]);
    const ts = T.settings || {}, ds = D.settings || {}, A = T.angles || {};
    const points = {};
    for (const [k, p] of Object.entries(T.planets || {})) {
      if (!p || typeof p.longitude !== 'number') continue;
      points[k] = { longitude: p.longitude, retrograde: !!p.isRetrograde };
      if (typeof p.speedLongitude === 'number') points[k].speed = p.speedLongitude;
    }
    return chartsFromHandoff({ kind: HANDOFF_KIND, v: 1, zodiac: 'tropical', houseSystem: ts.houseSystemActual || ts.houseSystem || st.houseSystem || 'placidus',
      ayanamsa: typeof ds.ayanamsaDegrees === 'number' ? { name: ds.ayanamsaUsed || 'lahiri', label: ds.ayanamsaLabel || null, degrees: ds.ayanamsaDegrees } : null,
      points, angles: { ascendant: A.ascendant && A.ascendant.longitude, midheaven: A.midheaven && A.midheaven.longitude },
      cusps: (T.houses || []).map(h => h.cusp) });
  }
  // ?stubauth=1, localhost only (ignored anywhere else): a stand-in for the Supabase client, with invented rows
  // (never a real person's data), so the saved-charts path (sign-in, list, read, recompute, Today) can be exercised
  // off recursive.eco. It answers the same calls the real client gets, and filters rows the way RLS would.
  function stubClient() {
    const me = { id: '00000000-0000-4000-8000-0000000000aa' };
    const row = (n, user, name, birthData, settings, extra) => Object.assign({ id: '00000000-0000-4000-8000-00000000000' + n, user_id: user,
      tool_slug: 'birth-chart', is_public: false, created_at: `2026-09-2${n}T12:00:00Z`, document_data: { name, birthData, settings } }, extra || {});
    const rows = [
      row(1, me.id, 'Invented test chart A (Greenwich, noon)', { date: '2000-01-01', time: '12:00', latitude: 51.4779, longitude: -0.0015, location: 'Royal Observatory, Greenwich' },
        { houseSystem: 'placidus', zodiacSystem: 'tropical', ayanamsa: 'lahiri' }),
      row(2, me.id, 'Invented test chart B (sidereal, Fagan-Bradley)', { date: '1990-07-15', time: '06:30', latitude: -33.8688, longitude: 151.2093, location: 'Sydney' },
        { houseSystem: 'equal-house', zodiacSystem: 'sidereal', ayanamsa: 'fagan-bradley' }),
      row(3, 'someone-else', 'Invented public chart of another account', { date: '1980-03-03', time: '03:03', latitude: 0, longitude: 0, location: 'Null Island' },
        { houseSystem: 'placidus', zodiacSystem: 'tropical' }, { is_public: true }),
    ];
    const project = (r, sel) => {
      if (sel === '*') return JSON.parse(JSON.stringify(r));
      const out = {};
      for (const part of sel.split(',').map(x => x.trim()).filter(Boolean)) {
        const m = /^(?:(\w+):)?(\w+)(?:->>(\w+))?$/.exec(part); if (!m) continue;
        out[m[1] || m[3] || m[2]] = m[3] ? (r[m[2]] || {})[m[3]] : r[m[2]];
      }
      return JSON.parse(JSON.stringify(out));
    };
    const query = () => {
      const q = { sel: '*', f: [], ord: null };
      const run = () => {
        let rs = rows.filter(r => r.user_id === me.id || r.is_public);
        for (const [c, v] of q.f) rs = rs.filter(r => r[c] === v);
        if (q.ord) rs.sort((a, b) => (a[q.ord[0]] < b[q.ord[0]] ? -1 : 1) * q.ord[1]);
        return rs.map(r => project(r, q.sel));
      };
      const later = x => new Promise(res => setTimeout(() => res(x), 120));
      const api = {
        select(s) { q.sel = s; return api; },
        eq(c, v) { q.f.push([c, v]); return api; },
        order(c, o) { q.ord = [c, o && o.ascending === false ? -1 : 1]; return api; },
        maybeSingle() { const rs = run(); return later(rs.length > 1 ? { data: null, error: { message: 'more than one row' } } : { data: rs[0] || null, error: null }); },
        then(ok, bad) { return later({ data: run(), error: null }).then(ok, bad); },
      };
      return api;
    };
    return { stub: true, auth: { getSession: () => Promise.resolve({ data: { session: { user: me } }, error: null }) },
      from: t => { if (t !== 'user_documents') throw new Error('stub: only user_documents'); return query(); } };
  }
  function renderChartPicker() {
    const sel = $('#chartSel'); if (!sel) return;
    const cur = S.pickValue || '';
    const opt = (v, label, extra = '') => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}${extra}>${esc(label)}</option>`;
    const groups = [];
    if (S.source === 'viewer') groups.push(`<optgroup label="From the calculator">${opt('viewer', 'The chart handed over (this tab only)')}</optgroup>`);
    if (S.localAvailable) groups.push(`<optgroup label="This laptop">${opt('local', 'My chart (local files, never committed)')}</optgroup>`);
    const a = S.auth;
    if (a && a.state === 'in') {
      const list = Array.isArray(S.saved) ? S.saved : [];
      let inner = list.map(r => opt('saved:' + r.id, r.name)).join('');
      if (cur.startsWith('saved:') && !list.some(r => 'saved:' + r.id === cur)) inner = opt(cur, S.savedName || 'Your saved chart') + inner;
      if (!inner) inner = opt('', S.savedErr ? 'Could not load your saved charts' : S.saved == null ? 'Loading your saved charts…' : 'No saved charts yet', ' disabled');
      groups.push(`<optgroup label="Your saved charts${a.stub ? ' (stub: invented rows)' : ''}">${inner}</optgroup>`);
    }
    const pub = S.publicCharts || [];
    // events by date, people by surname: an order that ranks no one
    const ev = pub.filter(c => c.group === 'event').sort((a, b) => dayOf(a) - dayOf(b));
    const pf = pub.filter(c => c.group === 'public-figure').sort((a, b) => surname(a).localeCompare(surname(b)) || a.label.localeCompare(b.label));
    if (ev.length) groups.push(`<optgroup label="AI events">${ev.map(c => opt('public:' + c.id, pubLabel(c))).join('')}</optgroup>`);
    if (pf.length) groups.push(`<optgroup label="Public figures">${pf.map(c => opt('public:' + c.id, pubLabel(c))).join('')}</optgroup>`);
    groups.push(`<optgroup label="Example (invented)">${opt('example', 'An invented example chart (not a person)')}</optgroup>`);
    // until the chart on the wheel is known, say so, rather than let the first option look chosen
    const known = groups.some(g => g.includes(`value="${esc(cur)}"`));
    sel.innerHTML = (cur && known ? '' : '<option value="" selected disabled>Loading the chart…</option>') + groups.join('');
    const note = $('#chartSelNote');
    if (!a) note.textContent = 'Checking your sign-in on recursive.eco…';
    else if (a.state === 'in') note.textContent = a.stub ? 'Signed in (stub, localhost only: invented rows, nothing real).' : '';
    else {
      const why = a.state === 'error' ? 'Could not check your sign-in. ' : '';
      const here = ON_RECURSIVE ? '' : ' (sign-in carries only on recursive.eco pages)';
      note.innerHTML = `${esc(why)}<a href="${esc(SIGN_IN_URL)}" target="_blank" rel="noopener">Sign in on recursive.eco</a> to see your saved charts${esc(here)}.`;
    }
  }
  function renderBanner() {
    const b = $('#pubBanner'), c = S.pub;
    if (!b) return;
    if (!c) { b.hidden = true; b.innerHTML = ''; return; }
    const head = c.group === 'event'
      ? '<p class="pb-head"><b>The sky at this event, read as the schools would read any moment.</b></p>'
      : `<p class="pb-head"><b>A public figure's birth chart, from a public source (${esc(ratingText(c))}).</b> The schools here read placements, never the person; nothing on this page predicts anything about anyone.</p>`;
    const src = c.source_url ? ` · source: <a href="${esc(c.source_url)}" target="_blank" rel="noopener">${esc(hostOf(c.source_url))} ↗</a>` : '';
    const time = c.time_known ? '' : `<p class="pb-time"><b>No time is documented</b>, so this chart has no houses, no Ascendant and no Midheaven, and the page leaves out every reading that needs them. The planets are placed at local noon; the Moon is approximate.</p>`;
    b.innerHTML = `${head}<p class="pb-src">${esc(c.date_label || '')} · ${esc(c.place || '')}${src}. ${esc(c.note || '')}</p>${time}`;
    b.hidden = false;
  }
  function renderTimeNote() {
    const tn = $('#timeNote'); if (!tn) return;
    if (hasHouses()) { tn.hidden = true; tn.textContent = ''; return; }
    const m = CH.pts.moon, signs = m && m.dayRange ? m.dayRange.map(x => SIGNS.find(s => String(x).includes(s))).filter(Boolean) : [];
    const moonSign = signs.length === 2 && signs[0] !== signs[1] ? ` Over that day the Moon moves from ${signs[0]} into ${signs[1]}, so even its sign is uncertain.` : '';
    tn.textContent = `${isEvent() ? 'Time' : 'Birth time'} unknown: no houses, no Ascendant or Midheaven, and none of the readings that need them (house placements, house owners, the first planet below the horizon). The planets are placed at local noon. They move little in a day, but the Moon moves 12 to 15 degrees, so its place is approximate.${moonSign}`;
    tn.hidden = false;
  }

  function lonOf(key, ch = CH) {
    if (key === 'ascendant') return ch.asc && ch.asc.lon;
    if (key === 'midheaven') return ch.mc && ch.mc.lon;
    if (key === 'earth') return ch.pts.sun ? n360(ch.pts.sun.lon + 180) : null;
    return ch.pts[key] ? ch.pts[key].lon : null;
  }
  function houseOfLon(lon, ch = CH) {
    const hs = ch.houses; if (!hs.length) return null;
    for (let i = 0; i < 12; i++) {
      const a = hs[i].cusp, b = hs[(i + 1) % 12].cusp;
      if (n360(lon - a) < n360(b - a)) return hs[i].n;
    }
    return null;
  }
  // where a body sits: a real point, the Ascendant, or Bailey's Earth (the point opposite the Sun)
  function positionOf(key, ch = CH) {
    if (ch.pts[key]) return ch.pts[key];
    if (key === 'ascendant' && ch.asc) return { key, lon: ch.asc.lon, sign: ch.asc.sign, pos: ch.asc.pos, house: 1 };
    if (key === 'midheaven' && ch.mc) return { key, lon: ch.mc.lon, sign: ch.mc.sign, pos: ch.mc.pos, house: 10 };
    if (key === 'earth' && ch.pts.sun) { const lon = n360(ch.pts.sun.lon + 180); return { key, lon, sign: signAt(lon), house: houseOfLon(lon, ch), virtual: true }; }
    return null;
  }
  const rulerOf = (sign, set = S.rulers) => ((S.RULERS[set] || S.RULERS['rulers-traditional'] || FALLBACK_TRAD)[sign]);
  const setLabel = (id = S.rulers) => (SETS.find(s => s.id === id) || SETS[0]).label;
  function chainFrom(key, set = S.rulers) {
    const chain = [key], seen = new Set([key]); let cur = key;
    for (let i = 0; i < 14; i++) {
      const pos = positionOf(cur);
      if (!pos) return { chain, end: 'uncomputed', at: cur };
      const r = rulerOf(pos.sign, set);
      if (!r) return { chain, end: 'uncomputed', at: cur };
      if (r === cur) return { chain, end: 'domicile', at: cur };
      if (seen.has(r)) { chain.push(r); return { chain, end: 'loop', at: r }; }
      chain.push(r); seen.add(r); cur = r;
    }
    return { chain, end: 'long', at: cur };
  }
  function finalDispositor(set = S.rulers) {
    const ends = PLANETS.filter(p => CH.pts[p]).map(p => chainFrom(p, set));
    const dom = new Set(ends.filter(e => e.end === 'domicile').map(e => e.at));
    // a loop is named once, by its members (two planets in each other's signs = a mutual reception)
    const cycles = new Map();
    for (const e of ends) if (e.end === 'loop') {
      const cyc = e.chain.slice(e.chain.indexOf(e.at), -1);
      const key = cyc.slice().sort().join('|'); if (!cycles.has(key)) cycles.set(key, cyc);
    }
    const unc = new Set(ends.filter(e => e.end === 'uncomputed').map(e => e.at));
    if (dom.size === 1 && !cycles.size && !unc.size) return { single: [...dom][0], dom: [...dom], loops: [], unc: [] };
    return { single: null, dom: [...dom], loops: [...cycles.values()], unc: [...unc] };
  }
  const rulesSigns = (p, set = S.rulers) => SIGNS.filter(s => rulerOf(s, set) === p);
  const ownsHouses = (p, set = S.rulers) => CH.houses.filter(h => rulerOf(h.sign, set) === p).map(h => h.n);
  const disposes = (p, set = S.rulers) => BODIES.filter(b => b !== p && CH.pts[b] && rulerOf(CH.pts[b].sign, set) === p);
  const aspectsOf = p => CH.aspects.filter(a => a.a === p || a.b === p);
  const other = (a, p) => (a.a === p ? a.b : a.a);
  const figuresOf = p => CH.figures.map((f, i) => [f, i]).filter(([f]) => (f.members || []).includes(p) || (f.alsoThere || []).includes(p));
  function houseInfo(n) {
    const h = CH.houses.find(x => x.n === n); if (!h) return null;
    const owner = rulerOf(h.sign);
    return { n, builder: h.sign, cusp: h.cusp, pos: h.pos, owner, ownerPos: positionOf(owner),
      tenants: BODIES.filter(b => CH.pts[b] && CH.pts[b].house === n) };
  }
  function dignityOf(p, sign) {
    const d = S.DIGN[p]; if (!d) return null;
    if ((d.domicile || []).includes(sign)) return 'domicile (at home)';
    if (d.exaltation === sign) return 'exaltation';
    if ((d.detriment || []).includes(sign)) return 'detriment';
    if (d.fall === sign) return 'fall';
    return null;
  }
  const speedClass = k => PERSONAL.has(k) ? 'personal' : SOCIAL.has(k) ? 'social' : SLOW.has(k) ? 'slow' : 'point';
  function aspectKind(a) {
    const x = speedClass(a.a), y = speedClass(a.b);
    if (x === 'point' || y === 'point') return 'point';
    const px = x === 'personal', py = y === 'personal';
    if (px && py) return 'personal';
    if (!px && !py) return 'slow';
    return 'mixed';
  }
  function firstBelowHorizon() {
    if (!CH.asc) return null;
    let best = null, bd = 999;
    for (const p of PLANETS) {
      if (!CH.pts[p]) continue;
      const d = n360(CH.pts[p].lon - CH.asc.lon);
      if (d > 0 && d < 180 && d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function tally() {
    const t = { element: { fire: 0, earth: 0, air: 0, water: 0 }, modality: { cardinal: 0, fixed: 0, mutable: 0 },
      polarity: { masculine: 0, feminine: 0 }, sign: {}, total: 0 };
    for (const k in WEIGHT) {
      const s = k === 'ascendant' ? (CH.asc && CH.asc.sign) : (CH.pts[k] && CH.pts[k].sign);
      if (!s) continue;
      const w = WEIGHT[k];
      t.element[elementOf(s)] += w; t.modality[modalityOf(s)] += w; t.polarity[polarityOf(s)] += w;
      t.sign[s] = (t.sign[s] || 0) + w; t.total += w;
    }
    return t;
  }
  function moonPhase() {
    if (!CH.pts.sun || !CH.pts.moon) return null;
    const e = n360(CH.pts.moon.lon - CH.pts.sun.lon);
    const names = ['new', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full', 'waning gibbous', 'last quarter', 'waning crescent'];
    return { name: names[Math.floor(e / 45)], elong: e };
  }
  // each school reads the zodiac it was written for: Jyotiṣa sidereal, the others tropical
  function signForSchool(key, school) {
    const z = (S.schoolBy[school] || {}).zodiac;
    const ch = (z === 'sidereal' ? S.charts.sidereal : S.charts.tropical) || CH;
    const p = positionOf(key, ch);
    return p ? p.sign : null;
  }
  const fmtPos = p => p ? (p.pos || `${Math.floor(p.deg || 0)}° ${p.sign}`) : '';

  // ───────────────────────── glyph html ─────────────────────────
  const gl = k => GLYPH[k] ? GLYPH[k] + VS : '';
  const G = k => GLYPH[k] ? `<span class="glyph p-${k}" aria-hidden="true">${gl(k)}</span>` : '';
  const SG = s => `<span class="glyph" aria-hidden="true">${SIGN_GLYPH[SIGNS.indexOf(s)] || ''}${VS}</span>`;
  const PN = k => `${G(k)}${esc(NAME[k] || cap(k))}`;
  const pList = keys => keys.map(PN).join(', ');

  // ───────────────────────── naming, in plain text ─────────────────────────
  const THE = new Set(['sun', 'moon', 'northnode', 'southnode', 'ascendant', 'midheaven', 'earth']);
  const nm = k => NAME[k] || cap(k);
  const theNm = k => (THE.has(k) ? 'the ' : '') + nm(k);
  const andList = a => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const houseNo = f => +String(f.where).replace(/\D/g, '');
  // "T-square (Mars opposite Pluto, both square the Sun, apex Sun)": the figure named by its members
  function figName(f) {
    const m = f.members || [];
    switch (f.type) {
      case 'T-square': {
        const o = f.opposition && f.opposition.length === 2 ? f.opposition : m.filter(x => x !== f.apex);
        return `T-square (${theNm(o[0])} opposite ${theNm(o[1])}, both square ${theNm(f.apex)}, apex ${nm(f.apex)})`;
      }
      case 'stellium':
        return f.scope === 'house' ? `stellium in the ${ord(houseNo(f))} house (${andList(m.map(nm))})`
          : `stellium in ${f.where} (${andList(m.map(nm))})`;
      case 'grand trine':
        return `grand trine${f.quality && f.quality !== 'mixed' ? ' in ' + f.quality : ''} (${andList(m.map(theNm))}, each trine the others)`;
      case 'grand cross': {
        const pairs = []; const left = m.slice();
        while (left.length) { const a = left.shift(); const b = left.find(x => CH && CH.aspects.some(y => y.type === 'opposition' && [y.a, y.b].sort().join() === [a, x].sort().join())) || left[0]; left.splice(left.indexOf(b), 1); pairs.push(`${theNm(a)} opposite ${theNm(b)}`); }
        return `grand cross (${pairs.join(', ')}, all four square)`;
      }
      case 'kite':
        return `kite (the grand trine of ${andList((f.grandTrine || []).map(theNm))}, with ${theNm(f.fourth)} opposite ${theNm(f.apex)}, apex ${nm(f.apex)})`;
      case 'yod': {
        const s = f.sextile || m.filter(x => x !== f.apex);
        return `yod (${theNm(s[0])} sextile ${theNm(s[1])}, both quincunx ${theNm(f.apex)}, apex ${nm(f.apex)})`;
      }
      case 'mystic rectangle':
        return `mystic rectangle (${andList(m.map(theNm))})`;
      default:
        return `${f.type} (${andList(m.map(theNm))})`;
    }
  }
  const figShort = f => f.type === 'stellium' ? 'stellium' : f.type;   // for a second mention in the same sentence
  function figSlug(f) {
    if (f.type === 'T-square') return 't-square';
    if (f.type === 'stellium') return f.scope === 'house' ? 'stellium-h' + String(houseNo(f)).padStart(2, '0') : 'stellium-' + String(f.where).toLowerCase();
    return String(f.type).toLowerCase().replace(/\s+/g, '-');
  }

  // ───────────────────────── the wheel ─────────────────────────
  const NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  const R = { out: 196, sgIn: 166, pl: 139, plIn: 112, asp: 96, tr: 214 };
  class Wheel {
    constructor(host, opts = {}) {
      this.mini = !!opts.mini; this.onPick = opts.onPick || null;
      this.svg = sv('svg', { viewBox: this.mini ? '0 0 400 400' : '-30 -30 460 460', class: 'wheel' + (this.mini ? ' mini' : ''),
        role: 'img', 'aria-label': opts.label || 'Chart wheel' }, host);
    }
    xy(lon, r) { const a = (180 + (lon - this.asc)) * Math.PI / 180; return [+(200 + r * Math.cos(a)).toFixed(2), +(200 - r * Math.sin(a)).toFixed(2)]; }
    sector(l1, l2, r1, r2) {
      let span = n360(l2 - l1); if (span === 0) span = 360;
      const large = span > 180 ? 1 : 0;
      const [x1, y1] = this.xy(l1, r2), [x2, y2] = this.xy(l1 + span, r2), [x3, y3] = this.xy(l1 + span, r1), [x4, y4] = this.xy(l1, r1);
      return `M${x1} ${y1}A${r2} ${r2} 0 ${large} 0 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 1 ${x4} ${y4}Z`;
    }
    render(ch) {
      this.ch = ch; this.asc = ch.asc ? ch.asc.lon : 0;
      const s = this.svg, mini = this.mini; s.innerHTML = '';
      this.els = { signs: {}, houses: {}, hn: {}, planets: {}, aspects: [], axes: {} };
      const gS = sv('g', { class: 'signs' }, s);
      SIGNS.forEach((name, i) => {
        this.els.signs[name] = sv('path', { d: this.sector(i * 30, i * 30 + 30, R.sgIn, R.out), class: `sg el-${ELEM[i % 4]}` }, gS);
        if (!mini) { const [x, y] = this.xy(i * 30 + 15, (R.sgIn + R.out) / 2); sv('text', { x, y, class: 'sgl' }, gS, SIGN_GLYPH[i] + VS); }
      });
      sv('circle', { cx: 200, cy: 200, r: R.asp, class: 'ring' }, s);
      sv('circle', { cx: 200, cy: 200, r: R.sgIn, class: 'ring' }, s);
      const gH = sv('g', { class: 'houses' }, s);
      const hs = ch.houses;
      hs.forEach((h, i) => {
        const nx = hs[(i + 1) % 12];
        const p = sv('path', { d: this.sector(h.cusp, nx.cusp, R.asp, R.sgIn), class: 'hs', 'data-house': h.n }, gH);
        this.els.houses[h.n] = p;
        if (!mini && this.onPick) {
          p.addEventListener('click', () => this.onPick({ kind: 'house', n: h.n }));
          sv('title', {}, p, `House ${h.n}: ${h.sign} on the cusp`);
        }
        const [x1, y1] = this.xy(h.cusp, R.asp), [x2, y2] = this.xy(h.cusp, R.sgIn);
        sv('line', { x1, y1, x2, y2, class: 'cusp' }, gH);
        if (!mini) {
          const mid = h.cusp + n360(nx.cusp - h.cusp) / 2;
          const [x, y] = this.xy(mid, (R.asp + R.plIn) / 2);
          this.els.hn[h.n] = sv('text', { x, y, class: 'hn' }, gH, String(h.n));
        }
      });
      const axes = [['ascendant', ch.asc, 'AC', 'DC'], ['midheaven', ch.mc, 'MC', 'IC']];
      for (const [k, a, l1, l2] of axes) {
        if (!a) continue;
        const [x1, y1] = this.xy(a.lon, R.out + (mini ? 0 : 6)), [x2, y2] = this.xy(a.lon + 180, R.out + (mini ? 0 : 6));
        this.els.axes[k] = sv('line', { x1, y1, x2, y2, class: 'axis' }, s);
        if (!mini) {
          const [ax, ay] = this.xy(a.lon, R.out + 17), [bx, by] = this.xy(a.lon + 180, R.out + 17);
          sv('text', { x: ax, y: ay, class: 'axl' }, s, l1); sv('text', { x: bx, y: by, class: 'axl' }, s, l2);
        }
      }
      const gA = sv('g', { class: 'aspects' }, s);
      for (const a of ch.aspects) {
        if (a.type === 'conjunction') continue;
        const la = lonOf(a.a, ch), lb = lonOf(a.b, ch);
        if (la == null || lb == null) continue;
        const [x1, y1] = this.xy(la, R.asp), [x2, y2] = this.xy(lb, R.asp);
        const ln = sv('line', { x1, y1, x2, y2, class: `asp asp-${a.type}` + (a.pt ? ' pt' : '') }, gA);
        ln.dataset.a = a.a; ln.dataset.b = a.b;
        this.els.aspects.push(ln);
      }
      this.gT = sv('g', { class: 'transits' }, s);
      const gP = sv('g', { class: 'planets' }, s);
      const items = BODIES.filter(k => ch.pts[k]).map(k => ({ key: k, lon: ch.pts[k].lon }));
      const disp = spread(items, mini ? 9 : 10.5);
      for (const it of disp) {
        const p = ch.pts[it.key];
        const g = sv('g', { class: `pl p-${it.key}` }, gP);
        const [t1x, t1y] = this.xy(p.lon, R.sgIn), [t2x, t2y] = this.xy(p.lon, R.sgIn - 7);
        sv('line', { x1: t1x, y1: t1y, x2: t2x, y2: t2y, class: 'tick' }, g);
        const [gx, gy] = this.xy(it.d, R.pl);
        if (!mini && Math.abs(((it.d - p.lon + 540) % 360) - 180) > 1.5) {
          const [lx, ly] = this.xy(it.d, R.pl + 12);
          sv('line', { x1: t2x, y1: t2y, x2: lx, y2: ly, class: 'lead' }, g);
        }
        sv('circle', { cx: gx, cy: gy, r: mini ? 12 : 12.5 }, g);
        if (!mini) {
          sv('text', { x: gx, y: gy + 1 }, g, gl(it.key));
          if (p.retro && it.key !== 'northnode' && it.key !== 'southnode') sv('text', { x: gx + 11, y: gy + 10, class: 'rx' }, g, 'r');
          g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
          g.setAttribute('aria-label', `${NAME[it.key]}, ${p.pos || p.sign}${inHouse(p)}${p.approx ? ', approximate' : ''}`);
          sv('title', {}, g, `${NAME[it.key]} · ${p.pos || p.sign}${p.house ? ' · house ' + p.house : ''}${p.retro ? ' · retrograde' : ''}${p.approx ? ' · approximate (time unknown)' : ''}`);
          if (this.onPick) {
            g.addEventListener('click', () => this.onPick({ kind: 'planet', key: it.key }));
            g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onPick({ kind: 'planet', key: it.key }); } });
          }
        }
        this.els.planets[it.key] = g;
      }
      this.gO = sv('g', { class: 'overlay' }, s);
      if (this.spec) this.highlight(this.spec);
    }
    highlight(spec) {
      this.spec = spec || null;
      const s = this.svg; if (!this.els) return;
      $$('.hl, .hl2', s).forEach(e => e.classList.remove('hl', 'hl2'));
      this.gT.innerHTML = ''; this.gO.innerHTML = '';
      if (!spec) { s.classList.remove('has-hl'); return; }
      s.classList.add('has-hl');
      const add = (el, c) => el && el.classList.add(c);
      (spec.planets2 || []).forEach(k => add(this.els.planets[k], 'hl2'));
      (spec.planets || []).forEach(k => { add(this.els.planets[k], 'hl'); add(this.els.axes[k], 'hl'); });
      (spec.signs2 || []).forEach(k => add(this.els.signs[k], 'hl2'));
      (spec.signs || []).forEach(k => add(this.els.signs[k], 'hl'));
      (spec.houses2 || []).forEach(n => add(this.els.houses[n], 'hl2'));
      (spec.houses || []).forEach(n => { add(this.els.houses[n], 'hl'); add(this.els.hn[n], 'hl'); });
      const pairs = (spec.aspects || []).map(p => [p.a, p.b].sort().join('|'));
      const of = new Set(spec.aspectsOf || []);
      for (const ln of this.els.aspects) {
        const k = [ln.dataset.a, ln.dataset.b].sort().join('|');
        if (pairs.includes(k) || of.has(ln.dataset.a) || of.has(ln.dataset.b)) ln.classList.add('hl');
      }
      if (!this.mini) {
        for (const t of (spec.transits || [])) {
          const nl = lonOf(t.natal, this.ch); if (nl == null || t.lon == null) continue;
          const [x1, y1] = this.xy(t.lon, R.tr - 11), [x2, y2] = this.xy(nl, R.pl + 13);
          sv('line', { x1, y1, x2, y2, class: `trl asp-${t.type}` }, this.gT);
          const g = sv('g', { class: `tr p-${t.key}` }, this.gT);
          const [x, y] = this.xy(t.lon, R.tr);
          sv('circle', { cx: x, cy: y, r: 10 }, g);
          sv('text', { x, y: y + 1 }, g, gl(t.key));
          sv('title', {}, g, `transiting ${NAME[t.key]} (approximate position)`);
        }
      }
      if (spec.empty != null) {
        const [x, y] = this.xy(spec.empty, R.pl);
        sv('circle', { cx: x, cy: y, r: this.mini ? 16 : 12, class: 'empty-pt' }, this.gO);
        if (!this.mini) { const [lx, ly] = this.xy(spec.empty, R.pl - 22); sv('text', { x: lx, y: ly, class: 'empty-lb' }, this.gO, 'empty point'); }
      }
    }
  }
  function spread(items, minSep) {
    const arr = items.map(x => Object.assign({}, x, { d: x.lon })).sort((a, b) => a.d - b.d);
    if (arr.length < 2) return arr;
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i], b = arr[(i + 1) % arr.length];
        const gap = n360(b.d - a.d);
        if (gap < minSep - 0.01) { const push = (minSep - gap) / 2 + 0.01; a.d = n360(a.d - push); b.d = n360(b.d + push); moved = true; }
      }
      arr.sort((a, b) => a.d - b.d);
      if (!moved) break;
    }
    return arr;
  }

  // ───────────────────────── passages + reading cards ─────────────────────────
  const KIND_ORDER = { mine: 0, grammar: 1, book: 2, podcast: 3 };
  function passFor(keys, school) {
    const out = [], seen = new Set();
    for (const k of keys) for (const p of (S.byKey.get(k) || [])) {
      if (p.school !== school || seen.has(p.id)) continue;
      seen.add(p.id); out.push(p);
    }
    return out.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  }
  const SEC_PREF = ['Interpretation', 'Story', 'The complex', 'In this school (our paraphrase)', 'Rulers (Tabulation VI)', 'Greco-Roman'];
  function firstSection(secs) {
    const ks = Object.keys(secs || {});
    const k = SEC_PREF.find(x => secs[x]) || ks.find(x => !/^The record/i.test(x)) || ks[0];
    return [k, secs[k]];
  }
  function schoolLabel(slug) {
    const s = S.schoolBy[slug];
    return s ? `${esc(s.label)}<span class="fam">${esc(s.family_label || '')}</span>` : esc(slug);
  }
  function srcLine(p) {
    if (p.kind === 'grammar') {
      const href = `../viewers/cards.html?src=../grammars/${encodeURIComponent(p.grammar)}/grammar.json&item=${encodeURIComponent(p.item)}`;
      const bailey = p.school === 'esoteric-bailey'
        ? ' · our paraphrase; the ruler table is from Alice A. Bailey, <i>Esoteric Astrology</i> (1951), Tabulation VI' : '';
      return `Source: <a href="${href}" target="_blank" rel="noopener">${esc(p.grammar_name || p.grammar)}</a> (grammar in this library)${bailey}`;
    }
    if (p.kind === 'book') {
      // page links (…/page/n<leaf>/mode/1up) since Sep 29 2026; an old search link (?q=…) often found
      // nothing, so it is cut back to the book's own page rather than shown
      const url = String(p.url || '').split('?')[0].split('#')[0];
      const onPage = /\/page\/n\d+/.test(url);
      return `Source: ${esc(p.book)} · <a href="${esc(url)}" target="_blank" rel="noopener">archive.org, ${onPage ? 'the scanned page' : 'the book'} ↗</a> · ${esc(p.note || 'public-domain OCR')}`;
    }
    if (p.kind === 'podcast') return `<span class="lbl">auto-caption</span>Source: ${esc(p.show)}, at ${esc(p.at)} · <a href="${esc(p.url)}" target="_blank" rel="noopener">the moment on YouTube ↗</a>`;
    return '';
  }
  function passText(p, n) {
    if (p.kind === 'grammar') {
      const [k, v] = firstSection(p.sections);
      return `<span class="sec">${esc(k)}</span>${esc(trim(v, n))}`;
    }
    return esc(trim(p.text, n + 60));
  }
  // one reading card: the school's label, what it speaks to, its words, its source
  function card(p, opts = {}) {
    const n = opts.n || 300;
    let more = '';
    if (p.kind === 'grammar') {
      const [k0] = firstSection(p.sections);
      const rest = Object.entries(p.sections).filter(([k]) => k !== k0);
      if (rest.length) more = `<details><summary>${rest.length} more section${rest.length > 1 ? 's' : ''} of this item</summary>${rest.map(([k, v]) => `<p><span class="sec">${esc(k)}</span> ${esc(v)}</p>`).join('')}</details>`;
    }
    const extra = (opts.extra || []).map(x => `<details><summary>${x.kind === 'book' ? 'a passage from the book' : x.kind === 'podcast' ? 'from a talk (auto-caption)' : 'another item'}</summary><p>${passText(x, 400)}</p><div class="src">${srcLine(x)}</div></details>`).join('');
    const para = p.school === 'esoteric-bailey' ? '<span class="lbl">paraphrase</span>' : '';
    return `<div class="rcard"><div class="school">${schoolLabel(p.school)}</div>${opts.what ? `<div class="what">${opts.what}</div>` : ''}
      <div class="txt">${para}${passText(p, n)}</div>${more}${extra}<div class="src">${srcLine(p)}</div></div>`;
  }
  function mineCard(item, r) {
    const texts = r.texts.map(t => `<p class="txt">${esc(t)}</p>`).join('');
    const srcs = r.sources.length ? `Sources: ${r.sources.map(srcText).join(' · ')}` : 'No source listed';
    return `<div class="rcard mine"><div class="school">${r.schools.map(schoolLabel).join(' + ') || 'Your reading'}</div>
      <div class="what"><span class="lbl">your reading, local draft</span>${esc(item.title || item.id)}</div>${texts}<div class="src">${srcs}</div></div>`;
  }
  function srcText(s) {
    if (typeof s === 'string') return /^https?:/.test(s) ? `<a href="${esc(s)}" target="_blank" rel="noopener">${esc(s)}</a>` : esc(s);
    if (s && typeof s === 'object') {
      const label = s.label || s.title || s.name || s.book || s.grammar_name || s.grammar || s.show || s.id || 'source';
      const url = s.url || s.href;
      return url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : esc(label);
    }
    return '';
  }
  // cards for one set of keys, across the enabled schools, at most one card (with a book passage folded in) each
  function schoolCards(keysFor, opts = {}) {
    const out = [];
    for (const s of enabledSchools()) {
      const keys = typeof keysFor === 'function' ? keysFor(s.slug) : keysFor;
      if (!keys || !keys.length) continue;
      const ps = passFor(keys, s.slug);
      if (!ps.length) continue;
      const main = ps[0], extra = ps.slice(1).filter(x => x.kind !== main.kind).slice(0, 1);
      const what = opts.whatFor ? opts.whatFor(s.slug) : opts.what;
      out.push({ slug: s.slug, html: card(main, { extra, what, n: opts.n }) });
    }
    return out;
  }
  const enabledSchools = () => S.schools.filter(s => S.on.has(s.slug));

  // her local readings
  const TEXT_SKIP = new Set(['sources', 'source', 'school', 'schools', 'school_slug', 'id', 'url', 'kind', 'key', 'keys']);
  function normReadings(raw) {
    if (!raw) return null;
    const items = Array.isArray(raw) ? raw : (raw.items || raw.units || raw.readings || []);
    const out = [];
    for (const it of items) {
      const id = String(it.id || it.unit_id || it.unit || it.key || '').replace(/^chains\./, 'rulers.');
      if (!id) continue;
      const rs = (Array.isArray(it.readings) ? it.readings : []).map(r => {
        const sc = r.school || r.school_slug || r.schools;
        const schools = Array.isArray(sc) ? sc : sc ? [sc] : [];
        const texts = [];
        for (const k of ['text', 'reading', 'body', 'could_mean', 'could_also_mean', 'question']) if (typeof r[k] === 'string') texts.push(r[k]);
        for (const [k, v] of Object.entries(r)) if (typeof v === 'string' && !TEXT_SKIP.has(k) && !['text', 'reading', 'body', 'could_mean', 'could_also_mean', 'question'].includes(k)) texts.push(v);
        const src = r.sources != null ? r.sources : r.source;
        return { schools, texts, sources: Array.isArray(src) ? src : src ? [src] : [] };
      });
      out.push({ id, chapter: id.split('.')[0], title: it.title || '', readings: rs });
    }
    return out;
  }
  function mineFor(ids) {
    if (!S.readings) return [];
    const out = [];
    for (const id of ids) {
      const it = S.readById.get(id); if (!it) continue;
      for (const r of it.readings) if (!r.schools.length || r.schools.some(s => S.on.has(s))) out.push(mineCard(it, r));
    }
    return out;
  }

  // ───────────────────────── possibility notes (templates, marked as such) ─────────────────────────
  const TMPL = '<span class="tmpl">(template wording)</span>';
  function planetNote(k, short, ch = CH) {
    const p = ch.pts[k]; if (!p) return '';
    if (short) return `<div class="possible">This could mean ${esc(FUNC[k] || NAME[k])} working through “${esc(VERB[p.sign] || p.sign)}”${p.house ? `, in ${esc(AREA[p.house - 1] || '')}` : ''};
      it could also mean something else. What does it mean to you?${TMPL}</div>`;
    // no known time: no house to say where
    if (!p.house) return `<div class="possible">${esc(cap(FUNC[k] || NAME[k]))}, qualified by ${esc(p.sign)} (“${esc(VERB[p.sign] || '')}”). With no known time there is no
      house to say where. This could mean ${esc(FUNC[k])} working through “${esc(VERB[p.sign] || p.sign)}”; it could also mean something else entirely,
      and the schools below read it their own ways. What does it mean to you?${TMPL}</div>`;
    return `<div class="possible">${esc(cap(FUNC[k] || NAME[k]))}, qualified by ${esc(p.sign)} (“${esc(VERB[p.sign] || '')}”), lived in the ${ord(p.house)} house
      (${esc(AREA[p.house - 1] || '')}). This could mean ${esc(FUNC[k])} working through “${esc(VERB[p.sign] || p.sign)}” there;
      it could also mean something else entirely, and the schools below read it their own ways. What does it mean to you?${TMPL}</div>`;
  }
  function aspectNote(a) {
    return `<div class="possible">This could mean ${esc(FUNC[a.a] || NAME[a.a])} and ${esc(FUNC[a.b] || NAME[a.b])} meeting as ${esc(NATURE[a.type] || a.type)};
      it could also mean the two take turns, one loud while the other waits. What does it mean to you?${TMPL}</div>`;
  }

  // ───────────────────────── controls ─────────────────────────
  function defaultsOn() { return new Set(S.schools.filter(s => s.default_on).map(s => s.slug)); }
  function renderSchoolChips() {
    const host = $('#schoolChips');
    host.innerHTML = S.schools.map(s => {
      const on = S.on.has(s.slug);
      const z = s.zodiac === 'sidereal' ? 'sidereal' : s.zodiac === 'tropical' ? 'tropical' : '';
      return `<label class="chip${on ? ' on' : ''}" title="${esc(s.family_label || '')}${s.year_label ? ' · ' + esc(s.year_label) : ''}">
        <input type="checkbox" data-school="${esc(s.slug)}"${on ? ' checked' : ''}>${esc(s.label)}${s.slug === 'esoteric-bailey' ? ' <span class="fam">(paraphrase)</span>' : ''}${z ? ` <span class="z">${z}</span>` : ''}</label>`;
    }).join('');
    $('#schoolCount').textContent = `${S.on.size} of ${S.schools.length} on`;
  }
  function renderRulers() {
    const sel = $('#rulerSel');
    sel.innerHTML = SETS.map(s => `<option value="${s.id}"${s.id === S.rulers ? ' selected' : ''}>${esc(s.label)}</option>`).join('');
    const opts = [['Venus', 'traditional, modern', ['rulers-traditional', 'rulers-modern']], ['Vulcan', 'Bailey, esoteric column', ['rulers-bailey-esoteric']],
      ['Vesta', 'colour-horoscope notes', ['rulers-colour-system']]];
    $('#taurusDemo').innerHTML = `Who rules ${SG('Taurus')} Taurus? ` + opts.map(([n, l, ids]) =>
      `<span class="${ids.includes(S.rulers) ? 'cur' : ''}">${esc(n)} (${esc(l)})</span>`).join(' · ');
    const notes = {
      'rulers-traditional': 'The seven visible planets: the scheme Ptolemy and Lilly share; the Bṛhat Jātaka’s sign lords are the same.',
      'rulers-modern': 'The outer planets added: Pluto for Scorpio, Uranus for Aquarius, Neptune for Pisces (the old rulers often kept as co-rulers).',
      'rulers-bailey-esoteric': 'One school’s teaching: Alice A. Bailey, Esoteric Astrology (1951), Tabulation VI, print p. 68, the esoteric (“disciple”) column; given as facts with attribution. Vulcan was never found in the sky, so chains pause there; Earth is read as the point opposite the Sun. You choose the set; nothing here assigns one to a person.',
      'rulers-colour-system': 'Only two changes from the modern set: Vesta for Taurus and Chiron for Virgo, as used in some colour-coded horoscope reports and taught by some contemporary schools. Vesta is not computed here, so chains pause there.',
    };
    $('#rulerNote').textContent = notes[S.rulers] || '';
  }
  function renderMeta() {
    const m = $('#chartMeta');
    // switching charts is the dropdown's job (at the top); this line says what is on the wheel
    const failed = S.handoffFailed ? '<span class="pill warn">no chart arrived from the calculator: showing the example</span>'
      : S.pickFailed ? `<span class="pill warn">${esc(S.pickFailed)}: showing the example</span>` : '';
    const c = S.pub;
    m.innerHTML = S.source === 'viewer'
      ? `<b>A chart from the calculator</b><span class="pill private">this tab only · positions, no birth data</span>`
      : S.source === 'saved'
        ? `<b>${esc(S.savedName || 'Your saved chart')}</b><span class="pill private">your saved chart · only its id is in the address</span>`
        : S.source === 'local'
          ? `<b>Your chart</b><span class="pill private">private · local files, never committed</span>`
          : S.source === 'public'
            ? `<b>${esc(c.label)}</b>${c.group === 'event' ? '<span class="pill">AI event · the sky at a moment</span>'
              : `<span class="pill">public figure · ${esc(ratingShort(c))}</span><span class="pill">placements, never the person</span>`}${c.time_known ? '' : '<span class="pill warn">time unknown: no houses</span>'}`
            : `${failed}<b>Example chart</b><span class="pill">invented, not a person</span><span>${esc(S.exampleNote)}</span>`;
    renderTimeNote();
    const segB = $$('#zodiacSeg button');
    segB.forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.z === S.zodiac)); b.disabled = !S.charts[b.dataset.z]; });
    const zn = $('#zodiacNote');
    if (S.zodiac === 'sidereal' && CH.ayan) zn.textContent = `${CH.ayan.label || CH.ayan.name}, ${(+CH.ayan.degrees).toFixed(1)}° back · ${hasHouses() ? 'whole-sign houses' : 'no houses (time unknown)'}. Aspects stay; signs move. Each school still reads its own zodiac.`;
    else zn.textContent = `${hasHouses() ? cap(hsName()) + ' houses' : 'No houses: the time is unknown'}. Each school reads its own zodiac (Jyotiṣa sidereal).`;
  }

  // ───────────────────────── URL ─────────────────────────
  const SHORT = { 'rulers-traditional': 'traditional', 'rulers-modern': 'modern', 'rulers-bailey-esoteric': 'esoteric', 'rulers-colour-system': 'colour' };
  const LONG = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [v, k]));
  function selToStr(sel) { if (!sel) return null; return sel.kind === 'planet' ? `planet:${sel.key}` : sel.kind === 'figure' ? `figure:${sel.i}` : `house:${sel.n}`; }
  function strToSel(s) {
    const m = /^(planet|figure|house):([a-z0-9]+)$/.exec(s || ''); if (!m) return null;
    return m[1] === 'planet' ? { kind: 'planet', key: m[2] } : m[1] === 'figure' ? { kind: 'figure', i: +m[2] } : { kind: 'house', n: +m[2] };
  }
  function urlWith(over) {
    const u = new URL(location.href);
    for (const [k, v] of Object.entries(over)) { if (v == null || v === '') u.searchParams.delete(k); else u.searchParams.set(k, v); }
    return u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString().replace(/%2C/g, ',').replace(/%3A/g, ':') : '') + u.hash;
  }
  function writeURL() {
    const def = defaultsOn();
    const same = def.size === S.on.size && [...def].every(x => S.on.has(x));
    const day = S.transits && S.transits.days[S.dayIdx] ? S.transits.days[S.dayIdx].date : null;
    history.replaceState(null, '', urlWith({
      mode: S.mode, schools: same ? null : ([...S.on].join(',') || 'none'), rulers: S.rulers === 'rulers-traditional' ? null : SHORT[S.rulers],
      zodiac: S.zodiac === 'tropical' ? null : S.zodiac, sel: S.mode === 'lens' ? selToStr(S.sel) : null,
      day: S.mode === 'today' ? day : null, q: S.mode === 'ask' && S.q ? S.q : null,
    }));
  }

  // ───────────────────────── modes ─────────────────────────
  function setMode(m, opts = {}) {
    S.mode = m;
    $$('.modes button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    for (const [k, id] of [['ask', 'modeAsk'], ['today', 'modeToday'], ['lens', 'modeLens'], ['book', 'modeBook']]) $('#' + id).hidden = k !== m;
    if (bookObserver) { bookObserver.disconnect(); bookObserver = null; }
    ({ ask: renderAsk, today: renderToday, lens: renderLens, book: renderBook })[m]();
    writeURL();
    if (opts.scroll && window.innerWidth <= 860) $('.modes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function rerender() { renderMeta(); ({ ask: renderAsk, today: renderToday, lens: renderLens, book: renderBook })[S.mode](); writeURL(); }
  function hl(spec, note) { WHEEL.highlight(spec); $('#wheelNote').innerHTML = note || ''; }
  function onPick(p) {
    S.sel = p.kind === 'planet' ? { kind: 'planet', key: p.key } : { kind: 'house', n: p.n };
    if (S.mode !== 'lens') setMode('lens', { scroll: true }); else { renderLens(); writeURL(); }
  }

  // ═════════ MODE 1: Ask — client-side BM25 over the shelf ═════════
  const STOP = new Set(('a an the and or but of to in on at for with by from is are was were be been being do does did has have had it its this that these those ' +
    'i me my mine you your we our they them their he she his her what which who whom why how when where there here as if than then so not no yes ' +
    'can could would should will shall may might must also just about into over under more most very much many some any all each one two ' +
    'mean means meaning tell say says said like get got make made').split(' '));
  const PROTECT = new Set(['mars', 'venus', 'uranus', 'aries', 'pisces', 'chiron', 'rahu', 'ketu', 'axis', 'crisis', 'always', 'perhaps', 'thus', 'jupiter', 'saturn', 'neptune', 'pluto', 'mercury', 'various', 'nodes']);
  function stem(w) {
    if (PROTECT.has(w) || w.length <= 4) return w;
    if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
    return w;
  }
  const tokenize = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
  function keysFromId(id) {
    const [ch, rest = ''] = id.split('.');
    const ks = [];
    for (const p of BODIES) if (new RegExp(`(^|-)${p}(-|$)`).test(rest)) ks.push('planet-' + p);
    const h = /^h(\d+)$/.exec(rest); if (h) ks.push('house-' + (+h[1]));
    for (const a of Object.keys(ANGLE)) if (rest.includes('-' + a + '-')) ks.push('aspect-' + a);
    if (rest === 't-square') ks.push('concept-t-square');
    if (/stellium/.test(rest)) ks.push('concept-stellium');
    if (ch === 'rulers') ks.push('concept-dispositor');
    if (ch === 'temperament') ks.push('concept-temperament');
    if (ch === 'generation') ks.push('concept-generation');
    if (ch === 'season') ks.push('concept-transit');
    return ks;
  }
  function buildIndex() {
    const docs = [];
    for (const p of S.passages) {
      const text = p.kind === 'grammar' ? p.name + ' ' + Object.values(p.sections || {}).join(' ') : p.text;
      docs.push({ p, school: p.school, keys: p.keys || [], toks: tokenize(text) });
    }
    for (const it of (S.readings || [])) for (const r of it.readings) {
      docs.push({ mine: { it, r }, schools: r.schools, keys: keysFromId(it.id), toks: tokenize((it.title || '') + ' ' + r.texts.join(' ')) });
    }
    const df = new Map(); let tot = 0;
    for (const d of docs) {
      d.tf = new Map(); for (const t of d.toks) d.tf.set(t, (d.tf.get(t) || 0) + 1);
      d.len = d.toks.length; tot += d.len;
      for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    }
    IDX = { docs, df, N: docs.length, avg: tot / Math.max(1, docs.length) };
  }
  function bm25(d, qt) {
    let s = 0; const k1 = 1.2, b = 0.75;
    for (const t of qt) {
      const f = d.tf.get(t); if (!f) continue;
      const n = IDX.df.get(t) || 0;
      const idf = Math.log(1 + (IDX.N - n + 0.5) / (n + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / IDX.avg));
    }
    return s;
  }
  const HOUSE_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
  const CONCEPTS = [
    [/t[\s-]?square/, 'concept-t-square'], [/final dispositor/, 'concept-final-dispositor'], [/disposit/, 'concept-dispositor'],
    [/\brul(e|es|ed|er|ers|ership)\b|\blord\b|domicile/, 'concept-rulership'], [/generation/, 'concept-generation'],
    [/transit/, 'concept-transit'], [/night|nocturnal|diurnal|\bsect\b/, 'concept-night-birth'], [/midheaven|\bmc\b|tilt/, 'concept-midheaven'],
    [/ascendant|rising/, 'concept-ascendant'], [/stellium/, 'concept-stellium'], [/retrograde/, 'concept-retrograde'],
    [/exalt/, 'concept-exaltation'], [/detriment/, 'concept-detriment'], [/temperament|element|fire|water|earth sign|air sign/, 'concept-elements'],
    [/temperament|choleric|sanguine|melanchol|phlegm/, 'concept-temperament'], [/sidereal|tropical|ayanam|precession/, 'concept-sidereal'],
    [/vulcan/, 'concept-vulcan'], [/new moon|full moon|moon phase|lunation/, 'concept-moon-phase'], [/cardinal/, 'concept-cardinal'],
    [/\bfixed\b/, 'concept-fixed'], [/mutable/, 'concept-mutable'], [/horizon/, 'concept-horizon'],
  ];
  function parseQuery(q) {
    const s = q.toLowerCase();
    const ents = { planets: [], signs: [], houses: [], aspects: [], concepts: [] };
    const nm = { northnode: /north node|\brahu\b|dragon.?s head/, southnode: /south node|\bketu\b|dragon.?s tail/ };
    for (const p of BODIES) if ((nm[p] || new RegExp(`\\b${p}\\b`)).test(s)) ents.planets.push(p);
    for (const sg of SIGNS) if (new RegExp(`\\b${sg.toLowerCase()}\\b`).test(s)) ents.signs.push(sg);
    for (const m of s.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b|\bhouse\s+(\d{1,2})\b/g)) { const n = +(m[1] || m[2]); if (n >= 1 && n <= 12) ents.houses.push(n); }
    HOUSE_WORDS.forEach((w, i) => { if (new RegExp(`\\b${w} house`).test(s)) ents.houses.push(i + 1); });
    const asp = { conjunction: /conjunct/, opposition: /opposi/, square: /\bsquare/, trine: /\btrine/, sextile: /sextile/ };
    for (const [a, rx] of Object.entries(asp)) if (rx.test(s) && !(a === 'square' && /t[\s-]?square/.test(s))) ents.aspects.push(a);
    for (const [rx, k] of CONCEPTS) if (rx.test(s) && !ents.concepts.includes(k)) ents.concepts.push(k);
    const keys = [...ents.planets.map(p => 'planet-' + p), ...ents.signs.map(x => 'sign-' + x.toLowerCase()), ...ents.houses.map(n => 'house-' + n),
      ...ents.aspects.map(a => 'aspect-' + a), ...ents.concepts];
    const ctx = [];
    for (const p of ents.planets) { const pp = CH.pts[p]; if (pp) { ctx.push('sign-' + pp.sign.toLowerCase()); if (pp.house) ctx.push('house-' + pp.house); } }
    const extra = [];
    if (ents.concepts.includes('concept-rulership')) extra.push('ruler', 'lord', 'domicile');
    if (ents.concepts.includes('concept-night-birth')) extra.push('nocturnal', 'diurnal', 'night', 'day');
    return { toks: tokenize(q).concat(extra.map(stem)), keys, ctx, ents };
  }
  const SEEDS = ['What does my Mars do?', 'Who rules Taurus?', 'What is a T-square, and how is it worked with?',
    'Does one transit need another to set it off?', 'Does a night birth change anything?', 'Is Aquarius also ruled by Saturn?',
    'Why is the Midheaven tilted?', 'What is the final dispositor?'];
  function renderAsk() {
    const host = $('#modeAsk');
    host.innerHTML = `<h2>Ask</h2>
      <p class="sub">A question retrieves what the switched-on schools have to say: their grammar items, short passages from
      public-domain books, and a few seconds of contemporary talk. Ranking happens here in the page (BM25, a keyword method), grouped by school.</p>
      <form class="askbox" id="askForm" role="search"><input id="askQ" type="search" autocomplete="off" placeholder="Ask about a planet, a sign, a house, a figure…" aria-label="Your question" value="${esc(S.q)}">
      <button type="submit">Ask</button></form>
      <div class="seeds" aria-label="Questions to start from">${SEEDS.map(q => S.source === 'public' ? q.replace(/\bmy\b/, 'this') : q).map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <div class="notice">On recursive.eco an assistant would compose an answer from these; this mock shows what it would draw on.</div>
      <div id="askOut"></div>`;
    $('#askForm').addEventListener('submit', e => { e.preventDefault(); S.q = $('#askQ').value.trim(); runAsk(); writeURL(); });
    $$('.seeds button', host).forEach(b => b.addEventListener('click', () => { S.q = b.dataset.q; $('#askQ').value = S.q; runAsk(); writeURL(); }));
    if (S.q) runAsk(); else { $('#askOut').innerHTML = ''; hl(null, 'Ask a question: the chart points it names light up here.'); }
  }
  function runAsk() {
    const out = $('#askOut');
    if (!S.q) { out.innerHTML = ''; return; }
    if (!IDX) buildIndex();
    const { toks, keys, ctx, ents } = parseQuery(S.q);
    const scored = [];
    for (const d of IDX.docs) {
      const sch = d.mine ? d.schools : [d.school];
      if (!d.mine && !S.on.has(d.school)) continue;
      if (d.mine && sch.length && !sch.some(x => S.on.has(x))) continue;
      // the schools' own items first; book windows and caption snippets are short, so BM25 would favour them
      let sc = bm25(d, toks) * (d.mine ? 1.3 : ({ grammar: 1.25, book: 0.9, podcast: 0.7 }[d.p.kind] || 1));
      for (const k of keys) if (d.keys.includes(k)) sc += 3;
      for (const k of ctx) if (d.keys.includes(k)) sc += 1.2;
      if (sc > 0.5) scored.push([sc, d]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    // facts from the chart for what the question names
    const facts = [];
    for (const p of ents.planets) { const pp = CH.pts[p]; if (pp) facts.push(`${PN(p)}: ${esc(pp.pos || pp.sign)}${inHouse(pp)}${pp.retro ? ', retrograde' : ''}${pp.approx ? ', approximate' : ''}`); }
    if (!hasHouses() && (ents.houses.length || ['concept-ascendant', 'concept-midheaven', 'concept-horizon', 'concept-night-birth'].some(k => ents.concepts.includes(k))))
      facts.push('No houses, Ascendant or Midheaven here: the time is unknown');
    for (const sg of ents.signs) {
      if (ents.concepts.includes('concept-rulership')) facts.push(`${SG(sg)} ${esc(sg)} is ruled by ${SETS.map(x => `${esc(NAME[rulerOf(sg, x.id)] || rulerOf(sg, x.id))} <small>(${esc(x.short)})</small>`).join(', ')}`);
      const inIt = BODIES.filter(b => CH.pts[b] && CH.pts[b].sign === sg);
      if (inIt.length) facts.push(`In ${SG(sg)} ${esc(sg)} here: ${pList(inIt)}`);
    }
    for (const n of ents.houses) { const h = houseInfo(n); if (h) facts.push(`House ${n}: built by ${esc(h.builder)}, owned by ${PN(h.owner)}${h.tenants.length ? ', tenants ' + pList(h.tenants) : ', no tenants'}`); }
    if (ents.concepts.includes('concept-t-square')) {
      const ts = CH.figures.filter(f => f.type === 'T-square');
      ts.forEach(f => facts.push(`This chart's ${esc(figName(f))}`));
      if (!ts.length) facts.push('This chart has no T-square');
    }
    if (ents.concepts.includes('concept-stellium')) CH.figures.filter(f => f.type === 'stellium').forEach(f => facts.push(`This chart's ${esc(figName(f))}`));
    if (ents.concepts.includes('concept-final-dispositor') || ents.concepts.includes('concept-dispositor')) {
      const fd = finalDispositor(); facts.push(fd.single ? `Final dispositor (${esc(SHORT[S.rulers])} set): ${PN(fd.single)}` : `No single final dispositor in the ${esc(SHORT[S.rulers])} set`);
    }
    // group by school
    const groups = new Map();
    for (const [sc, d] of scored) {
      const g = d.mine ? '__mine' : d.school;
      if (!groups.has(g)) groups.set(g, { best: sc, items: [] });
      const G2 = groups.get(g); if (G2.items.length < 3) G2.items.push(d);
    }
    const order = [...groups.entries()].sort((a, b) => (a[0] === '__mine' ? -1 : b[0] === '__mine' ? 1 : b[1].best - a[1].best));
    const block = ([slug, g]) => {
      if (slug === '__mine') return `<div class="group"><h3>Your readings <span class="fam">local draft, private</span></h3><div class="rgrid">${g.items.map(d => mineCard(d.mine.it, d.mine.r)).join('')}</div></div>`;
      const s = S.schoolBy[slug] || { label: slug };
      return `<div class="group"><h3>${esc(s.label)} <span class="fam">${esc(s.family_label || '')}</span> <span class="n">${g.items.length} of what it offers</span></h3>
        <div class="rgrid">${g.items.map(d => card(d.p, { what: esc(keyLabel(d.p.keys)) })).join('')}</div></div>`;
    };
    const top = order.slice(0, 6), rest = order.slice(6);
    S.lastAsk = { q: S.q, facts: facts.map(plainOf), keys };
    out.innerHTML = (order.length || facts.length ? aiRow('ask') : '') + (facts.length ? `<div class="facts">${facts.map(f => `<span class="fact">${f}</span>`).join('')}</div>` : '') +
      (order.length ? top.map(block).join('') + (rest.length ? `<details class="fold"><summary>${rest.length} more school${rest.length > 1 ? 's' : ''} with something on this</summary>${rest.map(block).join('')}</details>` : '')
        : `<p class="empty">Nothing on the shelf matches that among the ${S.on.size} schools switched on. Try other words, or switch more schools on.</p>`);
    const f = ents.concepts.includes('concept-t-square') ? CH.figures.find(x => x.type === 'T-square') : null;
    const planets = [...new Set(ents.planets.concat(f ? f.members : []))];
    hl({ planets, aspectsOf: ents.planets.length === 1 ? ents.planets : [], aspects: f ? figAspects(f) : [], signs: ents.signs, houses: ents.houses.concat(ents.planets.map(p => CH.pts[p] && CH.pts[p].house).filter(Boolean)) },
      planets.length || ents.signs.length || ents.houses.length ? 'Lit: what the question names.' : 'The question names no chart point; the results come from words alone.');
  }
  function keyLabel(keys) {
    const k = (keys || [])[0] || '';
    const [t, ...r] = k.split('-'); const v = r.join('-');
    if (t === 'planet') return 'on ' + (NAME[v] || v);
    if (t === 'sign') return 'on ' + cap(v);
    if (t === 'house') return `on the ${ord(+v)} house`;
    if (t === 'aspect') return `on the ${v}`;
    if (t === 'pair') return 'on the pair ' + v.split('-').map(x => NAME[x] || x).join('–');
    if (t === 'concept') return 'on ' + v.replace(/-/g, ' ');
    return '';
  }

  // ═════════ MODE 2: Today — at most three transits, slow planets first ═════════
  const dayMs = s => Date.parse(String(s).slice(0, 10) + 'T12:00:00Z');
  const fmtDay = (s, o = { month: 'short', day: 'numeric' }) => new Date(dayMs(s)).toLocaleDateString('en-US', Object.assign({ timeZone: 'UTC' }, o));
  function transitLon(t) {
    // a computed day carries the transiting longitude itself
    if (typeof t.lon === 'number') return S.zodiac === 'sidereal' && CH.ayan ? n360(t.lon - (+CH.ayan.degrees || 0)) : t.lon;
    // the file names the transiting sign, not its degree: place it from the natal point and the aspect (approximate)
    const trop = S.charts.tropical, nl = lonOf(t.natal, trop);
    if (nl == null) return null;
    const ang = ANGLE[t.aspect] || 0, si = SIGNS.indexOf(t.transitingSign);
    const cands = [n360(nl + ang), n360(nl - ang)];
    let best = cands.find(c => Math.floor(c / 30) === si);
    if (best == null) best = cands.sort((a, b) => Math.abs(n360(a - (si * 30 + 15) + 180) - 180) - Math.abs(n360(b - (si * 30 + 15) + 180) - 180))[0];
    if (S.zodiac === 'sidereal' && CH.ayan) best = n360(best - (+CH.ayan.degrees || 0));
    return best;
  }
  function spanOf(t) { return (S.transits.spans || []).find(s => s.transiting === t.transiting && s.natal === t.natal && s.aspect === t.aspect); }
  // a small time bar: start, exact(s), end, today. Drawn at the width it will show at, so text stays ~11px;
  // labels that would collide are dropped (lowest priority first) or moved to the free row.
  function barWidth() {
    const host = $(S.mode === 'book' ? '#modeBook' : '#modeToday');
    const w = host && host.clientWidth ? host.clientWidth - 34 : 560;
    return Math.round(Math.max(280, Math.min(560, w)));
  }
  const realToday = () => new Date().toLocaleDateString('en-CA');
  function timeBar(span, today, domain) {
    const W = barWidth(), M = 12;
    const ex = (span.exacts || []).map(e => e.local || e.utc);
    // the file covers a window: a span that touches its edge may run on beyond it, so say so rather than show a false start or end
    const win = (S.transits && S.transits.window) || {};
    const openStart = !!win.startDate && span.firstDay <= win.startDate, openEnd = !!win.endDate && span.lastDay >= win.endDate;
    const pts = [dayMs(span.firstDay), dayMs(span.lastDay), ...ex.map(dayMs)];
    const lo = Math.min(...pts, domain ? dayMs(domain[0]) : Infinity), hi = Math.max(...pts, domain ? dayMs(domain[1]) : -Infinity);
    const span0 = Math.max(hi - lo, 86400000);
    const X = t => M + (t - lo) / span0 * (W - 2 * M);
    const labels = [];
    const add = (x, text, row, pri, cls, alt) => labels.push({ x, text, row, pri, cls: cls || '', alt });
    ex.forEach(e => add(X(dayMs(e)), 'exact ' + fmtDay(e), 'top', 2));
    if (today) add(X(dayMs(today)), today === realToday() ? 'today' : 'this day', 'bot', 3, 'nowl');
    add(X(dayMs(span.firstDay)), openStart ? fmtDay(span.firstDay) + ' (window start)' : fmtDay(span.firstDay), 'bot', 1, '', openStart ? fmtDay(span.firstDay) : null);
    add(X(dayMs(span.lastDay)), openEnd ? fmtDay(span.lastDay) + ' (window end)' : fmtDay(span.lastDay), 'bot', 1, '', openEnd ? fmtDay(span.lastDay) : null);
    const placed = { top: [], bot: [] };
    const fits = (row, a, b) => placed[row].every(([c, d]) => b + 6 < c || a - 6 > d);
    for (const l of labels.sort((a, b) => b.pri - a.pri)) {
      for (const text of [l.text, l.alt].filter(Boolean)) {
        const w = text.length * 6.1;
        const cx = Math.max(2 + w / 2, Math.min(W - 2 - w / 2, l.x));
        for (const row of [l.row, l.row === 'top' ? 'bot' : 'top']) {
          if (fits(row, cx - w / 2, cx + w / 2)) { placed[row].push([cx - w / 2, cx + w / 2]); l.cx = cx; l.prow = row; l.text = text; break; }
        }
        if (l.cx != null) break;
      }
    }
    const aria = `${span.label || ''}: in orb ${fmtDay(span.firstDay)} to ${fmtDay(span.lastDay)}${openStart || openEnd ? ` within this file's window (${fmtDay(win.startDate)} to ${fmtDay(win.endDate)}); it may run on beyond it` : ''}${ex.length ? ', exact ' + ex.map(e => fmtDay(e)).join(' and ') : ''}`;
    let s = `<svg class="tbar" viewBox="0 0 ${W} 46" style="max-width:${W}px" role="img" aria-label="${esc(aria)}">`;
    s += `<line class="base" x1="${X(lo).toFixed(1)}" y1="23" x2="${X(hi).toFixed(1)}" y2="23"/>`;
    s += `<line class="orb asp-${esc(span.aspect)}" x1="${X(dayMs(span.firstDay)).toFixed(1)}" y1="23" x2="${X(dayMs(span.lastDay)).toFixed(1)}" y2="23"/>`;
    ex.forEach(e => { const x = X(dayMs(e)).toFixed(1); s += `<path class="ex" d="M${x} 17l6 6-6 6-6-6z" style="fill:currentColor"/>`; });
    if (today) { const x = X(dayMs(today)).toFixed(1); s += `<line class="now" x1="${x}" y1="14" x2="${x}" y2="32"/>`; }
    for (const l of labels) if (l.cx != null) s += `<text class="${l.cls}" x="${l.cx.toFixed(1)}" y="${l.prow === 'top' ? 10 : 43}" text-anchor="middle">${esc(l.text)}</text>`;
    return `<span class="p-${esc(span.transiting)}">${s}</svg></span>`;
  }
  // Today (and the Book's season) lay the day's transits over a chart as a calendar for its owner: left out for public charts
  const publicNoToday = () => isEvent()
    ? 'Today lays the day’s transits over a chart as a personal calendar. An event’s chart is read here as the sky of its own moment, so Today is left out for it.'
    : 'Today lays the day’s transits over a chart as a calendar for its owner. A public figure’s chart is read here for its placements only, so Today is left out: nothing on this page forecasts anything about anyone.';
  function renderToday() {
    const host = $('#modeToday');
    if (!S.transits || !S.transits.days || !S.transits.days.length) {
      const msg = S.source === 'public' ? publicNoToday()
        : S.source !== 'viewer' && S.source !== 'saved' ? 'No transits file for this chart.'
          : S.transitsPending ? 'Asking the chart server (chart.recursive.eco) for 90 days of transits to this chart’s positions…'
            : 'The chart server did not answer, so this chart has no transits here. Everything else on the page is computed without it.';
      host.innerHTML = `<h2>Today</h2><p class="empty">${esc(msg)}</p>`; hl(null, ''); return;
    }
    const days = S.transits.days, d = days[S.dayIdx], win = S.transits.window || {};
    const top = (d.top3 || []).slice().sort((a, b) => (BODYW[b.transiting] || 0) - (BODYW[a.transiting] || 0) || b.score - a.score).slice(0, 3);
    const key = t => `${t.transiting}|${t.natal}|${t.aspect}`;
    const topKeys = new Set(top.map(key));
    const minor = (S.transits.spans || []).filter(s => s.firstDay <= d.date && d.date <= s.lastDay && !topKeys.has(key(s))).sort((a, b) => b.weight - a.weight);
    const cards = top.map(t => {
      const sp = spanOf(t) || { transiting: t.transiting, natal: t.natal, aspect: t.aspect, firstDay: d.date, lastDay: d.date, exacts: t.exacts || [], label: t.label };
      const title = `${TT[t.transiting] || NAME[t.transiting]} ${AV[t.aspect] || t.aspect} ${NT[t.natal] || NAME[t.natal]}`;
      return `<div class="tcard"><h3>${esc(title)}</h3>
        <div class="tl">${G(t.transiting)}<span>${esc(NAME[t.transiting])}${t.transitingRetrograde ? ' (retrograde)' : ''} in ${esc(t.transitingSign)}</span>
          <span class="tag ${esc(t.aspect)}">${esc(t.aspect)}</span><span>natal ${PN(t.natal)}</span>
          <span>orb ${(+t.orb).toFixed(2)}°, ${t.applying ? 'applying' : 'separating'}${t.exactToday ? ', exact today' : ''}</span></div>
        ${timeBar(sp, d.date)}
        <div class="possible">${t.transiting === t.natal
          ? `This could mean ${esc(NAME[t.natal])} coming back to look at its own starting point: ${esc(FUNC[t.natal] || '')}, checked against where it began.`
          : `This could mean ${esc(FUNC[t.transiting] || NAME[t.transiting])} ${esc(AX[t.aspect] || 'meeting')} ${esc(FUNC[t.natal] || NAME[t.natal])}.`}
          It could also mean ${esc(AY[t.aspect] || 'something quieter')}. What does it mean to you?${TMPL}</div>
        <div class="actrow"><button type="button" class="minibtn" data-lens="${esc(t.natal)}">See natal ${esc(NAME[t.natal] || t.natal)} in the Lens</button></div></div>`;
    }).join('');
    const minorHtml = minor.length ? `<details class="fold"><summary>${minor.length} quieter contact${minor.length > 1 ? 's' : ''} around this day (folded)</summary><ul>${minor.map(s =>
      `<li>${G(s.transiting)}${esc(s.label)} <span class="tag ${esc(s.aspect)}">${esc(s.aspect)}</span> <small>in orb ${esc(fmtDay(s.firstDay))} to ${esc(fmtDay(s.lastDay))}</small></li>`).join('')}</ul></details>` : '';
    const ev = (d.events || []).length ? `<details class="fold"><summary>${d.events.length} sky event${d.events.length > 1 ? 's' : ''} this day (stations, ingresses)</summary><ul>${d.events.map(e => `<li>${G(e.transiting)}${esc(e.label)}</li>`).join('')}</ul></details>` : '';
    const mo = d.moon ? `<details class="fold"><summary>The Moon this day: ${esc(d.moon.signAtNoon)}, your ${ord(d.moon.natalHouseAtNoon)} house (folded: it moves fast)</summary><ul>${(d.moon.exactAspects || []).map(a => `<li>${G('moon')}${esc(a.label)} <small>at ${esc(String(a.local || '').slice(11, 16))}</small></li>`).join('') || '<li>no exact contacts</li>'}</ul></details>` : '';
    const cfg = S.transits.config || {};
    const todayStr = realToday();
    const tIdx = days.findIndex(x => x.date === todayStr);
    host.innerHTML = `<h2>Today</h2><p class="sub">At most three transits for the day, slow planets first; everything else is folded away. Each bar runs from the first to the last day the contact is in orb in this file, with its exact moment marked.</p>
      <div class="stepper"><button type="button" id="dPrev" aria-label="Previous day"${S.dayIdx === 0 ? ' disabled' : ''}>‹</button>
        <input type="date" id="dPick" value="${esc(d.date)}" min="${esc(days[0].date)}" max="${esc(days[days.length - 1].date)}" aria-label="Day">
        <button type="button" id="dNext" aria-label="Next day"${S.dayIdx === days.length - 1 ? ' disabled' : ''}>›</button>
        <span class="dname">${esc(fmtDay(d.date, { weekday: 'long', month: 'long', day: 'numeric' }))}</span>
        ${tIdx >= 0 && tIdx !== S.dayIdx ? '<button type="button" class="minibtn today" id="dToday">today</button>' : ''}</div>
      ${cards ? cards + aiRow('today') : '<p class="empty">No transit within 1° this day. A quiet sky is also a reading: what would you do with a day nothing asks of you?</p>'}
      ${minorHtml}${ev}${mo}
      <p class="rules">How these were chosen: ${esc(cfg.scoring && cfg.scoring.intent || 'slow planets first, then exactness')}; orb ${esc(cfg.orb || 1)}° at ${S.transits.computed ? 'noon UTC' : 'local noon'}; the Moon kept out of the ranking. ${esc(cfg.note || 'A calendar of geometry, not a forecast.')} Window: ${esc(fmtDay(win.startDate || days[0].date))} to ${esc(fmtDay(win.endDate || days[days.length - 1].date))}. Bars show the first and last day in orb; a contact can leave orb and return between them.</p>`;
    const go = i => { S.dayIdx = Math.max(0, Math.min(days.length - 1, i)); renderToday(); writeURL(); };
    $('#dPrev').addEventListener('click', () => go(S.dayIdx - 1));
    $('#dNext').addEventListener('click', () => go(S.dayIdx + 1));
    $('#dPick').addEventListener('change', e => { const i = days.findIndex(x => x.date === e.target.value); if (i >= 0) go(i); });
    const tb = $('#dToday'); if (tb) tb.addEventListener('click', () => go(tIdx));
    $$('[data-lens]', host).forEach(b => b.addEventListener('click', () => { S.sel = b.dataset.lens === 'ascendant' || b.dataset.lens === 'midheaven' ? null : { kind: 'planet', key: b.dataset.lens }; setMode('lens', { scroll: true }); }));
    hl({ planets: top.map(t => t.natal), transits: top.map(t => ({ key: t.transiting, natal: t.natal, type: t.aspect, lon: transitLon(t) })) },
      top.length ? `Lit: the natal points today's ${top.length === 1 ? 'transit touches' : top.length + ' transits touch'}; the outer ring shows each transiting planet (approximate).` : '');
  }

  // ═════════ MODE 3: Lens — everything one planet (or figure, or house) touches ═════════
  // A figure is always named by its members ("the T-square (Mars opposite Pluto, both square the Sun,
  // apex Sun)"), never "the figure": the reader should not have to look up which shape is meant.
  function figLabel(f) { return cap(figName(f)); }
  function figAspects(f) {
    const m = f.members || [];
    return CH.aspects.filter(a => m.includes(a.a) && m.includes(a.b));
  }
  function emptyPoint(f) { const p = f.type === 'T-square' ? positionOf(f.apex) : null; return p ? n360(p.lon + 180) : null; }
  function renderLens() {
    const host = $('#modeLens');
    if (S.sel && S.sel.kind === 'planet' && !CH.pts[S.sel.key]) S.sel = null;
    if (S.sel && S.sel.kind === 'figure' && !CH.figures[S.sel.i]) S.sel = null;
    if (S.sel && S.sel.kind === 'house' && !houseInfo(S.sel.n)) S.sel = null;
    if (!S.sel) S.sel = CH.figures.length ? { kind: 'figure', i: Math.max(0, CH.figures.findIndex(f => f.type === 'T-square')) } : { kind: 'planet', key: 'sun' };
    const sel = S.sel;
    const pressed = (k, v) => String(sel.kind === k && (sel.key === v || sel.i === v || sel.n === v));
    // no known time: no houses to pick, and the picker says why
    const housePick = hasHouses()
      ? `<select id="houseSel" class="minibtn" aria-label="A house"><option value="">a house…</option>${CH.houses.map(h => `<option value="${h.n}"${sel.kind === 'house' && sel.n === h.n ? ' selected' : ''}>House ${h.n} (${esc(h.sign)})</option>`).join('')}</select>`
      : '<span class="minibtn" style="cursor:default;color:var(--mut)">no houses: the time is unknown</span>';
    const picker = `<div class="picker" role="group" aria-label="Figures">${CH.figures.map((f, i) => `<button type="button" class="pbtn fig" data-fig="${i}" aria-pressed="${pressed('figure', i)}">${esc(figLabel(f))}</button>`).join('')}
        ${housePick}</div>
      <div class="picker" role="group" aria-label="Planets">${BODIES.filter(k => CH.pts[k]).map(k => `<button type="button" class="pbtn p-${k}" data-p="${k}" aria-pressed="${pressed('planet', k)}">${G(k)}<span style="color:var(--ink-soft)">${esc(NAME[k])}</span></button>`).join('')}</div>`;
    let body = '';
    if (sel.kind === 'planet') body = lensPlanet(sel.key);
    else if (sel.kind === 'figure') body = lensFigure(CH.figures[sel.i]);
    else body = lensHouse(sel.n);
    host.innerHTML = `<h2>Lens</h2><p class="sub">Tap a planet (here or on the wheel), a figure${hasHouses() ? ' or a house' : ''}: everything it touches lights up, and each switched-on school's reading of those links sits side by side.</p>${picker}${body}`;
    $$('[data-p]', host).forEach(b => b.addEventListener('click', () => { S.sel = { kind: 'planet', key: b.dataset.p }; renderLens(); writeURL(); }));
    $$('[data-fig]', host).forEach(b => b.addEventListener('click', () => { S.sel = { kind: 'figure', i: +b.dataset.fig }; renderLens(); writeURL(); }));
    const hs = $('#houseSel'); if (hs) hs.addEventListener('change', e => { if (e.target.value) { S.sel = { kind: 'house', n: +e.target.value }; renderLens(); writeURL(); } });
    $$('[data-synby]', host).forEach(b => b.addEventListener('click', () => { S.synBy = b.dataset.synby; renderLens(); }));
  }
  function synopsis(rows, mine) {
    S.lastRows = rows;
    const toggle = `<div class="seg" role="group" aria-label="Arrange"><button type="button" data-synby="link" aria-pressed="${S.synBy === 'link'}">by link</button><button type="button" data-synby="school" aria-pressed="${S.synBy === 'school'}">by school</button></div>`;
    const built = rows.map(r => ({ r, cards: schoolCards(r.keysFor, { whatFor: r.whatFor, n: 260 }) }));
    let html = `<div class="synhead"><h3>Side by side: ${enabledSchools().length} school${enabledSchools().length === 1 ? '' : 's'} on</h3>${toggle}</div>`;
    if (mine.length) html += `<details class="lrow" open><summary>Your readings <span class="facts-inline">local draft, private</span></summary><div class="rgrid">${mine.join('')}</div></details>`;
    if (S.synBy === 'link') {
      html += built.map(({ r, cards }, i) => `<details class="lrow"${i < 3 && !r.closed ? ' open' : ''}><summary>${r.label}<span class="facts-inline">${r.facts || ''} · ${cards.length} school${cards.length === 1 ? '' : 's'}</span></summary>
        ${cards.length ? `<div class="rgrid">${cards.map(c => c.html).join('')}</div>` : '<p class="empty">None of the switched-on schools speaks to this link.</p>'}</details>`).join('');
    } else {
      html += enabledSchools().map((s, i) => {
        const cs = built.map(({ r }) => {
          const one = schoolCards(r.keysFor, { whatFor: r.whatFor ? (sl => r.label + ' · ' + r.whatFor(sl)) : null, what: r.label, n: 260 }).find(c => c.slug === s.slug);
          return one ? one.html : '';
        }).filter(Boolean);
        if (!cs.length) return '';
        return `<details class="lrow"${i < 3 ? ' open' : ''}><summary>${esc(s.label)}<span class="facts-inline">${cs.length} of ${rows.length} links</span></summary><div class="rgrid">${cs.join('')}</div></details>`;
      }).join('');
    }
    return html;
  }
  function lensPlanet(k) {
    const p = CH.pts[k];
    const asps = aspectsOf(k);
    const byKind = {};
    for (const a of asps) (byKind[aspectKind(a)] = byKind[aspectKind(a)] || []).push(a);
    const owns = ownsHouses(k), rules = rulesSigns(k), disp = disposes(k);
    const ch = chainFrom(k), figs = figuresOf(k), dig = dignityOf(k, p.sign);
    const w = WEIGHT[k];
    const chainHtml = chainText(ch);
    const approx = p.approx ? ` · <b>approximate</b>: the time is unknown and the Moon moves 12 to 15° a day${p.dayRange ? ` (over that day, ${esc(p.dayRange[0])} to ${esc(p.dayRange[1])})` : ''}` : '';
    const kv = [
      ['Sign', `${SG(p.sign)} ${esc(fmtPos(p))} · ${esc(elementOf(p.sign))}, ${esc(modalityOf(p.sign))}, ${esc(polarityOf(p.sign))}${p.retro ? ' · retrograde' : ''}${approx}`],
      p.house ? ['Tenant of', `the ${ord(p.house)} house (${esc(AREA[p.house - 1])})${S.zodiac === 'sidereal' && p.placidusHouse ? ` · Placidus ${ord(p.placidusHouse)}` : ''}`]
        : ['House', '<span style="color:var(--mut)">none: with no known time there are no houses, so no tenancy and no house owned</span>'],
      hasHouses() ? ['Owner of', owns.length ? owns.map(n => `house ${n}`).join(', ') + ` <small>(${esc(SHORT[S.rulers])} set)</small>` : `no house cusp <small>(${esc(SHORT[S.rulers])} set)</small>`] : null,
      ['Rules', rules.length ? rules.map(s => `${SG(s)} ${esc(s)}`).join(', ') : 'no sign in this set'],
      ['Dispositor chain', chainHtml],
      ['Disposes', disp.length ? pList(disp) : 'no planet sits in a sign it rules'],
      ['Dignity', dig ? `${esc(dig)} <small>(traditional table)</small>` : '<span style="color:var(--mut)">none in the traditional table</span>'],
    ].filter(Boolean);
    if (w) kv.push(['Weight', `${w} of 46 in the method's tally`]);
    if (S.zodiac === 'sidereal' && p.nak) kv.push(['Nakṣatra', `${esc(p.nak.name)}, pada ${esc(p.nak.pada)}, lord ${esc(NAME[p.nak.lord] || p.nak.lord)}`]);
    const aspHtml = Object.keys(AKIND).filter(x => byKind[x]).map(x => `<div><small style="color:var(--mut)">${esc(AKIND[x])}</small><br>${byKind[x].map(a =>
      `<span class="tag ${esc(a.type)}">${esc(a.type)}</span> ${PN(other(a, k))} <small>${(+a.orb).toFixed(1)}°</small>`).join(' · ')}</div>`).join('');
    const figBtns = figs.map(([f, i]) => `<button type="button" class="pbtn fig" data-fig="${i}">${esc(figLabel(f))}</button>`).join(' ');
    const head = `<div class="lens-head"><h2>${G(k)}<span style="color:var(--ink)">${esc(NAME[k])}</span> <small style="color:var(--mut);font-size:14px;font-weight:400">${esc(fmtPos(p))}${inHouse(p)}${p.approx ? ' (approximate)' : ''}</small></h2>
      <dl class="kv">${kv.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl>
      ${asps.length ? `<div style="margin-top:8px;font-size:13px">${aspHtml}</div>` : ''}
      ${figBtns ? `<div class="actrow" style="margin-top:8px">Part of: ${figBtns}</div>` : ''}</div>${planetNote(k)}`;
    const types = [...new Set(asps.map(a => a.type))];
    const pairs = asps.map(a => 'pair-' + [k, other(a, k)].sort().join('-')).filter(x => S.byKey.has(x));
    const rows = [
      { label: `${G(k)} ${esc(NAME[k])}, the planet`, keysFor: ['planet-' + k] },
      { label: `in ${SG(p.sign)} ${esc(p.sign)}, the sign`, keysFor: sl => { const s = signForSchool(k, sl); return s ? ['sign-' + s.toLowerCase()] : []; },
        whatFor: sl => { const s = signForSchool(k, sl); return s && s !== p.sign ? `read on the ${esc(S.schoolBy[sl].zodiac)} sign: ${esc(s)}` : ''; } },
      p.house ? { label: `in the ${ord(p.house)} house`, keysFor: ['house-' + p.house] } : null,
      ...types.map(t => ({ label: `its ${esc(t)}${asps.filter(a => a.type === t).length > 1 ? 's' : ''}`, facts: 'to ' + asps.filter(a => a.type === t).map(a => esc(NAME[other(a, k)])).join(', '), keysFor: ['aspect-' + t] })),
    ].filter(Boolean);
    if (pairs.length) rows.push({ label: 'planet pairs it forms', facts: pairs.map(x => x.slice(5).split('-').map(y => NAME[y]).join('–')).join(', '), keysFor: pairs });
    if (rules.length) rows.push({ label: `the signs it rules (${esc(SHORT[S.rulers])} set)`, facts: rules.join(', '), keysFor: rules.map(s => 'sign-' + s.toLowerCase()), closed: true });
    rows.push({ label: 'dispositors and rulership', keysFor: ['concept-dispositor', 'concept-final-dispositor', 'concept-rulership'], closed: true });
    if (dig) rows.push({ label: `its ${esc(dig.split(' ')[0])}`, keysFor: ['concept-' + dig.split(' ')[0].replace('domicile', 'rulership')], closed: true });
    const mine = mineFor(['planets.' + k, 'pillars.' + k, 'generation.' + k, 'rulers.chain-' + k,
      ...asps.map(a => `aspects.${a.a}-${a.type}-${a.b}`), ...asps.map(a => `aspects.${a.b}-${a.type}-${a.a}`)]);
    hl({ planets: [k, ...asps.map(a => other(a, k))], planets2: ch.chain.slice(1).concat(disp), aspectsOf: [k], houses: p.house ? [p.house] : [], houses2: owns, signs: [p.sign], signs2: rules },
      p.house ? `Lit: ${esc(NAME[k])}, its aspects and partners, its sign and house; paler: the houses it owns, the signs it rules and its dispositor chain (${esc(SHORT[S.rulers])} set).`
        : `Lit: ${esc(NAME[k])}, its aspects and partners, its sign; paler: the signs it rules and its dispositor chain (${esc(SHORT[S.rulers])} set). No houses: the time is unknown.`);
    return head + aiRow('lens', 'selection') + synopsis(rows, mine);
  }
  function chainText(c) {
    let s = c.chain.map(x => `<span class="link">${PN(x)}</span>`).join(' <span class="arrow">→</span> ');
    if (c.end === 'domicile') s += ` <small>(${esc(NAME[c.at])} is in its own sign: the chain rests)</small>`;
    else if (c.end === 'loop') s += ` <small>(${esc(NAME[c.at])} repeats: a loop)</small>`;
    else if (c.end === 'uncomputed') s += ` <small>(${esc(UNCOMPUTED[c.at] || 'no position here: the chain pauses')})</small>`;
    return `<span class="chain">${s}</span>`;
  }
  function lensFigure(f) {
    const members = f.members || [];
    let head, rows, empty = null;
    if (f.type === 'T-square') {
      empty = emptyPoint(f);
      const es = signAt(empty), eh = houseOfLon(empty);
      const opp = f.opposition || members.filter(m => m !== f.apex);
      const ap = positionOf(f.apex);
      head = `<div class="lens-head"><h2>${esc(figLabel(f))}</h2>
        <dl class="kv"><dt>Apex</dt><dd>${PN(f.apex)}${ap ? ` in ${esc(ap.sign)}${inHouse(ap)}` : ''}</dd>
        <dt>Opposition</dt><dd>${pList(opp)}</dd>${f.quality ? `<dt>Signs</dt><dd>${esc(f.quality)}</dd>` : ''}<dt>Widest orb</dt><dd>${esc(f.maxOrb)}°</dd>
        <dt>Empty point</dt><dd>${SG(es)} ${esc(es)}${eh ? `, house ${eh}` : ''} <small>(opposite the apex)</small></dd></dl></div>
        <div class="possible">The method names two ways a T-square is often worked with: through the opposition (the two ends learning to share one tension),
          or by living the empty point opposite the apex (here ${esc(es)}${eh ? ', the ' + ord(eh) + ' house' : ''}), where the pressure could find a release.
          This could mean the apex ${esc(nm(f.apex))} carries the strain of ${esc(theNm(opp[0]))} opposite ${esc(theNm(opp[1]))}; it could also mean it is where that
          T-square's energy gets things done. What does it mean to you?${TMPL}</div>`;
      rows = [
        { label: `the ${esc(figName(f))}`, facts: 'what the schools say of T-squares', keysFor: ['concept-t-square'] },
        { label: `the apex: ${PN(f.apex)}`, keysFor: ['planet-' + f.apex] },
        { label: `the opposition: ${pList(opp)}`, keysFor: ['aspect-opposition', 'pair-' + opp.slice().sort().join('-')] },
        { label: 'the squares to the apex', keysFor: ['aspect-square', ...opp.map(o => 'pair-' + [o, f.apex].sort().join('-'))] },
        { label: `the empty point: ${SG(es)} ${esc(es)}${eh ? `, the ${ord(eh)} house` : ''}`, keysFor: sl => ['sign-' + es.toLowerCase()].concat(eh ? ['house-' + eh] : []), closed: true },
      ];
    } else if (f.type === 'stellium') {
      const hn = f.scope === 'house' ? houseNo(f) : null;
      head = `<div class="lens-head"><h2>${esc(figLabel(f))}</h2><dl class="kv"><dt>Members</dt><dd>${pList(members)}</dd>
        ${f.alsoThere && f.alsoThere.length ? `<dt>Also there</dt><dd>${pList(f.alsoThere)}</dd>` : ''}<dt>Rule</dt><dd>${esc(f.note || '3 or more planets; some traditions ask for 4 or more')}</dd></dl></div>
        <div class="possible">This could mean a lot of life gathered in ${hn ? 'the ' + ord(hn) + ' house' : esc(f.where)}: ${esc(andList(members.map(theNm)))}, a strong accent;
          it could also mean those ${members.length} crowd each other and take turns. What does it mean to you?${TMPL}</div>`;
      rows = [
        { label: `the ${esc(figName(f))}`, facts: 'what the schools say of stelliums', keysFor: ['concept-stellium'] },
        hn ? { label: `the ${ord(hn)} house`, keysFor: ['house-' + hn] } : { label: `${SG(f.where)} ${esc(f.where)}`, keysFor: sl => ['sign-' + String(f.where).toLowerCase()] },
        { label: 'the members', facts: members.map(m => NAME[m]).join(', '), keysFor: members.map(m => 'planet-' + m), closed: true },
      ];
    } else {
      const fa = figAspects(f);
      head = `<div class="lens-head"><h2>${esc(figLabel(f))}</h2><dl class="kv"><dt>Members</dt><dd>${pList(members)}</dd>
        ${fa.length ? `<dt>Aspects</dt><dd>${fa.map(a => `${esc(nm(a.a))} <span class="tag ${esc(a.type)}">${esc(a.type)}</span> ${esc(nm(a.b))}`).join(' · ')}</dd>` : ''}
        ${f.maxOrb != null ? `<dt>Widest orb</dt><dd>${esc(f.maxOrb)}°</dd>` : ''}</dl></div>`;
      rows = members.map(m => ({ label: PN(m), keysFor: ['planet-' + m] }));
    }
    const hlSpec = { planets: members.concat(f.alsoThere || []), aspects: figAspects(f), empty };
    if (f.type === 'stellium') { if (f.scope === 'house') hlSpec.houses = [houseNo(f)]; else hlSpec.signs = [f.where]; }
    hl(hlSpec, `Lit: the ${esc(figName(f))}${empty != null ? ' and its empty point' : ''}.`);
    return head + aiRow('lens', 'selection') + synopsis(rows, mineFor(['figures.' + figSlug(f)]));
  }
  function lensHouse(n) {
    const h = houseInfo(n); if (!h) return '<p class="empty">No such house.</p>';
    const head = `<div class="lens-head"><h2>House ${n} <small style="color:var(--mut);font-size:14px;font-weight:400">${esc(AREA[n - 1])}</small></h2>
      <dl class="kv"><dt>Builder</dt><dd>${SG(h.builder)} ${esc(h.builder)} on the cusp (${esc(h.pos || '')})</dd>
      <dt>Owner</dt><dd>${h.ownerPos ? `${PN(h.owner)}, in ${esc(h.ownerPos.sign)}, house ${h.ownerPos.house}` : `${esc(NAME[h.owner] || h.owner)} <small>(${esc(UNCOMPUTED[h.owner] || 'not computed')})</small>`} <small>(${esc(SHORT[S.rulers])} set)</small></dd>
      <dt>Tenants</dt><dd>${h.tenants.length ? pList(h.tenants) : 'none: the owner speaks for the house'}</dd></dl></div>
      <div class="possible">This could mean ${esc(AREA[n - 1])} lived in the manner of ${esc(h.builder)} (“${esc(VERB[h.builder])}”), with ${esc(NAME[h.owner] || h.owner)} looking after it from afar;
      it could also mean the tenants set the tone more than the builder. What does it mean to you?${TMPL}</div>`;
    const rows = [
      { label: `the ${ord(n)} house`, keysFor: ['house-' + n] },
      { label: `the builder: ${SG(h.builder)} ${esc(h.builder)}`, keysFor: ['sign-' + h.builder.toLowerCase()] },
    ];
    if (CH.pts[h.owner]) rows.push({ label: `the owner: ${PN(h.owner)}`, keysFor: ['planet-' + h.owner], closed: true });
    if (h.tenants.length) rows.push({ label: 'the tenants', facts: h.tenants.map(t => NAME[t]).join(', '), keysFor: h.tenants.map(t => 'planet-' + t), closed: true });
    hl({ houses: [n], planets: h.tenants, planets2: CH.pts[h.owner] ? [h.owner] : [], signs: [h.builder] }, `Lit: house ${n}, its tenants, its builder sign; its owner is paler.`);
    return head + aiRow('lens', 'selection') + synopsis(rows, mineFor(['houses.h' + String(n).padStart(2, '0')]));
  }

  // ═════════ MODE 4: Book — one document, in the method's order ═════════
  // each chapter's facts and key sets, for "Interpret this chapter with AI"
  function bookAI(id) {
    const P = ptLine;
    switch (id) {
      case 'generation': { const g = ['uranus', 'neptune', 'pluto', 'chiron'].filter(k => CH.pts[k]); return { facts: g.map(P), keys: g.map(k => ['planet-' + k]).concat([['concept-generation']]) }; }
      case 'pillars': {
        const fb = firstBelowHorizon();
        const facts = ['sun', 'moon'].filter(k => CH.pts[k]).map(k => `${P(k)}; its sign's ruler (${SHORT[S.rulers]} set): ${nm(rulerOf(CH.pts[k].sign))}`);
        if (CH.asc) facts.push(`Ascendant: ${CH.asc.pos || CH.asc.sign}; its sign's ruler: ${nm(rulerOf(CH.asc.sign))}`);
        if (fb) facts.push(`First planet below the horizon: ${P(fb)}`);
        return { facts, keys: [['planet-sun'], ['planet-moon'], ['concept-ascendant']] };
      }
      case 'figures': return { facts: CH.figures.length ? CH.figures.map(f => `The ${figName(f)}${f.maxOrb != null ? `, widest orb ${f.maxOrb}°` : ''}`) : ['No closed figure found.'], keys: [['concept-t-square'], ['concept-stellium']] };
      case 'chains': {
        const fd = finalDispositor();
        return { facts: PLANETS.filter(p => CH.pts[p]).map(p => `${nm(p)}: ${chainLine(p)}`)
          .concat([fd.single ? `Final dispositor (${SHORT[S.rulers]} set): ${nm(fd.single)}` : `No single final dispositor (${SHORT[S.rulers]} set)${fd.loops.length ? '; loops: ' + fd.loops.map(c => c.map(nm).join(' and ')).join('; ') : ''}`]),
          keys: [['concept-dispositor', 'concept-final-dispositor']] };
      }
      case 'temperament': {
        const t = tally(), ph = moonPhase(), fmt = o => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ');
        return { facts: [`Element (weighted, of ${t.total}): ${fmt(t.element)}`, `Modality: ${fmt(t.modality)}`, `Polarity: ${fmt(t.polarity)}`].concat(ph ? [`Moon phase ${momentWord()}: ${ph.name}`] : []),
          keys: [['concept-temperament', 'concept-elements']] };
      }
      case 'planets': return { facts: BODIES.filter(k => CH.pts[k]).map(P), keys: BODIES.filter(k => CH.pts[k]).map(k => ['planet-' + k]) };
      case 'houses': if (!hasHouses()) return null;   // nothing to interpret: no known time, no houses
        return { facts: CH.houses.map(h => { const x = houseInfo(h.n); return `House ${h.n}: ${x.builder} on the cusp, owner ${nm(x.owner)}${x.ownerPos ? ` (in ${x.ownerPos.sign}, house ${x.ownerPos.house})` : ''}, tenants ${x.tenants.length ? x.tenants.map(nm).join(', ') : 'none'}`; }), keys: [['concept-rulership']] };
      case 'aspects': return { facts: CH.aspects.map(aspLine), keys: [...new Set(CH.aspects.map(a => a.type))].map(t => ['aspect-' + t]) };
      case 'season': {
        if (S.source === 'public') return null;   // no transits for public charts (see publicNoToday)
        const sp = S.transits && S.transits.spans ? S.transits.spans.slice().sort((a, b) => b.weight - a.weight).slice(0, 5) : [];
        return { facts: sp.length ? sp.map(x => `${x.label}: in orb ${fmtDay(x.firstDay)} to ${fmtDay(x.lastDay)}${(x.exacts || []).length ? ', exact ' + x.exacts.map(e => fmtDay(e.local || e.utc)).join(' and ') : ''}`) : ['No transits for this chart.'], keys: [['concept-transit']] };
      }
      default: return null;
    }
  }
  const CHAPTERS = [['generation', 'Generation'], ['pillars', 'The four pillars'], ['figures', 'Figures'], ['chains', 'Chains and the final dispositor'],
    ['temperament', 'Temperament'], ['planets', 'Planets'], ['houses', 'Houses: builder, owner, tenants'], ['aspects', 'Aspects'], ['season', 'The season'], ['method', 'How this was read']];
  function foldSchools(keysFor, opts = {}) {
    const cs = schoolCards(keysFor, Object.assign({ n: 220 }, opts));
    if (!cs.length) return '';
    return `<details class="schools-fold"><summary>Through ${cs.length} school${cs.length > 1 ? 's' : ''}</summary><div class="rgrid">${cs.map(c => c.html).join('')}</div></details>`;
  }
  function renderBook() {
    const host = $('#modeBook');
    if (bookObserver) { bookObserver.disconnect(); bookObserver = null; }
    const used = new Set();
    const mine = id => { used.add(id); const m = mineFor([id]); return m.length ? `<div class="rgrid">${m.join('')}</div>` : ''; };
    const leftovers = ch => {
      if (!S.readings) return '';
      const ids = S.readings.filter(it => (it.chapter === ch || (ch === 'chains' && it.chapter === 'rulers')) && !used.has(it.id)).map(it => it.id);
      if (!ids.length) return '';
      return `<div class="bk-item"><h3>More from your readings</h3><div class="rgrid">${mineFor(ids).join('')}</div></div>`;
    };
    const secs = [];
    const T = S.zodiac === 'sidereal' ? 'sidereal' : 'tropical';
    // 1 generation
    {
      const gen = ['uranus', 'neptune', 'pluto', 'chiron'].filter(k => CH.pts[k]);
      const items = gen.map(k => `<div class="bk-item"><h3>${PN(k)} <span class="f">in ${esc(CH.pts[k].sign)}${inHouse(CH.pts[k])}</span></h3>
        ${foldSchools(['planet-' + k])}${mine('generation.' + k)}</div>`).join('');
      secs.push({ id: 'generation', intro: isEvent()
          ? 'The slow planets: shared by every moment within a few years of this one. This could mean the mood of an era more than a trait of one event; it could also mean the way this event takes part in that mood. What does it mean to you?'
          : 'The slow planets: shared by everyone born within a few years of this chart. This could mean the mood of a generation more than a trait of one person; it could also mean the way one life takes part in that mood. What does it mean to you?',
        html: items + leftovers('generation'), spec: { planets: gen } });
    }
    // 2 pillars
    {
      const fb = firstBelowHorizon();
      const one = (id, title, key, sign, house) => {
        const r = rulerOf(sign), rp = positionOf(r);
        return `<div class="bk-item"><h3>${title} <span class="f">${esc(sign)}${house ? ', house ' + house : ''}</span></h3>
          <div class="facts-line">Its sign's ruler (${esc(SHORT[S.rulers])} set): ${rp ? `${PN(r)}, in ${esc(rp.sign)}${inHouse(rp)}` : `${esc(NAME[r] || r)} (${esc(UNCOMPUTED[r] || 'not computed')})`}</div>
          ${key !== 'ascendant' ? planetNote(key, true) : ''}${foldSchools(key === 'ascendant' ? ['concept-ascendant', 'sign-' + sign.toLowerCase()] : ['planet-' + key, 'sign-' + sign.toLowerCase()])}${mine('pillars.' + id)}</div>`;
      };
      let h = '';
      if (CH.pts.sun) h += one('sun', `${PN('sun')}: consciousness`, 'sun', CH.pts.sun.sign, CH.pts.sun.house);
      if (CH.pts.moon) h += one('moon', `${PN('moon')}: needs and instinct`, 'moon', CH.pts.moon.sign, CH.pts.moon.house);
      if (CH.asc) h += one('ascendant', 'The Ascendant: the way in', 'ascendant', CH.asc.sign, null);
      if (fb) h += one('first-below-horizon', `${PN(fb)}: the first planet below the horizon`, fb, CH.pts[fb].sign, CH.pts[fb].house);
      secs.push({ id: 'pillars', intro: 'Sun, Moon, Ascendant, and the first planet below the horizon (the next to rise). For each: its sign, and where that sign\'s ruler sits.' +
          (CH.asc ? '' : ' Here only the Sun and the Moon: with no known time there is no Ascendant and no horizon.'),
        html: h + leftovers('pillars'), spec: { planets: ['sun', 'moon', fb, 'ascendant'].filter(Boolean) } });
    }
    // 3 figures
    {
      const CONCEPT = { 'T-square': 'concept-t-square', stellium: 'concept-stellium' };
      const h = CH.figures.map((f, i) => {
        let extra = '';
        if (f.type === 'T-square') { const e = emptyPoint(f); extra = `Apex ${PN(f.apex)}; opposition ${pList(f.opposition || [])}${e != null ? `; empty point ${esc(signAt(e))}${houseOfLon(e) ? ', house ' + houseOfLon(e) : ''}` : ''}. Two ways a T-square is often worked with: through the opposition, or by living the empty point.`; }
        else extra = `Members: ${pList(f.members || [])}${f.alsoThere && f.alsoThere.length ? '; also there: ' + pList(f.alsoThere) : ''}.`;
        return `<div class="bk-item"><h3>${esc(figLabel(f))} <button type="button" class="minibtn no-print" data-fig="${i}">open in the Lens</button></h3><div class="facts-line">${extra}</div>
          ${CONCEPT[f.type] ? foldSchools([CONCEPT[f.type]]) : foldSchools((f.members || []).map(m => 'planet-' + m))}${mine('figures.' + figSlug(f))}</div>`;
      }).join('') || '<p class="empty">No closed figure: no T-square, grand trine or stellium was found.</p>';
      const all = [...new Set(CH.figures.flatMap(f => f.members || []))];
      const t0 = CH.figures.find(f => f.type === 'T-square');
      secs.push({ id: 'figures', intro: CH.figures.length ? `This chart's figures, each named by its members: ${esc(CH.figures.map(f => 'the ' + figName(f)).join('; '))}.`
          : 'Figures are closed patterns of aspects: T-squares, grand trines, kites, yods, and stelliums (three or more planets in one sign or house).',
        html: h + leftovers('figures'),
        spec: { planets: all, aspects: CH.figures.flatMap(figAspects), empty: t0 ? emptyPoint(t0) : null } });
    }
    // 4 chains
    {
      const fd = finalDispositor();
      const rows = PLANETS.filter(p => CH.pts[p]).map(p => `<li>${chainText(chainFrom(p))}</li>`).join('');
      const verdict = fd.single ? `All chains lead back to ${PN(fd.single)}: the final dispositor in the ${esc(SHORT[S.rulers])} set.`
        : `No single final dispositor in the ${esc(SHORT[S.rulers])} set${fd.dom.length ? '; chains rest in ' + pList(fd.dom) : ''}${fd.loops.length ? '; ' + fd.loops.map(c => (c.length === 2 ? 'a mutual reception: ' : 'a loop: ') + c.map(PN).join(' → ') + ' → ' + PN(c[0])).join('; ') : ''}${fd.unc.length ? '; some pause at ' + fd.unc.map(x => esc(NAME[x] || x)).join(', ') : ''}.`;
      secs.push({ id: 'chains', intro: 'Follow each planet to the ruler of its sign, then that ruler to the ruler of its sign, and on. When a planet repeats, the chain rests there. Change the rulership set above and the chains change with it.',
        html: `<div class="bk-item"><div class="facts-line"><b>${verdict}</b></div><ul class="alist">${rows}</ul>${mine('rulers.final-dispositor')}${foldSchools(['concept-dispositor', 'concept-final-dispositor'])}</div>` +
          PLANETS.map(p => mine('rulers.chain-' + p)).join('') + leftovers('chains'),
        spec: { planets: fd.single ? [fd.single] : fd.dom.concat(fd.loops.flat()), planets2: PLANETS } });
    }
    // 5 temperament
    {
      const t = tally(), ph = moonPhase();
      const bar = (label, v, cls) => `<div class="bar"><span>${esc(label)}</span><span class="track"><span class="fill ${cls}" style="width:${(100 * v / Math.max(1, t.total)).toFixed(1)}%;display:block"></span></span><span class="v">${v}/${t.total}</span></div>`;
      const grp = (title, obj) => `<div><h4>${esc(title)}</h4>${Object.entries(obj).map(([k, v]) => bar(cap(k), v, k)).join('')}</div>`;
      const topSigns = Object.entries(t.sign).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const domEl = Object.entries(t.element).sort((a, b) => b[1] - a[1])[0][0];
      secs.push({ id: 'temperament', intro: 'The method\'s weighted tally: Sun 9, Moon 7; Ascendant, Mercury, Venus and Mars 5 each; Jupiter and Saturn 3; Uranus, Neptune, Pluto and Chiron 1 (46 in all).' +
          (CH.asc ? '' : ` Here ${t.total}: with no known time there is no Ascendant to count.`),
        html: `<div class="bars">${grp('Element', t.element)}${grp('Modality', t.modality)}${grp('Polarity', t.polarity)}</div>
          <div class="facts-line">Heaviest signs: ${topSigns.map(([s, v]) => `${SG(s)} ${esc(s)} (${v})`).join(', ')}.${ph ? ` Moon phase ${momentWord()}: ${esc(ph.name)} (${Math.round(ph.elong)}° from the Sun).` : ''}</div>
          <div class="possible">This could mean a temperament leaning ${esc(domEl)}; it could also mean the lighter elements are where effort goes. What does it mean to you?${TMPL}</div>
          ${foldSchools(['concept-temperament', 'concept-elements'])}${mine('temperament.tally')}${leftovers('temperament')}`,
        spec: { signs: SIGNS.filter(s => elementOf(s) === domEl) } });
    }
    // 6 planets
    {
      const h = BODIES.filter(k => CH.pts[k]).map(k => {
        const p = CH.pts[k], dig = dignityOf(k, p.sign), owns = ownsHouses(k), n = aspectsOf(k).length;
        return `<div class="bk-item"><h3>${PN(k)} <span class="f">${esc(fmtPos(p))}${inHouse(p)}${p.retro && k !== 'northnode' && k !== 'southnode' ? ', retrograde' : ''}${p.approx ? ', approximate' : ''}</span> <button type="button" class="minibtn no-print" data-p="${k}">Lens</button></h3>
          <div class="facts-line">${dig ? esc(dig) + ' (traditional table) · ' : ''}${owns.length ? 'owns house ' + owns.join(', ') + ' · ' : ''}${n} aspect${n === 1 ? '' : 's'}${p.approx && p.dayRange ? ` · over that day it runs from ${esc(p.dayRange[0])} to ${esc(p.dayRange[1])}` : ''}</div>
          ${planetNote(k, true)}${foldSchools(sl => { const s = signForSchool(k, sl); return ['planet-' + k].concat(s ? ['sign-' + s.toLowerCase()] : []); })}${mine('planets.' + k)}</div>`;
      }).join('') + mine('planets.nodes');
      secs.push({ id: 'planets', intro: 'The planet is the function, the sign qualifies it, the house says where.' + (hasHouses() ? '' : ' Here there is no house: the time is unknown.'), html: h + leftovers('planets'), spec: { planets: BODIES } });
    }
    // 7 houses (none without a known time: the chapter says why and stops)
    if (!hasHouses()) {
      secs.push({ id: 'houses', intro: 'Each house has a builder (the sign on its cusp), an owner (that sign\'s ruler) and tenants (the planets inside).',
        html: `<p class="empty">No houses in this chart: the ${isEvent() ? '' : 'birth '}time is unknown, and houses turn with the hour (the whole circle of cusps goes round once a day), so a noon chart has none to show. Every house-based reading is left out here and elsewhere on the page.</p>`,
        spec: null });
    } else {
      const rows = CH.houses.map(hh => { const h = houseInfo(hh.n);
        return `<tr class="click" data-house="${h.n}" tabindex="0"><td><b>${h.n}</b></td><td>${SG(h.builder)} ${esc(h.builder)}</td>
          <td>${h.ownerPos ? `${PN(h.owner)} <small>in ${esc(h.ownerPos.sign)}, h${h.ownerPos.house}</small>` : `${esc(NAME[h.owner] || h.owner)} <small>(not computed)</small>`}</td>
          <td>${h.tenants.length ? pList(h.tenants) : '<span style="color:var(--faint)">none</span>'}</td><td class="area"><small>${esc(AREA[h.n - 1])}</small></td></tr>`; }).join('');
      const withT = CH.houses.filter(h => houseInfo(h.n).tenants.length).map(h => h.n);
      secs.push({ id: 'houses', intro: `Each house has a builder (the sign on its cusp), an owner (that sign's ruler, ${esc(SHORT[S.rulers])} set) and tenants (the planets inside). Tap a row to open it in the Lens.`,
        html: `<div style="overflow-x:auto"><table class="htable"><thead><tr><th>House</th><th>Builder</th><th>Owner</th><th>Tenants</th><th class="area">Area</th></tr></thead><tbody>${rows}</tbody></table></div>` +
          CH.houses.map(h => mine('houses.h' + String(h.n).padStart(2, '0'))).join('') + leftovers('houses'),
        spec: { houses: withT } });
    }
    // 8 aspects
    {
      const by = {};
      for (const a of CH.aspects) (by[aspectKind(a)] = by[aspectKind(a)] || []).push(a);
      const h = Object.keys(AKIND).filter(k => by[k]).map(k => `<div class="agroup"><h4>${esc(AKIND[k])}</h4><ul class="alist">${by[k].map(a =>
        `<li>${PN(a.a)} <span class="tag ${esc(a.type)}">${esc(a.type)}</span> ${PN(a.b)} <small>orb ${(+a.orb).toFixed(2)}°${a.applying === true ? ', applying' : a.applying === false ? ', separating' : ''}${a.outOfSign ? ', out of sign' : ''}</small></li>`).join('')}</ul></div>`).join('');
      const types = [...new Set(CH.aspects.map(a => a.type))];
      secs.push({ id: 'aspects', intro: 'Aspects as harmonics, grouped by speed: between personal planets, between a personal and a slower one (the slower acts on the personal), between slow ones.',
        html: h + (CH.aspects[0] ? aspectNote(CH.aspects.find(a => !a.pt) || CH.aspects[0]) : '') + foldSchools(types.map(t => 'aspect-' + t)) +
          CH.aspects.map(a => mine(`aspects.${a.a}-${a.type}-${a.b}`)).join('') + leftovers('aspects'),
        spec: { aspectsOf: BODIES } });
    }
    // 9 season
    {
      const pubSeason = isEvent()
        ? 'Like Today, this chapter lays the coming transits over a chart as a personal calendar. An event’s chart is read here as the sky of its own moment, so the season is left out.'
        : 'Like Today, this chapter lays the coming transits over a chart as a calendar for its owner. A public figure’s chart is read here for its placements only, so the season is left out: nothing on this page forecasts anything about anyone.';
      let h = `<p class="empty">${esc(S.source === 'public' ? pubSeason : 'No transits file.')}</p>`, spec = null;
      if (S.transits && S.transits.spans) {
        const w = S.transits.window || {}, dom = [w.startDate || S.transits.days[0].date, w.endDate || S.transits.days[S.transits.days.length - 1].date];
        const today = S.transits.days[S.dayIdx] ? S.transits.days[S.dayIdx].date : null;
        const top = S.transits.spans.slice().sort((a, b) => b.weight - a.weight);
        const main = top.slice(0, 5), rest = top.slice(5);
        h = main.map(s => `<div class="bk-item"><h3>${G(s.transiting)}${esc(s.label)} <span class="tag ${esc(s.aspect)}">${esc(s.aspect)}</span></h3>${timeBar(s, today, dom)}
          ${mine(`season.${s.transiting}-${s.aspect}-${s.natal}`)}</div>`).join('') +
          (rest.length ? `<details class="fold"><summary>${rest.length} more contacts in this window (folded)</summary><ul>${rest.map(s => `<li>${G(s.transiting)}${esc(s.label)} <small>${esc(fmtDay(s.firstDay))} to ${esc(fmtDay(s.lastDay))}</small></li>`).join('')}</ul></details>` : '') +
          `<div class="possible">This could mean a season with a few long themes and many short visits; it could also mean the short visits matter more on a given day. What does it mean to you?${TMPL}</div>` + leftovers('season');
        const natal = [...new Set(main.map(s => s.natal))];
        spec = { planets: natal };
      }
      secs.push({ id: 'season', intro: S.source === 'public' ? 'Transits over the coming 90 days: not for a public chart.'
        : 'The slowest, heaviest contacts of the 90-day window, each as a bar across the whole window (today marked). A calendar of geometry, not a forecast.', html: h, spec });
    }
    // 10 method
    {
      const on = enabledSchools();
      secs.push({ id: 'method', intro: 'What this book was read with, so the choices show.',
        html: `<div class="method"><ul>
          <li>Chart: ${S.source === 'local' ? 'your own (local files, never committed)'
            : S.source === 'viewer' ? 'handed over by the calculator (positions only, no birth data); its aspects, figures, sidereal version and chains computed in this page'
              : S.source === 'saved' ? 'one of your saved charts, read from your recursive.eco account and recomputed by the chart server (api/calculate-chart); its aspects, figures, sidereal version and chains computed in this page'
                : S.source === 'public' ? `${isEvent() ? 'a public event' : 'a public figure'}, ${esc(S.pub.label)}, from mock-data/public-charts.json (${esc(S.pub.date_label)}; source: <a href="${esc(S.pub.source_url)}">${esc(hostOf(S.pub.source_url))}</a>${isEvent() ? '' : '; ' + esc(ratingText(S.pub))})`
                  : 'the invented example'}, ${esc(T)} zodiac${CH.ayan ? ' (' + esc(CH.ayan.label || CH.ayan.name) + ')' : ''}, ${hasHouses() ? esc(hsName()) + ' houses' : 'no houses (the time is unknown)'}.</li>
          <li>Rulership set: ${esc(setLabel())}.</li>
          <li>Schools switched on (${on.length}): ${on.map(s => esc(s.label)).join('; ') || 'none'}.</li>
          <li>Readings come from the grammars in this library (by the one cross-link key, <code>source_item_id</code>), short windows of public-domain books (archive.org OCR, old spellings kept) and podcast auto-captions (20 words at most, linked to the moment). Each school reads the zodiac it was written for. The Bailey school appears only as our paraphrase plus the attributed ruler table: its text is under copyright and is not stored here.</li>
          <li>Template notes (marked “template wording”) are this mock's own scaffolding: the method's structure, phrased as possibilities.</li>
          ${CH.orbsNote ? `<li>Orbs: ${esc(CH.orbsNote)}</li>` : ''}</ul></div>`, spec: null });
    }
    const title = {}; CHAPTERS.forEach(([id, t]) => { title[id] = t; });
    secs.forEach(s => { s.title = title[s.id]; s.ai = bookAI(s.id); });
    S.bookSecs = secs;
    host.innerHTML = `<h2>Book</h2><p class="sub">One document in the method's order. Each chapter's small wheel lights what it discusses; scrolling lights the big wheel too.</p>
      <nav class="toc" aria-label="Contents"><div class="tools"><b>Contents</b><button type="button" class="minibtn" id="bkPrint">Print</button></div>
      <ol>${secs.map(s => `<li><a href="#bk-${s.id}">${esc(title[s.id])}</a></li>`).join('')}</ol></nav>` +
      secs.map((s, i) => `<section class="bk-sec" id="bk-${s.id}" data-i="${i}"><header>${s.spec ? `<div class="bk-mini" aria-hidden="true"></div>` : ''}<div><h2><span class="num">${i + 1}</span>${esc(title[s.id])}</h2><p class="intro">${s.intro}</p>${s.ai ? `<button type="button" class="aibtn sm no-print" data-ai="book:${s.id}" title="${esc(AI_TIP)}">Interpret this chapter with AI</button>` : ''}</div></header>${s.html}</section>`).join('');
    // mini wheels
    secs.forEach((s, i) => {
      if (!s.spec) return;
      const holder = $(`#bk-${s.id} .bk-mini`);
      const w = new Wheel(holder, { mini: true, label: 'Small wheel: ' + title[s.id] });
      w.render(CH); w.highlight(s.spec);
    });
    $('#bkPrint').addEventListener('click', () => window.print());
    $$('[data-fig]', host).forEach(b => b.addEventListener('click', () => { S.sel = { kind: 'figure', i: +b.dataset.fig }; setMode('lens', { scroll: true }); }));
    $$('[data-p]', host).forEach(b => b.addEventListener('click', () => { S.sel = { kind: 'planet', key: b.dataset.p }; setMode('lens', { scroll: true }); }));
    $$('tr[data-house]', host).forEach(r => {
      const go = () => { S.sel = { kind: 'house', n: +r.dataset.house }; setMode('lens', { scroll: true }); };
      r.addEventListener('click', go); r.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    });
    // the big wheel follows the chapter in view
    hl(secs[0].spec, `Lit: ${esc(title[secs[0].id])}.`);
    let lastSec = -1, timer = null;
    const follow = () => {
      timer = null;
      if (S.mode !== 'book') return;
      const els = $$('.bk-sec', host), y = window.innerHeight * 0.35;
      let i = 0; els.forEach((el, k) => { if (el.getBoundingClientRect().top <= y) i = k; });
      if (i === lastSec) return; lastSec = i;
      const s = secs[i]; hl(s.spec, s.spec ? `Lit: ${esc(title[s.id])}.` : '');
    };
    const onScroll = () => { if (!timer) timer = setTimeout(follow, 80); };
    window.addEventListener('scroll', onScroll, { passive: true });
    bookObserver = { disconnect: () => window.removeEventListener('scroll', onScroll) };
  }

  // ═════════ Interpret with AI, and "build my grammar": the shared recursive.eco assistant ═════════
  // The text is shown first, in an edit box (the dialog is the consent screen). Two routes:
  // - "Send to the assistant" (Interpret, Oct 1 2026): the tarot Caster's pattern (recursive-tarot
  //   docs/ASSISTANT-EMBED-CONTRACT.md) in recursive.eco's own envelope. The page opens the sidebar and posts
  //   { type: 'recursive-eco:ask', text, send: true, id } to the iframe's own origin (read from its src, never
  //   '*'); the embed acks { type: 'recursive-eco:ask-ack', id, ok } and sends the text through its own Send
  //   button's path, so sign-in, the 18+ question and credits all still apply (recursive-eco
  //   apps/flow/src/lib/assistant/host-messages.ts, branch claude/prayer-for-the-loop, Sep 30 2026).
  // - the prefill (Sep 29 2026; the fallback when no ack comes, and the grammar request's route):
  //   RecursiveAstroAssistant.ask(text, context) reloads the iframe with ?tab=chat&open=1&ask=<text>, so
  //   the assistant opens on Chat with the text typed into its chat box, and the reader taps Send there.
  // Either way the launcher's page-context request is answered with pageSummary(), never the page's text.
  const CREED = 'Read the sky to know yourself, not to be told your fate. A chart is a mirror and a calendar, not a command. Relate to the symbol; never obey it.';
  const FRAME = 'Offer possibilities, not predictions; ask me what fits.';
  const AI_MAX = 6000;   // the prefill carries the text in the assistant's URL (flow.recursive.eco answered 414 from about 40,000 characters); a message may carry 8,000
  const AI_TIP = 'Sends the chart facts you chose (this selection, no birth date, time or place) to the recursive.eco assistant. You see and can edit the text first; nothing is sent until you press "Send to the assistant".';
  const GR_TIP = 'Asks the recursive.eco assistant to build a PRIVATE grammar from these chart facts (no birth date, time or place). You see and can edit the request first; the assistant asks before it writes anything.';
  const aiRow = (ctx, grammar) => `<div class="airow no-print"><button type="button" class="aibtn" data-ai="${esc(ctx)}" title="${esc(AI_TIP)}">Interpret with AI</button>${grammar ? `<button type="button" class="minibtn" data-grammar="${esc(grammar)}" title="${esc(GR_TIP)}">Ask the assistant to make this a grammar</button>` : ''}</div>`;
  // plain text from the page's own html (glyph spans dropped)
  function plainOf(html) {
    const d = document.createElement('div'); d.innerHTML = html;
    $$('.glyph', d).forEach(g => g.remove());
    return d.textContent.replace(/\s+/g, ' ').trim();
  }
  const chartKind = () => S.source === 'local' ? 'my own chart' : S.source === 'viewer' ? 'a chart from the recursive.eco calculator'
    : S.source === 'saved' ? 'one of my saved charts from recursive.eco'
      : S.source === 'public' ? (isEvent() ? `the sky at a public event: ${S.pub.label} (${S.pub.date_label})` : `the public birth chart of ${S.pub.label} (${ratingText(S.pub)})`)
        : 'an invented example chart (not a person)';
  // for a public chart, what the reading may and may not do, said to the assistant as well
  const publicLines = () => !S.pub ? [] : [isEvent()
    ? 'This is the sky at a public event, to be read as the schools would read any moment; predict nothing from it.'
    : 'This is a public figure\'s chart from a public source: read the placements only, never the person, and predict nothing about anyone.']
    .concat(S.pub.time_known ? [] : ['The time is unknown: there are no houses, Ascendant or Midheaven, and the Moon is approximate.']);
  function settingsLine() {
    return `Chart settings: ${S.zodiac} zodiac${S.zodiac === 'sidereal' && CH.ayan ? ` (${CH.ayan.label || CH.ayan.name})` : ''}, ${hasHouses() ? hsName() + ' houses' : 'no houses (time unknown)'}, rulership set: ${setLabel()}.`;
  }
  function ptLine(k, pre) {
    const who = pre ? cap(`${pre} ${nm(k)}`) : cap(theNm(k));
    const p = positionOf(k); if (!p) return `${who}: not computed here`;
    const dig = PLANETS.includes(k) ? dignityOf(k, p.sign) : null;
    return `${who}: ${p.pos || p.sign}${p.house ? `, house ${p.house}` : ''}${p.retro && !/node/.test(k) ? ', retrograde' : ''}${p.approx ? ', approximate (time unknown)' : ''}${dig ? `, ${dig.split(' ')[0]} (traditional table)` : ''}`;
  }
  const aspLine = a => `${cap(theNm(a.a))} ${a.type} ${theNm(a.b)} (orb ${(+a.orb).toFixed(1)}°)`;
  const chainLine = k => { const c = chainFrom(k); return c.chain.map(nm).join(' -> ') + (c.end === 'domicile' ? ' (rests: in its own sign)' : c.end === 'loop' ? ' (a loop)' : c.end === 'uncomputed' ? ' (pauses: no position)' : ''); };
  // the switched-on schools' readings for a list of key sets, first match per school, short; `from` starts the
  // round of schools further along, so the whole-chart text gives each school a turn
  function schoolLines(keyLists, max = 8, n = 230, from = 0) {
    const out = [], on = enabledSchools(), at = on.length ? from % on.length : 0;
    for (const s of on.slice(at).concat(on.slice(0, at))) {
      let hit = null;
      for (const keys of keyLists) {
        const ks = typeof keys === 'function' ? keys(s.slug) : keys;
        if (!ks || !ks.length) continue;
        const ps = passFor(ks, s.slug); if (ps.length) { hit = ps[0]; break; }
      }
      if (!hit) continue;
      let text, src;
      if (hit.kind === 'grammar') { const [k, v] = firstSection(hit.sections); text = trim(v, n); src = `grammar "${hit.grammar_name || hit.grammar}"${k ? ', ' + k : ''}`; }
      else if (hit.kind === 'book') { text = trim(hit.text.replace(/…/g, ' '), n); src = `${hit.book}, public-domain OCR`; }
      else { text = trim(hit.text, n); src = `${hit.show}, auto-caption`; }
      out.push(`${s.label}${s.slug === 'esoteric-bailey' ? ' (our paraphrase)' : ''}: ${text} [${src}]`);
      if (out.length >= max) break;
    }
    return out;
  }
  // what is selected, as { title, facts[], keyLists[] }
  function selectionFor(ctx) {
    const [kind, arg] = String(ctx).split(':');
    if (kind === 'lens') {
      const sel = S.sel || {};
      const keyLists = (S.lastRows || []).map(r => r.keysFor);
      if (sel.kind === 'figure' && CH.figures[sel.i]) {
        const f = CH.figures[sel.i], facts = [`The ${figName(f)}${f.quality && f.quality !== 'mixed' ? `, in ${f.quality} signs` : ''}${f.maxOrb != null ? `, widest orb ${f.maxOrb}°` : ''}`];
        (f.members || []).forEach(m => facts.push(ptLine(m)));
        figAspects(f).forEach(a => facts.push(aspLine(a)));
        const e = emptyPoint(f); if (e != null) facts.push(`Empty point (opposite the apex): ${signAt(e)}${houseOfLon(e) ? ', house ' + houseOfLon(e) : ''}`);
        return { title: `the ${figName(f)}`, facts, keyLists };
      }
      if (sel.kind === 'house') {
        const h = houseInfo(sel.n); if (!h) return null;
        return { title: `house ${sel.n} (${AREA[sel.n - 1]})`, keyLists, facts: [`House ${sel.n}: built by ${h.builder} on the cusp (${h.pos || ''}); owner ${nm(h.owner)}${h.ownerPos ? ` in ${h.ownerPos.sign}, house ${h.ownerPos.house}` : ' (not computed)'}; tenants: ${h.tenants.length ? andList(h.tenants.map(nm)) : 'none'}`]
          .concat(h.tenants.map(ptLine)) };
      }
      const k = sel.key || 'sun'; if (!CH.pts[k]) return null;
      const facts = [ptLine(k)].concat(aspectsOf(k).map(aspLine));
      const figs = figuresOf(k).map(([f]) => 'Part of the ' + figName(f)); facts.push(...figs);
      facts.push(`Dispositor chain (${SHORT[S.rulers]} set): ${chainLine(k)}`);
      const owns = ownsHouses(k); if (owns.length) facts.push(`Owns house ${owns.join(', ')}`);
      return { title: `${theNm(k)} in ${CH.pts[k].sign}${inHouse(CH.pts[k])}`, facts, keyLists };
    }
    if (kind === 'today') {
      const d = S.transits && S.transits.days[S.dayIdx]; if (!d) return null;
      const top = (d.top3 || []).slice().sort((a, b) => (BODYW[b.transiting] || 0) - (BODYW[a.transiting] || 0) || b.score - a.score).slice(0, 3);
      const facts = top.map(t => { const sp = spanOf(t);
        return `Transiting ${nm(t.transiting)}${t.transitingRetrograde ? ' (retrograde)' : ''} in ${t.transitingSign} ${t.aspect} natal ${nm(t.natal)}: orb ${(+t.orb).toFixed(2)}°, ${t.applying ? 'applying' : 'separating'}${sp ? `; in orb ${fmtDay(sp.firstDay)} to ${fmtDay(sp.lastDay)}` : ''}${(t.exacts || []).length ? '; exact ' + t.exacts.map(e => fmtDay(e.local || e.utc)).join(' and ') : ''}`; });
      [...new Set(top.map(t => t.natal))].forEach(k => facts.push(ptLine(k, 'natal')));
      const keyLists = top.flatMap(t => [['planet-' + t.transiting], ['planet-' + t.natal], ['aspect-' + t.aspect]]).concat([['concept-transit']]);
      return { title: `the transits of ${fmtDay(d.date, { month: 'long', day: 'numeric', year: 'numeric' })}`, facts: facts.length ? facts : ['No transit within 1° this day.'], keyLists };
    }
    if (kind === 'ask') {
      const a = S.lastAsk; if (!a) return null;
      return { title: 'my question', ask: a.q, facts: a.facts.length ? a.facts : ['The question names no chart point.'], keyLists: [a.keys] };
    }
    if (kind === 'book') {
      const sec = (S.bookSecs || []).find(s => s.id === arg); if (!sec) return null;
      return { title: `the "${sec.title}" chapter of my chart's book`, facts: sec.ai.facts, keyLists: sec.ai.keys };
    }
    return null;
  }
  function interpretText(sel) {
    const L = [`I'm reading ${chartKind()} in Chart Lab on The Recursive Astrology (astro.recursive.eco), one chart read through many schools of astrology.`,
      `Please interpret ${sel.title}.`, ...publicLines()];
    if (sel.ask) L.push(`My question: ${sel.ask}`);
    L.push('', 'What is selected:', ...sel.facts.map(f => '- ' + f), '- ' + settingsLine());
    const rs = schoolLines(sel.keyLists || []);
    if (rs.length) L.push('', 'What the schools I switched on say (short excerpts from this site\'s grammars and public-domain books; each speaks in its own voice):', ...rs.map(r => '- ' + r));
    L.push('', `How to answer: ${FRAME} Say "this could mean ..., it could also mean ...", keep each school in its own voice and name it, and never state the chart as fate or as something to obey.`,
      `The site's creed: "${CREED}"`);
    return L.join('\n');
  }
  // maxAsp: list only the tightest aspects (the whole-chart interpret text, when a long list would not fit)
  function wholeChartFacts(maxAsp = Infinity) {
    const f = [];
    BODIES.filter(k => CH.pts[k]).forEach(k => f.push(ptLine(k)));
    if (CH.asc) f.push(`Ascendant: ${CH.asc.pos || CH.asc.sign}`);
    if (CH.mc) f.push(`Midheaven: ${CH.mc.pos || CH.mc.sign}`);
    CH.figures.forEach(x => f.push(`Figure: the ${figName(x)}`));
    const asps = CH.aspects.length > maxAsp ? CH.aspects.slice().sort((a, b) => a.orb - b.orb).slice(0, maxAsp) : CH.aspects;
    f.push((asps.length < CH.aspects.length ? `Aspects (the ${asps.length} tightest of ${CH.aspects.length}): ` : 'Aspects: ') + asps.map(a => `${nm(a.a)} ${a.type} ${nm(a.b)} ${(+a.orb).toFixed(1)}°`).join('; '));
    const fd = finalDispositor(); f.push(fd.single ? `Final dispositor (${SHORT[S.rulers]} set): ${nm(fd.single)}` : `No single final dispositor (${SHORT[S.rulers]} set)`);
    return f;
  }
  function grammarText(scope) {
    const sel = scope === 'chart' ? { title: 'this whole chart', facts: wholeChartFacts() } : selectionFor('lens');
    if (!sel) return '';
    const L = [`Please make a PRIVATE grammar for me on recursive.eco from ${sel.title}${scope === 'chart' ? (S.pub ? ', ' + chartKind() : '') : ' in ' + chartKind()}.`,
      ...publicLines().map(x => '- ' + x),
      '- Make it private: not public, and not offered to any channel.',
      '- Before you create anything, tell me the grammar name and the items you will make, and wait for my yes.',
      '- One item per placement (planet in sign and house), one per aspect, and one per figure; name each figure by its members, never just "the figure".',
      '- In each item, give a short reading phrased as possibilities, not predictions, and end with one question for me. Do not invent quotations or sources.',
      `- Put this creed in the grammar's description: "${CREED}"`,
      '', 'Chart facts I chose to share (no birth date, time or place):', ...sel.facts.map(x => '- ' + x), '- ' + settingsLine(),
      `- Schools I read with: ${enabledSchools().map(s => s.label).join('; ') || 'none switched on'}.`];
    return L.join('\n');
  }
  // the whole chart, for the "Interpret with AI" by the wheel: a short prompt; the chart (positions only, and a name
  // only where chartKind() gives one: a public chart or the example); the schools switched on; then what they say,
  // topic by topic in priority order (the Sun, the Moon, the Ascendant, the figures, the three tightest aspects,
  // the other planets), three schools a topic in turn, for as long as the text fits AI_MAX. The key sets are the
  // Book's (its pillars and figures), so the excerpts are the ones the page shows.
  const ASK_HOW = ['Please read this chart with me as possibilities, not verdicts.',
    '- For each thing you pick out, say "this could mean ..., it could also mean ...", then ask me: "what does it mean to you?"',
    '- Name the school each reading comes from and keep it in that school\'s voice. The old books below speak in certainties: give those as that school\'s view, not as fact.',
    '- No fate claims, and no predictions about me or anyone.',
    '- End on one question for me, or one small step I could take.',
    `The site's creed: "${CREED}"`];
  function chartTopics() {
    // title: the heading over the excerpts; short: its name in the note on what was left out
    const t = [], pillar = (k, p) => ({ title: `${theNm(k)} in ${p.sign}${inHouse(p)}`, short: theNm(k), keyLists: [['planet-' + k, 'sign-' + p.sign.toLowerCase()]] });
    if (CH.pts.sun) t.push(pillar('sun', CH.pts.sun));
    if (CH.pts.moon) t.push(pillar('moon', CH.pts.moon));
    if (CH.asc) t.push({ title: `the Ascendant in ${CH.asc.sign}`, short: 'the Ascendant', keyLists: [['concept-ascendant', 'sign-' + CH.asc.sign.toLowerCase()]] });
    CH.figures.forEach(f => t.push({ title: `the ${figName(f)}`, short: `the ${figShort(f)}${f.type === 'stellium' ? (f.scope === 'house' ? ` in the ${ord(houseNo(f))} house` : ` in ${f.where}`) : ''}`,
      keyLists: [f.type === 'T-square' ? ['concept-t-square'] : f.type === 'stellium' ? ['concept-stellium'] : (f.members || []).map(m => 'planet-' + m)] }));
    CH.aspects.filter(a => !a.pt).sort((a, b) => a.orb - b.orb).slice(0, 3)
      .forEach(a => t.push({ title: `${theNm(a.a)} ${a.type} ${theNm(a.b)} (orb ${(+a.orb).toFixed(1)}°)`, short: `${theNm(a.a)} ${a.type} ${theNm(a.b)}`, keyLists: [['pair-' + [a.a, a.b].sort().join('-')], ['aspect-' + a.type]] }));
    PLANETS.filter(k => k !== 'sun' && k !== 'moon' && CH.pts[k]).forEach(k => t.push(pillar(k, CH.pts[k])));
    return t;
  }
  function chartText() {
    const on = enabledSchools();
    const headOf = maxAsp => [...ASK_HOW, '',
      `I'm reading ${chartKind()} in Chart Lab on The Recursive Astrology (astro.recursive.eco), one chart read through many schools of astrology.`, ...publicLines(),
      '', 'The chart (positions only; no birth date, time or place):', ...wholeChartFacts(maxAsp).map(x => '- ' + x), '- ' + settingsLine(),
      '', on.length ? `Schools I switched on: ${on.map(s => s.label).join('; ')}.` : 'No school is switched on, so there are no school readings here: read from the placements.'].join('\n');
    // the chart itself comes first; a long aspect list gives way to its tightest aspects before any of it is lost
    let out = '';
    for (const m of [Infinity, 20, 12, 8]) { out = headOf(m); if (out.length <= AI_MAX - 1200) break; }
    if (!on.length) return out;
    const blocks = [];
    chartTopics().forEach((tp, i) => {
      const rs = schoolLines(tp.keyLists, 3, 150, i * 3);
      if (rs.length) blocks.push({ short: tp.short, text: '\n\n' + [`On ${tp.title}:`, ...rs.map(r => '- ' + r)].join('\n') });
    });
    if (!blocks.length) return out;
    out += '\n\nWhat the schools say (short excerpts from this site\'s grammars, public-domain books and podcast captions, each in its school\'s own voice, with its source in brackets):';
    const left = [], room = AI_MAX - 220;   // keeps room for the note on what was left out
    for (const b of blocks) { if (out.length + b.text.length <= room) out += b.text; else left.push(b.short); }
    if (left.length) {
      const note = `\n\n(Left out to fit the length the assistant takes: what the schools say of ${andList(left)}.)`;
      out += out.length + note.length <= AI_MAX ? note : `\n\n(Left out to fit: what the schools say of ${left.length} more placements, figures and aspects.)`;
    }
    return out;
  }
  // the switched-on schools' public grammars on recursive.eco (../ids.json), named in the page context so the
  // assistant can read one whole with its library_grammar_detail tool. The page context is the only channel for
  // them: the embed takes a grammar_id only from its own URL, at load, and a sent message must not reload it.
  function schoolGrammars() {
    const out = [];
    for (const s of enabledSchools()) for (const g of (s.grammar_slugs || [])) {
      const id = S.gids[g]; if (!id || !S.gidsPublic.has(g)) continue;
      const had = out.find(x => x.id === id);
      if (had) had.schools.push(s.label); else out.push({ id, slug: g, schools: [s.label] });
    }
    return out;
  }
  const pageSummary = () => {
    const gs = schoolGrammars();
    return `Chart Lab on The Recursive Astrology: one chart read through many schools, in four modes. The chart on screen is ${chartKind()}. Chart facts reach the assistant only in a message the reader previews, edits and sends. ${FRAME} Creed: ${CREED}` +
      (gs.length ? ` The schools switched on have these public grammars on recursive.eco; when the reader asks what a school says beyond the excerpts in a message, read its grammar with library_grammar_detail: ${gs.map(x => `${x.slug} (${x.id}), for ${x.schools.join(' and ')}`).join('; ')}.` : '');
  };
  // what the shared assistant reads as "the page": never the page's own text (it may be a private chart)
  window.recursiveAstroPageText = pageSummary;
  const offRecursive = () => !/(^|\.)recursive\.eco$/.test(location.hostname);
  let aiMode = 'interpret';
  const SEND_NOTE = '<b>Which route:</b> the shared recursive.eco assistant (the star in the corner). "Send to the assistant" opens it and sends the text below as if you had pressed Send there, so sign-in, the age question and credits apply as usual. Where recursive.eco does not take a sent message yet, the text is typed into its chat box instead, and you press Send there.';
  function openAI(mode, arg) {
    const dlg = $('#aiDlg'); if (!dlg) return;
    let text = '', what = '', note = '';
    if (mode === 'grammar') {
      text = grammarText(arg);
      $('#aiTitle').textContent = 'Ask the assistant to build my grammar';
      what = arg === 'chart' ? 'The whole chart on screen: every placement, the figures by name, the aspects.' : 'The selection in the Lens.';
      note = `<b>Which route:</b> the recursive.eco assistant, opened on Chat with the request typed into its chat box. This page cannot save a grammar itself, and recursive.eco has no one-step "save this chart as a grammar" message a page like this could send (that would need a change on recursive.eco). When you are signed in, the assistant has its own tools to create a grammar; the request asks it to make the grammar private and to tell you what it will create and wait for your yes. Nothing is sent until you tap Send in the assistant.`;
    } else if (arg === 'chart') {
      text = chartText();
      $('#aiTitle').textContent = 'Interpret with AI';
      what = 'The whole chart on screen: every placement, the figures by name, the aspects, and what the schools you switched on say, as much as fits.';
      note = SEND_NOTE;
    } else {
      const sel = selectionFor(arg);
      if (!sel) return;
      text = interpretText(sel);
      $('#aiTitle').textContent = 'Interpret with AI';
      what = `Selected: ${sel.title}.`;
      note = SEND_NOTE;
    }
    aiMode = mode;
    $('#aiGo').textContent = mode === 'grammar' ? 'Open the assistant with this' : 'Send to the assistant';
    note += ' The text carries only the chart facts shown in it, never a birth date, time or place. A chat may use recursive.eco credits.';
    if (offRecursive()) note += ' On this host the assistant runs signed out (sign-in carries only on recursive.eco pages): it can chat, but cannot save or create anything.';
    $('#aiWhat').textContent = what;
    $('#aiNote').innerHTML = note;
    $('#aiStatus').textContent = '';
    const ta = $('#aiText'); ta.value = text; aiCount();
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0;
  }
  function aiCount() {
    const n = $('#aiText').value.length, over = n > AI_MAX;
    $('#aiCount').textContent = `${n.toLocaleString('en-US')} characters${over ? ` — over the ${AI_MAX.toLocaleString('en-US')} that fit in the link to the assistant; shorten it, or copy it instead` : ''}`;
    $('#aiCount').classList.toggle('over', over);
    $('#aiGo').disabled = over || !n;
  }
  async function aiCopy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = $('#aiText'); ta.focus(); ta.select();
      try { return document.execCommand('copy'); } catch (e2) { return false; }
    }
  }
  function closeAI() { const d = $('#aiDlg'); if (d.close) d.close(); else d.removeAttribute('open'); }
  // where the outcome is said once the dialog has closed (an open modal dialog keeps the sidebar out of reach)
  let toastT = null;
  function toast(msg, ms = 8000) {
    let t = $('#labToast');
    if (!t) { t = document.createElement('div'); t.id = 'labToast'; t.className = 'lab-toast no-print'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
  }
  // the launcher's iframe, once it has mounted (the launcher loads from recursive.eco after this page)
  async function assistantFrame() {
    for (let i = 0; i < 24; i++) {   // about 6 s
      const f = document.querySelector('.rec-assistant-shell iframe');
      if (f && window.RecursiveAssistant) return f;
      await new Promise(r => setTimeout(r, 250));
    }
    return null;
  }
  // post the text and wait for the ack: 'sent' | 'held' (acked ok:false: a repeat inside a minute, or too soon after
  // the last ask) | 'no-ack' (an embed without the listener, or no answer in time). The launcher starts the embed
  // only after this page has settled, or on the first open: when this open starts it, the wait counts from its load.
  const ACK_MS = 1500, LOAD_MS = 8000;
  function sendToAssistant(frame, text) {
    return new Promise(resolve => {
      const loaded = !!frame.getAttribute('src');
      window.RecursiveAssistant.open();   // grows the shell into the sidebar, and sets the iframe's src if it had none
      let origin = '';
      try { origin = new URL(frame.src, location.href).origin; } catch (e) { /* no src: no ack */ }
      if (!origin || origin === 'null') { resolve('no-ack'); return; }
      const id = 'chart-lab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      let done = false, every = null, until = null;
      const finish = r => { if (done) return; done = true; clearInterval(every); clearTimeout(until); window.removeEventListener('message', onAck); resolve(r); };
      function onAck(e) {
        if (e.origin !== origin || e.source !== frame.contentWindow) return;
        const d = e.data;
        if (d && d.type === 'recursive-eco:ask-ack' && d.id === id) finish(d.ok ? 'sent' : 'held');
      }
      window.addEventListener('message', onAck);
      // posted again every 300 ms while the embed may still be starting: the embed sends one text once (a repeat
      // inside a minute is acked ok:false and not sent), and the first ack ends the wait
      const post = () => { try { frame.contentWindow.postMessage({ type: 'recursive-eco:ask', text, send: true, id }, origin); } catch (e) { /* the frame went away */ } };
      const start = ms => { clearTimeout(until); post(); every = setInterval(post, 300); until = setTimeout(() => finish('no-ack'), ms); };
      if (loaded) start(ACK_MS);
      else { frame.addEventListener('load', () => { if (!done) start(ACK_MS * 2); }, { once: true }); until = setTimeout(() => finish('no-ack'), LOAD_MS); }
    });
  }
  function wireAI() {
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-ai], [data-grammar]'); if (!b) return;
      if (b.dataset.ai) openAI('interpret', b.dataset.ai); else openAI('grammar', b.dataset.grammar);
    });
    $('#aiText').addEventListener('input', aiCount);
    $('#aiCancel').addEventListener('click', closeAI);
    $('#aiCopy').addEventListener('click', async () => { $('#aiStatus').textContent = (await aiCopy($('#aiText').value)) ? 'Copied.' : 'Could not copy: select the text and copy it.'; });
    const unavailable = async text => {
      const copied = await aiCopy(text);
      $('#aiStatus').textContent = `The assistant is not available on this page right now (it loads from recursive.eco, and is left out inside embeds).${copied ? ' The text is copied: paste it into the assistant on any recursive.eco page.' : ''}`;
    };
    $('#aiGo').addEventListener('click', async () => {
      const text = $('#aiText').value.trim(); if (!text) return;
      const A = window.RecursiveAstroAssistant;
      if (aiMode === 'grammar') {   // the grammar request keeps the prefill: the reader taps Send in the assistant
        if (A && A.ask(text, pageSummary())) closeAI(); else await unavailable(text);
        return;
      }
      if (!A) { await unavailable(text); return; }
      const go = $('#aiGo'); go.disabled = true;
      $('#aiStatus').textContent = 'Opening the assistant…';
      const frame = await assistantFrame();
      go.disabled = false;
      if (!frame) { await unavailable(text); return; }
      closeAI();
      toast('Sending to the assistant…', 15000);
      const r = await sendToAssistant(frame, text);
      if (r === 'sent') toast('Sent to the assistant: its answer comes in the sidebar. Sign-in, the age question and credits apply as usual.');
      else if (r === 'held') toast('The assistant did not send it: it takes the same text once a minute, and one ask every few seconds. Try again in a moment, or copy the text from Interpret with AI.', 10000);
      else if (A.ask(text, pageSummary())) toast('Placed in the assistant: press Send.', 10000);
      else toast('The assistant did not answer. Open Interpret with AI again and copy the text.', 10000);
    });
  }

  // ───────────────────────── boot ─────────────────────────
  async function boot() {
    const P = new URLSearchParams(location.search);
    const want = parseChartParam(P.get('chart'));
    const onLocalhost = ON_LOCALHOST;
    // the dropdown's sources, started now: sign-in (awaited only for a saved chart), the public list, and on
    // localhost whether the owner's local files are there
    // what the dropdown shows while the chart loads: what was asked for (corrected once it is on the wheel)
    S.pickValue = want.kind === 'public' || want.kind === 'saved' ? `${want.kind}:${want.id}` : (want.kind || '');
    const stub = onLocalhost && P.get('stubauth') === '1' ? stubClient() : null;
    S.authP = initAuth(stub).then(a => { S.auth = a; renderChartPicker(); return a; });
    S.authP.then(async a => {
      if (a.state !== 'in') return;
      try { S.saved = await listSaved(a); } catch (e) { S.saved = []; S.savedErr = true; }
      renderChartPicker();
    });
    const pubP = getJSON('../mock-data/public-charts.json').then(l => (S.publicCharts = Array.isArray(l) ? l : []));
    // "This laptop": offered on localhost once her local files have loaded here (a per-browser note, so no
    // probe request is made for files that may not exist)
    const LOCAL_SEEN = 'chart-lab:local-files-seen';
    const localSeen = v => { try { if (v === undefined) return localStorage.getItem(LOCAL_SEEN) === '1'; if (v) localStorage.setItem(LOCAL_SEEN, '1'); else localStorage.removeItem(LOCAL_SEEN); } catch (e) { /* storage off: the group shows only while her chart is on screen */ } return false; };
    $('#chartSel').addEventListener('change', e => {
      const v = e.target.value;
      if (!v || v === 'viewer' || v === S.pickValue) return;
      // a new chart: a fresh page (its own figures, houses, transits), keeping the mode, schools, rulers and zodiac
      location.assign(urlWith({ chart: v, from: null, h: null, sel: null, day: null, q: null }));
    });
    const [schoolsG, structure, bailey, shelf, ids] = await Promise.all([
      getJSON('../grammars/astrology-schools/grammar.json'), getJSON('../grammars/the-structure-of-the-sky/grammar.json'),
      getJSON('../grammars/esoteric-bailey-paraphrase/grammar.json'), getJSON('../mock-data/passages.json'), getJSON('../ids.json')]);
    // the schools' grammars on recursive.eco, for the assistant's page context (pageSummary)
    if (ids && ids.ids) { S.gids = ids.ids; S.gidsPublic = new Set(ids._public_now || []); }
    // schools (+ the extra podcast group from the shelf)
    const fams = {}; ((schoolsG && schoolsG._families) || []).forEach(f => { fams[f.id] = f.label; });
    S.schools = ((schoolsG && schoolsG._schools) || []).map(s => Object.assign({}, s, { family_label: fams[s.family] || s.family_label || '' }));
    for (const x of ((shelf && shelf.extra_groups) || [])) S.schools.push(Object.assign({ family_label: x.family_label }, x));
    S.schools.forEach(s => { S.schoolBy[s.slug] = s; });
    // rulers: traditional + modern from the structure grammar, Bailey's esoteric column from the paraphrase grammar
    const trad = {}, mod = {};
    for (const it of ((structure && structure.items) || [])) {
      const m = it.metadata || {};
      if (/^sign-/.test(it.id) && m.ruler) { const s = cap(it.id.slice(5)); trad[s] = low(m.ruler); mod[s] = low(m.ruler_modern || m.ruler); }
      if (/^planet-/.test(it.id) && (m.domicile || m.exaltation)) {
        const arr = v => Array.isArray(v) ? v : v ? [v] : [];
        S.DIGN[it.id.slice(7)] = { domicile: arr(m.domicile), exaltation: Array.isArray(m.exaltation) ? m.exaltation[0] : m.exaltation, detriment: arr(m.detriment), fall: Array.isArray(m.fall) ? m.fall[0] : m.fall };
      }
    }
    const eso = {};
    for (const it of ((bailey && bailey.items) || [])) { const m = it.metadata || {}; if (m.sign && m.ruler_esoteric) eso[m.sign] = low(m.ruler_esoteric); }
    S.RULERS['rulers-traditional'] = Object.keys(trad).length === 12 ? trad : FALLBACK_TRAD;
    S.RULERS['rulers-modern'] = Object.keys(mod).length === 12 ? mod : FALLBACK_MOD;
    S.RULERS['rulers-bailey-esoteric'] = Object.keys(eso).length === 12 ? eso : null;
    if (!S.RULERS['rulers-bailey-esoteric']) SETS.splice(SETS.findIndex(s => s.id === 'rulers-bailey-esoteric'), 1);
    S.RULERS['rulers-colour-system'] = Object.assign({}, S.RULERS['rulers-modern'], { Taurus: 'vesta', Virgo: 'chiron' });
    // the shelf
    S.passages = (shelf && shelf.passages) || [];
    for (const p of S.passages) for (const k of (p.keys || [])) { if (!S.byKey.has(k)) S.byKey.set(k, []); S.byKey.get(k).push(p); }
    // the chart: the one ?chart= names; else a hand-over from the calculator; else her private files on
    // localhost; else the invented example
    let trop = null, sid = null, tr = null, rd = null;
    // a chart the calculator handed over (?from=viewer): computed here, from positions only
    if (P.get('from') === 'viewer' && (!want.kind || want.kind === 'viewer')) {
      $('#chartMeta').textContent = 'Waiting for the chart from the calculator…';
      const v = await receiveHandoff(P.get('h'));
      const both = chartsFromHandoff(v);
      if (both) { trop = both.tropical; sid = both.sidereal; S.source = 'viewer'; }
      else S.handoffFailed = true;
    } else if (want.kind === 'public') {
      const c = (await pubP).find(x => x.id === want.id);
      if (c && c.tropical) { trop = c.tropical; sid = c.sidereal || null; S.source = 'public'; S.pub = c; }
      else S.pickFailed = 'that public chart is not in the list';
    } else if (want.kind === 'saved') {
      $('#chartMeta').textContent = 'Checking your sign-in on recursive.eco…';
      const a = await S.authP;
      if (a.state !== 'in') S.pickFailed = a.state === 'error' ? 'could not check your sign-in' : 'that saved chart needs you signed in on recursive.eco';
      else {
        try {
          $('#chartMeta').textContent = 'Reading your saved chart…';
          const row = await readSaved(a, want.id);
          if (!row) S.pickFailed = 'that chart is not among your saved charts';
          else {
            S.savedName = (row.document_data && row.document_data.name) || 'Your saved chart';
            $('#chartMeta').textContent = 'Recomputing it on the chart server…';
            const both = await chartsFromSaved(row.document_data || {});
            if (both) { trop = both.tropical; sid = both.sidereal; S.source = 'saved'; S.savedId = want.id; }
            else S.pickFailed = 'the chart server gave an incomplete chart';
          }
        } catch (e) { S.pickFailed = `could not load that saved chart (${(e && e.message) || e})`; }
      }
    }
    if (!trop && onLocalhost && (!want.kind || want.kind === 'local') && !S.handoffFailed && !S.pickFailed) {
      trop = await getJSON('../mock-data/my-chart.local.json');
      if (trop) { [sid, tr, rd] = await Promise.all(['my-sidereal', 'my-transits', 'my-readings'].map(f => getJSON(`../mock-data/${f}.local.json`))); S.source = 'local'; localSeen(true); }
      else { localSeen(false); if (want.kind === 'local') S.pickFailed = 'no local chart files on this laptop'; }
    }
    if (!trop) {
      const ex = await getJSON('../mock-data/example-chart.json');
      if (!ex) { $('#chartMeta').textContent = 'Could not load mock-data/example-chart.json.'; return; }
      trop = ex.tropical; sid = ex.sidereal; tr = ex.transits90d; S.source = 'example';
      S.exampleNote = ex.birth ? `${ex.birth.date} ${ex.birth.time} ${ex.birth.zone || ''}, ${ex.birth.place || ''}` : '';
    }
    S.charts.tropical = normChart(trop); S.charts.sidereal = normChart(sid); S.transits = tr && tr.days ? tr : null;
    // the dropdown shows what is on the wheel
    S.pickValue = S.source === 'viewer' ? 'viewer' : S.source === 'local' ? 'local' : S.source === 'public' ? 'public:' + S.pub.id
      : S.source === 'saved' ? 'saved:' + S.savedId : 'example';
    await pubP; S.localAvailable = S.source === 'local' || (onLocalhost && localSeen());
    renderChartPicker(); renderBanner();
    if (S.source === 'viewer' || S.source === 'saved') S.transitsPending = transitsFor(trop).then(t => { S.transitsPending = null; S.transits = t; S.transitsTried = true; if (t) { const i = t.days.findIndex(d => d.date === (P.get('day') || '')); S.dayIdx = i >= 0 ? i : 0; } if (S.mode === 'today' || S.mode === 'book') rerender(); });
    S.readings = normReadings(rd); if (S.readings) S.readings.forEach(it => S.readById.set(it.id, it));
    // state from the URL (?schools= mirrors tarot's ?decks=)
    const sp = P.get('schools');
    S.on = sp == null ? defaultsOn() : new Set(sp.split(',').map(x => x.trim()).filter(x => S.schoolBy[x]));
    const rs = P.get('rulers'); if (rs && LONG[rs] && S.RULERS[LONG[rs]]) S.rulers = LONG[rs];
    const z = P.get('zodiac'); if (z === 'sidereal' && S.charts.sidereal) S.zodiac = 'sidereal';
    S.sel = strToSel(P.get('sel'));
    S.q = P.get('q') || '';
    if (S.transits) {
      const want = P.get('day') || new Date().toLocaleDateString('en-CA');
      const i = S.transits.days.findIndex(d => d.date === want);
      S.dayIdx = i >= 0 ? i : 0;
    }
    CH = S.charts[S.zodiac];
    // wheel
    WHEEL = new Wheel($('#wheelHost'), { onPick, label: 'Chart wheel: signs, houses, planets and aspect lines' });
    WHEEL.render(CH);
    // controls
    renderSchoolChips(); renderRulers(); renderMeta();
    if (window.innerWidth > 860) $('#schoolsBox').open = true;
    $('#schoolChips').addEventListener('change', e => {
      const cb = e.target.closest('input[data-school]'); if (!cb) return;
      if (cb.checked) S.on.add(cb.dataset.school); else S.on.delete(cb.dataset.school);
      renderSchoolChips(); rerender();
    });
    $$('[data-preset]').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.preset;
      S.on = p === 'all' ? new Set(S.schools.map(s => s.slug)) : p === 'none' ? new Set() : defaultsOn();
      renderSchoolChips(); rerender();
    }));
    $('#rulerSel').addEventListener('change', e => { S.rulers = e.target.value; renderRulers(); rerender(); });
    $$('#zodiacSeg button').forEach(b => b.addEventListener('click', () => {
      if (b.disabled || b.dataset.z === S.zodiac) return;
      const was = S.sel && S.sel.kind === 'figure' && CH.figures[S.sel.i] ? figLabel(CH.figures[S.sel.i]) : null;
      S.zodiac = b.dataset.z; CH = S.charts[S.zodiac];
      // each zodiac lists its own figures: keep the same figure by name, not by its place in the list
      if (S.sel && S.sel.kind === 'figure') { const i = CH.figures.findIndex(f => figLabel(f) === was); S.sel = i >= 0 ? { kind: 'figure', i } : null; }
      WHEEL.render(CH); rerender();
    }));
    $$('.modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    wireAI();
    // print = the Book, with every fold open
    let reopened = [];
    window.addEventListener('beforeprint', () => {
      if (S.mode !== 'book') renderBook();
      reopened = $$('#modeBook details:not([open])'); reopened.forEach(d => { d.open = true; });
    });
    window.addEventListener('afterprint', () => { reopened.forEach(d => { d.open = false; }); reopened = []; });
    const m = P.get('mode');
    setMode(['ask', 'today', 'lens', 'book'].includes(m) ? m : 'lens');
  }
  boot();
})();
