/* The Recursive Astrology — one shared footer: under construction · recursive.eco spiral · newsletter.
   <site-footer></site-footer>  (reads theme.css tokens). The newsletter writes to recursive.eco's
   newsletter_subscribers via the public anon key (browser-safe) — same Supabase project the whole
   recursive.eco family shares (see recursive-tarot/site-footer.js, the pattern source).
*/
(function(){
  if (customElements.get('site-footer')) return;
  var SUPA="https://xtviwcznhbrsvkitepvm.supabase.co";
  var ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0dml3Y3puaGJyc3ZraXRlcHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDA1MDMsImV4cCI6MjA4MzExNjUwM30.eBXM6NTe3Sz3SfdtI0pTHQyJzd6PXJl5ZvpNg7yFSII";
  var SPIRAL='M50.60 50.00 L50.61 50.03 L50.62 50.06 L50.62 50.10 L50.63 50.13 L50.63 50.17 L50.63 50.20 L50.63 50.24 L50.62 50.28 L50.62 50.31 L50.61 50.35 L50.60 50.39 L50.59 50.43 L50.57 50.47 L50.56 50.50 L50.54 50.54 L50.52 50.58 L50.50 50.61 L50.47 50.65 L50.44 50.68 L50.41 50.72 L50.38 50.75 L50.35 50.78 L50.31 50.81 L50.27 50.84 L50.23 50.87 L50.19 50.89 L50.14 50.91 L50.10 50.94 L50.05 50.95 L50.00 50.97 L49.95 50.99 L49.90 51.00 L49.84 51.01 L49.78 51.01 L49.73 51.02 L49.67 51.02 L49.61 51.01 L49.55 51.01 L49.49 51.00 L49.43 50.99 L49.37 50.97 L49.31 50.95 L49.25 50.93 L49.19 50.90 L49.13 50.87 L49.07 50.84 L49.01 50.80 L48.95 50.76 L48.90 50.72 L48.84 50.67 L48.79 50.62 L48.74 50.56 L48.69 50.50 L48.64 50.44 L48.60 50.38 L48.56 50.31 L48.52 50.23 L48.49 50.16 L48.46 50.08 L48.43 50.00 L48.41 49.92 L48.39 49.83 L48.37 49.74 L48.36 49.65 L48.36 49.56 L48.36 49.47 L48.36 49.37 L48.37 49.27 L48.38 49.18 L48.40 49.08 L48.43 48.98 L48.46 48.88 L48.50 48.78 L48.54 48.68 L48.59 48.59 L48.64 48.49 L48.70 48.40 L48.77 48.30 L48.84 48.21 L48.92 48.13 L49.00 48.04 L49.09 47.96 L49.19 47.88 L49.29 47.80 L49.39 47.73 L49.50 47.67 L49.62 47.61 L49.74 47.55 L49.87 47.50 L50.00 47.46 L50.14 47.42 L50.27 47.39 L50.42 47.37 L50.56 47.35 L50.71 47.34 L50.86 47.34 L51.02 47.35 L51.18 47.36 L51.33 47.38 L51.49 47.42 L51.65 47.46 L51.81 47.51 L51.97 47.57 L52.13 47.64 L52.29 47.71 L52.44 47.80 L52.59 47.90 L52.74 48.01 L52.89 48.12 L53.03 48.25 L53.17 48.38 L53.30 48.53 L53.43 48.68 L53.55 48.85 L53.67 49.02 L53.77 49.20 L53.87 49.39 L53.96 49.58 L54.04 49.79 L54.11 50.00 L54.17 50.22 L54.22 50.44 L54.26 50.68 L54.29 50.91 L54.30 51.15 L54.31 51.40 L54.30 51.65 L54.27 51.90 L54.23 52.16 L54.18 52.41 L54.11 52.67 L54.03 52.93 L53.94 53.19 L53.83 53.44 L53.70 53.70 L53.56 53.95 L53.40 54.20 L53.23 54.44 L53.04 54.68 L52.83 54.91 L52.61 55.13 L52.38 55.35 L52.13 55.55 L51.87 55.75 L51.59 55.93 L51.30 56.10 L50.99 56.26 L50.67 56.41 L50.34 56.54 L50.00 56.65 L49.65 56.75 L49.28 56.83 L48.91 56.90 L48.52 56.94 L48.13 56.96 L47.74 56.97 L47.33 56.95 L46.92 56.91 L46.51 56.85 L46.09 56.77 L45.68 56.66 L45.26 56.53 L44.84 56.37 L44.43 56.19 L44.01 55.99 L43.61 55.76 L43.21 55.50 L42.81 55.22 L42.43 54.92 L42.06 54.59 L41.70 54.23 L41.35 53.85 L41.02 53.45 L40.70 53.02 L40.40 52.57 L40.12 52.10 L39.87 51.61 L39.63 51.09 L39.42 50.55 L39.23 50.00 L39.07 49.43 L38.94 48.84 L38.84 48.23 L38.77 47.61 L38.73 46.98 L38.73 46.34 L38.75 45.68 L38.82 45.02 L38.92 44.35 L39.05 43.68 L39.23 43.00 L39.44 42.33 L39.69 41.65 L39.98 40.98 L40.32 40.32 L40.69 39.66 L41.10 39.01 L41.55 38.37 L42.05 37.75 L42.58 37.15 L43.15 36.56 L43.77 36.00 L44.42 35.46 L45.11 34.95 L45.84 34.47 L46.60 34.02 L47.40 33.60 L48.24 33.22 L49.10 32.88 L50.00 32.58 L50.93 32.32 L51.88 32.11 L52.86 31.95 L53.86 31.83 L54.89 31.77 L55.93 31.76 L56.98 31.80 L58.06 31.91 L59.14 32.07 L60.23 32.29 L61.32 32.57 L62.41 32.91 L63.51 33.32 L64.59 33.79 L65.67 34.33 L66.73 34.93 L67.78 35.60 L68.81 36.33 L69.82 37.13 L70.79 38.00 L71.74 38.92 L72.65 39.92 L73.52 40.97 L74.35 42.09 L75.13 43.27 L75.86 44.50 L76.53 45.80 L77.15 47.15 L77.70 48.55 L78.19 50.00 L78.60 51.50 L78.95 53.04 L79.21 54.63 L79.40 56.25 L79.50 57.90 L79.52 59.59 L79.44 61.30 L79.28 63.03 L79.02 64.78 L78.66 66.55 L78.20 68.31 L77.64 70.08 L76.98 71.85 L76.22 73.61 L75.35 75.35 L74.38 77.08 L73.30 78.77 L72.11 80.44 L70.82 82.06 L69.42 83.64 L67.92 85.17 L66.32 86.65 L64.61 88.06 L62.80 89.40 L60.89 90.66 L58.89 91.84 L56.80 92.93 L54.62 93.93 L52.35 94.82 L50.00 95.61 L47.59 95.94 L45.19 95.75 L42.80 95.43 L40.44 94.99 L38.09 94.43 L35.79 93.75 L33.52 92.94 L31.29 92.02 L29.12 90.99 L27.00 89.84 L24.95 88.58 L22.96 87.21 L21.05 85.75 L19.22 84.18 L17.47 82.53 L15.82 80.78 L14.25 78.95 L12.79 77.04 L11.42 75.05 L10.16 73.00 L9.01 70.88 L7.98 68.71 L7.06 66.48 L6.25 64.21 L5.57 61.91 L5.01 59.56 L4.57 57.20 L4.25 54.81 L4.06 52.41 L4.00 50.00 L4.06 47.59 L4.25 45.19 L4.57 42.80 L5.01 40.44 L5.57 38.09 L6.25 35.79 L7.06 33.52 L7.98 31.29 L9.01 29.12 L10.16 27.00 L11.42 24.95 L12.79 22.96 L14.25 21.05 L15.82 19.22 L17.47 17.47 L19.22 15.82 L21.05 14.25 L22.96 12.79 L24.95 11.42 L27.00 10.16 L29.12 9.01 L31.29 7.98 L33.52 7.06 L35.79 6.25 L38.09 5.57 L40.44 5.01 L42.80 4.57 L45.19 4.25 L47.59 4.06 L50.00 4.00 L52.41 4.06 L54.81 4.25 L57.20 4.57 L59.56 5.01 L61.91 5.57 L64.21 6.25 L66.48 7.06 L68.71 7.98 L70.88 9.01 L73.00 10.16 L75.05 11.42 L77.04 12.79 L78.95 14.25 L80.78 15.82 L82.53 17.47 L84.18 19.22 L85.75 21.05 L87.21 22.96 L88.58 24.95 L89.84 27.00 L90.99 29.12 L92.02 31.29 L92.94 33.52 L93.75 35.79 L94.43 38.09 L94.99 40.44 L95.43 42.80 L95.75 45.19 L95.94 47.59 L96.00 50.00 L95.94 52.41 L95.75 54.81 L95.43 57.20 L94.99 59.56 L94.43 61.91 L93.75 64.21 L92.94 66.48 L92.02 68.71 L90.99 70.88 L89.84 73.00 L88.58 75.05 L87.21 77.04 L85.75 78.95 L84.18 80.78 L82.53 82.53 L80.78 84.18 L78.95 85.75 L77.04 87.21 L75.05 88.58 L73.00 89.84 L70.88 90.99 L68.71 92.02 L66.48 92.94 L64.21 93.75 L61.91 94.43 L59.56 94.99 L57.20 95.43 L54.81 95.75 L52.41 95.94 L50.00 96.00 L47.59 95.94 L45.19 95.75 L42.80 95.43 L40.44 94.99 L38.09 94.43 L35.79 93.75 L33.52 92.94 L31.29 92.02 L29.12 90.99 L27.00 89.84 L24.95 88.58 L22.96 87.21 L21.05 85.75 L19.22 84.18 L17.47 82.53 L15.82 80.78 L14.25 78.95 L12.79 77.04 L11.42 75.05 L10.16 73.00 L9.01 70.88 L7.98 68.71 L7.06 66.48 L6.25 64.21 L5.57 61.91 L5.01 59.56 L4.57 57.20 L4.25 54.81 L4.06 52.41 L4.00 50.00 L4.06 47.59 L4.25 45.19 L4.57 42.80 L5.01 40.44 L5.57 38.09 L6.25 35.79 L7.06 33.52 L7.98 31.29 L9.01 29.12 L10.16 27.00 L11.42 24.95 L12.79 22.96 L14.25 21.05 L15.82 19.22 L17.47 17.47 L19.22 15.82 L21.05 14.25 L22.96 12.79 L24.95 11.42 L27.00 10.16 L29.12 9.01 L31.29 7.98 L33.52 7.06 L35.79 6.25 L38.09 5.57 L40.44 5.01 L42.80 4.57 L45.19 4.25 L47.59 4.06 L50.00 4.00 L52.41 4.06 L54.81 4.25 L57.20 4.57 L59.56 5.01 L61.91 5.57 L64.21 6.25 L66.48 7.06 L68.71 7.98 L70.88 9.01 L73.00 10.16 L75.05 11.42 L77.04 12.79 L78.95 14.25 L80.78 15.82 L82.53 17.47 L84.18 19.22 L85.75 21.05 L87.21 22.96 L88.58 24.95 L89.84 27.00 L90.99 29.12 L92.02 31.29 L92.94 33.52 L93.75 35.79 L94.43 38.09 L94.99 40.44 L95.43 42.80 L95.75 45.19 L95.94 47.59 L96.00 50.00';
  var css=`
  site-footer{display:block;margin-top:64px;border-top:1px solid var(--line);background:var(--surface)}
  .raf{max-width:760px;margin:0 auto;padding:40px 24px 48px;text-align:center;font-family:var(--serif-body);color:var(--ink-soft)}
  .raf .spin{display:block;margin:0 auto 14px;width:46px;height:46px}
  .raf .spin path{stroke:var(--gold);stroke-width:2.4;fill:none;stroke-linecap:round;
    stroke-dasharray:1;stroke-dashoffset:1;animation:rafdraw 3.6s ease-out forwards}
  @keyframes rafdraw{to{stroke-dashoffset:0}}
  .raf .spinwrap{animation:rafspin 80s linear infinite;display:inline-block}
  @keyframes rafspin{to{transform:rotate(360deg)}}
  .raf h3{font-family:var(--serif-display);font-weight:600;font-size:20px;color:var(--ink);margin:0 0 .35em}
  .raf p{font-size:15px;line-height:1.6;margin:0 auto .5em;max-width:56ch}
  .raf p a{color:var(--gold);text-decoration:none}.raf p a:hover{text-decoration:underline}
  .raf form{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:18px auto 6px;max-width:420px}
  .raf input{flex:1;min-width:200px;font-family:var(--sans);font-size:14px;padding:10px 14px;
    border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink)}
  .raf input::placeholder{color:var(--faint)}
  .raf button{font-family:var(--sans);font-weight:600;font-size:14px;padding:10px 20px;border:0;
    border-radius:8px;background:var(--gold);color:#fff;cursor:pointer}
  .raf button:hover{background:#1f4468}.raf button:disabled{opacity:.6;cursor:default}
  .raf .msg{font-family:var(--sans);font-size:13px;margin-top:8px;min-height:1em}
  .raf .links{font-family:var(--sans);font-size:12.5px;color:var(--mut);margin-top:20px}
  .raf .links a{color:var(--gold);text-decoration:none;margin:0 7px}.raf .links a:hover{text-decoration:underline}
  .raf .uc{font-family:var(--sans);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin-bottom:10px}
  `;
  class SiteFooter extends HTMLElement{
    connectedCallback(){
      // Embedded (iframed into some other surface): render no footer.
      if(new URLSearchParams(location.search).get('embed')==='1'){ this.style.display='none'; return; }
      var base=this.getAttribute('base')||'';
      this.innerHTML='<style>'+css+'</style>'+
        '<div class="raf">'+
        '<div class="uc">Recursively under construction</div>'+
        '<span class="spinwrap"><svg class="spin" viewBox="0 0 100 100" aria-hidden="true"><path pathLength="1" d="'+SPIRAL+'"/></svg></span>'+
        '<h3>One branch of a larger tree</h3>'+
        '<p>The work so far of <strong>one solo developer</strong> — passionate about the history of astrology and meaning systems, and built with a great deal of help from AI. The hope is that <strong>real human collaborators</strong> will make the whole thing better.</p>'+
        '<p>Part of <a href="https://recursive.eco" target="_blank" rel="noopener">recursive.eco</a> — grammars for sense-making. Get an occasional note as it grows:</p>'+
        '<form id="raf-news"><input id="raf-email" type="email" required placeholder="you@email.com" aria-label="Email"><button type="submit">Sign up</button></form>'+
        '<div class="msg" id="raf-msg"></div>'+
        '<div class="links"><a href="https://recursive.eco" target="_blank" rel="noopener">recursive.eco ↗</a> · '+
        '<a href="'+base+'index.html#all-grammars">All grammars</a> · '+
        '<a href="'+base+'pages/course.html">Course</a> · '+
        '<a href="https://github.com/PlayfulProcess/Recursive-astrology" target="_blank" rel="noopener">the repo</a></div>'+
        '</div>';
      var f=this.querySelector('#raf-news'), msg=this.querySelector('#raf-msg');
      f.addEventListener('submit', async function(e){
        e.preventDefault();
        var email=(f.querySelector('#raf-email').value||'').trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){msg.style.color='#c0473b';msg.textContent='Please enter a valid email.';return;}
        var btn=f.querySelector('button'); btn.disabled=true; btn.textContent='Signing up…'; msg.textContent='';
        try{
          var r=await fetch(SUPA+'/rest/v1/newsletter_subscribers',{method:'POST',
            headers:{'apikey':ANON,'Authorization':'Bearer '+ANON,'Content-Type':'application/json','Prefer':'return=minimal'},
            body:JSON.stringify({email:email,subscribed_from:'recursive-astrology',subscribed:true})});
          if(r.ok){msg.style.color='#3f7a5c';msg.textContent='✓ Welcome to the recursive public!';f.querySelector('#raf-email').value='';}
          else if(r.status===409){msg.style.color='#3f7a5c';msg.textContent='✓ You\'re already signed up!';}
          else{throw new Error('status '+r.status);}
        }catch(err){msg.style.color='#c0473b';msg.innerHTML='Something went wrong — or sign up at <a href="https://recursive.eco" target="_blank" rel="noopener" style="color:var(--gold)">recursive.eco</a>.';}
        finally{btn.disabled=false; btn.textContent='Sign up';}
      });
    }
  }
  customElements.define('site-footer', SiteFooter);
})();
