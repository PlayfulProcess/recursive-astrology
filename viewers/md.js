/* md.js — the ONE markdown-ish renderer shared by every viewer.
 *
 * Consolidation (Jul 26 2026): four copies had drifted — cards.html had the good
 * block-aware one, tree-viewer.html an older per-line variant, and lenses.html /
 * all-astros.html a two-line `**bold**`-only version that leaked raw `*…*` and
 * `> ` markers straight onto the page. The six public-domain "The record — <author>
 * (<year>)" sections are italic caption + blockquote, so those two viewers rendered
 * the source texts as unstyled slabs with literal punctuation in them. One renderer
 * now, per CLAUDE.md's "consolidate, don't multiply".
 *
 * Handles: # headers, > blockquotes, bullet lists, paragraphs, and inline
 * **bold** / *italic* / `code` / [links](url) / ![images](url).
 * Self-styling (inline styles) so it looks right in any themed viewer; colour comes
 * from `currentColor`, never a hardcoded hex, so theme.css stays the only palette.
 *
 * Usage:  <script src="md.js?v=2"></script>   then   MD.toHtml(text)
 *         MD.strip(text) → plain text with the markers removed (dense previews).
 *         MD.credit(item.metadata.image_credit) → the PD provenance caption for an
 *         image (see below); MD.creditText(…) → the same as a plain title string.
 */
(function (global) {
  'use strict';
  if (global.MD) return;

  const escHtml = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = t => escHtml(t)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;margin:8px 0;border-radius:8px;">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Research-source paths (e.g. `research/views/foo.md`) become GitHub links —
    // every "Research note" points at its dossier on GitHub, app-wide.
    .replace(/<code>(research\/[^<\s]+?\.md)<\/code>/g,
      '<a href="https://github.com/PlayfulProcess/Recursive-astrology/blob/main/$1" target="_blank" rel="noopener noreferrer" title="View research source on GitHub">$1 ↗</a>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  /* Block-aware render. Prose in these grammars can be hard-wrapped mid-sentence
     (and list items span several wrapped lines), so each block's lines are buffered
     and joined with a space (standard Markdown soft-break) before inline() runs —
     otherwise a `**` opening on one line and closing on the next renders as literal
     asterisks, and one sentence splits into many gappy paragraphs. */
  function toHtml(s) {
    if (!s) return '';
    const lines = String(s).split(/\r?\n/);
    let html = '', inList = false, inQuote = false, m;
    let para = [], liBuf = null;
    const flushP = () => { if (para.length) { html += `<p style="margin:.6em 0;">${inline(para.join(' '))}</p>`; para = []; } };
    const flushLI = () => { if (liBuf) { html += `<li>${inline(liBuf.join(' '))}</li>`; liBuf = null; } };
    const closeL = () => { flushLI(); if (inList) { html += '</ul>'; inList = false; } };
    const closeQ = () => { if (inQuote) { html += '</blockquote>'; inQuote = false; } };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flushP(); closeL(); closeQ(); continue; }
      if (m = line.match(/^(#{1,6})\s+(.*)$/)) { flushP(); closeL(); closeQ(); html += `<div style="font-weight:700;font-size:1.05em;margin:.7em 0 .25em;">${inline(m[2])}</div>`; continue; }
      if (m = line.match(/^>\s?(.*)$/)) { flushP(); closeL(); if (!inQuote) { html += '<blockquote style="border-left:3px solid currentColor;opacity:.8;margin:.5em 0;padding:.1em 0 .1em .8em;">'; inQuote = true; } html += inline(m[1]) + ' '; continue; }
      if (m = line.match(/^[-*+]\s+(.*)$/)) { flushP(); closeQ(); flushLI(); if (!inList) { html += '<ul style="margin:.4em 0;padding-left:1.2em;">'; inList = true; } liBuf = [m[1]]; continue; }
      // Plain line: a continuation of the open list item (no blank line broke it)
      // folds into that item; otherwise it extends the current paragraph.
      if (inList && liBuf) { liBuf.push(line); continue; }
      closeL(); closeQ(); para.push(line);
    }
    flushP(); closeL(); closeQ();
    return html;
  }

  /* Plain text with the markers removed — for dense previews (pivot cells, tooltips,
     truncated blurbs) where markup can't be rendered but the punctuation shouldn't leak. */
  function strip(s) {
    return String(s || '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '· ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\s*\n+\s*/g, ' ')
      .trim();
  }

  /* Shared truncation that never destroys meaning silently: cuts on a word boundary,
     appends an ellipsis, and the caller is expected to keep the full text in a
     title attribute. Returns the original string when it already fits. */
  function clip(s, max) {
    const t = String(s == null ? '' : s);
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + '…';
  }

  /* ── image provenance ──────────────────────────────────────────────────────
     Added Jul 26 2026. The illustration pass records, for every plate it added,
     a `metadata.image_credit` object:

       { title, creator, date, source, file_page, license, pd_basis, verified }

     …and until now NOTHING rendered it: the sourcing was recorded but invisible,
     which is only half of CLAUDE.md's "public-domain only, sourced and recorded".
     This is the one shared caption, so every viewer credits a picture the same
     way: the plate's own title, its creator/date where known, and a link to the
     Wikimedia Commons file page where the public-domain status is stated.

     Deliberately small and quiet — it sits under the image, in the muted token,
     and never competes with the item's own text. Colour comes from currentColor
     / opacity, never a hex, so theme.css stays the only palette.
     Returns '' when there is no credit, so callers can concatenate blindly. */
  function creditParts(c) {
    if (!c || typeof c !== 'object') return null;
    const title = String(c.title || '').trim();
    if (!title) return null;
    const by = [c.creator, c.date].map(x => String(x || '').trim()).filter(Boolean).join(', ');
    return { title, by, page: String(c.file_page || '').trim(), source: String(c.source || '').trim() };
  }

  /* Plain-text form — for a title="" tooltip on a thumbnail too small to caption. */
  function creditText(c) {
    const p = creditParts(c);
    if (!p) return '';
    return [strip(p.title), p.by, p.source, 'Public domain — via Wikimedia Commons']
      .filter(Boolean).join(' · ');
  }

  /* HTML caption. opts.compact drops the creator line for tight spaces. */
  function credit(c, opts) {
    const p = creditParts(c);
    if (!p) return '';
    const compact = !!(opts && opts.compact);
    const link = p.page
      ? `<a href="${escHtml(p.page)}" target="_blank" rel="noopener noreferrer"
           title="Wikimedia Commons file page — where the public-domain status is stated"
           style="color:inherit;text-decoration:underline;text-underline-offset:2px">Commons ↗</a>`
      : 'public domain';
    const by = (!compact && p.by) ? `<span style="opacity:.85"> · ${inline(p.by)}</span>` : '';
    return `<figcaption class="md-credit" style="font-size:10.5px;line-height:1.45;opacity:.72;
      margin:5px 0 0;font-style:normal">${inline(p.title)}${by} · ${link}</figcaption>`;
  }

  global.MD = { toHtml, strip, clip, inline, escHtml, credit, creditText };
})(typeof window !== 'undefined' ? window : globalThis);
