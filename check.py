#!/usr/bin/env python3
"""Minimal grammar gate for a starter site — run before you commit.

Walks grammars/*/grammar.json (or pass paths as args), validates each
against the canonical shape in GRAMMAR_FORMAT.md, and fails loud on the three
mistakes that keep a grammar from loading. Zero dependencies.

    python check.py            # check every grammar under grammars/
    python check.py path.json  # check one file
"""
import json
import sys
from pathlib import Path

VALID_TYPES = {
    "tarot", "iching", "astrology", "sequence",
    "course", "prompt", "birthchart", "altar", "music", "custom",
}


def check(path: Path) -> list[str]:
    errs = []
    try:
        g = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return [f"{path}: not valid JSON — {e}"]

    for field in ("name", "description", "grammar_type"):
        if field not in g:
            errs.append(f"{path}: missing required top-level '{field}'")
    if g.get("grammar_type") not in VALID_TYPES:
        errs.append(f"{path}: grammar_type '{g.get('grammar_type')}' is not one of {sorted(VALID_TYPES)}")
    if "emergences" in g:
        errs.append(f"{path}: has a top-level 'emergences' array — move those items into items[] with composite_of")
    items = g.get("items")
    if not isinstance(items, list) or not items:
        errs.append(f"{path}: 'items' must be a non-empty array")
        return errs

    ids = {it.get("id") for it in items}
    for it in items:
        for field in ("id", "name", "sections"):
            if field not in it:
                errs.append(f"{path}: item {it.get('id') or it.get('name') or '?'} missing '{field}'")
        for child in it.get("composite_of", []):
            if child not in ids:
                errs.append(f"{path}: composite_of references missing id '{child}'")
        meta = it.get("metadata") or {}
        if "video_id" in meta:
            errs.append(f"{path}: item {it.get('id')} uses metadata.video_id — rename to youtube_video_id")
    return errs


def main() -> int:
    args = sys.argv[1:]
    root = Path(__file__).parent
    paths = [Path(a) for a in args] if args else sorted(root.glob("grammars/*/grammar.json"))
    if not paths:
        print("No grammars found under grammars/*/grammar.json")
        return 1
    all_errs = []
    for p in paths:
        all_errs += check(p)
    if all_errs:
        print("\n".join(all_errs))
        print(f"\nFAILED: {len(all_errs)} problem(s) across {len(paths)} grammar(s)")
        return 1
    print(f"OK: all checks passed ({len(paths)} grammar{'s' if len(paths) != 1 else ''})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
