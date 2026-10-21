# Elcano POB Control

A mobile-first operations dashboard for Elcano Manufacturing Complex in Freelancer Discovery. It reads live Darkstat telemetry for the Elcano POB and brings health, credits, cargo capacity, reserve signals, pinned stock, inventory quotes and recipe costing into one installable site.

## Runtime

- Static HTML, CSS and JavaScript; no build step is required.
- Live POB data comes from the Darkstat API. The dashboard matches the Elcano Manufacturing Complex entry by its name and API nickname.
- The latest verified response, previous snapshot, selected view, pins and calculator settings are stored locally in this app's Elcano-specific browser storage.
- The service worker caches the application shell. Live telemetry remains network-only.

## Elcano-specific behaviour

- Only Elcano Manufacturing Complex is tracked; its live base faction is Freelancers.
- Inventory stock warnings use Darkstat-provided limits. The dashboard does not apply DTR reserve thresholds or assume production modules for Elcano.
- Recipe calculations use the selected POB's faction ID for recipe bonuses and restricted-recipe authorization. Missing prices and stock remain unknown rather than being treated as zero.
- Pins and manual recipe prices are stored locally on the device.
- The forum composer starts without group-specific banners or crests. Sender images, banners and footers are optional and editable.
- The responsive layout, offline snapshot support, diagnostics, calculator and installable app shell are retained from the source site.

## Quality checks

Run the repository's dependency-free audit with:

```sh
node tests/static-audit.mjs
```

GitHub Actions runs syntax and runtime audits on changes to `main`.