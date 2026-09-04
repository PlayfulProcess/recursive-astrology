/* Shared site header for The Recursive Astrology static site.
 * One definition, used by every page (root + viewer/ + viewers/ + pages/). Style-
 * isolated via Shadow DOM so each page's own CSS can't override it. Path-aware so
 * links resolve from any nesting depth.
 *
 * Usage:  <script src="<path-to>site-header.js?v=46"></script>
 *         <site-header active="cards"></site-header>
 * The `active` attribute highlights the matching tab; if omitted it is
 * auto-detected from the filename.
 *
 * Ported from recursive-tarot/site-header.js (the family's pattern source — incl.
 * the dropdown hover/gap fix, commit 84934e6) — adapted: crescent + star branding
 * (astro's own, kept from the pre-port header), and this repo's own menus:
 *   Home | Views (Cards, Explorer, Lenses, Tree · Timeline, Genealogy, Chart Wheel,
 *   Archetypal, All Astros, Chart Viewer, All grammars) | Courses (History of
 *   Astrology, The Right Size, Three Doors) | Grammars (every grammar in grammars/*,
 *   fetched live from grammars/_collection.json so the menu never goes stale as
 *   grammars are added) | GitHub.
 */
/* One fetch of grammars/_collection.json per page load.
 *
 * Aug 2 2026: the collection index is the site's shared spine — the header
 * dropdown, the deck picker, the view switcher and a viewer's own bootstrap all
 * want it, and each was fetching it independently, so a single page load asked
 * for the same file three or four times. There is no shared loader to put the
 * cache in (each caller resolves its own relative path), so the memo sits here,
 * in the one script every page loads first, and is keyed on the resolved URL.
 * Deliberately narrow: GET requests for that one filename only — everything
 * else, including the chart API's POSTs, goes straight through untouched. */
(function () {
  if (typeof window === 'undefined' || window.__raCollectionMemo || !window.fetch) return;
  const memo = new Map();
  window.__raCollectionMemo = memo;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || null;
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (url && method === 'GET' && url.split(/[?#]/)[0].endsWith('_collection.json')) {
        const key = new URL(url, location.href).href;
        let pending = memo.get(key);
        if (!pending) {
          // Hand out clones and never read the original, so every caller gets
          // its own readable body. A failure is not cached — the next caller
          // gets a real retry rather than a memoised rejection.
          pending = nativeFetch(input, init);
          pending.catch(() => memo.delete(key));
          memo.set(key, pending);
        }
        return pending.then(function (r) { return r.clone(); });
      }
    } catch (_) { /* anything unexpected: fall through to a plain fetch */ }
    return nativeFetch(input, init);
  };
})();

(function () {
  if (customElements.get('site-header')) return;

  // Path back to the repo root — depth-aware so it works at any nesting
  // (root, /viewer/, /viewers/, /pages/).
  const _segs = location.pathname.split('/').filter(Boolean);
  const PFX = '../'.repeat(Math.max(0, _segs.length - 1));

  // Figure-capture mode (?fig=1): hide a viewer's own control toolbars so headless
  // screenshots become clean static plates. Only when explicitly asked.
  if (new URLSearchParams(location.search).get('fig') === '1') {
    const s = document.createElement('style');
    s.textContent = '.hint,.controls,.toolbar{display:none!important}';
    (document.head || document.documentElement).appendChild(s);
  }

  // Shared SVG icon library — one source, available as <rt-icon name="…"> on every page.
  if (!document.getElementById('ra-icons-lib')) {
    const si = document.createElement('script'); si.id = 'ra-icons-lib'; si.src = PFX + 'icons.js';
    document.head.appendChild(si);
  }

  // [key, label, href] — every content VIEW of this repo's data, in two groups
  // (mirrors recursive-tarot's Views menu: card-level vs collection-level).
  const CARD_VIEWS = [
    ['cards',    'Cards',    PFX + 'viewers/cards.html'],
    ['explorer', 'Explorer', PFX + 'viewers/explorer.html'],
    ['lenses',   'Lenses',   PFX + 'viewers/lenses.html'],
    ['tree',     'Tree',     PFX + 'viewers/tree-viewer.html'],
  ];
  const COLLECTION_VIEWS = [
    ['timeline',   'Timeline',                   PFX + 'viewers/timeline.html'],
    ['genealogy',  'Genealogy',                  PFX + 'genealogy.html'],
    ['wheel',      'Chart Wheel',                PFX + 'wheel.html'],
    ['archetypal', 'Archetypal — planet pairs',  PFX + 'archetypal.html'],
    ['all-astros', 'All Astros — one symbol, every voice', PFX + 'viewers/all-astros.html'],
    ['viewer',     'Chart Viewer',                PFX + 'viewer/astrology-viewer.html'],
    ['all',        'All grammars',                PFX + 'index.html#all-grammars'],
  ];
  // Courses — each a course-viewer ?course=… except the flagship, which has its
  // own chapter-list page (pages/course.html).
  const COURSES = [
    ['course',      'History of Astrology',        PFX + 'pages/course.html'],
    ['reading',     'The Right Size (a reading)',   PFX + 'pages/course-viewer.html?course=the-right-size'],
    ['three-doors', 'Three Doors — the Trika lens', PFX + 'pages/course-viewer.html?course=three-doors'],
  ];
  const TOOLS = [
    ['github', 'GitHub ↗', 'https://github.com/PlayfulProcess/Recursive-astrology', 't-github', true],
  ];

  function autoActive() {
    const f = location.pathname.split('/').pop() || 'index.html';
    if (f.startsWith('cards')) return 'cards';
    if (f.startsWith('explorer')) return 'explorer';
    if (f.startsWith('lenses')) return 'lenses';
    if (f.startsWith('all-astros')) return 'all-astros';
    if (f.startsWith('tree-viewer')) return 'tree';
    if (f.startsWith('timeline')) return 'timeline';
    if (f.startsWith('genealogy')) return 'genealogy';
    if (f.startsWith('wheel')) return 'wheel';
    if (f.startsWith('archetypal')) return 'archetypal';
    if (f.startsWith('astrology-viewer')) return 'viewer';
    if (f.startsWith('course-viewer') || f.startsWith('course')) return 'course';
    if (f === 'index.html' || f === '') return 'home';
    return 'home';
  }

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      // Embedded (iframed into some other surface): render no header at all.
      if (new URLSearchParams(location.search).get('embed') === '1') { this.style.display = 'none'; return; }
      // Museum/Editorial webfonts — same families theme.css tokenises (--serif-display / --sans),
      // injected once into the document head so this shadow DOM and the light DOM both render in them.
      if (!document.getElementById('ra-fonts')) {
        const fl = document.createElement('link'); fl.id = 'ra-fonts'; fl.rel = 'stylesheet';
        fl.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&display=swap';
        document.head.appendChild(fl);
      }
      const active = this.getAttribute('active') || autoActive();
      const root = this.attachShadow({ mode: 'open' });
      const tab = ([key, label, href, cls, ext]) =>
        `<a class="tab ${cls || ''}${key === active ? ' active' : ''}" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`;
      const viewItem = ([key, label, href]) =>
        `<a class="${key === active ? 'on' : ''}" href="${href}">${label}</a>`;
      const VIEW_KEYS = [...CARD_VIEWS, ...COLLECTION_VIEWS].map(v => v[0]);
      const viewActive = VIEW_KEYS.includes(active);
      root.innerHTML = `
        <style>
          :host{ display:block; position:sticky; top:0; z-index:50;
                 background:#fbf9f3; padding:0; margin:0; border:0; font-size:14px;
                 transition:transform .25s ease; will-change:transform; }
          @media (prefers-reduced-motion: reduce){ :host{ transition:none; } .tab, .dd-menu a, .brand{ transition:none !important; } }
          .bar{
            display:flex; align-items:center; gap:14px; flex-wrap:wrap;
            padding:13px 20px; background:#fbf9f3;
            border-bottom:1px solid #d8d2c6;
            font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
          }
          .brand{ display:flex; flex-direction:row; align-items:center; gap:10px; margin-right:4px; }
          .brand-logo, .brand-name{ display:inline-flex; align-items:center; text-decoration:none; }
          .brand-logo{ border-radius:50%; }
          .brand-name .name{ font-family:"Fraunces",Georgia,serif; font-size:21px; font-weight:600; letter-spacing:.4px; color:#221f1a; white-space:nowrap; }
          .brand-name:hover .name{ color:#000; }
          .brand-name .name .gold{ color:#2f5d8a; }
          .brand svg{ flex-shrink:0; }
          .spacer{ flex:1 1 auto; }
          nav{ display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
          .cap{ font-size:9.5px; text-transform:uppercase; letter-spacing:.16em;
                color:#8a8273; margin:0 2px 0 6px; user-select:none; }
          .sep{ width:1px; height:20px; background:#d8d2c6; margin:0 6px; }
          .tab{
            color:#6b6457; text-decoration:none; font-size:13px; font-weight:500;
            padding:7px 9px; white-space:nowrap; transition:color .15s;
            border:0; border-bottom:1.5px solid transparent; border-radius:0;
          }
          .tab:hover{ color:#2f5d8a; }
          .tab.active{ color:#2f5d8a; font-weight:600; border-bottom-color:#2f5d8a; }
          .t-github{ color:#6b6457; border:0; border-bottom:1.5px solid transparent; border-radius:0; }
          .t-github:hover{ color:#2f5d8a; background:transparent; }
          /* dropdown */
          .dd{ position:relative; }
          .dd-btn{ background:none; font-family:inherit; cursor:pointer; }
          .dd-btn::after{ content:""; display:inline-block; width:5px; height:5px; margin-left:7px;
            border-right:1.4px solid currentColor; border-bottom:1.4px solid currentColor;
            transform:rotate(45deg) translateY(-2px); opacity:.5; }
          .dd-menu{ position:absolute; top:calc(100% + 8px); right:0; min-width:230px;
            max-width:min(320px,calc(100vw - 16px)); background:#ffffff; border:1px solid #d8d2c6;
            border-radius:8px; padding:7px; box-shadow:0 16px 44px -18px rgba(60,45,20,.45); display:none; z-index:60;
            overflow-y:auto; }
          /* Invisible bridge across the 8px gap: keeps the menu open while the cursor
             travels from the trigger down to a sub-item (no more disappearing dropdown). */
          .dd-menu::before{ content:""; position:absolute; left:0; right:0; top:-10px; height:10px; }
          /* Horizontal/vertical clamping is computed in JS (positionMenu, below), not a fixed
             breakpoint: a left-side trigger (Views) overflows the left edge whenever the panel
             is wider than the space to its left, which happens at tablet widths (~760–950px)
             just as much as on phones — a single max-width media query misses that range. */
          .dd:hover .dd-menu, .dd:focus-within .dd-menu, .dd.open .dd-menu{ display:block; }
          .dd.open .dd-btn::after{ transform:rotate(225deg) translateY(2px); opacity:.85; }
          .dd-menu a{ display:block; color:#4a4439; text-decoration:none; font-size:13px;
            padding:8px 10px; border-radius:7px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .dd-menu a:hover{ background:#f1ece1; color:#221f1a; }
          .dd-menu a[href*="recursive.eco"]{ color:#9333ea; }
          .dd-menu a.on{ color:#221f1a; background:#f1ece1; font-weight:600; }
          .dd-menu a.all{ border-top:1px solid #d8d2c6; margin-top:4px; padding-top:9px; font-weight:600; }
          .dd-cap{ display:block; font-family:Inter,sans-serif; font-size:9px; text-transform:uppercase; letter-spacing:.16em;
            color:#8a8273; padding:8px 10px 3px; user-select:none; }
          .dd-cap:first-child{ padding-top:2px; }
          @media (max-width:680px){
            .brand .sub{ display:none; }
            .tab{ padding:5px 8px; font-size:12px; }
            .cap{ display:none; } .sep{ display:none; }
          }
        </style>
        <div class="bar">
          <span class="brand">
            <a class="brand-logo" href="https://recursive.eco" target="_blank" rel="noopener" title="Part of recursive.eco — the parent project" aria-label="recursive.eco — the parent project">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;background:#fff;border-radius:50%;flex-shrink:0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2f5d8a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M17 4a7 7 0 1 0 3 11 5.6 5.6 0 0 1-3-11z" />
                  <path d="M8.5 4.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" />
                </svg>
              </span>
            </a>
            <a class="brand-name" href="${PFX}index.html" title="The Recursive Astrology — home">
              <span class="name">The <span class="gold">Recursive Astrology</span></span>
            </a>
          </span>
          <span class="spacer"></span>
          <nav aria-label="Site sections">
            <a class="tab${active === 'home' ? ' active' : ''}" href="${PFX}index.html">Home</a>
            <span class="dd">
              <a class="tab dd-btn${viewActive ? ' active' : ''}" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" aria-label="Views menu">Views</a>
              <span class="dd-menu">
                <span class="dd-cap">By grammar</span>
                ${CARD_VIEWS.map(viewItem).join('')}
                <span class="dd-cap">Across the collection</span>
                ${COLLECTION_VIEWS.map(viewItem).join('')}
              </span>
            </span>
            <span class="dd">
              <a class="tab dd-btn${active === 'course' ? ' active' : ''}" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" aria-label="Courses menu">Courses</a>
              <span class="dd-menu">
                ${COURSES.map(viewItem).join('')}
              </span>
            </span>
            <span class="dd">
              <a class="tab dd-btn" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" aria-label="Grammars menu">Grammars</a>
              <span class="dd-menu" id="grammars-menu"><span class="dd-cap">Loading…</span></span>
            </span>
            ${TOOLS.map(tab).join('')}
          </nav>
        </div>`;

      // Grammars dropdown is filled live from grammars/_collection.json so it
      // never drifts as grammars are added (unlike a hardcoded list baked into
      // this file) — every entry opens the Cards viewer on that grammar.
      fetch(PFX + 'grammars/_collection.json', { cache: 'no-cache' })
        .then(r => r.json())
        .then(col => {
          const menu = root.querySelector('#grammars-menu');
          if (!menu) return;
          const BRANCH_LABEL = { 'primary-sources': 'Primary sources', synthesis: 'Synthesis', castings: 'Castings', readings: 'Readings' };
          const groups = {};
          (col.grammars || []).forEach(g => { (groups[g.branch || 'synthesis'] = groups[g.branch || 'synthesis'] || []).push(g); });
          let html = '';
          for (const b of ['primary-sources', 'synthesis', 'castings', 'readings']) {
            const list = groups[b]; if (!list || !list.length) continue;
            html += `<span class="dd-cap">${BRANCH_LABEL[b] || b}</span>`;
            html += list.map(g => {
              // The src param is always resolved relative to viewers/cards.html's own
              // location (one level from root), NOT relative to whatever page this
              // link sits on — so it's "../grammars/…" regardless of PFX.
              const href = `${PFX}viewers/cards.html?src=../grammars/${encodeURIComponent(g.slug)}/grammar.json`;
              const name = (g.name || g.slug).split(' — ')[0];
              return `<a href="${href}">${name}</a>`;
            }).join('');
          }
          html += `<a class="all" href="${PFX}index.html#all-grammars">Browse all (Cards · Study · Tree) →</a>`;
          menu.innerHTML = html || '<span class="dd-cap">No grammars found</span>';
        })
        .catch(() => {
          const menu = root.querySelector('#grammars-menu');
          if (menu) menu.innerHTML = `<a href="${PFX}index.html#all-grammars">Browse all grammars →</a>`;
        });

      // Dropdowns: keyboard + ARIA on top of the hover/focus-within CSS. Panels are
      // right-anchored by default (.dd-menu right:0), which reads fine when the trigger
      // sits near the right of the nav — but a left-side trigger (Views) has less room
      // to its left than the panel needs, at tablet widths as much as on phones.
      // positionMenu() measures the real trigger + panel on every open and clamps
      // left/top so the panel always stays fully on-screen, at any width. (Pattern
      // ported from recursive-tarot/site-header.js commit 84934e6, the family's fix
      // for the same left-edge-overflow bug.)
      const DD_EDGE = 8; // min gap kept between a panel and the viewport edge
      const positionMenu = dd => {
        const menu = dd.querySelector('.dd-menu');
        if (!menu) return;
        const ddRect = dd.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        // Natural position mirrors the CSS default (panel's right edge flush with the
        // trigger's right edge), then clamp so neither edge crosses the viewport.
        let left = ddRect.right - menuRect.width;
        left = Math.max(DD_EDGE, Math.min(left, vw - menuRect.width - DD_EDGE));
        menu.style.left = (left - ddRect.left) + 'px';
        menu.style.right = 'auto';
        // Vertical: cap height + let the panel scroll internally rather than running
        // off the bottom of short viewports (e.g. a phone in landscape).
        const top = ddRect.bottom + 8;
        menu.style.maxHeight = Math.max(120, vh - top - DD_EDGE) + 'px';
      };
      root.querySelectorAll('.dd').forEach(dd => {
        const btn = dd.querySelector('.dd-btn');
        const set = open => btn && btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        dd.addEventListener('mouseenter', () => { set(true); positionMenu(dd); });
        dd.addEventListener('mouseleave', () => set(false));
        dd.addEventListener('focusin', () => { set(true); positionMenu(dd); });
        dd.addEventListener('focusout', () => { if (!dd.matches(':focus-within')) set(false); });
        dd.addEventListener('keydown', e => {
          if (e.key === 'Escape') { set(false); btn && btn.focus(); }
          if ((e.key === 'Enter' || e.key === ' ') && e.target === btn) {
            const first = dd.querySelector('.dd-menu a'); if (first) { e.preventDefault(); set(true); positionMenu(dd); first.focus(); }
          }
        });
        // Touch / no-hover devices: tap the tab to toggle its menu (hover never fires).
        btn.addEventListener('click', e => {
          if (window.matchMedia('(hover: hover)').matches) return;
          e.preventDefault();
          const willOpen = !dd.classList.contains('open');
          root.querySelectorAll('.dd.open').forEach(o => { o.classList.remove('open'); const b = o.querySelector('.dd-btn'); if (b) b.setAttribute('aria-expanded', 'false'); });
          if (willOpen) { dd.classList.add('open'); set(true); positionMenu(dd); }
        });
      });

      // Close any open menu when tapping outside the header (touch).
      document.addEventListener('click', e => {
        if (!e.composedPath().includes(this)) {
          root.querySelectorAll('.dd.open').forEach(o => { o.classList.remove('open'); const b = o.querySelector('.dd-btn'); if (b) b.setAttribute('aria-expanded', 'false'); });
        }
      });

      // Reposition any currently-open menu on resize/orientation-change (e.g. rotating
      // a tablet with a dropdown open) — a fixed breakpoint can't react to this either.
      window.addEventListener('resize', () => {
        root.querySelectorAll('.dd').forEach(dd => {
          const menu = dd.querySelector('.dd-menu');
          if (menu && getComputedStyle(menu).display !== 'none') positionMenu(dd);
        });
      });

      // Auto-hide on scroll down, reveal on scroll up — but never while the nav has keyboard focus.
      let lastY = window.scrollY || 0, host = this;
      window.addEventListener('scroll', () => {
        const y = window.scrollY || 0;
        const hide = y > 90 && y > lastY + 4 && !host.matches(':focus-within');
        host.style.transform = hide ? 'translateY(-100%)' : 'translateY(0)';
        lastY = y;
      }, { passive: true });
    }
  }
  customElements.define('site-header', SiteHeader);
})();
