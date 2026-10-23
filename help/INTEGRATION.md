# DTR Help Guide — integration notes

Paste this to ChatGPT (or whoever edits the site) together with `guide.html`.

## What's here
- `guide.html` — the full user guide. Self-contained: CSS scoped under `#dtr-help`, one small script at the bottom (contents highlighting, search, mobile drawer, click-to-enlarge screenshots).
- `img/` — 29 WebP screenshots (~0.9 MB total) referenced as `img/<name>.webp`.

## Suggested integration into https://github.com/phytehq/DTR
1. Copy this folder into the repo as `help/` so the files are at `help/guide.html` and `help/img/*.webp`.
2. Add a HELP button to `.header-actions` in `index.html`, next to SYSTEM and INSTALL, using the same `system-button` styling:
   ```html
   <a class="system-button" id="helpButton" href="./help/guide.html" target="_blank" rel="noopener"><span>HELP</span><small>USER GUIDE</small></a>
   ```
   Alternatively open it in a modal with an `<iframe src="./help/guide.html">` styled like `.system-overlay`.
3. Optional context-sensitive help: link to a section by id, e.g. `./help/guide.html#trade-routes`, `#calculator`, `#forum`, `#shipyard`, `#inventory`.
4. Optional offline support: add `./help/guide.html` and the `./help/img/*.webp` files to the cached shell list in `sw.js`, and bump the cache version.
5. Run `node tests/static-audit.mjs` afterwards in case the audit checks the header markup.

## Section ids
start, layout, header, command-bar, system, install, overview, pob-status, uplink-panel, matrix,
pob-detail, maintenance, production, shipyard, pinned, inventory, trade-routes, ship, flight-plan,
advanced, results, docking, calculator, forum, composer, avatar, mobile, data, glossary, faq
