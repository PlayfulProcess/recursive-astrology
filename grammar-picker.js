/* grammar-picker.js — shared multi-select grammar picker for the astro viewers.
 *
 * Builder's words (Jul 2026): "in the astro viewers I want the flexibility to
 * pull different grammars. we could recon grammars with houses and render
 * there and highlight the ones for which they populate. maybe we can
 * multiselect and stack several grammars."
 *
 * Before this file, wheel.html and archetypal.html each hardcoded their own
 * "load every grammar from _collection.json, keep the ones with category:X
 * items, stack ALL of them" logic (TRADITIONS) — the reader had no say in
 * which voices stack. This module is the ONE place that:
 *   1. loads grammars/_collection.json + every grammar.json once,
 *   2. detects what each grammar "has" (house / planet / sign items — the
 *      same category/metadata shape-inference wheel.html's findHouseItem()
 *      and archetypal.html's findPlanetItem() already use, kept honest per
 *      CLAUDE.md's "grammar types are dead code" rule: this reads the DATA,
 *      never a document_type/slug),
 *   3. renders a chip checklist — chips that HAVE the current view's shape
 *      are highlighted (full ink); chips that don't are visually
 *      de-emphasized but never hidden (the family's honesty convention:
 *      show gaps, don't hide them),
 *   4. lets the reader multi-select which grammars stack, live — no page
 *      reload, no "Load" button; every toggle fires onChange immediately.
 *
 * Reused by any viewer that stacks "every voice" for an entity: today
 * wheel.html (shape:'house'); a natural next fit is archetypal.html
 * (shape:'planet') if that page is ever given its own picker.
 *
 * Usage:
 *   const picker = GrammarPicker.create({
 *     mount: document.getElementById('grammar-picker'),
 *     basePath: '',                    // '' at repo root, '../' from viewers/
 *     shape: 'house',                  // 'house' | 'planet' | 'sign' — which
 *                                      // shape highlights + seeds the default
 *     storageKey: 'wheel-grammar-picker-v1', // persists the reader's choice
 *     onChange(chosen) { ... }         // chosen = [{slug, grammar, shapes, year, eraLabel, voiceLabel}, ...]
 *   });
 *   picker.all      // -> full loaded list once resolved, or null while loading
 *   picker.selected // -> current array of selected slugs
 */
(function (global) {
  'use strict';

  const CSS = [
    '.gp-wrap{margin:18px 0 4px}',
    '.gp-head{display:flex;align-items:center;justify-content:space-between;gap:10px 14px;flex-wrap:wrap;margin-bottom:9px}',
    '.gp-title{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}',
    '.gp-count{font-size:12px;color:var(--muted)}',
    '.gp-actions{display:flex;gap:7px;flex-wrap:wrap}',
    '.gp-actionbtn{font-family:inherit;font-size:11.5px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);',
      'background:var(--panel);color:var(--ink-soft);cursor:pointer;transition:border-color .15s,color .15s}',
    '.gp-actionbtn:hover{border-color:var(--accent);color:var(--ink)}',
    '.gp-chips{display:flex;flex-wrap:wrap;gap:7px}',
    '.gp-chip{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:5px 12px 5px 9px;border-radius:999px;',
      'border:1px solid var(--line);background:var(--panel);color:var(--muted);cursor:pointer;user-select:none;',
      'transition:border-color .15s,color .15s,background .15s,opacity .15s}',
    '.gp-chip:hover{border-color:var(--accent)}',
    '.gp-chip input{accent-color:var(--accent);margin:0;cursor:pointer}',
    // has-shape = this grammar actually populates the current view — full ink, never dimmed.
    '.gp-chip.has-shape{color:var(--ink-soft)}',
    '.gp-chip.has-shape.on{background:var(--chip,#f1ece1);border-color:var(--accent);color:var(--accent);font-weight:600}',
    // no-shape = shown honestly (never hidden), but de-emphasized — the gap is visible, not erased.
    '.gp-chip.no-shape{opacity:.5;font-style:italic}',
    '.gp-chip.no-shape.on{opacity:.8;border-style:dashed}',
    '.gp-loading{font-size:12.5px;color:var(--muted);margin:0}',
    '.gp-empty{font-size:12.5px;color:var(--muted);margin:0;font-style:italic}',
  ].join('');

  function ensureCSS() {
    if (document.getElementById('gp-css')) return;
    const s = document.createElement('style');
    s.id = 'gp-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // ── the same "content-bearing" + "era" inference wheel.html / archetypal.html
  // already carry — lifted here verbatim so both pages (and future ones) share
  // one copy instead of three slightly-drifting ones.
  function contentBearing(item) {
    const keys = Object.keys(item.sections || {});
    return keys.some(k => k !== 'See also');
  }

  function extractEra(g) {
    const attr = g.attribution || {};
    const rawYearStr = attr.source_year || null;
    let year = null, eraLabel = null, voiceLabel = attr.source_author || null;
    if (rawYearStr) {
      const ce = rawYearStr.match(/c\.\s*(\d{1,4})\s*CE/i);
      if (ce) year = parseInt(ce[1], 10);
      else { const y = rawYearStr.match(/(\d{3,4})/); if (y) year = parseInt(y[1], 10); }
      eraLabel = rawYearStr;
    }
    if (year == null && g.author) {
      const range = g.author.match(/(\d{4})\s*-\s*(\d{4})/);
      if (range) { year = parseInt(range[2], 10); eraLabel = `${range[1]}–${range[2]}`; }
      if (!voiceLabel) voiceLabel = g.author.replace(/\s*\([^)]*\)\s*/g, '').trim();
    }
    if (!voiceLabel) voiceLabel = (g.creator_name && g.creator_name !== 'PlayfulProcess') ? g.creator_name : (g.name || '').split(/[—-]/)[0].trim();
    if (year == null) { year = Infinity; eraLabel = eraLabel || 'contemporary'; }
    return { year, eraLabel, voiceLabel };
  }

  // What does this grammar "have"? Data-shape inference only (never document_type
  // / tool_slug — see CLAUDE.md "grammar types are dead code"): an item counts as
  // shape X if its category is X, OR its metadata carries a same-named key (some
  // grammars stamp metadata.house/planet/sign instead of, or in addition to,
  // category).
  function detectShapes(g) {
    const items = g.items || [];
    const has = shape => items.some(it =>
      (it.category || '') === shape || (it.metadata || {})[shape] != null);
    return { house: has('house'), planet: has('planet'), sign: has('sign') };
  }

  async function loadJSON(path) {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }

  async function loadAll(basePath) {
    const bp = basePath || '';
    const col = await loadJSON(bp + 'grammars/_collection.json');
    const slugs = (col.grammars || []).map(g => g.slug);
    const loaded = await Promise.all(slugs.map(async slug => {
      try { return { slug, g: await loadJSON(`${bp}grammars/${slug}/grammar.json`) }; }
      catch (e) { return { slug, g: null }; }
    }));
    return loaded
      .filter(({ g }) => g && Array.isArray(g.items))
      .map(({ slug, g }) => ({ slug, grammar: g, shapes: detectShapes(g), ...extractEra(g) }))
      .sort((x, y) => x.year - y.year || x.voiceLabel.localeCompare(y.voiceLabel));
  }

  function create(opts) {
    const mount = opts.mount;
    let shape = opts.shape;
    const storageKey = opts.storageKey || null;
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};
    const basePath = opts.basePath || '';

    let all = null;        // null while loading; array of {slug, grammar, shapes, ...era} once resolved
    let selected = null;   // Set<slug>, null until `all` resolves and a default is seeded

    function readStoredSelection(defaultSlugs) {
      if (storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) return new Set(JSON.parse(raw));
        } catch (e) { /* ignore malformed storage */ }
      }
      return new Set(defaultSlugs);
    }

    function persistSelection() {
      if (!storageKey || !selected) return;
      try { localStorage.setItem(storageKey, JSON.stringify([...selected])); }
      catch (e) { /* storage full/unavailable — selection just won't persist */ }
    }

    function fireChange() {
      if (!all || !selected) return;
      onChange(all.filter(t => selected.has(t.slug)));
    }

    function setSelection(slugs) {
      selected = new Set(slugs);
      persistSelection();
      render();
      fireChange();
    }

    function toggle(slug) {
      if (!selected) return;
      if (selected.has(slug)) selected.delete(slug); else selected.add(slug);
      persistSelection();
      render();
      fireChange();
    }

    function render() {
      if (!mount) return;
      ensureCSS();
      mount.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'gp-wrap';

      if (all === null) {
        wrap.innerHTML = '<p class="gp-loading">Loading grammars…</p>';
        mount.appendChild(wrap);
        return;
      }
      if (!all.length) {
        wrap.innerHTML = '<p class="gp-empty">No grammars found in the collection.</p>';
        mount.appendChild(wrap);
        return;
      }

      const populating = all.filter(t => t.shapes[shape]).length;
      const head = document.createElement('div');
      head.className = 'gp-head';
      const title = document.createElement('span');
      title.className = 'gp-title';
      title.textContent = 'Grammars stacking here';
      const count = document.createElement('span');
      count.className = 'gp-count';
      count.textContent = `${selected.size} selected · ${populating} of ${all.length} have ${shape} content`;
      const left = document.createElement('div');
      left.style.cssText = 'display:flex;flex-direction:column;gap:2px';
      left.appendChild(title); left.appendChild(count);
      head.appendChild(left);

      const actions = document.createElement('div');
      actions.className = 'gp-actions';
      const mkBtn = (label, fn) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gp-actionbtn'; b.textContent = label;
        b.onclick = fn;
        return b;
      };
      actions.appendChild(mkBtn(`Populating only (${populating})`, () => setSelection(all.filter(t => t.shapes[shape]).map(t => t.slug))));
      actions.appendChild(mkBtn('All', () => setSelection(all.map(t => t.slug))));
      actions.appendChild(mkBtn('None', () => setSelection([])));
      head.appendChild(actions);
      wrap.appendChild(head);

      const chips = document.createElement('div');
      chips.className = 'gp-chips';
      all.forEach(t => {
        const has = !!t.shapes[shape];
        const label = document.createElement('label');
        label.className = 'gp-chip ' + (has ? 'has-shape' : 'no-shape') + (selected.has(t.slug) ? ' on' : '');
        label.title = has
          ? `${t.voiceLabel} has ${shape} content`
          : `${t.voiceLabel} has no ${shape} content yet — selecting it won't add anything here, but it's not hidden`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(t.slug);
        cb.setAttribute('aria-label', t.voiceLabel + (has ? '' : ' (no ' + shape + ' content)'));
        cb.addEventListener('change', () => toggle(t.slug));
        label.appendChild(cb);
        const name = document.createElement('span');
        name.textContent = t.voiceLabel;
        label.appendChild(name);
        chips.appendChild(label);
      });
      wrap.appendChild(chips);
      mount.appendChild(wrap);
    }

    render(); // loading state, immediately

    loadAll(basePath).then(loaded => {
      all = loaded;
      const defaultSlugs = all.filter(t => t.shapes[shape]).map(t => t.slug);
      selected = readStoredSelection(defaultSlugs);
      render();
      fireChange();
    }).catch(() => {
      all = [];
      selected = new Set();
      render();
      fireChange();
    });

    return {
      get all() { return all; },
      get selected() { return selected ? [...selected] : []; },
      setShape(newShape) { shape = newShape; render(); },
    };
  }

  global.GrammarPicker = { create, contentBearing, extractEra, detectShapes };
})(window);
