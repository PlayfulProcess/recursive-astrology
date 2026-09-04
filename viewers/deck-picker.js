/* deck-picker.js — shared deck multiselect popover for cards + explorer.
 * Usage:
 *   DeckPicker.open(anchorEl, { collection, selected: ['slug',...], onLoad(slugs) {} })
 * collection = parsed _collection.json  (needs collection.grammars[])
 * selected   = currently active slug array (for checkmarks)
 * onLoad     = called with the chosen slug array when user clicks "Load selected"
 */
(function (global) {
  'use strict';

  /* Colour comes from theme.css tokens only (CLAUDE.md: define colours once, light
     only). These were hardcoded hexes ported from a dark theme — most visibly the
     search box, which had a near-black background under near-black text, so whatever
     you typed was invisible. */
  const POP_STYLE = [
    'position:fixed', 'z-index:9001', 'background:var(--bg)',
    'border:1px solid var(--line-soft)', 'border-radius:10px', 'padding:10px',
    'box-shadow:0 12px 32px rgba(60,45,20,.28)', 'min-width:260px',
    'max-height:60vh', 'display:flex', 'flex-direction:column', 'gap:6px'
  ].join(';');

  /* Dating contract (grammars/_collection.json `_dating_contract`): `year` exists
     ONLY for provenance === 'record'; an absent year means genuinely undated, and a
     sentinel must never stand in for it. Dated grammars sort oldest → newest, then
     the undated ones by name — no fake year, and none printed. */
  const isDated = g => typeof g.year === 'number';
  const yearChip = g => isDated(g) ? (g.year < 0 ? Math.abs(g.year) + ' BCE' : String(g.year)) : 'undated';

  /* Cut on a word boundary with a real ellipsis; the full name always goes in a
     title attribute. `.slice(0, 34)` alone produced "William Lilly's Christian Astrolog". */
  function shortLabel(name, max) {
    const head = String(name == null ? '' : name).split(' — ')[0].trim();
    if (head.length <= max) return head;
    const cut = head.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + '…';
  }

  function open(anchor, { collection, selected, onLoad }) {
    document.querySelectorAll('.dp-pop').forEach(p => p.remove());
    const sel = new Set(selected || []);
    const decks = (collection?.grammars || [])
      .filter(g => !g.is_meta)
      .sort((a, b) => (isDated(a) ? 0 : 1) - (isDated(b) ? 0 : 1) ||
                      (isDated(a) ? a.year - b.year : 0) ||
                      (a.name || '').localeCompare(b.name || ''));
    // Two grammars can share a short name; keep the em-dash qualifier for those so the
    // list never shows two identical, indistinguishable rows.
    const shortCount = {};
    decks.forEach(g => { const s = String(g.name || g.slug).split(' — ')[0].trim(); shortCount[s] = (shortCount[s] || 0) + 1; });

    const pop = document.createElement('div');
    pop.className = 'dp-pop';
    pop.style.cssText = POP_STYLE;

    const r = anchor.getBoundingClientRect();
    pop.style.left = Math.min(r.left, window.innerWidth - 280) + 'px';
    pop.style.top = (r.bottom + 6) + 'px';

    const hint = document.createElement('p');
    hint.style.cssText = 'margin:0;font-size:11.5px;color:var(--mut);line-height:1.45;max-width:240px';
    hint.innerHTML = 'Tick <b>several grammars</b> and Load — patterns appear when collections overlap.';
    pop.appendChild(hint);

    const search = document.createElement('input');
    search.type = 'text'; search.placeholder = 'search grammars…';
    search.style.cssText = 'width:100%;padding:5px 8px;background:var(--surface);border:1px solid var(--line-soft);border-radius:6px;color:var(--ink);font-size:12px;box-sizing:border-box;flex-shrink:0';
    pop.appendChild(search);

    const list = document.createElement('div');
    list.style.cssText = 'overflow-y:auto;flex:1;';
    decks.forEach(g => {
      const full = String(g.name || g.slug);
      const short = full.split(' — ')[0].trim();
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:4px;cursor:pointer;font-size:12.5px;color:var(--ink-soft);';
      // full name + the honest year_label (always present) live in the tooltip
      label.title = full + (g.year_label ? ' · ' + g.year_label : '');
      label.onmouseenter = () => { label.style.background = 'var(--panel2)'; };
      label.onmouseleave = () => { label.style.background = ''; };
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = g.slug; cb.checked = sel.has(g.slug);
      cb.style.accentColor = 'var(--accent)';
      const name = document.createElement('span');
      name.textContent = shortCount[short] > 1 ? shortLabel(full.replace(' — ', ': '), 40) : shortLabel(full, 34);
      label.append(cb, name);
      const yr = document.createElement('span');
      yr.textContent = yearChip(g);
      yr.style.cssText = 'margin-left:auto;padding-left:8px;color:var(--faint);font-size:11px;white-space:nowrap;';
      label.appendChild(yr);
      list.appendChild(label);
    });
    pop.appendChild(list);

    search.oninput = e => {
      const q = e.target.value.toLowerCase();
      list.querySelectorAll('label').forEach(l => {
        l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    };

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;';

    const mkBtn = (text, fn, isPrimary) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = `flex:1;padding:5px 8px;border-radius:6px;font-size:12px;cursor:pointer;${
        isPrimary ? 'background:var(--accent);border:none;color:#fff;' : 'background:var(--panel2);border:1px solid var(--line-soft);color:var(--ink-soft);'
      }`;
      b.onclick = fn;
      return b;
    };

    btns.appendChild(mkBtn('All', () => list.querySelectorAll('input[type=checkbox]').forEach(i => { i.checked = true; })));
    btns.appendChild(mkBtn('None', () => list.querySelectorAll('input[type=checkbox]').forEach(i => { i.checked = false; })));
    btns.appendChild(mkBtn('Load selected', () => {
      const v = [...list.querySelectorAll('input[type=checkbox]:checked')].map(i => i.value);
      pop.remove();
      onLoad(v);
    }, true));
    pop.appendChild(btns);

    document.body.appendChild(pop);
    search.focus();

    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        if (!pop.contains(e.target) && e.target !== anchor) {
          pop.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 10);

    return pop;
  }

  global.DeckPicker = { open };
})(window);
