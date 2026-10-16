# DTR POB Network

Mobile-first operational dashboard for the DTR faction's three active player-owned bases. It combines Darkstat telemetry, facility maintenance reserves, POB-specific pinned cargo, inventory quotations, recipe costing, production capacity and offline snapshot support in one installable web app.

## Runtime

- Static HTML, CSS and JavaScript; no build step is required.
- Live POB data is requested from the Darkstat API.
- The latest verified response, previous snapshot, selected view and per-POB pin lists are stored locally on the device.
- A service worker caches the application shell. Telemetry itself remains network-only.

## Behaviour

- All visible interface text is English.
- Missing quantities remain unknown (`—`) and are never treated as zero.
- Stock bars and alerts use API-provided minimum and maximum limits. When limits are absent, no bar or inferred stock warning is shown.
- Facility supplies fall back to DTR maintenance thresholds only when the API provides no valid limits.
- App updates wait for explicit approval through **UPDATE NOW** before reloading.
- The desktop tab strip and the larger fixed mobile navigation operate on the same view state.
- On phones, decorative header layers collapse so live POB content begins substantially higher on the first screen.
- POB health and last-sync telemetry live in the detail header, leaving only credits and storage as compact summary cards.
- Every POB has its own pinned-cargo list. Existing global watchlist entries are migrated to all three active POBs once, then remain independently editable per base.
- All three active POBs include an advanced Scrap Smelter production module for Basic Alloy. Fort Torrelavega also produces Wildcat Gold. Every module uses that POB's live material stock to calculate production capacity and the next-cycle bottleneck, and opens the calculator with that POB and material selection. The Gold module applies the Corsair 0.85× material factor; Scrap Smelting uses its standard recipe quantities.
- Equal API minimum and maximum stock limits are shown once as a required stock value.
- On wide desktop screens, the command filter aligns with the dashboard shell and overview figures use larger display type.
- Currency values use Discovery's `$` notation throughout the dashboard and calculator.
- The recipe calculator contains 292 recipes generated from Discovery's public `base_recipe_items.cfg` and `base_recipe_modules.cfg` data.
- Calculator material prices start with the selected DTR POB's Darkstat `price_to_sell_to_base` (**BASE BUYS**) quotation and remain editable per commodity. Manual prices are saved locally per POB, can be reset to the live value and can complete a quote for an unlisted commodity without hiding its stock/listing status.
- Unlisted commodities and missing POB purchase prices remain unknown (`—`) until a manual price is entered; they are never treated as zero.
- Recipe search includes actual outputs as well as recipe titles, so affiliation products such as Wildcat Gold expose their basic, advanced and bulk recipes alongside the separate reprocessing recipe.
- Alternative recipe inputs use a clearly labelled material chooser, automatically prefer the best-priced available option at the selected POB and can be returned to automatic mode after a manual selection.
- The quote summary shows pricing completeness as plain status text and only displays a recipe-fee card when the selected recipe actually charges one.
- Explicitly reported stock shortages are shown separately from pricing completeness. Catalysts are listed as retained requirements and are not added to consumed-material cost.

## Forum transmissions

The **FORUM** workspace is a neutral Corsair transmission composer based on the supplied Montserrat / crimson / gold BBCode format. Sender ID, role, location, recipient, encryption, optional opening/sign-off and top/footer artwork URLs are editable. The optional internal draft subject is retained for organising saved drafts but is never rendered in the preview or exported BBCode header. The shared Corsair top banner and footer are editable. The right-side DTR red-serpent crest (`https://i.imgur.com/QFFOGWY.png`) is **always included and cannot be replaced**, including when restoring older saved drafts. The left-side character portrait remains optional and is stored with each sender profile; no portrait is included by default. A one-time migration clears the previously inherited Aurelio GIF from legacy local work without deleting the rest of an existing draft.

WRITE, PREVIEW and BB CODE panes follow RHW's composer workflow. The module supports live preview, one-click copy, BBCode formatting shortcuts, spoilers and image links, browser-local autosave, named draft saves and reusable sender identities. None of that content is posted to the forum or uploaded to GitHub. The user pastes the generated BBCode into their forum post manually.

Forja del Vacio was retired and is no longer shown as a POB tab, overview card, matrix column, production node or active alert. Old raw Darkstat snapshots and local settings may remain in the browser for recovery but are not part of active counts.

## Recipe catalog

Rebuild the generated browser catalog from downloaded Discovery CFG files with:

```sh
node scripts/build-recipe-catalog.mjs /path/to/base_recipe_items.cfg /path/to/base_recipe_modules.cfg recipe-catalog.js
```

## Quality checks

Run the repository's dependency-free audit with:

```sh
node tests/static-audit.mjs
```

GitHub Actions checks JavaScript syntax and runs static, calculator, production and forum-composer runtime audits on changes to `main`.
