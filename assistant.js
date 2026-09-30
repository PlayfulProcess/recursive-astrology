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

  // What the assistant reads as "the page" (the launcher answers the embed's page-context request
  // with this). Order: text set by ask() below; a page's own window.recursiveAstroPageText() (Chart
  // Lab defines one, so a private chart on screen is never read out of the page); a [data-page-text]
  // block; else the visible text of <main> (the launcher's own default).
  var askContext = '';
  function pageText() {
    if (askContext) return askContext;
    if (typeof window.recursiveAstroPageText === 'function') {
      try { return String(window.recursiveAstroPageText() || ''); } catch (e) { return ''; }
    }
    var el = document.querySelector('[data-page-text]') || document.querySelector('main') || document.body;
    return el ? el.innerText : '';
  }
  function buildSrc() {
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

  // RecursiveAstroAssistant.ask(text, context) -- open the shared sidebar on Chat with `text` typed
  // into its chat box, and ground the chat on `context` (page context). Nothing is sent by itself:
  // the reader edits and taps Send. Both halves already ship in recursive.eco (the ?ask= prefill the
  // embed reads when it mounts, and the launcher's page-context handshake), so this needs no change
  // there (Sep 29 2026; tested on flow and dev.flow). Returns false when the launcher is not mounted
  // (inside an embed, offline): the caller then offers the text to copy.
  // The text travels in the iframe URL: flow.recursive.eco answered 200 for a 32,000-character ask
  // and 414 from 40,000, and non-ASCII letters grow when encoded, so it is capped well below that.
  window.RecursiveAstroAssistant = {
    ask: function (text, context) {
      var RA = window.RecursiveAssistant;
      var frame = document.querySelector('.rec-assistant-shell iframe');
      if (!RA || !frame) return false;
      askContext = String(context || '').slice(0, 20000);
      var u = new URL(frame.getAttribute('src') || (buildSrc() + '&theme=light'), location.href);
      u.searchParams.set('tab', 'chat');
      u.searchParams.set('open', '1');
      u.searchParams.set('ask', String(text || '').slice(0, 6000));
      frame.src = u.toString();                   // reloads the embed with the text in its chat box
      RA.open();                                  // grows the shell into the sidebar
      return true;
    }
  };

  var s = document.createElement('script');
  s.src = 'https://recursive.eco/js/assistant-launcher.js';
  s.defer = true;
  s.onload = function () {
    if (!window.RecursiveAssistant) return;
    window.RecursiveAssistant.init({
      // Declare explicitly rather than relying on the launcher's auto-detection:
      // this site is light-only by policy (CLAUDE.md), so there is nothing to
      // detect. Without this, the launcher falls through to the VISITOR's
      // `prefers-color-scheme`, and anyone whose phone is in dark mode got a
      // dark assistant panel on a light-only page (reported Sep 6 2026 from a
      // phone). Same declaration recursive-tarot has carried since Aug 2026.
      theme: 'light',
      buildSrc: buildSrc,
      getPageText: pageText
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
