#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Label `tetrabiblos-ashmand`'s unheaded sections as what they actually are.

    python scripts/label_tetrabiblos_source_sections.py [--check] [--report]

Every item in this deck carries four sections: `Interpretation`, `Light`,
`Shadow`, and `The record — Ptolemy, tr. Ashmand (1822)`. The record section
is properly headed and blockquoted. The other three carried **no attribution
line at all** — and measurement shows most of them are Ashmand's own English.

CLAUDE.md, "Sources & honesty (hard guardrails)":

    - **Flag paraphrase as paraphrase.** Where you give a famous line, quote
      verbatim only if certain of the wording; otherwise paraphrase and *say
      so*

How this happened, for the record: the `Interpretation`/`Light`/`Shadow`
bodies were imported verbatim from `recursive.eco-schemas`
(`schemas/astrology/ptolemy-tetrabiblos/ptolemy-tetrabiblos.json` — identical
strings, no record section). The `The record` sections were added later, by
the Jul 2026 PD-enrichment pass, whose own plan said "Keep the existing
intention/voice sections untouched." So nobody revisited text that was
already Ashmand; the enrichment simply put the source next to it and made the
overlap visible.

**The label is computed, never hand-assigned.** For each section the script
measures the longest run of consecutive words it shares with that item's own
record section (both lowercased, punctuation dropped, the record's header and
blockquote markers stripped) and picks a header by threshold:

    LCS >= 20 words   ->  excerpted verbatim
    8 <= LCS < 20     ->  close restatement
    LCS <  8          ->  no header (the section is the repo's own words)

20 consecutive identical words is not coincidence; 8 is a whole clause. The
measured numbers are printed by `--report`, so the classification is
auditable rather than a matter of taste. Nothing else about the sections is
touched — no rewording, no reordering, no deletion.

Scope note: the audit question was about `Interpretation` only. The same
measurement finds the same problem in `Light` and `Shadow` (e.g. `sun`'s
Light shares a 28-word run, `virgo`'s Shadow a 23-word run), so the same rule
is applied to all three rather than labelling one section and leaving its
neighbours unlabelled. Revert the LIGHT/SHADOW part if you disagree — the
rule is one constant, `SECTIONS`.

Separately, and NOT changed here because it is a content question rather than
a labelling one: `house-1`, `house-4`, `house-7` and `house-10` assert
significations (life and destiny, parents and endings, marriage, honour and
profession) that their own record headers candidly say Book One does not
make. `house-1`'s "Planets here have the most potent influence on the life
and destiny of the native" also sits close to the site creed's floor against
stating a card or a placement as fate. Worth a human read.

Idempotent: an existing header is replaced, never stacked. `--check` verifies
without writing.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRAMMAR = ROOT / "grammars" / "tetrabiblos-ashmand" / "grammar.json"
SECTIONS = ("Interpretation", "Light", "Shadow")
RECORD_PREFIX = "The record"

VERBATIM_LCS = 20
RESTATEMENT_LCS = 8

HEADER_PREFIX = "*Ptolemy, tr. J. M. Ashmand (1822) —"
HEADER_VERBATIM = (HEADER_PREFIX + " excerpted verbatim; the fuller passage "
                   'is quoted in "The record" below*')
HEADER_RESTATEMENT = (HEADER_PREFIX + " close restatement of the translated "
                      "text, not an independent reading; the passage is quoted "
                      'in "The record" below*')

HEADER_RE = re.compile(r"^\*Ptolemy, tr\. J\. M\. Ashmand \(1822\)[^\n]*\*\n\n",
                       re.S)


def tokens(text):
    text = re.sub(r"^\*[^\n]*\*\s*", "", text)      # an italic header line
    text = re.sub(r"^>\s?", "", text, flags=re.M)   # blockquote markers
    return re.findall(r"[a-z0-9']+", text.lower())


def longest_common_run(a, b):
    best, prev = 0, [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        cur = [0] * (len(b) + 1)
        ai = a[i - 1]
        for j in range(1, len(b) + 1):
            if ai == b[j - 1]:
                cur[j] = prev[j - 1] + 1
                if cur[j] > best:
                    best = cur[j]
        prev = cur
    return best


def header_for(lcs):
    if lcs >= VERBATIM_LCS:
        return HEADER_VERBATIM
    if lcs >= RESTATEMENT_LCS:
        return HEADER_RESTATEMENT
    return None


def strip_header(body):
    return HEADER_RE.sub("", body, count=1)


def measure(grammar):
    """[(item_id, section, body_without_header, lcs, header_or_None)]"""
    rows = []
    for it in grammar["items"]:
        secs = it["sections"]
        record_key = next((k for k in secs if k.startswith(RECORD_PREFIX)), None)
        if record_key is None:
            continue
        rec = tokens(secs[record_key])
        for name in SECTIONS:
            if name not in secs:
                continue
            body = strip_header(secs[name])
            lcs = longest_common_run(tokens(body), rec)
            rows.append((it["id"], name, body, lcs, header_for(lcs)))
    return rows


def apply(grammar, rows):
    by = {it["id"]: it for it in grammar["items"]}
    changed = 0
    for item_id, name, body, _lcs, header in rows:
        want = (header + "\n\n" + body) if header else body
        if by[item_id]["sections"][name] != want:
            by[item_id]["sections"][name] = want
            changed += 1
    return changed


def load():
    return json.loads(GRAMMAR.read_text(encoding="utf-8"))


def report(rows):
    print(f"{'item':14s} {'section':14s} {'words':>5s} {'LCS':>4s}  label")
    for item_id, name, body, lcs, header in rows:
        label = ("excerpt" if header == HEADER_VERBATIM else
                 "restatement" if header else "—")
        print(f"{item_id:14s} {name:14s} {len(body.split()):5d} {lcs:4d}  {label}")
    n_v = sum(1 for r in rows if r[4] == HEADER_VERBATIM)
    n_r = sum(1 for r in rows if r[4] == HEADER_RESTATEMENT)
    print(f"\n{len(rows)} sections: {n_v} excerpt, {n_r} restatement, "
          f"{len(rows) - n_v - n_r} unlabelled (the deck's own words)")


def check():
    grammar = load()
    rows = measure(grammar)
    by = {it["id"]: it for it in grammar["items"]}
    ok = True
    for item_id, name, body, lcs, header in rows:
        want = (header + "\n\n" + body) if header else body
        if by[item_id]["sections"][name] != want:
            ok = False
            print(f"FAIL {item_id}/{name}: LCS={lcs} but the section does not "
                  f"carry the header that implies")
    if ok:
        n = sum(1 for r in rows if r[4])
        print(f"OK: {len(rows)} sections measured against their own record "
              f"section; {n} carry the header their overlap requires, "
              f"{len(rows) - n} are correctly unlabelled")
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="verify only; do not write")
    ap.add_argument("--report", action="store_true",
                    help="print the measurement table and exit")
    args = ap.parse_args()

    grammar = load()
    rows = measure(grammar)

    if args.report:
        report(rows)
        return
    if args.check:
        sys.exit(0 if check() else 1)

    report(rows)

    # Nothing-lost: labelling must not touch a single word of the bodies.
    before = {(it["id"], n): strip_header(it["sections"][n])
              for it in grammar["items"] for n in SECTIONS
              if n in it["sections"]}
    changed = apply(grammar, rows)
    after = {(it["id"], n): strip_header(it["sections"][n])
             for it in grammar["items"] for n in SECTIONS
             if n in it["sections"]}
    if before != after:
        diff = [k for k in before if before[k] != after[k]]
        print(f"\nFAIL: section bodies changed under the header: {diff}")
        sys.exit(1)

    if changed:
        GRAMMAR.write_text(json.dumps(grammar, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8", newline="\n")
        print(f"\nwrote {GRAMMAR.relative_to(ROOT)} ({changed} section(s) labelled)")
    else:
        print("\nno changes (idempotent)")

    print("\n--- verifying ---")
    if not check():
        sys.exit(1)


if __name__ == "__main__":
    main()
