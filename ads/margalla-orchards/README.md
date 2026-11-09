# Margalla Orchards ads — WH Ventures

_Brand: **WH Ventures** (gold WH emblem + "WH VENTURES" in the header). A Sigma Developers version can be rendered with `?brand=sigma` (logo traced from a photo: `sigma-logo-green.svg` in ad colours, `sigma-logo-blue.svg` original). Older versions are in git history._

## ✅ FINAL: Margalla Sunrise — `WH-Margalla-Sunrise-FINAL/` (English/ and Urdu/ subfolders, plus a .zip of both)
| File | Size | Use for |
|---|---|---|
| `*_Post-4x5_*` | 1080x1350 | Instagram & Facebook feed posts |
| `*_Square-1x1_*` | 1080x1080 | Facebook posts/ads, Instagram grid, WhatsApp chats |
| `*_Story-9x16_*` | 1080x1920 | WhatsApp Status, Instagram Stories, Facebook Stories |

English (`EN`) and Urdu (`UR`). Plus the animated English video with voice-over:
`English/WH-Margalla-Sunrise_EN_Video-9x16_Reels-WhatsApp-Status_Voiceover.mp4` (9:16, ~25s) and a `-MASTERED` mix. Re-render with `NODE_PATH=$(npm root -g) node render.js final`.

---

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

## Margalla mountain versions (luxury layout)
`variants/margalla/` — the luxury layout with a layered Margalla Hills scene (pine-covered ridges)
in three green palettes: margalla-teal, margalla-pine, margalla-sunrise (gold sun). English + Urdu.
```
NODE_PATH=$(npm root -g) node render.js mountains
```
Story (9:16) versions of the chosen design: `node render.js story` (edit `STORIES` in render.js).
