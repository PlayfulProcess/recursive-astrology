# Diagnosis — the two chart bugs from FUTURE-PLANS-2026-09-06.md (items 1 and 2)

Investigated 6 September 2026 against the live sites and the live database. Evidence first,
conclusion second, because both original guesses turned out to be wrong.

## Item 1 — `POST /api/calculate-chart` → 405

**The guess in the plan** was that this is a flow route problem, to be fixed in
`recursive-eco/apps/flow/src/app/api/calculate-chart/route.ts`. That route does not exist and
should not: flow has no chart API at all, and never did. The calculator is a Python function in
THIS repo.

**What the evidence says.** Two different origins serve the same `viewer/astrology-viewer.html`,
and only one of them can answer its API call:

| Request | astro.recursive.eco (GitHub Pages) | chart.recursive.eco (Vercel) |
|---|---|---|
| `GET /viewer/astrology-viewer.html` | 200 | 200 |
| `POST /api/calculate-chart` | **405** | 400 (the function parsed the body and rejected it) |
| `Server` header | GitHub.com | Vercel |

The viewer asks for its API with a RELATIVE url — `const CHART_API_URL = '/api/calculate-chart'`
(`viewer/astrology-viewer.html:2599`) — so the call resolves against whatever origin the page was
served from. On Pages there is no server to answer a POST, and Pages replies 405. That is exactly
the observed error, and it is reproducible on demand.

The flow side is fine. The deployed dev bundle
(`/_next/static/chunks/4131-ffc81e7fcfbb48dc.js` on dev.flow.recursive.eco) contains
`chart.recursive.eco`, which is what `getAstrologyViewerUrl()` in
`apps/flow/src/components/shared/url-utils.ts` falls back to when `NEXT_PUBLIC_ASTRO_SITE_URL` is
unset. So flow embeds the Vercel copy, whose API works.

**Conclusion.** The page that produced the 405 was the GitHub Pages copy of the viewer. The bug is
that Pages serves a full copy of the calculator that can never calculate — a trap for anyone who
reaches `astro.recursive.eco/viewer/astrology-viewer.html`, whether by link, search or an old
bookmark.

**Fix (not applied — `astrology-viewer.html` is being refactored in a parallel pass; do this after
that lands).** Make the API origin explicit instead of relative:

```js
const ON_API_ORIGIN = location.hostname === 'chart.recursive.eco'
  || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const CHART_API_URL = ON_API_ORIGIN
  ? '/api/calculate-chart'
  : 'https://chart.recursive.eco/api/calculate-chart';
```

That needs CORS response headers on `api/calculate_chart.py` for the `.recursive.eco` family —
check before shipping, and mirror the allowlist flow uses (exact `https://recursive.eco` plus any
`*.recursive.eco` subdomain, never a wildcard with credentials). The alternative, cheaper and
uglier, is to stop Pages serving `viewer/` at all and let the library site link out to
chart.recursive.eco.

## Item 1b — a landmine found while confirming the above (fixed)

`f36aa67` ("Drop dead Vercel config") deleted `vercel.json` and `.vercelignore` on the premise that
they "configure a deployment that no longer exists". **They configure the deployment that is
currently live.** Evidence:

- `POST /api/calculate-chart` answers, but `POST /api/calculate_chart` is 404. Vercel's zero-config
  detection would route the second (it uses the filename); the first only exists because
  `vercel.json` maps `/api/calculate-chart` → `api/calculate_chart.py`.
- `GET /` returns the viewer — another `vercel.json` route.
- The viewer responds with `Content-Security-Policy: frame-ancestors https://*.recursive.eco …`,
  which is defined nowhere else in the repo. That header is what lets recursive.eco iframe the chart.

So the live build predates that commit, and the next Vercel deploy from this branch would have
dropped the API routes, the `/` route and the frame-ancestors header — silently breaking both the
calculator and its embed. Both files are restored (commit `3d787f7`). `api/calculate_chart.py` and
`api/transit_timeline.py` were never removed; only their configuration had gone.

**Do not push this repo again without those files present.**

## Item 2 — `rpc/astrology_grammar_options` → 500

**Not reproducible, and the function is healthy.** Measured today:

| Check | Result |
|---|---|
| Called as `anon` over REST | 200, `[]` (correct: `auth.uid()` is null, so no rows) |
| Called with the author's uid in `request.jwt.claims` | 46 rows |
| `EXPLAIN ANALYZE` of its expensive half for that user | 112 ms, index scan, 46 rows |
| Definition | `LANGUAGE sql STABLE`, `SET search_path TO 'public'`, SECURITY INVOKER |
| Grants | EXECUTE to `anon`, `authenticated`, `service_role`, `postgres` |

So there is no missing grant and no broken definition. The function does read
`document_data` (a jsonb access de-TOASTs the whole blob), which is the pattern that once "choked
the whole Supabase REST endpoint into 522s" per the comment at the call site, so the most probable
cause of a one-off 500 is a statement timeout while other blob-heavy queries were running on the
same page load — plausibly the same page load whose chart call was already failing.

**What to do.** Not a code fix on this evidence. Two cheap moves instead:

1. **Make a recurrence diagnosable.** The call site swallows the error:
   `catch (error) { console.error('Error loading user astrology grammars:', error); }`
   (`viewer/astrology-viewer.html:7667`). Log `error.code`, `error.message`, `error.details` and
   `error.hint` behind an `[astro-grammars]` canary, so next time the response says whether it was
   `57014` (statement timeout) or something else. Same reasoning as the canary-log rule in
   recursive-eco's CLAUDE.md: a swallowed error costs days.
2. **Take the blob out of the query if it recurs.** Every one of the 531 candidate rows already has
   a populated `summary` jsonb carrying `name`, `description`, `cover_image_url`, `thumbnail_url`,
   `item_count`, `grammar_type`, `document_type` and `tool_slug` — everything the RPC returns except
   `is_spread` and `is_astrology`, which are computed by scanning the items array. Rewriting the RPC
   against `summary` (and stamping those two booleans into `summary` at save time) removes the
   de-TOAST entirely. Worth doing when something else touches this path; not worth a migration today.

## Not verified

The flow astro tab has not been exercised end to end signed in since these findings. The claim that
its embed works rests on the deployed bundle pointing at `chart.recursive.eco` and that origin's API
answering, not on a chart having been drawn in the tab.
