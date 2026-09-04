# -*- coding: utf-8 -*-
"""Build grammars/_collection.json for The Recursive Astrology — the collection-index
file the ported viewers (cards.html, explorer.html, lenses.html, tree-viewer.html,
timeline.html) read to discover every grammar in this repo, in the SAME schema
recursive-tarot/tarot/_collection.json uses (only the root path differs: grammars/
here vs tarot/ there). Port of recursive-tarot/scripts/build_tarot_collection.py +
refresh_collection.py, collapsed into one script since this repo has no separate
"migrate from source repo" step — the grammars already live in grammars/*/grammar.json.

The grammar files are the source of truth for name/type/items/cover_image_url/blurb
AND, since the Jul 2026 dating audit, for provenance/year/year_label too — each
grammar.json carries its own `provenance` + `dating` block (see GRAMMAR_FORMAT.md
"Dating & provenance"). This script only ADDS branch grouping, the one piece of
curation that lives nowhere else. Unlisted / future grammars still get included
automatically (glob-driven, no hardcoded slug list to fall out of date) — they just
land in the "synthesis" branch.

There is deliberately NO hardcoded YEARS table here any more. The old one was keyed on
two slugs that never existed on disk, so Jyotiṣa and Lilly silently lost their dates and
dropped off the timeline; and it stamped Proctor 1896 (a posthumous reprint) as if it
were the work's date. Dates belong next to the sources they describe.

RULE: every key in BRANCH_OF below must be a directory that exists under grammars/. Dead
slugs are not kept around as comments — a slug named here that is not on disk is a bug,
and the builder prints a WARN for any such key on every run.

Run from the repo root:  python3 scripts/build_collection.py
"""
import json
import os
import glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GRAMMARS_DIR = os.path.join(ROOT, "grammars")
OUT = os.path.join(GRAMMARS_DIR, "_collection.json")
# The repo-root index channels.html reads. Its own _note has always claimed this script
# generates it; until the Jul 2026 audit that was untrue and the file had drifted (14 of
# 21 grammars, one of them a duplicate, stale item counts). Now it really is generated.
OUT_ROOT = os.path.join(ROOT, "_collection.json")

REPO = "PlayfulProcess/Recursive-astrology"
BRANCH = "main"

BRANCHES = [
    ("primary-sources", "Primary Sources — the voices themselves, in translation"),
    ("synthesis",        "Synthesis — surveys, flagship interpretations, and readings"),
    ("castings",         "Castings — spread-grammars (positions, not interpretations)"),
    ("readings",         "Readings — thematic essays, not interpretation sets"),
]

# slug -> branch id. Curated by hand (mirrors tarot's DECKS dict) but NOT load-bearing:
# any grammar not listed here still appears in the collection, just in "synthesis"
# with no curated year — an honest "undated" default, never a guess.
BRANCH_OF = {
    "tetrabiblos-ashmand":            "primary-sources",
    "alan-leo":                       "primary-sources",
    "proctor-skeptical-astrology":    "primary-sources",
    "jyotisa-brhat-jataka":           "primary-sources",
    "mesopotamian-omens":             "primary-sources",
    "william-lilly-christian-astrology": "primary-sources",
    "historiographies-of-astrology":  "synthesis",
    "western-astrology-canonical":    "synthesis",
    "planetary-myths":                "synthesis",
    "trika-lens":                     "synthesis",
    "casting-big-three":              "castings",
    "casting-single-aspect":          "castings",
    "casting-twelve-houses":          "castings",
    "the-right-size":                 "readings",
    "three-doors":                    "readings",
    "astro-of-all-astros":            "synthesis",  # generated meta-voice — see scripts/build_meta_astro.py
    "archetypal-pairs":                "synthesis",  # hand-authored, after Tarnas — see docs/DESIGN-archetypal.md
    "aspects-commented":               "synthesis",  # multi-voice compilation (Ptolemy + Lilly + Canonical), not a single primary source
    "dignities-rulerships":            "synthesis",  # lens compilation of the traditional dignities table
    "dwarf-planets":                   "synthesis",  # contemporary synthesis on the IAU 2006 reclassification — an interpretation set, not a single source
}

VALID_PROVENANCE = {"record", "contemporary", "casting"}


def blurb_of(g):
    desc = (g.get("description") or "").strip().split("\n")[0]
    return (desc[:200] + "…") if len(desc) > 200 else desc


def main():
    paths = sorted(glob.glob(os.path.join(GRAMMARS_DIR, "*", "grammar.json")))
    grammars_index = []
    root_index = []
    duplicates = []
    warnings = []

    # Guard against dead keys: BRANCH_OF is hand-curated, so a slug that has been renamed
    # or deleted can linger here and silently "curate" nothing. Fail loud instead.
    on_disk = {os.path.basename(os.path.dirname(p)) for p in paths}
    for slug in sorted(set(BRANCH_OF) - on_disk):
        warnings.append(f"BRANCH_OF has key {slug!r} with no grammars/{slug}/grammar.json "
                        f"on disk — dead slug, remove it")

    for path in paths:
        slug = os.path.basename(os.path.dirname(path))
        try:
            g = json.load(open(path, encoding="utf-8"))
        except Exception as e:
            print(f"  SKIP {slug}: {e}")
            continue

        # Exact-duplicate grammar directories are listed separately so they cannot
        # double-plot on the timeline or double-count in a lens. See the "duplicates"
        # key in the output and the note there.
        if g.get("_duplicate_of"):
            duplicates.append({
                "slug": slug,
                "duplicate_of": g["_duplicate_of"],
                "path": f"grammars/{slug}/grammar.json",
                "note": "Byte-level duplicate of the grammar it points at (same name, same "
                        "description, same item ids, same section text). Kept on disk but held "
                        "out of `grammars` so it cannot appear twice in any view.",
            })
            continue

        branch = BRANCH_OF.get(slug, "synthesis")
        provenance = g.get("provenance")
        dating = g.get("dating") or {}
        if provenance not in VALID_PROVENANCE:
            warnings.append(
                f"{slug}: provenance {provenance!r} is not one of {sorted(VALID_PROVENANCE)} "
                f"— see GRAMMAR_FORMAT.md 'Dating & provenance'")
        if not dating.get("label"):
            warnings.append(f"{slug}: dating.label is missing")
        year = dating.get("year")
        if provenance == "record" and year is None:
            warnings.append(f"{slug}: provenance 'record' but no dating.year")
        if provenance != "record" and year is not None:
            warnings.append(f"{slug}: dating.year set on a non-record grammar — dropping it "
                            f"rather than plotting an undated grammar on the timeline")
            year = None

        categories = {}
        for it in g.get("items", []):
            c = it.get("category")
            if c:
                categories[c] = categories.get(c, 0) + 1

        entry = {
            "slug": slug,
            "name": g.get("name"),
            "type": g.get("grammar_type"),
            "branch": branch,
            "is_meta": False,
            "default_preview": g.get("default_preview"),
            "items": len(g.get("items", [])),
            "cover_image_url": g.get("cover_image_url"),
            "blurb": blurb_of(g),
            "path": f"grammars/{slug}/grammar.json",
            "provenance": provenance,
            # ALWAYS present, for every grammar: an undated one says so in words rather
            # than falling through to a sentinel year in a viewer.
            "year_label": dating.get("label"),
        }
        # `year` is present ONLY for provenance == "record". Absent means undated —
        # consumers must skip the grammar or bucket it as undated, NEVER substitute 9999.
        if year is not None:
            entry["year"] = year
            if dating.get("confidence"):
                entry["year_confidence"] = dating["confidence"]
        grammars_index.append(entry)

        root_entry = {
            "slug": slug,
            "name": g.get("name"),
            "description": (g.get("description") or "").split(".")[0][:200],
            "grammar_type": g.get("grammar_type"),
            "items": len(g.get("items", [])),
            "categories": categories,
            "provenance": provenance,
            "year_label": dating.get("label"),
        }
        if year is not None:
            root_entry["year"] = year
        root_index.append(root_entry)

    branch_index = [
        {"id": bid, "name": bname,
         "deck_slugs": [e["slug"] for e in grammars_index if e["branch"] == bid]}
        for bid, bname in BRANCHES
    ]

    collection = {
        "repo": REPO,
        "branch": BRANCH,
        "github_url": f"https://github.com/{REPO}",
        "collection": "astrology",
        "name": "The Recursive Astrology",
        "version": "1.0.0",
        "license": "Mixed — see each grammar's own `license` field (public-domain source texts; original synthesis CC-BY-SA-4.0)",
        "original_creator": None,
        "creator_name": "PlayfulProcess",
        "meta_grammar": "historiographies-of-astrology",
        "_dating_contract": (
            "Every entry carries `provenance` ('record' = a dated historical source | "
            "'contemporary' = a present-day synthesis/reading | 'casting' = a spread grammar) "
            "and `year_label` (a human string, always present). `year` (integer, negative = BCE) "
            "is present ONLY when provenance == 'record'. ABSENT `year` means genuinely undated: "
            "skip the grammar or bucket it as undated — never substitute a sentinel such as 9999. "
            "Source of truth is each grammar.json's own `provenance` + `dating` block; this file "
            "is derived by scripts/build_collection.py. See GRAMMAR_FORMAT.md 'Dating & provenance'."
        ),
        "branches": branch_index,
        "grammars": grammars_index,
        "duplicates": duplicates,
    }
    json.dump(collection, open(OUT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    root_collection = {
        "repo": REPO,
        "channel": "astrology",
        "_note": "Derived index for channels.html — regenerate with scripts/build_collection.py; never hand-edit.",
        "_dating_contract": collection["_dating_contract"],
        "grammars": root_index,
        "duplicates": duplicates,
    }
    json.dump(root_collection, open(OUT_ROOT, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    n_items = sum(e["items"] for e in grammars_index)
    n_dated = sum(1 for e in grammars_index if e.get("year") is not None)
    for w in warnings:
        print("  WARN", w)
    print(f"Wrote {OUT} — {len(grammars_index)} grammars ({n_items} items), "
          f"{n_dated} dated, {len(duplicates)} duplicate(s) held out, {len(branch_index)} branches")
    print(f"Wrote {OUT_ROOT} — {len(root_index)} grammars (channels.html index)")


if __name__ == "__main__":
    main()
