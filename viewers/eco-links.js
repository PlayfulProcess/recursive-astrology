/* Recursive.eco per-grammar links — shared across viewers.
 * Reads the hardcoded slug -> deckId map (ids.json, at the repo root) and builds
 * three links for any grammar that's in the map:
 *   <rt-icon name="oracle"></rt-icon> Cast  → https://recursive.eco/process?cast=<id>          (Cast, with this deck chosen)
 *   <rt-icon name="eye"></rt-icon> View  → https://recursive.eco/play?id=<id>               (Play, the reader)
 *   ✏️ Edit  → https://recursive.eco/play?id=<id>&edit=1        (Play with the pencil: the owner edits; others propose edits or make a copy)
 * Links only RESOLVE for visitors once that grammar is is_public on recursive.eco —
 * but they're shown regardless (stable UUIDs), so they light up as grammars publish.
 *
 * Usage:
 *   <script src="<pfx>viewers/eco-links.js"></script>
 *   await RecursiveEcoLinks.ready();
 *   el.innerHTML = RecursiveEcoLinks.barHTML(slug, { type:'astrology', item:22 });
 */
(function () {
  if (window.RecursiveEcoLinks) return;
  const _segs = location.pathname.split('/').filter(Boolean);
  const PFX = '../'.repeat(Math.max(0, _segs.length - 1));   // path back to repo root, depth-aware
  let MAP = null, _p = null;

  function ready() {
    if (_p) return _p;
    _p = fetch(PFX + 'ids.json')
      .then(r => r.json())
      .then(j => { MAP = (j && j.ids) || {}; return MAP; })
      .catch(() => { MAP = {}; return MAP; });
    return _p;
  }
  const deckId = slug => (MAP && MAP[slug]) || null;

  function urls(slug, opts) {
    opts = opts || {};
    const id = deckId(slug);
    if (!id) return null;
    return {
      id,
      cast: 'https://recursive.eco/process?cast=' + id,
      view: 'https://recursive.eco/play?id=' + id,
      edit: 'https://recursive.eco/play?id=' + id + '&edit=1',
    };
  }

  function barHTML(slug, opts) {
    const u = urls(slug, opts);
    if (!u) return '';
    const a = (cls, href, label) => `<a class="eco-btn ${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
    return '<div class="eco-links" title="Open this deck on recursive.eco">'
      + a('eco-cast', u.cast, '<rt-icon name="oracle"></rt-icon> Cast')
      + a('eco-view', u.view, '<rt-icon name="eye"></rt-icon> View')
      + a('eco-edit', u.edit, '✏️ Edit')
      + '</div>';
  }

  (function injectCSS() {
    if (document.getElementById('eco-links-css')) return;
    const s = document.createElement('style');
    s.id = 'eco-links-css';
    s.textContent =
      '.eco-links{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px}' +
      '.eco-btn{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;' +
      'text-decoration:none;padding:8px 14px;border-radius:9px;border:1px solid transparent;transition:filter .15s,background .15s}' +
      '.eco-cast{background:linear-gradient(135deg,#1f4468,#2f5d8a);color:#fff;box-shadow:0 3px 14px rgba(47,93,138,.35)}' +
      // pale lavender / pale mint were dark-theme values: unreadable on this light
      // paper. Ink and the one blue accent, per theme.css.
      '.eco-view{background:transparent;color:#2f5d8a;border-color:rgba(47,93,138,.45)}' +
      '.eco-edit{background:transparent;color:#3f7a5c;border-color:rgba(63,122,92,.45)}' +
      '.eco-btn:hover{filter:brightness(1.12)}' +
      '.eco-view:hover{background:rgba(47,93,138,.12)} .eco-edit:hover{background:rgba(129,178,154,.10)}';
    document.head.appendChild(s);
  })();

  window.RecursiveEcoLinks = { ready, deckId, urls, barHTML, prefix: PFX };
})();
