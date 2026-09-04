# -*- coding: utf-8 -*-
"""Build the meta-voice grammar "Astro of All Astros" from the voice grammars already
in this repo (grammars/<slug>/grammar.json).

DATA PREP that lives in the public recursive-astrology repo, not a recursive.eco app
feature — mirrors recursive-tarot/scripts/build_meta_grammar.py (see its docstring and
docs/DESIGN-oracle-trinity.md "Astro of all Astros" / "the same mechanism as Tarot of
All Tarots + the lenses matcher"). One item per shared entity (the 7 classical planets,
the 12 zodiac signs, the 12 houses), each item's `sections` carrying EVERY voice
grammar's own entry for that entity, keyed by source label ("Ptolemy (Tetrabiblos)",
"Lilly (1647)", "Jyotiṣa (Bṛhat Jātaka)", "Alan Leo", "Planetary Myths", "Canonical").
"One draw, all traditions answering."

Output: grammars/astro-of-all-astros/grammar.json. Idempotent — re-run after editing
any source voice grammar; this file is a generated projection, never hand-edited.

Run from repo root:  python3 scripts/build_meta_astro.py
"""
import json
import os
import re
import datetime

HERE = os.path.dirname(__file__)
GRAMMARS = os.path.abspath(os.path.join(HERE, "..", "grammars"))
OUT_SLUG = "astro-of-all-astros"

# slug -> section label used in the meta item (order here = section order in output).
SOURCES = [
    ("western-astrology-canonical", "Canonical"),
    ("tetrabiblos-ashmand",         "Ptolemy (Tetrabiblos)"),
    ("william-lilly-christian-astrology", "Lilly (1647)"),
    ("jyotisa-brhat-jataka",        "Jyotiṣa (Bṛhat Jātaka)"),
    ("alan-leo",                    "Alan Leo"),
    ("planetary-myths",             "Planetary Myths"),
    # Label names the SCHEME, not the two 19th/20th-c. reprints that enrich it: the
    # dignities table itself is Ptolemy's and Lilly's, and Raphael (1828) / Sepharial
    # (1920) supply the public-domain commentary sections. Naming only those two in the
    # section header mis-attributed the table to them.
    ("dignities-rulerships",        "Dignities & Rulerships (traditional table)"),
]

# The 7 classical planets (visible to the naked eye — the set every historical voice
# in this repo actually covers; outer planets/nodes are excluded, same as Lilly/Ptolemy).
PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra",
         "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
HOUSES = list(range(1, 13))

SIGN_ELEMENT = {  # for a bit of first-class metadata parity with western-astrology-canonical
    "Aries": "Fire", "Leo": "Fire", "Sagittarius": "Fire",
    "Taurus": "Earth", "Virgo": "Earth", "Capricorn": "Earth",
    "Gemini": "Air", "Libra": "Air", "Aquarius": "Air",
    "Cancer": "Water", "Scorpio": "Water", "Pisces": "Water",
}


def _canon(name, options):
    """Case-insensitive exact match against a canonical option list."""
    for o in options:
        if name.strip().lower() == o.lower():
            return o
    return None


def _paren_inner(name):
    m = re.search(r"\(([^)]+)\)", name or "")
    if not m:
        return None
    inner = m.group(1).strip()
    inner = re.sub(r"^the\s+", "", inner, flags=re.IGNORECASE)
    return inner


def canonical_planet(item):
    md = item.get("metadata") or {}
    if isinstance(md.get("planet"), str):
        c = _canon(md["planet"], PLANETS)
        if c:
            return c
    # word-boundary match against item name (e.g. "Saturn", "Sūrya (the Sun)")
    name = item.get("name") or ""
    for p in PLANETS:
        if re.search(r"\b" + p + r"\b", name, re.IGNORECASE):
            return p
    inner = _paren_inner(name)
    if inner:
        c = _canon(inner, PLANETS)
        if c:
            return c
    return None


def canonical_sign(item):
    md = item.get("metadata") or {}
    if isinstance(md.get("sign"), str):
        c = _canon(md["sign"], SIGNS)
        if c:
            return c
    if isinstance(md.get("western_equivalent"), str):
        c = _canon(md["western_equivalent"], SIGNS)
        if c:
            return c
    name = item.get("name") or ""
    for s in SIGNS:
        if re.search(r"\b" + s + r"\b", name, re.IGNORECASE):
            return s
    inner = _paren_inner(name)
    if inner:
        c = _canon(inner, SIGNS)
        if c:
            return c
    return None


def canonical_house(item):
    """Mirrors extractHouseNumber() in recursive.eco's astrology.types.ts (id pattern
    first, then metadata, then a digit in the name) so this generator and the app agree."""
    m = re.search(r"house-?(\d{1,2})\b", item.get("id", ""), re.IGNORECASE)
    if m:
        return int(m.group(1))
    md = item.get("metadata") or {}
    for k in ("house", "number"):
        v = md.get(k)
        if isinstance(v, int):
            return v
        if isinstance(v, str) and v.strip().isdigit():
            return int(v.strip())
    m = re.search(r"(\d{1,2})", item.get("name") or "")
    if m:
        return int(m.group(1))
    return None


def render_sections(item):
    """Flatten one source item's own sections into one markdown block."""
    sections = item.get("sections") or {}
    parts = []
    for k, v in sections.items():
        if not v:
            continue
        parts.append("**%s:** %s" % (k, v.strip() if isinstance(v, str) else v))
    return "\n\n".join(parts)


def load_source(slug):
    path = os.path.join(GRAMMARS, slug, "grammar.json")
    if not os.path.exists(path):
        print("  ! missing source grammar:", slug)
        return None
    return json.load(open(path, encoding="utf-8"))


def build():
    # entity -> label -> rendered text
    planet_text = {p: {} for p in PLANETS}
    sign_text = {s: {} for s in SIGNS}
    house_text = {h: {} for h in HOUSES}
    # entity -> symbol glyph, read straight off whichever source item carries one first
    # (western-astrology-canonical, first in SOURCES, has one per planet/sign/house —
    # a Unicode glyph, not invented data; other sources rarely set `symbol` but could).
    planet_symbol = {}
    sign_symbol = {}
    house_symbol = {}
    source_names = {}
    coverage = {p: [] for p in PLANETS}
    coverage.update({s: [] for s in SIGNS})
    coverage.update({h: [] for h in HOUSES})

    for slug, label in SOURCES:
        g = load_source(slug)
        if not g:
            continue
        source_names[slug] = g.get("name") or slug
        for it in g.get("items", []):
            if it.get("composite_of"):
                continue  # skip any emergence/axis nodes — only L1 entity items count
            cat = (it.get("category") or "").lower()
            text = render_sections(it)
            sym = it.get("symbol") or None
            if cat == "planet":
                p = canonical_planet(it)
                if p:
                    if sym and p not in planet_symbol:
                        planet_symbol[p] = sym
                    if text:
                        planet_text[p][label] = text
                        coverage[p].append(label)
            elif cat == "sign":
                s = canonical_sign(it)
                if s:
                    if sym and s not in sign_symbol:
                        sign_symbol[s] = sym
                    if text:
                        sign_text[s][label] = text
                        coverage[s].append(label)
            elif cat == "house":
                h = canonical_house(it)
                if h in house_text:
                    if sym and h not in house_symbol:
                        house_symbol[h] = sym
                    if text:
                        house_text[h][label] = text
                        coverage[h].append(label)

    items = []

    def add_entity(entity_id, name, category, metadata, texts, symbol=None):
        if not texts:
            return  # no voice covers this entity — skip rather than ship an empty item
        sections = {label: texts[label] for slug, label in SOURCES if label in texts}
        item = {
            "id": entity_id,
            "name": name,
            "category": category,
            "level": 1,
            "metadata": metadata,
            "sections": sections,
            "keywords": [name.lower(), category],
        }
        if symbol:
            item["symbol"] = symbol
        items.append(item)

    # Fallback glyphs for the 7 classical planets, used only if no source item
    # supplied its own `symbol` (western-astrology-canonical always does, so this
    # is a defensive backstop, not the primary path).
    PLANET_SYMBOLS = {"Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀",
                      "Mars": "♂", "Jupiter": "♃", "Saturn": "♄"}
    for p in PLANETS:
        add_entity("planet-%s" % p.lower(), p, "planet", {"planet": p},
                   planet_text[p], symbol=planet_symbol.get(p, PLANET_SYMBOLS.get(p)))
    for s in SIGNS:
        add_entity("sign-%s" % s.lower(), s, "sign",
                   {"sign": s, "element": SIGN_ELEMENT.get(s)}, sign_text[s],
                   symbol=sign_symbol.get(s))
    for h in HOUSES:
        ORDINAL = {1: "First", 2: "Second", 3: "Third", 4: "Fourth", 5: "Fifth", 6: "Sixth",
                   7: "Seventh", 8: "Eighth", 9: "Ninth", 10: "Tenth", 11: "Eleventh", 12: "Twelfth"}
        add_entity("house-%d" % h, "%s House" % ORDINAL[h], "house", {"house": h}, house_text[h],
                   symbol=house_symbol.get(h))

    grammar = {
        "_grammar_commons": {
            "schema_version": "1.0",
            "license": "Mixed — see each grammar's own `license` field (public-domain source texts; original synthesis CC-BY-SA-4.0)",
            "attribution": [{"name": "PlayfulProcess", "note": "Generated meta-voice grammar; entries aggregated from the voice grammars in this repo."}],
        },
        "name": "Astro of All Astros — every voice, one placement",
        "description": (
            "A generated meta-voice grammar aggregating every interpretation grammar in this "
            "repo into one navigable set: one item per planet, sign, and house, each carrying "
            "every voice's own reading of that placement side by side — Ptolemy, Lilly, Jyotiṣa, "
            "Alan Leo, the planetary myths, and the platform's own Canonical synthesis. Cast a "
            "placement and hear every tradition answer at once.\n\n"
            "SOURCE OF TRUTH — read this first. Each voice's authoritative interpretation lives in "
            "its own grammar at `grammars/<slug>/grammar.json`. This meta is a *generated index* "
            "(a projection) over those voices, rebuilt idempotently by "
            "`scripts/build_meta_astro.py` — it is NOT a second copy to maintain. To correct an "
            "entry, edit its source voice; the meta re-derives. Coverage varies by entity — a "
            "voice with no historical entry for a given placement (e.g. Lilly only wrote on the "
            "seven planets, not signs or houses) simply has no section there; nothing is invented "
            "to fill a gap. See docs/DESIGN-oracle-trinity.md ('Astro of all Astros') for the "
            "design this proves out."
        ),
        "grammar_type": "astrology",
        "creator_name": "PlayfulProcess",
        "creator_link": "https://recursive.eco",
        "default_view": "cards",
        "default_preview": "cards",
        # Dating contract — see GRAMMAR_FORMAT.md "Dating & provenance". This meta is a
        # projection, not an artifact: it has no source date of its own, so it carries NO
        # `dating.year` and must never be given a sentinel year. The voices it aggregates
        # are dated in their own grammar.json files.
        "provenance": "contemporary",
        "dating": {
            "label": ("Undated — generated meta-voice projection over the voice grammars in "
                      "this repo. The voices it stacks are dated individually (Ptolemy c. 150 CE, "
                      "Lilly 1647, Bṛhat Jātaka c. 6th c. CE, Alan Leo 1899–1903); the projection "
                      "itself is present-day and rebuilt on every run."),
        },
        "is_published": True,
        "_generated": True,
        "_do_not_hand_edit": True,
        "_rebuild_note": "Generated by scripts/build_meta_astro.py from grammars/*/grammar.json. Do not hand-edit — edit the source voice grammar and re-run the script.",
        "_built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "_built_by": "scripts/build_meta_astro.py",
        "_sources": [{"slug": slug, "name": source_names.get(slug, slug), "label": label}
                      for slug, label in SOURCES if slug in source_names],
        "items": items,
    }

    out_dir = os.path.join(GRAMMARS, OUT_SLUG)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "grammar.json")
    json.dump(grammar, open(out_path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    # summary
    n_planets = sum(1 for p in PLANETS if planet_text[p])
    n_signs = sum(1 for s in SIGNS if sign_text[s])
    n_houses = sum(1 for h in HOUSES if house_text[h])
    print("sources=%d items=%d (planets=%d/%d signs=%d/%d houses=%d/%d)" % (
        len(source_names), len(items), n_planets, len(PLANETS), n_signs, len(SIGNS), n_houses, len(HOUSES)))
    for entity, labels in coverage.items():
        pass
    print("wrote", out_path)


if __name__ == "__main__":
    build()
