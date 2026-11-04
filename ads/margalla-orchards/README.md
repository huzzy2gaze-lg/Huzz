# Margalla Orchards ads — WH Ventures

18 feed ads (1080x1350): 3 layouts x 3 colour themes x 2 languages, in `variants/`.

| # | Layout | Themes |
|---|--------|--------|
| 01–03 | Comparison cards | teal, navy, emerald |
| 04–06 | Savings hero + bar chart | teal, navy, emerald |
| 07–09 | Luxury split (serif) | teal, navy, emerald |

Each theme follows the 60-30-10 colour rule (dominant / neutral / gold accent),
taken from the WH Ventures letterhead palettes in Canva.

## Re-render
```
NODE_PATH=$(npm root -g) node render.js
```
- **DHA logo:** save the official logo as `dha-logo.png` (transparent PNG) in this folder and re-render;
  it replaces the "Developed by DHA" text badge top-right on every ad.
- Copy and prices live in the `T` object in `variants.html`; the phone number is in `render.js`.
