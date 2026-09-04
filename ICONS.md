# Icons — SVG only, never emoji

**The rule (family-wide, from recursive.eco):** every user-facing glyph is a line-drawn **SVG** from
the shared set below — **never a colored emoji** (🌙 ☉ 🃏 …). Emoji render differently on every
platform, can't inherit the surrounding text color, and read as decoration. SVGs inherit
`currentColor`, scale cleanly, and keep one visual language across the app, the channel heroes on
recursive.eco, and this repo's own pages/viewers.

**Source of truth:** `recursive-eco/apps/flow/src/components/shared/icons.tsx` (React components).
This file is the **framework-agnostic mirror** — the same paths as raw `<svg>` you can paste into any
HTML page, viewer, or README here (this repo has no React). If you add or change a glyph in the app,
update this file too; if you only work here, this file is enough.

> **Primary glyph for this repo: Astrology — crescent moon + star.** The same mark the sky repos
> (Nara, Kali·Paradevi) and the app's astro oracle use. Never label an astrology surface with 🌙 / ☉.
> (The one sanctioned exception in the family: the `channel.icon` field in `recursive-eco.json`,
> which the app's channel schema currently takes as an emoji — tarot uses 🃏 there, nara 🌗, we 🌙.)

## How to use

Every icon shares one frame: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
`stroke-linecap="round"`, `stroke-linejoin="round"`, stroke width **1.75** (a few note a different
width). **Color** = whatever text color the parent sets (`color:` / a class). **Size** = set
`width`/`height`.

```html
<span style="color:#c08a3e">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- paste a path block from "The set" below -->
  </svg>
</span>
```

## The set

### Astrology — crescent moon + star  *(this repo's primary glyph)*
```html
<path d="M17 4a7 7 0 1 0 3 11 5.6 5.6 0 0 1-3-11z" />
<path d="M8.5 4.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" />
```

### The wheel — a chart's twelve houses  *(this repo's casting glyph: circle + cross + horizon)*
```html
<circle cx="12" cy="12" r="9" />
<path d="M3 12h18M12 3v18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
```

### Tarot — card + lozenge  *(the parent repo's primary glyph)*
```html
<rect x="6" y="3" width="12" height="18" rx="2" />
<path d="M12 7l3 5-3 5-3-5z" />
```

### View / preview — the eye (matches the public grammar cards)
```html
<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
<circle cx="12" cy="12" r="3" />
```

### Grammar — emergence / org-chart (a grammar with no cover image; its *shape*)
```html
<circle cx="12" cy="4.5" r="2" />
<circle cx="5" cy="14" r="2" />
<circle cx="12" cy="14" r="2" />
<circle cx="19" cy="14" r="2" />
<circle cx="8.5" cy="20" r="1.5" />
<circle cx="15.5" cy="20" r="1.5" />
<path d="M12 6.5v2M12 8.5 5 12M12 8.5l7 3.5M12 8.5v3.5M5 16l3 2.6M19 16l-3 2.6" />
```

### I Ching — trigram lines  *(use stroke-width 2)*
```html
<path d="M5 7h14M5 12h5M14 12h5M5 17h14" />
```

### Story — open book
```html
<path d="M12 6c-2-1.4-5-1.4-7 0v12c2-1.4 5-1.4 7 0 2-1.4 5-1.4 7 0V6c-2-1.4-5-1.4-7 0z" />
<path d="M12 6v12" />
```

### The recursive.eco spiral mark  *(its own 32×32 frame, stroke-width 1.6)*
```html
<svg width="48" height="48" viewBox="0 0 32 32" fill="none" stroke="currentColor"
     stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M16,14.8 16.28,14.68 16.61,14.63 16.98,14.67 17.35,14.8 17.7,15.04 18,15.37 18.24,15.79 18.38,16.28 18.41,16.82 18.32,17.39 18.08,17.94 17.72,18.46 17.22,18.9 16.61,19.24 15.92,19.45 15.16,19.5 14.38,19.38 13.62,19.09 12.91,18.62 12.3,17.98 11.82,17.2 11.51,16.31 11.4,15.34 11.5,14.34 11.82,13.35 12.36,12.43 13.1,11.62 14.03,10.97 15.1,10.52 16.28,10.31 17.5,10.35 18.72,10.65 19.88,11.23 20.91,12.05 21.76,13.1 22.39,14.33 22.74,15.7 22.8,17.15 22.55,18.6 21.99,20 21.12,21.27 19.98,22.36 18.61,23.19 17.07,23.73 15.42,23.93 13.72,23.77 12.08,23.26 10.54,22.39 9.21,21.19 8.14,19.72 7.38,18.02 7,16.18 7.02,14.26 7.44,12.36 8.27,10.56 9.48,8.95 11.03,7.61 12.85,6.62 14.87,6.01 17,5.85 19.15,6.14 21.22,6.89 23.11,8.07 24.74,9.65" />
</svg>
```

## Never do this
- ❌ `<h1>🌙 The Recursive Astrology</h1>`
- ✅ Astrology SVG (above) next to `<h1>The Recursive Astrology</h1>`

Empty / fallback states use the relevant glyph (an empty grammar thumbnail → the **Grammar** icon),
never an emoji.
