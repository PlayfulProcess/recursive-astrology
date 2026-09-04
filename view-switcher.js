/* Shared "eye" view-switcher for the Recursive Tarot static site.
 * One eye icon that flips the current grammar through every view (Cards, Course,
 * Explorer, Tree, Thumbnails, Timeline, Tree of Life, Genealogy, Print). Preserves
 * the loaded grammar (?src / ?github / ?id). Course = the same grammar rendered as a
 * readable course (grammar-course.html), each item a lesson. Style-isolated via Shadow DOM.
 *
 * Usage:  <script src="<path>/view-switcher.js"></script>
 *         <view-switcher active="cards"></view-switcher>
 */
(function () {
  if (customElements.get('view-switcher')) return;

  // Root-relative from any subdir (viewers/ OR pages/), so links work everywhere.
  const root = /\/(viewers|pages)\//.test(location.pathname) ? '../' : '';

  // preserve the loaded grammar + deck multiselect across views
  const p = new URLSearchParams(location.search);
  const keep = new URLSearchParams();
  for (const k of ['src', 'github', 'id', 'type', 'item', 'decks']) if (p.get(k)) keep.set(k, p.get(k));
  const qs = keep.toString() ? '?' + keep.toString() : '';
  const amp = keep.toString() ? '&' : '?';

  // Carry the active spec (groupby/rows) in the URL hash across card-level views.
  // Explorer writes {rows,cols,...} as JSON to location.hash.
  // Cards writes #groupby=fieldName.
  // When switching, translate between formats.
  let specHash = '';
  try {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith('{')) {
      const s = JSON.parse(h);
      if (s.rows?.length) specHash = '#groupby=' + encodeURIComponent(s.rows[0]);
      else if (h) specHash = location.hash; // pass through
    } else if (h.startsWith('groupby=')) {
      const field = new URLSearchParams(h).get('groupby');
      if (field) specHash = '#' + encodeURIComponent(JSON.stringify({ rows: [field], cols: [], filters: {}, pinned: [] }));
    }
  } catch (_) {}

  // [key, label, href]
  // Card-level viewers carry the spec hash so the active grouping survives view switches.
  const cardSpec = specHash && !specHash.startsWith('#' + encodeURIComponent('{')) ? '' : specHash;
  const explorerSpec = specHash.startsWith('#groupby=') ? '#' + encodeURIComponent(JSON.stringify({ rows: [new URLSearchParams(specHash.slice(9)).get('groupby') || decodeURIComponent(specHash.slice(9))], cols: [], filters: {}, pinned: [] })) : specHash;

  // Two viewer families:
  // • Card-level: render items (one node per card / emergence)
  // • Grammar-level: render whole decks (one node per grammar)
  const CARD_VIEWS = [
    ['cards',      'Cards',        root + 'viewers/cards.html' + qs + cardSpec],
    ['explorer',   'Explorer',     root + 'viewers/explorer.html' + qs + explorerSpec],
    ['lenses',     'Lenses',       root + 'viewers/lenses.html' + qs],
    ['tree',       'Tree',         root + 'viewers/tree-viewer.html' + qs + cardSpec],
  ];
  const GRAMMAR_VIEWS = [
    ['timeline',   'Timeline',     root + 'viewers/timeline.html' + qs],
    ['genealogy',  'Genealogy',    root + 'genealogy.html'],
  ];
  const EXTRA_VIEWS = [
    ['thumbnails', 'Thumbnails',   root + 'viewers/cards.html' + qs + amp + 'layout=thumbnails'],
  ];
  const VIEWS = [...CARD_VIEWS, ...GRAMMAR_VIEWS, ...EXTRA_VIEWS];

  const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

  const VIEW_MAP = Object.fromEntries(VIEWS.map(([k, , href]) => [k, href]));

  // Which view is THIS page? (so ?lens to the current view is a no-op, not a loop)
  function autoActive() {
    const f = (location.pathname.split('/').pop() || '').toLowerCase();
    if (f.startsWith('grammar-course')) return 'course';
    if (f.startsWith('tree-viewer')) return 'tree';
    if (f.startsWith('genealogy-tree')) return 'treeoflife';
    if (f.startsWith('timeline')) return 'timeline';
    if (f.startsWith('caster')) return 'caster';
    if (f.startsWith('print')) return 'print';
    if (f.indexOf('genealogy') !== -1) return 'genealogy';
    if (p.get('layout') === 'thumbnails') return 'thumbnails';
    return 'cards';
  }

  // Portable deep-link: ?lens=<view> redirects to that lens at load (preserving
  // src/item via the target href; lens is dropped so there's no loop). Runs
  // immediately, independent of the <view-switcher> element being present.
  const wantLens = p.get('lens');
  if (wantLens && wantLens !== autoActive() && VIEW_MAP[wantLens]) {
    location.replace(VIEW_MAP[wantLens]);
    return;
  }

  function renderSection(views, active) {
    return views.map(([k, label, href]) =>
      `<a class="vs-item${k === active ? ' active' : ''}" href="${href}">${label}</a>`
    ).join('');
  }

  class ViewSwitcher extends HTMLElement {
    connectedCallback() {
      // Eye view-switcher retired Jun 29 2026 — it renders nothing now; the
      // per-page header nav already covers view switching, and the in-page
      // controls were unreliable. The ?lens= deep-link redirect above still works.
      this.style.display = 'none';
      return;
      // --- legacy render (unreachable, kept for reference) ---
      const active = this.getAttribute('active') || autoActive();
      const sr = this.attachShadow({ mode: 'open' });
      const menu =
        `<div class="vs-section-label">Card views</div>` +
        renderSection(CARD_VIEWS, active) +
        `<div class="vs-divider"></div><div class="vs-section-label">Collection maps</div>` +
        renderSection(GRAMMAR_VIEWS, active) +
        `<div class="vs-divider"></div>` +
        renderSection(EXTRA_VIEWS, active);
      sr.innerHTML = `
        <style>
          :host{ display:inline-block; position:relative; font-family:Inter,system-ui,-apple-system,sans-serif; }
          details{ position:relative; }
          summary{ list-style:none; cursor:pointer; display:inline-flex; align-items:center; gap:6px;
            padding:6px 11px; border:1px solid #d8d2c6; border-radius:8px; background:#ffffff; color:#4a4439;
            font-size:13px; font-weight:600; user-select:none; }
          summary::-webkit-details-marker{ display:none; }
          summary:hover{ border-color:#2f5d8a; color:#1f4468; }
          summary .cap{ font-size:12px; opacity:.85; }
          .menu{ position:absolute; top:calc(100% + 6px); left:0; z-index:60; min-width:170px;
            background:#f4f1ea; border:1px solid #d8d2c6; border-radius:10px; padding:6px; box-shadow:0 8px 24px rgba(60,45,20,.5); }
          .vs-section-label{ padding:4px 10px 2px; font-size:10px; letter-spacing:.07em; text-transform:uppercase; color:#6b6457; font-weight:600; }
          .vs-divider{ margin:4px 0; border-top:1px solid #f1ece1; }
          .vs-item{ display:block; padding:7px 12px; border-radius:7px; text-decoration:none; color:#4a4439; font-size:13px; }
          .vs-item:hover{ background:#faf3e6; color:#221f1a; }
          .vs-item.active{ background:#2f5d8a; color:#fff; font-weight:700; }
        </style>
        <details>
          <summary title="Switch view">${EYE}<span class="cap">View</span></summary>
          <div class="menu">${menu}</div>
        </details>`;
      const det = sr.querySelector('details');
      document.addEventListener('click', (e) => { if (!this.contains(e.target)) det.removeAttribute('open'); });
    }
  }
  customElements.define('view-switcher', ViewSwitcher);
})();
