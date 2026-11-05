# Orchard Sales Map

Live team map: https://claude.ai/artifact/ACotWwamH6xub2WeVvVpKx

## What it is
- The map uses the official FGEHA layout plan (LOP, approved 4 Aug 2022) as its background.
- 4,738 plots are traced from the plan lines as exact shapes. Positions are not changed.
- 4,593 plot numbers are read from the plan text. No number is guessed: a number is kept only when OCR reads it from the plan.
- 145 plots show "number not read". A team member types the number from the plan.
- Plot blocks come from the plan's block labels and plot numbering. 10 plots near borders were checked by eye against the plan.
- Block areas on the map follow the plan's purple line. The purple line is one closed loop:
  - Outside the loop: Blocks A, F and G. Block A includes the graveyard, the STP and the north-west area.
  - Inside the loop: Blocks B, C, D, E and H.
  - On each side of the loop, the area is split between the blocks at the middle of the roads. Parks and other areas go whole to one block, except where the purple line cuts them.
  - The outer edge is the plan's solid blue scheme boundary.
  - Scripts: `tools/regions_purple.py`, `tools/regions_split.py`, `tools/hull_purple.py`.
- A small gap and a gold rim (15% opacity) separate the blocks. The red outline shows only on the block under the mouse.
- 97 corner or irregular plots show "Corner or irregular plot", not a standard size.
- 43 plots of the official 4,781 are not traced, because their lines do not form a closed box.
- Our plots show in colour: green = available, amber = pre-booked, red = sold.

## Files
- `orchard-sales-map.html` - the map page.
- `plotdata.json` - plot shapes, blocks, sizes and numbers (map coordinates).
- `plan.webp` - the layout plan image used as the map background.
- `tools/` - the scripts that traced the plots and read the numbers from the PDF.
- `../data/plots_from_layout_plan.csv` - every plot as a spreadsheet row.
- `concept-c1..c7.png` - design options shown before building.

## Plots per block (traced / number read)
| Block | Plots | Numbers read |
|---|---:|---:|
| A | 1,037 | 994 |
| B | 763 | 753 |
| C | 466 | 466 |
| D | 420 | 403 |
| E | 869 | 835 |
| F | 465 | 457 |
| G | 550 | 533 |
| H | 168 | 152 |
