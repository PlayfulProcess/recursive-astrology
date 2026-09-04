/* Course reading companion — uses the SAME recursive.eco assistant + credit system.
 * Pattern copied verbatim from recursive-tarot/viewers/course-assistant.js (the family's
 * pattern source) — only the persona text and a couple of comments are astrology-specific.
 *
 * No separate model, no BYO key. The course page is on astro.recursive.eco, which
 * carries the `.recursive.eco` login cookie, so we call the flow app's existing
 * chat API cross-subdomain with `credentials:'include'` — exactly how the landing
 * app links to flow. Auth + the credit wallet gate every call server-side.
 *
 * KNOWN GAP (Jul 6 2026, flagged in the astro-b course build): flow's
 * `/api/ai/chat` only CORS-allows requests whose Origin is in its FRUIT_ORIGINS
 * set (apps/flow/src/app/api/ai/chat/route.ts), and today that set contains only
 * `https://tarot.recursive.eco`. Until `https://astro.recursive.eco` is added to
 * FRUIT_ORIGINS in the recursive-eco repo, this widget will render but every send
 * will fail with a browser CORS error (no Access-Control-Allow-Origin header comes
 * back). That's a one-line addition in a different repo, outside what this course
 * build touches — see the course build's return report for the exact line.
 *
 * The course text is read straight from the rendered page and passed as `content`;
 * a course-companion persona is passed as `aiPrompt`. Usage is billed to the signed-in
 * user's recursive.eco credits, same as the Journal assistant.
 *
 * Usage:  <script src="../course/course-assistant.js?v=1"></script>  on any course
 * page that renders into #ctitle / #cintro / .content (course-viewer.html does).
 */
(function () {
  if (window.__raCourseAssistant) return;
  window.__raCourseAssistant = true;

  // --- config ---------------------------------------------------------------
  const FLOW = 'https://flow.recursive.eco';
  const ENDPOINT = FLOW + '/api/ai/chat';
  const MODEL = 'gemini-2.5-flash';               // cheap-but-good; billed via recursive.eco credits
  const MAX_TOKENS = 800;                          // concise
  const CONTENT_CAP = 220000;                       // chars of course text passed as context

  const md = (t) => (window.marked ? window.marked.parse(t) : t.replace(/</g, '&lt;'));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Pull the course straight from the rendered page.
  function courseText() {
    const title = (document.getElementById('ctitle') || {}).textContent || document.title || '';
    const intro = (document.getElementById('cintro') || {}).textContent || '';
    const body = ((document.querySelector('.content') || document.body) || {}).innerText || '';
    let t = `# ${title}\n\n${intro}\n\n${body}`.trim();
    if (t.length > CONTENT_CAP) t = t.slice(0, CONTENT_CAP) + '\n\n[…course truncated for length…]';
    return t;
  }

  // The "content" we send is framed server-side as "Current journal content"; this
  // persona reframes it as the course and sets the guardrails.
  const PERSONA =
    'You are a warm, precise reading companion for a course, part of recursive.eco’s ' +
    'Recursive Astrology — a library that holds each historical era of astrology honestly, in its ' +
    'own terms, never as a verdict on whether the sky speaks. The text provided to you (shown as the ' +
    'current content) is the COURSE CHAPTER the reader is studying. Answer their questions using ONLY ' +
    'that course text. If the answer is not in the course, say so plainly and do not invent history, ' +
    'dates, or sources. Be concise; when it helps, point to the section by its heading. This project ' +
    'reads a chart as a mirror and a calendar, never a prediction or a command — never tell the reader ' +
    'their fate or treat a chart as something to obey.';

  const convo = []; // {role:'user'|'assistant', content:string}

  // --- UI (shadow DOM so the page CSS can't fight it) -----------------------
  const host = document.createElement('div');
  document.body.appendChild(host);
  const sr = host.attachShadow({ mode: 'open' });
  sr.innerHTML = `
    <style>
      :host{ all:initial }
      .fab{ position:fixed; right:18px; bottom:18px; z-index:9998; font-family:Inter,system-ui,sans-serif;
        background:#2f5d8a; color:#fff; border:none; border-radius:999px; padding:12px 18px; font-size:14px;
        font-weight:600; cursor:pointer; box-shadow:0 10px 28px -10px rgba(60,45,20,.6) }
      .fab:hover{ background:#1f4468 }
      .panel{ position:fixed; right:18px; bottom:18px; z-index:9999; width:min(420px,calc(100vw - 24px));
        height:min(560px,calc(100vh - 24px)); background:#fbf9f3; border:1px solid #d8d2c6; border-radius:14px;
        display:none; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px -20px rgba(60,45,20,.55);
        font-family:Inter,system-ui,sans-serif; color:#221f1a }
      .panel.open{ display:flex }
      .hd{ display:flex; align-items:center; gap:8px; padding:11px 13px; border-bottom:1px solid #e7e1d5; background:#fff }
      .hd b{ font-size:13.5px } .hd .sp{ flex:1 } .hd .cr{ font-size:11px; color:#8a8273 }
      .hd button{ background:none; border:none; cursor:pointer; color:#6b6457; font-size:13px; padding:4px 6px; border-radius:6px }
      .hd button:hover{ background:#f1ece1; color:#221f1a }
      .log{ flex:1; overflow:auto; padding:13px; display:flex; flex-direction:column; gap:11px }
      .msg{ font-size:13.5px; line-height:1.55; max-width:90% }
      .msg.u{ align-self:flex-end; background:#2f5d8a; color:#fff; padding:8px 11px; border-radius:12px 12px 3px 12px }
      .msg.a{ align-self:flex-start; color:#221f1a }
      .msg.a :first-child{ margin-top:0 } .msg.a :last-child{ margin-bottom:0 }
      .msg.a p{ margin:.4em 0 } .msg.a a{ color:#1f4468 }
      .msg.sys{ align-self:center; color:#6b6457; font-size:12px; text-align:center; max-width:100% }
      .msg.sys a{ color:#1f4468 }
      .msg.err{ align-self:flex-start; color:#a3402d; font-size:12.5px }
      .ft{ border-top:1px solid #e7e1d5; padding:10px; background:#fff }
      .ft form{ display:flex; gap:7px }
      .ft textarea{ flex:1; resize:none; height:38px; padding:8px 10px; border:1px solid #d8d2c6; border-radius:8px;
        background:#fbf9f3; font-family:inherit; font-size:13.5px }
      .ft .send{ background:#2f5d8a; color:#fff; border:none; border-radius:8px; padding:0 14px; font-weight:600; cursor:pointer }
      .ft .send:disabled{ background:#d8d2c6; cursor:default }
    </style>
    <button class="fab" id="fab">✦ Ask about this chapter</button>
    <section class="panel" id="panel" aria-label="Course assistant">
      <div class="hd"><b>Reading companion</b><span class="cr" id="cr"></span><span class="sp"></span>
        <button id="reset" title="Clear conversation">Clear</button>
        <button id="close" title="Close">✕</button></div>
      <div class="log" id="log"></div>
      <div class="ft" id="ft">
        <form id="form"><textarea id="q" placeholder="Ask anything about this chapter…" rows="1"></textarea>
        <button class="send" id="send" type="submit">Send</button></form>
      </div>
    </section>`;

  const $ = (id) => sr.getElementById(id);
  const panel = $('panel'), log = $('log');

  function add(role, html) {
    const d = document.createElement('div');
    d.className = 'msg ' + role;
    d.innerHTML = html;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text) return;
    $('q').value = '';
    $('send').disabled = true;
    add('u', esc(text));
    convo.push({ role: 'user', content: text });
    const thinking = add('a', '<em style="color:#6b6457">thinking…</em>');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'include',                  // sends the .recursive.eco login cookie
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: text,
          content: courseText(),                  // the course chapter, as context
          aiPrompt: PERSONA,                      // course-companion persona + guardrails
          personalityName: 'Course companion',
          model: MODEL,
          maxTokens: MAX_TOKENS,
          history: convo.slice(0, -1)             // prior turns (current question is `message`)
        })
      });
      let data = {};
      try { data = await res.json(); } catch (_) { /* non-JSON */ }
      if (res.status === 401) {
        thinking.className = 'msg sys';
        thinking.innerHTML = 'Please <a href="' + FLOW + '" target="_blank" rel="noopener">sign in at recursive.eco</a> ' +
          'to chat — the assistant uses your account’s AI credits.';
        convo.pop();
      } else if (!res.ok || data.error) {
        thinking.className = 'msg err';
        thinking.textContent = data.error || ('Request failed (' + res.status + ').');
        convo.pop();
      } else {
        thinking.className = 'msg a';
        thinking.innerHTML = md((data.response || '(no answer)').trim());
        convo.push({ role: 'assistant', content: data.response || '' });
        const left = data.usage && data.usage.credits_remaining;
        if (typeof left === 'number') $('cr').textContent = '$' + left.toFixed(2) + ' left';
      }
    } catch (err) {
      thinking.className = 'msg err';
      thinking.textContent = 'Network error: ' + (err && err.message || err) +
        ' (if this is a CORS error, astro.recursive.eco may not yet be allow-listed in flow\'s FRUIT_ORIGINS).';
      convo.pop();
    } finally {
      $('send').disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  }

  $('form').onsubmit = (e) => { e.preventDefault(); send($('q').value); };
  $('q').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('q').value); } });
  $('fab').onclick = () => {
    panel.classList.add('open');
    $('fab').style.display = 'none';
    if (!log.children.length) add('sys', 'Ask about anything in this chapter — answered from the page in front of you, using your recursive.eco credits.');
    $('q').focus();
  };
  $('close').onclick = () => { panel.classList.remove('open'); $('fab').style.display = ''; };
  $('reset').onclick = () => { convo.length = 0; log.innerHTML = ''; add('sys', 'Conversation cleared.'); };
})();
