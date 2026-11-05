# Orchard Sales Map

Live team map: https://claude.ai/artifact/ACotWwamH6xub2WeVvVpKx

## What it is
- The map uses the official FGEHA layout plan (LOP, approved 4 Aug 2022) as its background.
- 4,711 plots are traced from the plan as exact shapes. 4,377 have their number read from the plan.
- 334 plots have no number yet. Team members can type the number on the map.
- Our plots show in colour: green = available, amber = pre-booked, red = sold.

## Files
- `orchard-sales-map.html` - the map page.
- `plotdata.json` - plot shapes, blocks, sizes and numbers (map coordinates).
- `plan.webp` - the layout plan image used as the map background.
- `tools/` - the scripts that traced the plots and read the numbers from the PDF.
- `../data/plots_from_layout_plan.csv` - every plot as a spreadsheet row.
- `concept-c1..c7.png` - design options shown before building.

## Plots per block (traced)
| Block | Plots | Sizes |
|---|---:|---|
| A | 1,030 | 1 Kanal, 14 Marla |
| B | 763 | 1 Kanal |
| C | 466 | 1 Kanal |
| D | 433 | 1 Kanal |
| E | 865 | mostly 10 Marla |
| F | 453 | 1 Kanal, 14 Marla |
| G | 544 | 14 Marla, 1 Kanal |
| H | 157 | 1 Kanal |

Official total: 4,781 plots. 70 plots were not traced (small irregular plots and plots under large labels).
