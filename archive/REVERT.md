# Putting an archived page back

The archive (Oct 20 2026) moved 3 pages and deleted nothing. Each old address holds a short stub
that forwards to the archive with its query and `#hash` kept, so every old link still works.

| Page | Now | Old address (the stub) |
|---|---|---|
| Cards | `archive/cards.html` | `viewers/cards.html` |
| Tree | `archive/tree-viewer.html` | `viewers/tree-viewer.html` |
| All voices, the older page | `archive/lenses-legacy.html` | `lenses-legacy.html` |

## Undo all of it

Revert the pull request's merge commit (on GitHub: the PR page → **Revert**, or
`git revert -m 1 <merge sha>`). The pages come back to their old addresses, the stubs and this folder go.

## Put one page back (example: Cards)

1. Delete the stub: `git rm viewers/cards.html`
2. Move the page back: `git mv archive/cards.html viewers/cards.html`
3. Undo its path edits (the only lines the move changed). Cards and Tree: the helper scripts go back to bare names, `src="../viewers/grammar-loader.js"` → `src="grammar-loader.js"` (and the same for each `../viewers/` the move added; `git diff` of the archive commit lists them). The older all-voices page: drop the `../` added to its root files (`theme.css`, `site-header.js`, `site-footer.js`, `assistant.js`, the grammar paths and its links).
4. Point the navigation back: `site-header.js` (Views: Cards, Tree; More: the Archive line) and `view-switcher.js`.
5. Take its card off `archive/index.html`.
6. Run `python check.py`, then open the old address with a `?src=` to see it load.
