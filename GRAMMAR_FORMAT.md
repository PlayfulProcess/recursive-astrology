> **Mirrored copy.** The canonical version lives in
> [`recursive.eco-schemas/GRAMMAR_FORMAT.md`](https://github.com/PlayfulProcess/recursive.eco-schemas/blob/main/GRAMMAR_FORMAT.md).
> If this copy and that one differ, the schemas repo wins — update this copy to match.

# Grammar JSON — Canonical Format

The complete, authoritative shape for a recursive.eco grammar JSON file.

This document is the contract between the schemas repo and the
recursive.eco application. **If your grammar won't load in the viewer
or the editor, this is the first place to look.**

The other docs (`CLAUDE.md`, `CONTRIBUTING.md`, `QUICKSTART.md`,
`schemas/SCHEMAS_GUIDE.md`) all describe pieces of this format. This
doc is the single source of truth.

---

## Top-level shape

A grammar is a single JSON object:

```jsonc
{
  "name": "string",                    // REQUIRED — display title
  "description": "string",             // REQUIRED — what this grammar contains
  "grammar_type": "string",            // REQUIRED — see "Grammar types" below
  "cover_image_url": "string",         // OPTIONAL — hero image for the deck
  "tags": ["string"],                  // OPTIONAL — search/filter tags
  "creator_name": "string",            // OPTIONAL — your name or handle
  "creator_link": "string",            // OPTIONAL — your website or profile
  "is_published": false,               // OPTIONAL — false for drafts
  "items": [ /* UnifiedItem objects */ ]   // REQUIRED — see "UnifiedItem" below

  // Optional library-placement fields (see CLAUDE.md "Monad Fields"):
  // "roots": [...], "shelves": [...], "lineages": [...], "worldview": "...",

  // Optional commons metadata:
  // "_grammar_commons": { "schema_version": "1.0", "license": "...", "attribution": [...] }

  // Optional astrology customization (see "Category & section roles" below):
  // "_category_roles": { "my-category-name": "planet" },
  // "_section_roles": { "My Section Name": "affirmation" }
}
```

**There is NO top-level `emergences` array.** Level-1 base items AND
level-2+ composite items ALL live inside `items[]`. Composite items
are distinguished by the presence of `composite_of: ["id1", "id2", ...]`
on the item itself. (Continued in "Composite items" below.)

---

## Grammar types

`grammar_type` must be one of:

| Type | What it's for |
|---|---|
| `"tarot"` | Card-draw oracle decks (Major Arcana, archetype decks). Items have Interpretation, Reversed, etc. |
| `"iching"` | I Ching hexagrams. Items have line data via the `lines` property. Must have 64 items. |
| `"astrology"` | Western or Vedic astrology. Items have planet / sign / house categories. |
| `"sequence"` | Curated playlists / story sequences / video collections. Often paired with `performance` blocks (see below). |
| `"course"` | Step-by-step learning sequences with lessons. |
| `"prompt"` | Prompt libraries for AI conversations. |
| `"birthchart"` | Astrological birth-chart grammars. |
| `"altar"` | Altar / shrine grammars — symbolic arrangements. |
| `"music"` | Music grammars — albums, songs, sequences. |
| `"custom"` | Anything else — chapter books, folk tales, poetry, journaling decks. Use when no other type fits. |

> ⚠️ **`"performance"` is NOT a valid `grammar_type`.** "Performance" is
> a viewer mode (timestamped video clip rendering). The grammar_type
> for a curated video playlist is `"sequence"` (or `"custom"`); the
> per-item `performance` object below carries the clip details.

If your `grammar_type` doesn't match what the items actually contain,
Flow / the viewer may render the grammar incorrectly. When in doubt,
use `"custom"`.

---

## UnifiedItem shape

Every entry in `items[]` follows this shape:

```jsonc
{
  "id": "stable-string-id",          // REQUIRED — unique within the grammar
  "name": "string",                  // REQUIRED — display name
  "category": "string",              // OPTIONAL — grouping key (e.g. "major_arcana")
  "sort_order": 0,                   // OPTIONAL — display order (default by array position)
  "image_url": "string",             // OPTIONAL — per-item image (R2 URL or any HTTPS)
  "sections": {                      // REQUIRED — at least {} (can be empty)
    "Section Label": "markdown content",
    "Another Section": "more content"
  },
  "keywords": ["string"],            // OPTIONAL — search tags for this item
  "composite_of": ["id-1", "id-2"],  // PRESENT ONLY ON COMPOSITE ITEMS — see below
  "metadata": { /* free-form */ },   // OPTIONAL — see "Metadata fields"
  "performance": { /* clip cfg */ }  // OPTIONAL — see "Performance object"
}
```

### Sections are flexible

Section keys are not restricted. Use whatever makes sense for your
content. Examples seen in production grammars:

- Tarot: `Interpretation`, `Reversed`, `Summary`
- I Ching: `Image`, `Judgment`, `Line 1`, `Line 2`, ...
- Bus Passengers: `Thoughts`, `Thinking`, `Perception`, `Sensing`, `Context`, `Mystery`
- Story grammar: `Story`, `For Young Readers`, `For Parents`, `Themes`
- Tantric tattvas: `Mirror`, `Yantra`, `Essence`, `Practice`, `Question`, `Unmesa/Nimesa`
- Sequence / performance: `What she says`, `Why this clip`, `Test for listener`

The viewer renders all sections. Order is the JSON property order.

### Composite items (the L2/L3 emergence pattern)

A composite item is just a regular item that has a `composite_of`
array referencing the IDs of its children:

```json
{
  "id": "act-1-the-departure",
  "name": "Act 1: The Departure",
  "category": "act",
  "composite_of": ["scene-1", "scene-2", "scene-3"],
  "sections": {
    "About this act": "The hero leaves the ordinary world..."
  }
}
```

- L1 items are the leaves (cards, scenes, hexagrams, video clips).
- L2 items group L1 items via `composite_of`.
- L3 items can group L2 items.

**All of these live in the same `items[]` array.** Do not put
composite items in a separate `emergences[]` block. (Legacy grammars
that used a separate array no longer work; the editor saves
everything in `items[]`.)

The `level` field (`"level": 1`, `"level": 2`, `"level": 3`) is
*allowed* and helpful for tools that walk the hierarchy, but the
real source of truth is the presence/absence of `composite_of`. An
item without `composite_of` is L1; an item with `composite_of` is L2
or deeper.

`composite_of` references must point to IDs that exist in the same
`items[]` array. Broken references will fail validation.

---

## Metadata fields

`metadata` is a free-form object for whatever extra structured data
your grammar needs. Some conventions:

| Field | Meaning | Used by |
|---|---|---|
| `youtube_video_id` | The 11-character YouTube ID (e.g. `dQw4w9WgXcQ`) | Sequence grammars with video clips |
| `youtube_url` | Full URL to the source video | Sequence grammars (for click-through) |
| `lines` | Array of line texts (for I Ching items) | I Ching grammars |
| `planet`, `sign`, `house` | Astrology categorizations | Astrology grammars |
| `theme`, `mood`, `tradition` | Free-form taxonomy | Any grammar |
| `image_credit` | Provenance for the item's `image_url` — **required whenever `image_url` is set** in this repo. See "Illustrations & image provenance" below. | Recursive Astrology |

> ⚠️ **YouTube field naming gotcha:** The canonical field name is
> `youtube_video_id`, NOT `video_id`. Earlier drafts of grammars
> shipped with `video_id` will not be recognized by the performance
> viewer. Always use the `youtube_` prefix.

You can also put arbitrary keys in `metadata` for editorial / study
purposes. The viewer ignores unknown keys.

---

## Dating & provenance

> **Recursive Astrology extension** (added Jul 2026). These two grammar-root fields
> are not part of the upstream schemas-repo contract yet; the app ignores them, and
> this repo's own viewers and `scripts/build_collection.py` consume them.

A library about history needs to say, per grammar, *when its content is from* — and to
say **"undated"** out loud rather than let a viewer invent a placeholder year. Two
grammar-root fields carry that:

```jsonc
{
  "grammar_type": "astrology",

  "provenance": "record",          // REQUIRED. One of the three kinds below.
  "dating": {
    "year": 1647,                  // integer. PRESENT IFF provenance == "record".
    "label": "1647 — William Lilly, Christian Astrology (first edition)",  // REQUIRED always
    "confidence": "high",          // "high" | "medium" | "low". PRESENT IFF `year` is present.
    "basis": "Anchored to the title-page date of the first edition, carried per item as …"
                                   // PRESENT IFF `year` is present.
  }
}
```

### The three kinds of `provenance`

| Value | What it means | `dating.year` |
|---|---|---|
| `"record"` | A dated historical source text — the voice speaks from a fixed point in time (Ptolemy, Lilly, Alan Leo, the Neo-Assyrian omen reports). | **required** |
| `"contemporary"` | A present-day synthesis, reading, lens compilation, or generated projection. It has no source date, on purpose. | **must be absent** |
| `"casting"` | A spread grammar — positions, not interpretations. A spread has no source date; it resolves against whichever interpretation grammar the reader picks. | **must be absent** |

### Rules

- **`dating.label` is required on every grammar, dated or not.** For an undated
  grammar it must *say so in words* — `"Undated — contemporary synthesis, written
  2026 after …"` — so a UI has honest text to render without a number.
- **Absence of `dating.year` is the machine-readable signal for "undated".**
  Consumers must skip the grammar or bucket it as undated. **Never substitute a
  sentinel year** (`9999`, `0`, "now"): a sentinel puts a contemporary essay on a
  historical timeline and silently lies about it.
- **`year` is an integer and negative means BCE** — `-700` = c. 700 BCE. It exists to
  sort, not to display; `label` is what a reader sees.
- **`year` anchors to the ORIGINAL composition of the material actually quoted**, not
  to the translation, edition, or scan the text was taken from. Ptolemy is `150`, not
  `1822` (Ashmand's translation); Proctor is `1877`, not `1896` (a posthumous reprint).
  Name the later edition in `label` and `basis`.
- **Date reconstructed dates with `c.`** in `label` and set `confidence` accordingly —
  `"c. 150 CE — Ptolemy, Tetrabiblos"`, confidence `medium`.
- **`basis` must say what the number anchors to and how it was checked**, and it must
  be checkable — from material already in the repo, or from a source actually fetched.
  If neither is possible, leave `year` out. Never invent a date to fill the field.
- **`_duplicate_of: "<slug>"`** marks a grammar directory that is a byte-level duplicate
  of another. `scripts/build_collection.py` holds these out of `_collection.json`'s
  `grammars` list (they are listed under `duplicates` instead) so they cannot plot twice.

The derived `_collection.json` mirrors this contract flat, as `provenance`,
`year_label`, `year`, and `year_confidence` — see that file's `_dating_contract` key.

---

## Illustrations & image provenance

> **Recursive Astrology extension** (added Jul 26 2026). `image_url` and
> `cover_image_url` are upstream fields; the two `*_credit` objects below are this
> repo's addition. The app ignores unknown keys, so they are safe to carry.

`CLAUDE.md` allows an item to carry an image **only when the image is genuinely
public domain and the item records where it came from and why it is PD**. That record
lives in a credit object:

- **item-level** — `metadata.image_credit`, describing that item's `image_url`
- **grammar-level** — `cover_image_credit` at the grammar root, describing
  `cover_image_url` (and `thumbnail_url`, which mirrors the cover when present)

```jsonc
"metadata": {
  "image_credit": {
    "title":    "The Flammarion engraving — a traveller puts his head through the edge of the sky",
    "creator":  "Anonymous wood engraver",      // REQUIRED — "Unknown …" is a real answer
    "date":     "1888",                          // REQUIRED — "c." / a range is fine
    "source":   "Camille Flammarion, *L'atmosphere: meteorologie populaire* (Paris, 1888)",
                                                 // OPTIONAL — the edition/collection it comes from
    "file_page":"https://commons.wikimedia.org/wiki/File:Flammarion.jpg",
                                                 // REQUIRED — the FILE PAGE, not the raw file
    "license":  "Public domain (as stated on the Wikimedia Commons file page)",
    "pd_basis": "Anonymous engraving published 1888; Commons file page states public domain (PD-old)",
    "verified": "2026-07-26"                     // REQUIRED — the day the URL and licence were checked
  }
}
```

### Rules

- **Public domain only, and checked.** Before an image goes in, fetch it and read the
  file page. Commons must *state* a public-domain status (PD-old / PD-old-100 / PD-US /
  "Public domain"). A CC licence — including CC BY and CC BY-SA on a modern photograph
  of an ancient object — **is not public domain**; those images do not belong here even
  though the object photographed is old. `pd_basis` must say which of the two it is
  (the work's age, or what the file page states), never a guess.
- **One image, one item, and it must be *of* that item.** A file may appear at most
  once as an item image across the whole repo, plus at most once as a grammar cover.
  Never repeat one picture down a list of signs, houses or aspects to make a page look
  furnished — that is decoration, and the honest gap is better.
- **No anachronism.** Don't illustrate a twentieth-century psychological item with a
  Renaissance woodcut, or a Renaissance item with a modern diagram.
- **Spread (`casting-*`) grammars may carry a COVER, but no per-item images.**
  *(Amended Jul 27 2026. The rule until then was "carry no images at all."* The
  builder set covers on all three casting grammars in the recursive.eco app, which
  is a reasonable wish — a spread with no picture is a blank tile in a gallery of
  illustrated ones. So a `cover_image_url` (+ mirrored `thumbnail_url`) is now
  allowed on a casting grammar, under exactly the same provenance burden as any
  other image: PD only, `cover_image_credit` filled in, file page checked. What
  does **not** change: a casting grammar's *items* stay bare. They are position
  scaffolds — "your Sun", "your 7th house" — and any picture on them would be
  decoration standing in for content the reader is supposed to supply from their
  own chart.*
  **The repo stays canonical.** A cover chosen here overwrites the app's on the
  next pull; when the two disagree, this file wins, because the app has no licence
  check and this repo is public-domain-only.
- **URL form.** Use `https://commons.wikimedia.org/wiki/Special:FilePath/<File_Name>?width=800`
  — a stable canonical URL that serves a sized rendition of the original (several of
  these originals are 20 000 px wide). Keep the human-readable file page in
  `file_page` so the licence is one click away.
- **An honest gap beats a wrong picture.** An item with no `image_url` is a valid,
  finished item. Leave it bare rather than reach.

---

## Category & section roles (astrology customization)

For `astrology` (and Vedic/Jyotish) grammars, the astrology viewer buckets
items into tabs — Planets, Signs, Houses, Aspects, etc. — by reading each
item's `category`. A default table of category names is already recognized,
no configuration needed:

| Category | Viewer role |
|---|---|
| `planet` | planet |
| `sign` | sign |
| `house` | house |
| `aspect` | aspect |
| `graha` (Vedic) | planet |
| `rashi` (Vedic) | sign |
| `bhava` (Vedic) | house |
| `nakshatra` (Vedic) | nakshatra |
| `yoga`, `drishti` (Vedic) | emergence |
| `dignity`, `position` | modifier |

### Custom category names — `_category_roles`

If your tradition uses category names outside this list (a regional or
invented tradition, not Western or Jyotish), declare a mapping at the
**grammar root** — this ADDS to the default table above, it doesn't replace it:

```jsonc
{
  "name": "My Astrology Tradition",
  "grammar_type": "astrology",
  "_category_roles": {
    "planetary-lord": "planet",
    "constellation": "sign"
  },
  "items": [ /* items whose "category" is "planetary-lord", "constellation", etc. */ ]
}
```

Valid target roles: `planet`, `sign`, `house`, `aspect`, `nakshatra`,
`emergence`, `modifier`.

### Custom section names — `_section_roles`

The astrology viewer also maps **section names** to display roles (which tab
subsection a section's content lands in) — `Shadow`, `Light`, `Archetype`,
`Karakatvas`/`Significations`, `Affirmation`/`Mantra`, `Questions`,
`Invitation`, and description-like sections (`Interpretation`, `Description`,
`Story`, `Meaning`, `Summary`) are recognized by default. If your sections
use different labels, declare `_section_roles` alongside `_category_roles`:

```json
{
  "_section_roles": {
    "Karakatvas": "significations",
    "Mantra": "affirmation"
  }
}
```

Both `_category_roles` and `_section_roles` are reserved, **grammar-root**
fields — never put them inside an item.

---

## Performance object (timestamped video clip rendering)

For grammars where each item is a clip from a YouTube video — common
in `sequence` grammars and useful in `custom` grammars too — each
item carries an optional `performance` object:

```jsonc
{
  "id": "clip-01-misconceptions-opening",
  "name": "Misconceptions about Hinduism — opening (5:00–7:30)",
  "metadata": {
    "youtube_video_id": "XS7RKHR_ink",
    "youtube_url": "https://www.youtube.com/watch?v=XS7RKHR_ink"
  },
  "performance": {
    "start_sec": 300,         // crop start, in seconds
    "end_sec": 450,           // crop end, in seconds
    "volume": 1.0,            // 0..1
    "video_visible": true,    // false = audio-only playback
    "cover_image_url": "https://...",   // OPTIONAL — used in audio-only mode

    "background_audio": {     // OPTIONAL — overlay background music/ambience
      "youtube_video_id": "different-id-here",
      "start_sec": 0,
      "end_sec": 600,
      "volume": 0.3
    },

    "overlays": [             // OPTIONAL — text or image overlays on the video
      {
        "kind": "text",       // "text" or "image"
        "content": "Overlay text or image URL",
        "start_sec": 5,       // when this overlay appears
        "end_sec": 12,        // when it disappears
        "x_pct": 10,          // horizontal position, 0..100
        "y_pct": 80,          // vertical position, 0..100
        "width_pct": 80       // width as percentage of viewport
      }
    ],

    "words": [                // OPTIONAL — per-word karaoke timing (see below)
      { "w": "In", "start": 5.0, "end": 5.2 },
      { "w": "the", "start": 5.2, "end": 5.3 }
    ]
  },
  "sections": {
    "What she says": "...",
    "Why this clip": "..."
  }
}
```

### Audio karaoke mode (`words`)

Some grammars are a single narrated audio track (a karaoke book / dramatic
reading) rather than per-item YouTube clips. For these, the **grammar root**
carries the narration track in `metadata.audio` (a hosted audio URL) and
optionally `metadata.total_sec` / `metadata.crop_ranges`. Each item then sets
`performance.video_visible: false` and times its own text against that shared
track with `performance.words` — one entry per spoken word, in seconds,
**absolute within the grammar-level narration track** (not relative to the
item):

```jsonc
{
  "name": "A Narrated Poem",
  "grammar_type": "custom",
  "metadata": {
    "audio": "https://.../narration.mp3",
    "total_sec": 612,
    "audio_source": "LibriVox (public domain) · Jane Reader (2026)"
  },
  "items": [
    {
      "id": "stanza-1",
      "name": "Stanza 1",
      "sections": { "Text": "In the beginning..." },
      "performance": {
        "video_visible": false,
        "start_sec": 12.4,          // this item's first word (absolute in the track)
        "end_sec": 18.9,            // this item's last word
        "cover_image_url": "https://...",   // shown instead of a video
        "words": [
          { "w": "In", "start": 12.4, "end": 12.6 },
          { "w": "the", "start": 12.6, "end": 12.7 },
          { "w": "beginning", "start": 12.7, "end": 13.3 }
        ]
      }
    }
  ]
}
```

`words` is normally produced by an audio-alignment tool (Whisper word
timestamps aligned onto the item's own text), not hand-written. The field
names are terse (`w` / `start` / `end`) because there's one object per word.

### Field-name conventions inside `performance`

Note the **singular `sec`** (not `seconds`):

- ✅ `start_sec`, `end_sec`
- ❌ `start_seconds`, `end_seconds`

This applies inside `performance`, inside `background_audio`, and
inside `overlays[]`.

### When to use `performance`

- ✅ Sequence grammars where items are video clips
- ✅ Custom grammars that want timestamped audio/video segments
- ✅ Any item where you want the viewer to play a cropped portion
- ❌ Static items (tarot cards, hexagrams) — leave `performance` off

The `performance` object lives on the **individual item**, not at
the grammar root. Each clip has its own start/end.

---

## Reference items & meta-grammars (a grammar of grammars)

An item does not have to hold its own content — it can **point at another
grammar/document**. This is what makes a "grammar of grammars" possible: a
meta-grammar whose items are themselves whole decks or texts, so you can build a
tree whose leaves drill down into full sub-grammars (recursion **by reference**,
not by merging the item and grammar types).

On a **UnifiedItem**:

| Field | Meaning |
|---|---|
| `item_type` | `"content"` (default) or `"reference"` |
| `ref_document_id` | the `user_document` id this item opens |
| `ref_item_id` | OPTIONAL — the specific item **inside** `ref_document_id` this item points at. Omit it and the reference opens the whole target document; set it and the reference opens exactly one item within that document. |
| `ref_preview` | how the target opens: `"default" \| "study" \| "grammar" \| "altar"` |
| `grammars` | array of linked grammar/document ids (multi-link) |

On the **grammar root**:

| Field | Meaning |
|---|---|
| `default_preview` | the viewer that opens by default: `"grammar" \| "study" \| "tree" \| "altar" \| "course" \| "thumbnails"` |

The viewer renders a reference item as a link that opens the target
(`/play?id=<ref_document_id>`, or `?id=<ref_document_id>&item=<ref_item_id>`
when `ref_item_id` is set). Combined with the L1/L2/L3 `composite_of`
emergence, `default_preview: "tree"` renders the whole thing in the tree-viewer.

**Resolution is additive, not a replacement.** A reference item is allowed to
carry its own content too (its own `sections`, e.g. a short provenance
blurb) — when the target resolves, the viewer renders the item's OWN content
together with the resolved SOURCE item's content, side by side. Don't treat
"this reference item already has some sections filled in" as a reason to
skip resolving it; resolve whenever `ref_document_id` (+ optionally
`ref_item_id`) is present, regardless of what else is on the item.

### Example 1 — a meta-grammar leaf that opens a full deck

```json
{
  "id": "deck-visconti-sforza",
  "name": "Visconti-Sforza Tarot",
  "level": 1,
  "item_type": "reference",
  "ref_document_id": "<the deck's user_document id>",
  "ref_preview": "grammar",
  "sections": { "What it is": "The oldest near-complete tarot…" },
  "metadata": { "branch": "branch-roots" }
}
```

### Example 1b — a meta-grammar leaf that opens ONE card inside a deck (`ref_item_id`)

Use `ref_item_id` when the meta-grammar's leaves are individual cards drawn
from many source decks, rather than whole decks — e.g. a "Tarot — All Decks,
Many Lenses" meta-grammar with one item per source-deck card:

```json
{
  "id": "leaf-visconti-the-fool",
  "name": "The Fool (Visconti-Sforza)",
  "level": 1,
  "item_type": "reference",
  "ref_document_id": "<the Visconti-Sforza deck's user_document id>",
  "ref_item_id": "<that deck's 'The Fool' item id>",
  "ref_preview": "study",
  "sections": {
    "Origin": "One of many cards drawn from every deck in the commons."
  }
}
```

None of this leaf's card content (keywords, interpretation, image) needs to
be duplicated inline — it resolves live from the source deck, and the
"Origin" section renders alongside it.

### Example 2 — the genealogy tree that opens in tree view

A `grammar_type: "custom"` meta-grammar with `"default_preview": "tree"` and three
levels: **L1** decks (reference items), **L2** branches (`composite_of` the decks),
**L3** root (`composite_of` the branches). The tree-viewer
(`recursive.eco/pages/tree-viewer.html?type=custom&id=…`) draws root → branches →
decks, and each deck leaf opens its own grammar.

> Real example in this repo: **`grammars/tree-of-tarot/grammar.json`** — the
> genealogy of tarot. (Its leaves currently use text references; after the decks are
> imported to Supabase, set `ref_document_id` on each leaf so clicking opens the deck.
> See `plan/tarot-roadmap-and-supabase-log.md` §3d.)

---

## Three common mistakes (when grammars won't load)

These three errors account for the vast majority of "won't load"
failures. Check yours against this list first.

### Mistake 1 — `grammar_type: "performance"`

`"performance"` is not a valid grammar type. It is a viewer mode.

✅ For a curated video playlist: `"grammar_type": "sequence"`
✅ When unsure: `"grammar_type": "custom"`

### Mistake 2 — `emergences[]` at the top level

A separate top-level `emergences` array is not supported. Merge the
L2/L3 items into `items[]` with their `composite_of` field intact.

```diff
- "items": [ /* L1 items */ ],
- "emergences": [ /* L2 items */ ]
+ "items": [
+   /* L1 items */,
+   /* L2 items with composite_of */
+ ]
```

### Mistake 3 — `metadata.video_id` / `metadata.start_seconds`

The canonical field names are:

- `metadata.video_id` → `metadata.youtube_video_id`
- `metadata.start_seconds` → `performance.start_sec` (moved to `performance`)
- `metadata.end_seconds` → `performance.end_sec` (moved to `performance`)

Each item that has a YouTube clip should have BOTH
`metadata.youtube_video_id` AND a `performance` object with
`start_sec` and `end_sec`.

---

## Minimal working examples

### Tarot card (L1 only)

```json
{
  "name": "Tiny Tarot",
  "description": "Just one card.",
  "grammar_type": "tarot",
  "tags": ["tarot"],
  "is_published": false,
  "items": [
    {
      "id": "major-00-fool",
      "name": "The Fool",
      "sort_order": 0,
      "category": "major_arcana",
      "keywords": ["new beginnings"],
      "sections": {
        "Interpretation": "The beginning of all journeys.",
        "Reversed": "Fear of the unknown."
      }
    }
  ]
}
```

### Sequence of video clips with emergence theme

```json
{
  "name": "Three clips on dharma",
  "description": "Curated video study.",
  "grammar_type": "sequence",
  "tags": ["dharma", "study"],
  "is_published": false,
  "items": [
    {
      "id": "clip-01",
      "name": "What is dharma",
      "category": "foundation",
      "sort_order": 1,
      "metadata": {
        "youtube_video_id": "abc12345XYZ",
        "youtube_url": "https://www.youtube.com/watch?v=abc12345XYZ"
      },
      "performance": {
        "start_sec": 120,
        "end_sec": 240,
        "video_visible": true,
        "volume": 1.0
      },
      "sections": {
        "Summary": "Teacher defines dharma in plain terms."
      }
    },
    {
      "id": "clip-02",
      "name": "The four legs of dharma",
      "category": "foundation",
      "sort_order": 2,
      "metadata": {
        "youtube_video_id": "def67890XYZ",
        "youtube_url": "https://www.youtube.com/watch?v=def67890XYZ"
      },
      "performance": {
        "start_sec": 600,
        "end_sec": 780,
        "video_visible": true,
        "volume": 1.0
      },
      "sections": {
        "Summary": "Satyam, daya, sochá, tapas."
      }
    },
    {
      "id": "theme-foundations",
      "name": "Foundations of dharma",
      "category": "theme",
      "sort_order": 100,
      "composite_of": ["clip-01", "clip-02"],
      "sections": {
        "About this theme": "Two starting-point clips."
      }
    }
  ]
}
```

Both clips live in `items[]`. The theme is also an item in `items[]`,
just with `composite_of`. No separate `emergences[]` array.

---

## Validating before upload

A minimal Python check:

```python
import json
g = json.load(open("your-grammar.json", encoding="utf-8"))

# Required top-level
assert "name" in g and "description" in g
assert "grammar_type" in g
assert g["grammar_type"] in {
    "tarot", "iching", "astrology", "sequence",
    "course", "prompt", "birthchart", "altar", "music", "custom"
}
assert isinstance(g.get("items"), list) and len(g["items"]) > 0

# No top-level emergences array
assert "emergences" not in g, "Move emergences into items[] with composite_of"

# Per-item checks
ids = {it["id"] for it in g["items"]}
for it in g["items"]:
    assert "id" in it and "name" in it and "sections" in it
    if "composite_of" in it:
        for child in it["composite_of"]:
            assert child in ids, f"composite_of references missing id: {child}"
    if "metadata" in it:
        # Common YouTube field-name gotcha
        assert "video_id" not in it["metadata"], \
            "Rename metadata.video_id -> metadata.youtube_video_id"
    if "performance" in it:
        p = it["performance"]
        # Singular "sec" not "seconds"
        assert "start_seconds" not in p, "Rename performance.start_seconds -> start_sec"
        assert "end_seconds" not in p, "Rename performance.end_seconds -> end_sec"

print("OK")
```

If you write a more thorough validator and submit it as
`scripts/validate-grammar.py`, others will thank you.

---

## See also

- [`README.md`](README.md) — repo overview and how to copy / fork / share grammars
- [`QUICKSTART.md`](QUICKSTART.md) — fastest path to your first grammar
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution workflow and git identity setup
- [`CLAUDE.md`](CLAUDE.md) — guidance for AI assistants working in this repo (includes
  monad/library-placement fields and the emergence-creation playbook)
- [`schemas/SCHEMAS_GUIDE.md`](schemas/SCHEMAS_GUIDE.md) — directory layout for the
  `schemas/` subtree

If you find a discrepancy between this doc and the actual behavior of
the editor or the viewer, **the editor's behavior is the source of
truth** — please open an issue or PR so we can update this doc.
