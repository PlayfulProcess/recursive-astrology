/*
 * image-reachout.js — "image missing → ask to restore" for the public landing
 * viewers. The Flow app has this via the MissingImageNotice React component, but
 * the landing static viewers (view.html, grammar-viewer.html, …) had NO reach-out
 * — a 404 just showed a broken placeholder. This adds it so ANYONE who sees a 404
 * on one of our hosted images can ask the owner to restore it (deletes move
 * published images to recoverable trash; this is how a viewer requests them back).
 *
 * Self-contained vanilla JS. Listens (capture phase, so it sees the original
 * failed load before any inline onerror swaps the src) for <img> load errors
 * whose src is one of our R2 objects, and offers a small "request" control that
 * POSTs to the Flow app's /api/image-retrieval-request (already CORS:* +
 * rate-limited + server-validates the URL is ours). Include with:
 *   <script src="js/image-reachout.js" defer></script>
 *
 * Known limitation: only catches <img> elements. CSS background-image 404s
 * (e.g. card_bg) fire no error event and aren't covered.
 */
(function () {
  'use strict';

  function isOurR2(src) {
    if (!src || typeof src !== 'string') return false;
    if (src.indexOf('.r2.dev/') !== -1) return true;
    try {
      if (window.ENV && window.ENV.R2_PUBLIC_URL && src.indexOf(window.ENV.R2_PUBLIC_URL) === 0) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  // Landing → Flow origin (where the endpoint lives). recursive.eco →
  // flow.recursive.eco ; dev.recursive.eco → dev.flow.recursive.eco.
  function flowBase() {
    var h = location.hostname;
    if (h.indexOf('flow.') !== -1) return location.origin;
    if (h.indexOf('dev.') === 0) return location.protocol + '//dev.flow.' + h.slice(4);
    if (h === 'recursive.eco' || /\.recursive\.eco$/.test(h)) return location.protocol + '//flow.' + h;
    return location.origin; // localhost/preview — endpoint may not exist; harmless
  }

  function grammarId() {
    try {
      var p = new URLSearchParams(location.search);
      var id = p.get('id') || p.get('grammar_id') || p.get('deckId') || p.get('bookId') || p.get('astroGrammarId');
      if (id) return id;
      var m = location.pathname.match(/\/(?:view|g)\/([0-9a-fA-F-]{16,})/);
      if (m) return m[1];
    } catch (e) { /* ignore */ }
    return null;
  }

  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var css =
      '.reachout-badge{display:inline-flex;align-items:center;gap:4px;margin:6px 0;padding:4px 10px;' +
      'font:500 12px/1.3 system-ui,-apple-system,Arial,sans-serif;color:#fff;background:rgba(30,27,75,.85);' +
      'border:0;border-radius:999px;cursor:pointer;}' +
      '.reachout-badge:hover{background:rgba(67,56,202,.95);}' +
      '.reachout-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.5);display:flex;' +
      'align-items:center;justify-content:center;padding:16px;}' +
      '.reachout-card{background:#fff;color:#111;max-width:380px;width:100%;border-radius:14px;padding:20px;' +
      'font:14px/1.5 system-ui,-apple-system,Arial,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3);}' +
      '.reachout-card h3{margin:0 0 8px;font-size:16px;}' +
      '.reachout-card p{margin:0 0 12px;color:#475569;font-size:13px;}' +
      '.reachout-card textarea,.reachout-card input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:8px 10px;' +
      'border:1px solid #cbd5e1;border-radius:8px;font:inherit;}' +
      '.reachout-row{display:flex;gap:8px;justify-content:flex-end;}' +
      '.reachout-row button{padding:8px 14px;border-radius:8px;border:0;font:600 13px/1 inherit;cursor:pointer;}' +
      '.reachout-send{background:#4f46e5;color:#fff;}.reachout-cancel{background:#e2e8f0;color:#334155;}' +
      '.reachout-note{font-size:12px;margin-top:10px;}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function openModal(imageUrl) {
    injectStyles();
    var ov = document.createElement('div');
    ov.className = 'reachout-ov';
    var note = '';
    ov.innerHTML =
      '<div class="reachout-card" role="dialog" aria-modal="true">' +
      '<h3>Request this image</h3>' +
      '<p>This image isn\'t available right now. Send a note to the owner to ask for it back — they can restore it.</p>' +
      '<textarea rows="2" placeholder="Optional message"></textarea>' +
      '<input type="email" placeholder="Your email (optional, so they can reply)" />' +
      '<div class="reachout-row"><button class="reachout-cancel" type="button">Close</button>' +
      '<button class="reachout-send" type="button">Send request</button></div>' +
      '<div class="reachout-note"></div></div>';
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    var card = ov.querySelector('.reachout-card');
    var msgEl = card.querySelector('textarea');
    var emailEl = card.querySelector('input');
    var noteEl = card.querySelector('.reachout-note');
    card.querySelector('.reachout-cancel').addEventListener('click', close);
    var sendBtn = card.querySelector('.reachout-send');
    sendBtn.addEventListener('click', function () {
      sendBtn.disabled = true;
      noteEl.textContent = 'Sending…';
      noteEl.style.color = '#64748b';
      fetch(flowBase() + '/api/image-retrieval-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl,
          grammarId: grammarId(),
          grammarName: document.title || undefined,
          pageUrl: location.href,
          contactEmail: (emailEl.value || '').trim() || undefined,
          message: (msgEl.value || '').trim() || undefined,
          loggedIn: false
        })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok && res.d && res.d.success !== false) {
            noteEl.textContent = 'Sent — thanks! The owner has been notified.';
            noteEl.style.color = '#059669';
            sendBtn.style.display = 'none';
          } else {
            noteEl.textContent = (res.d && res.d.error) || 'Could not send — please try again later.';
            noteEl.style.color = '#b91c1c';
            sendBtn.disabled = false;
          }
        })
        .catch(function () {
          noteEl.textContent = 'Could not send — please try again later.';
          noteEl.style.color = '#b91c1c';
          sendBtn.disabled = false;
        });
    });
    void note;
    document.body.appendChild(ov);
  }

  function flag(img) {
    if (!img || img.getAttribute('data-reachout') === '1') return;
    img.setAttribute('data-reachout', '1');
    var failedSrc = img.currentSrc || img.src; // captured before any onerror swap
    injectStyles();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reachout-badge';
    btn.textContent = '⚠ image missing — request it';
    btn.addEventListener('click', function () { openModal(failedSrc); });
    if (img.parentNode) img.parentNode.insertBefore(btn, img.nextSibling);
  }

  // Capture phase: runs before the element's own inline onerror, so the src we
  // read is still the original failed R2 url, not a swapped placeholder.
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG' && isOurR2(t.currentSrc || t.src)) flag(t);
  }, true);
})();
