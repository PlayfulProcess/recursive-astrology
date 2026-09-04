/* The Recursive Astrology — the ONE recursive.eco assistant sidebar.
   <script src="assistant.js" defer></script>   (../assistant.js from pages/)

   NOT a copy of the assistant: this only loads the shared shell,
   https://recursive.eco/js/assistant-launcher.js, which iframes the flow app's
   /assistant embed — the exact same star FAB and tabbed sidebar (Chat · Tarot ·
   I Ching · Astro · Story, same icon bars) every recursive.eco page mounts.
   When the pattern changes in the app, this site follows automatically —
   nothing here to keep in sync. Auth carries too: astro.recursive.eco is a
   .recursive.eco subdomain, so the signed-in session flows into the iframe.
   Mirrors recursive-tarot's include (the pattern source for this repo). */
(function () {
  // Never render inside an embed: the flow app iframes viewer/astrology-viewer.html
  // (it has its own assistant), and ?embed=1 marks other framed uses — the same
  // rule site-header.js / site-footer.js apply.
  if (window.self !== window.top) return;
  if (new URLSearchParams(location.search).get('embed') === '1') return;

  var s = document.createElement('script');
  s.src = 'https://recursive.eco/js/assistant-launcher.js';
  s.defer = true;
  s.onload = function () {
    if (!window.RecursiveAssistant) return;
    window.RecursiveAssistant.init({
      buildSrc: function () {
        var params = new URLSearchParams(location.search);
        var grammarId = params.get('grammar_id') || params.get('id') || '';
        var qs = new URLSearchParams();
        if (grammarId) {
          // A grammar is on the page: the assistant grounds "this grammar" on it.
          qs.set('grammar_id', grammarId);
          qs.set('context', 'astrology');
        } else {
          // No grammar: pass page context so "what is this page?" just works.
          qs.set('page_title', document.title || 'The Recursive Astrology');
          qs.set('page_url', location.href);
        }
        return window.RecursiveAssistant.flowBaseUrl() + '/assistant?' + qs.toString();
      }
    });
  };
  document.head.appendChild(s);

  // Jul 9 2026 fix — header-over-assistant overlap (builder screenshot on a
  // course page, mid-chat-response). Root cause, confirmed by reading the
  // shared launcher's actual source (recursive-eco/apps/landing/js/
  // assistant-launcher.js): `.rec-assistant-shell` is z-index:45, LOWER than
  // this site's own sticky <site-header> (site-header.js, z-index:50). Both
  // are position:fixed/sticky elements competing directly at the document
  // root, so whichever has the bigger number paints on top — no stacking-
  // context trap involved. site-header.js also auto-hides on scroll-down and
  // *reveals* on scroll-up (a normal reading gesture), which re-plants the
  // header at top:0 while the assistant panel (position:fixed, unaffected by
  // page scroll) is open — at that moment the header's opaque background
  // paints over the assistant's top ~129px, covering the first lines of
  // whatever response is scrolled to the top. Verified with a Playwright
  // elementFromPoint check before/after (see docs/DESIGN-wheel-frames.md
  // Round 2 note and the CHANGELOG entry for the repro).
  //
  // The correct long-term fix is bumping z-index in the shared launcher
  // itself (it's meant to be the topmost layer on every recursive.eco family
  // site) — that lives in a different, private repo and needs its own
  // session/approval. Until then, force it here so this site is never
  // affected regardless of the shared file's current value or load order.
  var zfix = document.createElement('style');
  zfix.textContent = '.rec-assistant-shell{z-index:2147483000!important}';
  document.head.appendChild(zfix);
})();
