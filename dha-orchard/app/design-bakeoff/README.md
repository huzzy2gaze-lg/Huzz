# Design bake-off, 12–13 November 2026

Three designers built three home-page concepts from the same brief (brief.md): A "Daylight Survey" (light, cartographic),
B "Cinematic Dusk" (dark, film-like), C "Bold Numbers" (price-led, comparison). The concept pages expect the asset
folder they were built with (`../assets/`: the renders, videos and plan from `web/public`); the screenshots show them.

Same tests for all (automatic checks for facts, tap-to-call, actions in reach, no sideways scroll; Lighthouse mobile;
the impeccable detector) and two blind judges (marketing, design) who did not know which page was which:

| | Marketing judge | Design judge | Total /120 | Lighthouse mobile |
|---|---|---|---|---|
| A Daylight Survey | 48 | 48 (1st) | **96** | 74 |
| C Bold Numbers | 50 (1st) | 43 | 93 | 94 |
| B Cinematic Dusk | 43 | 41 | 84 | 65 |
| Old site (3D home) | 32 | 36 | 68 | – |

Winner: A, built into the real site with the best ideas of B and C (src/home.js, src/home.css). The 3D plan moved to `#3d`.
Final blind check, new home vs old home: 49 vs 29 /60. Lighthouse mobile of the built site: 92–96, accessibility 100, CLS 0.
