# Orchard Sales Map

Live team map: https://claude.ai/artifact/ACotWwamH6xub2WeVvVpKx

## What it is
- The map uses the official FGEHA layout plan (LOP, approved 4 Aug 2022) as its background.
- 4,761 plots are traced from the plan lines as exact shapes. Positions are not changed.
  - 23 of these are curved or corner plots (for example A-538), traced later with `tools/corners_find.py` and `tools/corners_ocr.py`. Each one is kept only if its number reads clearly, is new in its block and fits the numbers of the plots next to it.
- 4,593 plot numbers are read from the plan text. No number is guessed: a number is kept only when OCR reads it from the plan.
- 145 plots show "number not read". A team member types the number from the plan.
- Plot blocks come from the plan's block labels and plot numbering. 10 plots near borders were checked by eye against the plan.
- Block areas on the map follow the plan's purple line. The purple line is one closed loop:
  - Outside the loop: Blocks A, F and G. Block A includes the graveyard, the STP and the north-west area.
  - Inside the loop: Blocks B, C, D, E and H.
  - On each side of the loop, the area is split between the blocks at the middle of the roads. Parks and other areas go whole to one block, except where the purple line cuts them.
  - The outer edge is the plan's solid blue scheme boundary.
  - Scripts: `tools/regions_purple.py`, `tools/regions_split.py`, `tools/hull_purple.py`.
- A small gap and a light red rim (15% opacity) separate the blocks. The red outline shows only on the block under the mouse.
- 97 corner or irregular plots show "Corner or irregular plot", not a standard size.
- About 20 plots of the official 4,781 are not traced, because their lines do not form a closed area or their number does not read clearly.
- Our plots show in colour: green = available, amber = pre-booked, red = sold.
- Plot size: choose 1 Kanal, 14 Marla, 10 Marla or Corner when you add a plot. Use Edit to change it later. A size change is saved for the whole team (collection `fixes`, field `size`).
- Every plot number is drawn level and upright, whatever the angle of the plot on the plan. The plan's own printed number is erased inside each numbered plot (`tools/erase_numbers.py`); plots whose number was not read keep the plan's printing. Numbers of plots that are not ours hide when you zoom far out; our coloured plots always show theirs.
- Find a plot: choose the block, type the number, press Go. The block stays chosen and the box clears, so you can search the next plot in the same block.
- Several plots at once: in a block, press "Select several plots" (or Ctrl/Shift-tap plots). Then set price, status, size or tags for all of them, or remove them from our plots.
- Change notices: every change by anyone (plot added or removed, status, price, size, notes, clients) shows at the top of the screen for 7 seconds. Tap a notice to open that plot.
- Notes bar on each of our plots: tags (Corner, Extra land, Park facing, Main road facing, Near commercial) and a free-text note. The tags also show when you hover over the plot.

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
| A | 1,039 | 996 |
| B | 763 | 753 |
| C | 466 | 466 |
| D | 420 | 403 |
| E | 870 | 836 |
| F | 473 | 465 |
| G | 561 | 544 |
| H | 169 | 153 |
