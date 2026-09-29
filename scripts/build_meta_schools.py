# -*- coding: utf-8 -*-
"""Build the SCHOOLS meta-grammar, grammars/astrology-schools/grammar.json: a grammar of
this repo's astrology schools, so a reader can switch schools in and out.

Mirrors recursive-tarot's tree-of-tarot (a grammar of grammars: decks at L1, branches at
L2) and its generated meta (scripts/build_meta_grammar.py: grouping nodes, then axis
nodes with render_as 'pill-group' that cards.html's getRootAxes() turns into 'Group:'
filter pills with no code change). Shape:

  L1  one item per SCHOOL (category 'school'). metadata carries grammar_slugs, family,
      zodiac, era, year_label, source_type (pd-book | compilation | ai-written), stance,
      view (a historiographies-of-astrology item id), voice (a voices.json id, if any),
      section_label (the school's section key in astro-of-all-astros — the key a school
      filter toggles), default_on and rulership_sets. Each school links to its view with
      the one cross-link pattern (metadata.source_deck / source_item_id / deck).
  L2  grouping nodes, composite_of schools: families, zodiacs, eras, source types and
      RULERSHIP SETS (traditional / modern / the Bailey school's esoteric table / the
      colour-horoscope set with Vesta and Chiron).
  L3  axes (render_as 'pill-group'): By family, By zodiac, By era, By source type,
      By rulership set.

Only 3 grammars stamp their own school (metadata.school / era_view), so the SCHOOLS table
below is curated by hand, like tarot's DECKS dict. What the script can read from the data,
it reads, and says so in metadata `_basis`: zodiac from a grammar's tags, rulers from its
sign items, year labels from its `dating` block, coverage from its items, voice links from
voices.json. Everything else is an inference, and each one is labelled in metadata
`_inferred` with its reason. A dangling slug, view or voice id prints a WARN.

URL contract (proposed, not yet wired): ?schools=<slug>,<slug> selects schools the way
tarot's ?decks= selects decks, and overrides any saved choice.

Idempotent apart from _built_at. Never hand-edit the output; edit SCHOOLS and re-run:

    python scripts/build_meta_schools.py
"""
import datetime
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
GRAMMARS = os.path.join(ROOT, "grammars")
OUT_SLUG = "astrology-schools"

STRUCTURE_SLUG = "the-structure-of-the-sky"
HISTORIO_SLUG = "historiographies-of-astrology"
HISTORIO_LABEL = "Historiographies of Astrology"
META_SLUG = "astro-of-all-astros"
BAILEY_SLUG = "esoteric-bailey-paraphrase"

SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra",
         "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

# ── Families (L2). Order = display order. ────────────────────────────────────────────
FAMILIES = [
    ("family-omen-craft", "Omen-craft",
     "The oldest layer: the sky read as signs about the king and the land, before any birth chart."),
    ("family-hellenistic-traditional", "Hellenistic & traditional Western",
     "The horoscopic astrology Ptolemy systematised and Lilly carried into early-modern "
     "England: seven visible planets, twelve signs, the dignities table."),
    ("family-jyotisa", "Jyotiṣa (Indian)",
     "The Indian tradition, read on the sidereal zodiac, with its nine grahas."),
    ("family-theosophical", "Theosophical & esoteric",
     "The turn from event to character and from fate to the soul's growth, in the "
     "Theosophical revival and the esoteric schools that grew from it."),
    ("family-psychological", "Psychological & archetypal",
     "Twentieth- and twenty-first-century astrology read as a mirror of the psyche."),
    ("family-comparative-myth", "Comparative myth",
     "The same planets told through several unrelated mythologies side by side."),
    ("family-critique", "Critique (the skeptical tradition)",
     "The tradition of critique, from inside and outside astrology, speaking in its own terms."),
]

ZODIACS = [
    ("zodiac-tropical", "Tropical",
     "Signs measured from the spring equinox. Most Western schools."),
    ("zodiac-sidereal", "Sidereal",
     "Signs measured against the fixed stars, about 24° away from the tropical signs today."),
    ("zodiac-none", "Zodiac not used",
     "Schools whose grammar here reads planets or pairs without signs, or critiques the "
     "whole practice."),
]

ERAS = [  # (id, label, sort)
    ("era-ancient", "Ancient (before c. 500 CE)", 1),
    ("era-classical-medieval", "Classical & medieval (c. 500–1500)", 2),
    ("era-early-modern", "Early modern (c. 1500–1800)", 3),
    ("era-modern", "Modern (c. 1800–1960)", 4),
    ("era-contemporary", "Contemporary (present-day writing)", 5),
]

SOURCE_TYPES = [
    ("source-pd-book", "pd-book", "Public-domain book",
     "The school speaks through a public-domain book, quoted or summarised."),
    ("source-compilation", "compilation", "Compilation",
     "A present-day compilation of dated or sourced material, cited per item."),
    ("source-ai-written", "ai-written", "AI-written synthesis or paraphrase",
     "Present-day writing made with an AI: a synthesis, or a paraphrase of a book that "
     "cannot be quoted."),
]

# ── Schools (L1). Hand-curated; the builder fills in what the data can tell. ─────────
# grammar_slugs[0] is the school's own grammar; later slugs are grammars where the
# school also appears as a section under the same section_label.
SCHOOLS = [
    dict(slug="mesopotamian-omens", label="Mesopotamian omen-craft",
         grammar_slugs=["mesopotamian-omens"], family="family-omen-craft",
         era="era-ancient", source_type="pd-book", stance="omen-craft",
         view="view-mesopotamian-omens", voice=None, section_label="Mesopotamian Omens",
         zodiac="none", default_on=True, rulership_sets=[],
         what=("Neo-Assyrian scholars reading the seven planet-gods as signs addressed to "
               "the state: if this appears in the sky, then this for the king and the land. "
               "There is no birth chart here and no personal reading."),
         inferred={"zodiac": "the grammar covers planets only, so no sign scheme is in play"}),
    dict(slug="ptolemy", label="Ptolemy's Hellenistic astrology",
         grammar_slugs=["tetrabiblos-ashmand", "aspects-commented"],
         family="family-hellenistic-traditional", era="era-ancient", source_type="pd-book",
         stance="natural-philosophy", view="view-hellenistic-synthesis", voice="ptolemy",
         section_label="Ptolemy (Tetrabiblos)", zodiac="tropical", default_on=True,
         rulership_sets=["rulers-traditional"],
         what=("The Tetrabiblos (c. 150 CE): astrology as the natural philosophy of its age, "
               "a conjectural art of tendencies rather than certainties, in the 1822 Ashmand "
               "translation."),
         inferred={
             "zodiac": ("the grammar has no zodiac tag; the-structure-of-the-sky says Ptolemy's "
                        "zodiac begins at the vernal equinox"),
             "rulership_sets": ("the grammar's sign items carry no ruler key; the "
                                "dignities-rulerships grammar says its scheme is the one "
                                "Ptolemy and Lilly share")}),
    dict(slug="lilly", label="Lilly's early-modern astrology",
         grammar_slugs=["william-lilly-christian-astrology", "aspects-commented"],
         family="family-hellenistic-traditional", era="era-early-modern", source_type="pd-book",
         stance="court-science", view="view-medieval-renaissance-court", voice=None,
         section_label="Lilly (1647)", zodiac="tropical", default_on=True,
         rulership_sets=["rulers-traditional"],
         what=("William Lilly's Christian Astrology (1647), the English book that carried "
               "horary and natal technique from the Renaissance into the modern revival."),
         inferred={
             "zodiac": "the grammar has no zodiac tag; Lilly works in the Western tropical signs",
             "rulership_sets": ("the grammar's sign items carry no ruler key; the "
                                "dignities-rulerships grammar says its scheme is the one "
                                "Ptolemy and Lilly share")}),
    dict(slug="dignities-table", label="The traditional dignities table",
         grammar_slugs=["dignities-rulerships"], family="family-hellenistic-traditional",
         era="era-ancient", source_type="compilation", stance="natural-philosophy",
         view="view-hellenistic-synthesis", voice=None,
         section_label="Dignities & Rulerships (traditional table)", zodiac="tropical",
         default_on=True, rulership_sets=["rulers-traditional"],
         what=("Rulership, exaltation, detriment and fall for the seven planets and twelve "
               "signs: the scheme Ptolemy and Lilly share, with public-domain commentary "
               "from Raphael (1828) and Sepharial (1920)."),
         inferred={
             "era": ("the scheme is Ptolemy's (c. 150 CE); the compilation itself is "
                     "present-day and undated"),
             "stance": "taken from the Hellenistic view, whose scheme it tabulates",
             "view": "the scheme is Ptolemy's; no view is stamped in the grammar",
             "zodiac": "the table is defined on the Western tropical signs"}),
    dict(slug="jyotisa", label="Jyotiṣa (Bṛhat Jātaka)",
         grammar_slugs=["jyotisa-brhat-jataka"], family="family-jyotisa",
         era="era-classical-medieval", source_type="pd-book", stance="natural-philosophy",
         view="view-jyotisha", voice=None, section_label="Jyotiṣa (Bṛhat Jātaka)",
         zodiac="sidereal", default_on=True, rulership_sets=["rulers-traditional"],
         what=("Varāhamihira's Bṛhat Jātaka (c. 6th century CE) in Iyer's 1885 translation: "
               "one text of a living, plural tradition, read on the sidereal zodiac. Its "
               "sign lords are the same seven planets as the Western traditional table."),
         inferred={}),
    dict(slug="alan-leo", label="Alan Leo's Theosophical astrology",
         grammar_slugs=["alan-leo"], family="family-theosophical", era="era-modern",
         source_type="pd-book", stance="psychological", view="view-theosophical-revival",
         voice="jung", section_label="Alan Leo", zodiac="tropical", default_on=True,
         rulership_sets=["rulers-traditional"],
         what=("Alan Leo (1860–1917), who turned astrology from the prediction of events "
               "toward character and the growth of the soul, in the Theosophical revival."),
         inferred={
             "zodiac": "the grammar has no zodiac tag; Leo works in the Western tropical signs",
             "view": ("the grammar's description presents it as the Theosophical revival; the "
                      "view is not stamped in its metadata"),
             "stance": ("the Theosophical-revival view's stance vocabulary says 'psychological'; "
                        "Leo's own register is closer to esoteric character-reading")}),
    dict(slug="esoteric-bailey", label="Esoteric astrology (Bailey school)",
         grammar_slugs=[BAILEY_SLUG], family="family-theosophical", era="era-modern",
         source_type="ai-written", stance="esoteric", view="view-theosophical-revival",
         voice=None, section_label="Esoteric (Bailey school, paraphrased)", zodiac="tropical",
         default_on=False, rulership_sets=["rulers-bailey-esoteric"],
         year=1951,
         year_label=("1951 — Alice A. Bailey, Esoteric Astrology (vol. III of A Treatise on the "
                     "Seven Rays; Lucis Publishing). Paraphrased here; the book is under "
                     "copyright to 2046."),
         what=("The soul-centred astrology of Alice A. Bailey's Esoteric Astrology (1951), in "
               "our own paraphrase. Each sign gets three rulers (orthodox, esoteric, "
               "hierarchical), among them Vulcan, a planet that has never been found, and the "
               "Earth. Off by default: its rulers differ from every other school here, and "
               "that difference is what the filter is for."),
         inferred={
             "zodiac": ("the book keeps the sign names and treats 'the Sun in Aries' as symbolic "
                        "rather than physical; in practice its signs are the tropical ones"),
             "view": ("the Theosophical-revival view covers c. 1890–1930; the book is later "
                      "(1951) but of the same lineage"),
             "stance": ("'esoteric' is not in the historiographies stance vocabulary; the "
                        "nearest listed stance is 'psychological'"),
             "source_type": ("the grammar is our AI-written paraphrase; the book itself cannot "
                             "be quoted or stored")}),
    dict(slug="canonical", label="Canonical psychological astrology",
         grammar_slugs=["western-astrology-canonical", "aspects-commented"],
         family="family-psychological", era="era-contemporary", source_type="ai-written",
         stance="psychological", view="view-humanistic-psychological", voice="jung",
         section_label="Canonical", zodiac="tropical", default_on=True,
         rulership_sets=["rulers-modern"],
         what=("This channel's flagship interpretation set: a present-day synthesis in the "
               "psychological register, with light, shadow and archetype for every planet, "
               "sign, house and aspect."),
         inferred={
             "source_type": ("the grammar calls itself a contemporary community-authored "
                             "synthesis; it is neither a public-domain book nor a compilation "
                             "of dated sources, so it is listed as ai-written. Check."),
             "view": "no view is stamped in the grammar; its register is the humanistic-psychological one",
             "voice": ("the jung voice's course names the humanistic-psychological view; not "
                       "stamped in the grammar"),
             "rulership_sets": ("the grammar states no rulers; it covers Uranus, Neptune and "
                                "Pluto as a modern-ruler school would")}),
    dict(slug="archetypal-pairs", label="Archetypal pairs",
         grammar_slugs=["archetypal-pairs"], family="family-psychological",
         era="era-contemporary", source_type="ai-written", stance="psychological",
         view="view-humanistic-psychological", voice="jung", section_label="Archetypal Pairs",
         zodiac="none", default_on=True, rulership_sets=[],
         what=("The planets in relationship, pair by pair (Saturn–Pluto, Venus–Mars and "
               "thirteen more), inspired by Richard Tarnas's archetypal astrology. Written "
               "with an AI; not Tarnas's text."),
         inferred={
             "view": "no view is stamped in the grammar; its register is the humanistic-psychological one",
             "voice": ("the jung voice's course names the humanistic-psychological view; not "
                       "stamped in the grammar"),
             "zodiac": "the pairs are read planet to planet, independent of signs"}),
    dict(slug="planetary-myths", label="Planetary myths",
         grammar_slugs=["planetary-myths"], family="family-comparative-myth",
         era="era-contemporary", source_type="compilation", stance="comparative",
         view=None, voice=None, section_label="Planetary Myths", zodiac="none",
         default_on=True, rulership_sets=[],
         what=("Each classical planet told three ways, Greco-Roman, Vedic and Babylonian, so "
               "the disagreement between traditions stays visible."),
         inferred={
             "era": "the myths are ancient; the compilation is present-day (2026)",
             "source_type": ("an AI research compilation with inline sources; listed as a "
                             "compilation because it cites its sources per section"),
             "stance": "'comparative' is not in the historiographies stance vocabulary",
             "zodiac": "the grammar covers planets only"}),
    dict(slug="proctor-skeptical", label="The skeptical tradition (Proctor)",
         grammar_slugs=["proctor-skeptical-astrology"], family="family-critique",
         era="era-modern", source_type="pd-book", stance="critical",
         view="pattern-critique", voice="skeptical-school",
         section_label="Proctor (skeptical, 1877)", zodiac="none", default_on=True,
         rulership_sets=[],
         what=("Richard A. Proctor's Myths and Marvels of Astronomy (1877): a Victorian "
               "astronomer walking through astrology's claims in a sardonic idiom. Part of "
               "the record, not this library's verdict."),
         inferred={
             "zodiac": ("the grammar describes the signs in order to criticise them; it "
                        "reads no chart"),
             "rulership_sets": "a critique; it documents rulers without using them"}),
]

# Grammars in this repo that are NOT schools, and why (kept visible, not silently dropped).
NOT_SCHOOLS = {
    "the-structure-of-the-sky": "the structure every school hangs on, in no one's voice",
    "historiographies-of-astrology": "the survey of eras and stances; each school links to one of its views",
    "astro-of-all-astros": "a generated meta: every school's reading stacked per placement",
    "aspects-commented": "a compilation whose sections are three schools (Ptolemy, Lilly, Canonical); listed under those schools",
    "trika-lens": "PlayfulProcess's own lens, mapped onto chart layers rather than a school of astrology",
    "dwarf-planets": "a topic synthesis about the 2006 reclassification, not a school",
    "casting-big-three": "a casting (positions, not interpretations)",
    "casting-single-aspect": "a casting (positions, not interpretations)",
    "casting-twelve-houses": "a casting (positions, not interpretations)",
    "the-right-size": "an essay",
    "three-doors": "an essay",
    OUT_SLUG: "this grammar",
}

# ── Rulership sets (L2). Tables are READ from grammars where they exist. ─────────────
COLOUR_OVERRIDES = {"Taurus": "Vesta", "Virgo": "Chiron"}


def load(slug):
    path = os.path.join(GRAMMARS, slug, "grammar.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def warn(msg):
    print("  WARN", msg)


def _planet_word(v):
    """'Mars (Kuja)' -> 'Mars'; 'The Moon' -> 'Moon'."""
    if not isinstance(v, str):
        return None
    v = re.sub(r"\s*\(.*\)$", "", v.strip())
    return re.sub(r"^the\s+", "", v, flags=re.IGNORECASE)


def sign_of(item):
    md = item.get("metadata") or {}
    for key in ("sign", "western_equivalent"):
        if isinstance(md.get(key), str) and md[key] in SIGNS:
            return md[key]
    sid = md.get("source_item_id") or ""
    if sid.startswith("sign-"):
        return sid[5:].capitalize()
    return None


def rulers_from(grammar, key_order=("ruler", "rasi_lord")):
    """sign -> ruler, read off a grammar's sign items, or {} if it states none."""
    out = {}
    for it in grammar.get("items", []):
        if it.get("category") != "sign":
            continue
        s = sign_of(it)
        md = it.get("metadata") or {}
        for k in key_order:
            if md.get(k):
                out[s] = _planet_word(md[k])
                break
    return out


def coverage(grammar):
    counts = {}
    for it in grammar.get("items", []):
        if it.get("composite_of"):
            continue
        c = it.get("category")
        if c in ("planet", "sign", "house", "aspect"):
            counts[c] = counts.get(c, 0) + 1
    return counts


def section_keys(grammar):
    keys = set()
    for it in grammar.get("items", []):
        keys.update((it.get("sections") or {}).keys())
    return keys


def fmt_table(rulers):
    return " · ".join(f"{s}: {rulers[s]}" for s in SIGNS if rulers.get(s))


def build():
    structure = load(STRUCTURE_SLUG) or {"items": []}
    historio = load(HISTORIO_SLUG) or {"items": []}
    meta = load(META_SLUG) or {"items": []}
    bailey = load(BAILEY_SLUG)
    with open(os.path.join(ROOT, "voices.json"), encoding="utf-8") as f:
        voices = json.load(f)

    view_ids = {it["id"]: it for it in historio.get("items", [])}
    voice_ids = {v["id"]: v for v in voices.get("voices", [])}
    meta_sections = section_keys(meta)

    # Rulership tables, read from the data.
    traditional = {sign_of(it): it["metadata"]["ruler"] for it in structure["items"]
                   if it.get("category") == "sign" and (it.get("metadata") or {}).get("ruler")}
    modern = dict(traditional)
    for it in structure["items"]:
        md = it.get("metadata") or {}
        if it.get("category") == "sign" and md.get("ruler_modern"):
            modern[sign_of(it)] = md["ruler_modern"]
    colour = dict(modern, **COLOUR_OVERRIDES)
    b_orth, b_eso, b_hier = {}, {}, {}
    if bailey:
        for it in bailey["items"]:
            md = it.get("metadata") or {}
            if it.get("category") == "sign" and md.get("ruler_esoteric"):
                b_orth[md["sign"]] = md["ruler_orthodox"]
                b_eso[md["sign"]] = md["ruler_esoteric"]
                b_hier[md["sign"]] = md["ruler_hierarchical"]
    else:
        warn(f"grammars/{BAILEY_SLUG} missing: the Bailey rulership set will be empty")

    RULERSHIP_SETS = [
        dict(id="rulers-traditional", label="Traditional (the seven visible planets)",
             rulers=traditional,
             source=("the-structure-of-the-sky metadata.ruler, checked against "
                     "dignities-rulerships: the scheme Ptolemy (Tetrabiblos, c. 150 CE) and "
                     "Lilly (1647) share; the Bṛhat Jātaka's sign lords are the same"),
             what=("One ruler per sign, from the seven planets visible to the eye. The Sun and "
                   "Moon rule one sign each; the other five rule two.")),
        dict(id="rulers-modern", label="Modern (outer planets added)",
             rulers=modern,
             source=("the-structure-of-the-sky metadata.ruler_modern (and dignities-rulerships "
                     "modern_co_ruler): Pluto for Scorpio, Uranus for Aquarius, Neptune for "
                     "Pisces, with the traditional ruler often kept as co-ruler"),
             what=("The traditional table with the three outer planets given to Scorpio, "
                   "Aquarius and Pisces, as much twentieth-century Western astrology does.")),
        dict(id="rulers-bailey-esoteric", label="Bailey school: orthodox / esoteric / hierarchical",
             rulers=b_eso, rulers_orthodox=b_orth, rulers_hierarchical=b_hier,
             source=("Alice A. Bailey, Esoteric Astrology (1951), Tabulation VI, print p. 68, as "
                     f"given with attribution in grammars/{BAILEY_SLUG}"),
             what=("Three rulers per sign. The orthodox column matches the traditional table "
                   "except that Aquarius has Uranus; the esoteric and hierarchical columns bring "
                   "in Vulcan (hypothetical, never observed), the Earth, and Pluto for Pisces.")),
        dict(id="rulers-colour-system", label="Colour-horoscope set (Vesta for Taurus, Chiron for Virgo)",
             rulers=colour, attested=sorted(COLOUR_OVERRIDES),
             source=("used in Astrodienst's (astro.com) colour-horoscope reports, which rank "
                     "Chiron and Vesta with the planets and give Vesta to Taurus and Chiron to "
                     "Virgo; Chiron for Virgo is also taught by some contemporary schools. Which "
                     "school first proposed either assignment is not verified here, and only "
                     "those two assignments are attested: the other ten signs are assumed to "
                     "follow the modern set"),
             what=("The modern table with two asteroid-era changes: Vesta rules Taurus and "
                   "Chiron rules Virgo. No school in this library uses it yet; it is listed so "
                   "the question 'who rules Taurus?' can be asked across schools.")),
    ]
    set_ids = {r["id"] for r in RULERSHIP_SETS}

    items, index = [], []
    by = {k: {} for k in ("family", "zodiac", "era", "source", "rulers")}

    for n, s in enumerate(SCHOOLS):
        node_id = "school-" + s["slug"]
        inferred = dict(s.get("inferred") or {})
        basis = {}
        primary = s["grammar_slugs"][0]
        g = load(primary)
        if g is None:
            warn(f"school {s['slug']}: grammars/{primary} not on disk")
            g = {"items": []}
        for extra in s["grammar_slugs"][1:]:
            eg = load(extra)
            if eg is None:
                warn(f"school {s['slug']}: grammars/{extra} not on disk")
            elif s["section_label"] not in section_keys(eg):
                warn(f"school {s['slug']}: section '{s['section_label']}' not found in {extra}")

        # zodiac: a grammar tag wins over the hand table
        tags = [t.lower() for t in (g.get("tags") or [])]
        zodiac = s["zodiac"]
        if "sidereal" in tags or "tropical" in tags:
            zodiac = "sidereal" if "sidereal" in tags else "tropical"
            basis["zodiac"] = f"grammars/{primary} tags"
            inferred.pop("zodiac", None)
            if zodiac != s["zodiac"]:
                warn(f"school {s['slug']}: tag says {zodiac}, table says {s['zodiac']}")

        # rulers: read from the grammar's sign items where it states them
        rulership_sets = list(s["rulership_sets"])
        stated = rulers_from(g)
        if s["slug"] == "esoteric-bailey" and b_eso:
            basis["rulership_sets"] = f"grammars/{primary} sign metadata (Tabulation VI)"
            inferred.pop("rulership_sets", None)
        elif len(stated) == 12:
            if stated == traditional:
                rulership_sets = ["rulers-traditional"]
            elif stated == modern:
                rulership_sets = ["rulers-modern"]
            else:
                warn(f"school {s['slug']}: its stated rulers match no set: {stated}")
            basis["rulership_sets"] = f"grammars/{primary} sign metadata.ruler / rasi_lord"
            inferred.pop("rulership_sets", None)
        for r in rulership_sets:
            if r not in set_ids:
                warn(f"school {s['slug']}: unknown rulership set {r}")

        # view and voice: validate, and read the voice link from voices.json when it names the grammar
        view = s["view"]
        if view and view not in view_ids:
            warn(f"school {s['slug']}: view {view} not in {HISTORIO_SLUG}")
        voice = s["voice"]
        if voice:
            if voice not in voice_ids:
                warn(f"school {s['slug']}: voice {voice} not in voices.json")
            elif f"grammars/{primary}" in (voice_ids[voice].get("course") or ""):
                basis["voice"] = f"voices.json {voice}.course names grammars/{primary}"
                inferred.pop("voice", None)
        # Three grammars stamp their own view (metadata.era_view): use it as evidence.
        stamped = {(it.get("metadata") or {}).get("era_view") for it in g.get("items", [])} - {None}
        if len(stamped) == 1:
            if view in stamped:
                basis["view"] = f"grammars/{primary} metadata.era_view"
                inferred.pop("view", None)
            else:
                warn(f"school {s['slug']}: grammar stamps era_view {stamped}, table says {view}")
        elif view and s["slug"] != "esoteric-bailey" and "view" not in inferred and "view" not in basis:
            course = (voice_ids.get(voice, {}).get("course") or "").lower() if voice else ""
            view_name = (view_ids.get(view, {}).get("name") or "").lower()
            if view_name and view_name in course:
                basis["view"] = f"voices.json {voice}.course names '{view_ids[view]['name']}'"
            else:
                inferred["view"] = "chosen by hand from the historiographies views; not stamped in the grammar"

        dating = g.get("dating") or {}
        year_label = s.get("year_label") or dating.get("label")
        year = s.get("year") if s.get("year") is not None else (
            dating.get("year") if g.get("provenance") == "record" else None)
        if s.get("year") is not None:
            basis["year"] = "the book's first publication (hand table); the grammar itself is undated"

        cov = coverage(g)
        in_meta = s["section_label"] in meta_sections
        era_label = dict((e[0], e[1]) for e in ERAS)[s["era"]]
        era_sort = dict((e[0], e[2]) for e in ERAS)[s["era"]]
        fam_label = dict((f[0], f[1]) for f in FAMILIES)[s["family"]]
        st = next(t for t in SOURCE_TYPES if t[1] == s["source_type"])
        zod_label = {"tropical": "Tropical", "sidereal": "Sidereal", "none": "Zodiac not used"}[zodiac]

        md = {
            "school": s["slug"],
            "grammar_slug": primary,
            "grammar_slugs": s["grammar_slugs"],
            "family": s["family"],
            "family_label": fam_label,
            "zodiac": zodiac,
            "era": s["era"],
            "era_label": era_label,
            "era_sort": era_sort,
            "year_label": year_label,
            "source_type": s["source_type"],
            "stance": s["stance"],
            "view": view,
            "voice": voice,
            "section_label": s["section_label"],
            "section_in_astro_of_all_astros": in_meta,
            "default_on": s["default_on"],
            "rulership_sets": rulership_sets,
            "coverage": cov,
            "_basis": basis,
            "_inferred": inferred,
        }
        if year is not None:
            md["year"] = year
        if view:  # the one cross-link pattern, to the school's view dossier
            md.update(source_deck=HISTORIO_SLUG, source_item_id=view, deck=HISTORIO_LABEL)

        cov_txt = ", ".join(f"{v} {k}{'s' if v != 1 else ''}" for k, v in cov.items()) or "no planet, sign, house or aspect items"
        extra_txt = "".join(f" Also a section in grammars/{x}." for x in s["grammar_slugs"][1:])
        meta_txt = ("present" if in_meta else
                    "not yet there: proposed, for when the grammar is added to SOURCES in "
                    "scripts/build_meta_astro.py")
        rset_labels = [r["label"] for r in RULERSHIP_SETS if r["id"] in rulership_sets]
        sections = {
            "What it is": s["what"],
            "Where & when": year_label or "Undated.",
            "Zodiac": zod_label + (f" (from {basis['zodiac']})." if "zodiac" in basis
                                   else f" (inferred: {inferred.get('zodiac', 'see metadata')})."),
            "Rulers": ("; ".join(rset_labels) + "." if rset_labels
                       else "No rulership set in use here."),
            "In this library": (f"grammars/{primary}: {cov_txt}.{extra_txt} Section label "
                                f"'{s['section_label']}' in astro-of-all-astros: {meta_txt}."),
            "In the filter": ("On by default." if s["default_on"] else
                              "Off by default. Switch it on to look through it; nothing here "
                              "infers which school suits a reader."),
        }
        if s["slug"] == "esoteric-bailey":
            sections.update(BAILEY_EXTRA)

        items.append({
            "id": node_id,
            "name": s["label"],
            "category": "school",
            "level": 1,
            "sort_order": n,
            "keywords": sorted({"school", s["slug"], s["family"].replace("family-", ""),
                                zodiac, s["source_type"], s["stance"]}),
            "metadata": md,
            "sections": sections,
        })
        index.append({
            "slug": s["slug"], "label": s["label"], "node_id": node_id,
            "family": s["family"], "zodiac": zodiac, "era": s["era"], "era_sort": era_sort,
            "source_type": s["source_type"], "default_on": s["default_on"],
            "grammar_slugs": s["grammar_slugs"], "section_label": s["section_label"],
            "section_in_astro_of_all_astros": in_meta, "rulership_sets": rulership_sets,
            **({"year": year} if year is not None else {}), "year_label": year_label,
        })
        by["family"].setdefault(s["family"], []).append(node_id)
        by["zodiac"].setdefault("zodiac-" + zodiac, []).append(node_id)
        by["era"].setdefault(s["era"], []).append(node_id)
        by["source"].setdefault(st[0], []).append(node_id)
        for r in rulership_sets:
            by["rulers"].setdefault(r, []).append(node_id)

    def names(ids):
        return ", ".join(next(i["name"] for i in items if i["id"] == x) for x in ids)

    def group(gid, name, category, members, what, sort, metadata=None, allow_empty=False):
        if not members and not allow_empty:
            warn(f"group {gid} has no schools; skipped")
            return None
        items.append({
            "id": gid, "name": name, "category": category, "level": 2, "sort_order": sort,
            "composite_of": members, "relationship_type": "emergence",
            "emergence_kind": "structural",
            "keywords": [category, name.lower()],
            "metadata": metadata or {},
            "sections": {"What it is": what,
                         "Schools here": names(members) if members else
                         "None in this library yet."},
        })
        return gid

    fam_nodes = [group(fid, lab, "family", by["family"].get(fid, []), what, 100 + i)
                 for i, (fid, lab, what) in enumerate(FAMILIES)]
    zod_nodes = [group(zid, lab, "zodiac", by["zodiac"].get(zid, []), what, 200 + i)
                 for i, (zid, lab, what) in enumerate(ZODIACS)]
    era_nodes = [group(eid, lab, "era", by["era"].get(eid, []), f"Schools whose texts date from: {lab}.",
                       300 + srt, metadata={"era_sort": srt})
                 for eid, lab, srt in ERAS]
    src_nodes = [group(gid, lab, "source-type", by["source"].get(gid, []), what, 400 + i,
                       metadata={"source_type": key})
                 for i, (gid, key, lab, what) in enumerate(SOURCE_TYPES)]
    rs_nodes = []
    for i, r in enumerate(RULERSHIP_SETS):
        rmd = {"rulers": r["rulers"], "source": r["source"]}
        for k in ("rulers_orthodox", "rulers_hierarchical", "attested"):
            if k in r:
                rmd[k] = r[k]
        if r["id"] == "rulers-colour-system":
            rmd["_inferred"] = {"rulers": "only Taurus and Virgo are attested; the rest assumed modern"}
        gid = group(r["id"], r["label"], "rulership-set", by["rulers"].get(r["id"], []), r["what"],
                    500 + i, metadata=rmd, allow_empty=True)
        it = items[-1]
        if r["id"] == "rulers-bailey-esoteric":
            it["sections"]["Rulers"] = (
                "Orthodox — " + fmt_table(r["rulers_orthodox"]) + "\n\nEsoteric — " +
                fmt_table(r["rulers"]) + "\n\nHierarchical — " + fmt_table(r["rulers_hierarchical"]))
        elif r["id"] == "rulers-colour-system":
            it["sections"]["Rulers"] = ("Taurus: Vesta · Virgo: Chiron (attested). The other ten "
                                        "signs are assumed to follow the modern set.")
        else:
            it["sections"]["Rulers"] = fmt_table(r["rulers"])
        it["sections"]["Source"] = r["source"]
        rs_nodes.append(gid)

    def who_rules(sign):
        parts = [f"traditional {traditional.get(sign)}", f"modern {modern.get(sign)}"]
        if b_eso:
            parts.append(f"Bailey school {b_orth[sign]} / {b_eso[sign]} / {b_hier[sign]} "
                         "(orthodox / esoteric / hierarchical)")
        parts.append(f"colour-horoscope set {colour.get(sign)}")
        return f"Who rules {sign}? " + "; ".join(parts) + "."

    AXES = [
        ("axis-family", "By family", "pills", fam_nodes,
         "Browse the schools by family: the lineages they belong to."),
        ("axis-zodiac", "By zodiac", "pills", zod_nodes,
         "Browse the schools by the zodiac they read: tropical, sidereal, or none."),
        ("axis-era", "By era", "timeline", era_nodes,
         "Browse the schools by the age of their texts, oldest first."),
        ("axis-source-type", "By source type", "pills", src_nodes,
         "Browse the schools by what kind of text speaks for them here: a public-domain "
         "book, a compilation, or AI-written present-day writing."),
        ("axis-rulership-set", "By rulership set", "pills", rs_nodes,
         "Browse the schools by which planet they say rules each sign. The same sign can "
         "have different rulers in different schools. " + who_rules("Taurus") + " "
         + who_rules("Virgo")),
    ]
    for i, (aid, name, lens, children, what) in enumerate(AXES):
        items.append({
            "id": aid, "name": name, "category": "axis", "level": 3, "sort_order": 900 + i,
            "render_as": "pill-group", "lens": lens, "emergence_kind": "structural",
            "composite_of": [c for c in children if c],
            "sections": {"What it is": what},
        })

    # Not-a-school audit: every grammar on disk is either a school or explained.
    on_disk = sorted(d for d in os.listdir(GRAMMARS)
                     if os.path.exists(os.path.join(GRAMMARS, d, "grammar.json")))
    school_grammars = {s["grammar_slugs"][0] for s in SCHOOLS}
    for d in on_disk:
        if d not in school_grammars and d not in NOT_SCHOOLS:
            warn(f"grammars/{d} is neither a school nor listed in NOT_SCHOOLS — classify it")

    grammar = {
        "_grammar_commons": {
            "schema_version": "1.0",
            "license": "CC-BY-SA-4.0",
            "attribution": [{"name": "PlayfulProcess",
                             "note": "Generated grammar of schools; each school's content lives in its own grammar."}],
        },
        "name": "The Schools of the Sky — a grammar of astrology's schools",
        "description": (
            "A grammar of grammars: one item per astrology school in this library, grouped by "
            "family, zodiac, era, source type and rulership set, so a reader can switch schools "
            "in and out. Each school names its grammar(s) and its section label in "
            "astro-of-all-astros, the key a school filter toggles. Mirrors recursive-tarot's "
            "tree-of-tarot and its many-lenses meta.\n\n"
            "SOURCE OF TRUTH. Generated by scripts/build_meta_schools.py; do not hand-edit. "
            "What the data states (zodiac tags, sign rulers, dates, coverage, voice links) is "
            "read from the grammars and recorded in each school's metadata._basis. The rest "
            "(family, era bucket, view, stance, and some zodiacs and rulers) is curated "
            "inference, and each inference is labelled with its reason in metadata._inferred.\n\n"
            "Rulership sets: the traditional and modern tables come from "
            "the-structure-of-the-sky; the Bailey school's three columns from "
            "grammars/esoteric-bailey-paraphrase (Tabulation VI, with attribution); the "
            "colour-horoscope set (Vesta for Taurus, Chiron for Virgo) is listed with its "
            "source and is used by no school here yet.\n\n"
            "Read the sky to know yourself, not to be told your fate. Choosing a school "
            "chooses a way of looking, never a verdict."),
        "grammar_type": "astrology",
        "creator_name": "PlayfulProcess",
        "creator_link": "https://recursive.eco",
        "default_view": "tree",
        "default_preview": "tree",
        "provenance": "contemporary",
        "dating": {
            "label": ("Undated — generated index of the schools in this repo. Each school is "
                      "dated in its own grammar; the index itself is present-day and rebuilt on "
                      "every run."),
        },
        "is_published": False,
        "_generated": True,
        "_do_not_hand_edit": True,
        "_rebuild_note": ("Generated by scripts/build_meta_schools.py. Edit its SCHOOLS table "
                          "(or the source grammars) and re-run."),
        "_built_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "_built_by": "scripts/build_meta_schools.py",
        "_url_contract": ("Proposed, not yet wired: ?schools=<slug>,<slug> selects schools the "
                          "way tarot's ?decks= selects decks, and overrides a saved choice. "
                          "With no parameter, the schools with default_on true are on."),
        "_schools": index,
        "_families": [{"id": fid, "label": lab, "schools": by["family"].get(fid, [])}
                      for fid, lab, _ in FAMILIES],
        "_rulership_sets": [{"id": r["id"], "label": r["label"], "source": r["source"],
                             "schools": by["rulers"].get(r["id"], [])} for r in RULERSHIP_SETS],
        "_not_schools": NOT_SCHOOLS,
        "items": items,
    }

    out_dir = os.path.join(GRAMMARS, OUT_SLUG)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "grammar.json")
    with open(out_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(grammar, f, indent=2, ensure_ascii=False)
        f.write("\n")
    off = [s["slug"] for s in SCHOOLS if not s["default_on"]]
    print(f"schools={len(SCHOOLS)} families={len([x for x in fam_nodes if x])} "
          f"items={len(items)} default_off={off}")
    print("wrote", out_path)


# The Bailey school's long form: stated faithfully as the school's own teaching (ranking,
# authorship claim, contradictions), with its critics. Our paraphrase throughout; never the
# book's sentences (under copyright to 2046; Lucis Trust terms forbid storing its text).
BAILEY_EXTRA = {
    "How this school reads a chart (our paraphrase)": (
        "The book's own rule of thumb: the Sun sign, read through its orthodox ruler, describes "
        "what a person brings (temperament, inheritance, background); the rising sign, read "
        "through its esoteric ruler, points to where they might be heading. Laying the two side "
        "by side shows the tension of a given life. Here that becomes: this could mean X; it "
        "could also mean Y; what does it mean to you?"),
    "The record": (
        "Published in 1951 by Lucis Publishing, New York, after Alice A. Bailey's death in "
        "1949, as volume III of A Treatise on the Seven Rays, and presented as written with a "
        "teacher she called the Tibetan. That authorship claim cannot be checked; within the "
        "Theosophical Society it was disputed.\n\n"
        "The school ranks people. It ties the orthodox rulers to most people, the esoteric "
        "rulers to those it calls disciples, and the third column to what it calls the Creative "
        "Hierarchies; later writers often read that column as the rulers for initiates, which "
        "the book does not say in the passages checked. It even suggests reading the Moon one "
        "way for an average person and another for a highly developed one. This library reports "
        "the ranking as the school's teaching and never applies it to a reader.\n\n"
        "It is inconsistent by its own account: it says the tables differ and no fixed rule "
        "seems to hold; its notes on planets hidden behind the Sun and the Moon disagree from "
        "passage to passage; and Scorpio has Mars in the table but Pluto in another passage.\n\n"
        "It asks readers to hold its statements as hypotheses to test over years, and it puts "
        "universal energies ahead of personal horoscopes; applying it to one person's chart "
        "follows later practitioners more than the book.\n\n"
        "Critics of the wider Bailey corpus have called its passages on 'root races' racist and "
        "antisemitic; the Wikipedia article on Alice Bailey gathers those critiques with their "
        "sources. This library does not draw on that material.\n\n"
        "Lineage: Blavatsky's Secret Doctrine (hidden planets, with the Sun and the Moon "
        "standing in for unseen ones); Alan Leo's Esoteric Astrology (1913), an earlier and "
        "different system; and the soul-centred astrologers who carry the school on today, "
        "named here only as a tradition."),
}


if __name__ == "__main__":
    build()
