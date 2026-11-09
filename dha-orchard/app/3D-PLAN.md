# 3D website, phase 2: plan

Research, 9 November 2026: Lusion (lusion.co: Choo Choo World, Of The Oak, Infinite Passerella) and the Vide Infra
case studies of 7 award-winning real estate sites (ERA, AIR, Likova, Springs, Silver Pinewood, Poklonnaya 9, Ever),
plus their article on the future of real estate websites.

## The one idea

**"From plot to home."** A buyer of a plot buys a future house. The site lets the visitor see that future:
the official plan comes alive, homes rise on the real plots, and the visitor builds a home on their own plot size.

## What we take from each reference

| Reference | What they did | What we do for DHA Margalla Orchard |
| --- | --- | --- |
| ERA | Live 3D district map with motion; a line of light that leads the camera; seasonal renders | Homes rise on the real plots of each block; a gold light line traces the camera flight; dawn-to-night light |
| Likova | Dark WebGL scene, building model in the centre, 3D site plan you move through | Already done (3D master plan); add a 3D home model you can turn |
| AIR | Configurator: choose parts, see them join, with live totals | "Build your home": choose 10 Marla, 14 Marla or 1 Kanal, number of floors and style; the home builds itself on the plot, to scale |
| Poklonnaya 9 | "A day in the life", morning to night | A day-night switch: at night the windows of the homes light up |
| Vide Infra, future article | "See the unit rendered to your taste" | Style choice for the home (modern white, warm brick, contemporary dark) |
| Lusion, Of The Oak | Thousands of objects with instancing, fast | All homes of a block drawn with instancing (one draw call), so phones stay fast |
| Lusion, Choo Choo World | A small world you can play with and share | Drag to turn the home; a "Share my home" WhatsApp link |

## Rules we keep

- The plan, the blocks and the plots stay where the official FGEHA plan puts them. Homes are placed only on real plot
  shapes from the plan data, turned to the plot's own direction.
- The homes are illustrations. The site says so: "Illustration only. A real design must follow the building bylaws."
- We show no construction costs or covered areas that we cannot check. Plot sizes come from the plan: 1 Kanal
  50 × 90 ft, 14 Marla 40 × 80 ft, 10 Marla 32 × 70 ft.
- No made-up roads, cars or places: the plan data has no road lines, so we do not draw moving cars.

## Steps

1. Prototype A: homes rising on the real plots of a block (instancing), with a day-night switch. Screenshots.
2. Prototype B: "Build your home" studio: plot to scale, the home builds in stages (pegs, foundation, walls, first
   floor, roof, windows, garden, boundary wall, gate). Screenshots.
3. Send the screenshots. Then build them into the 3D page:
   - chapter per block: homes rise on its plots when the camera arrives;
   - new chapter "Build your home" after the blocks, with its own 3D scene, controls and a "Book a call about this plot size" button;
   - gold light line along the camera path; dawn at the top of the page, night at the booking form.
4. Test on laptop, tablet and phone sizes; keep phones fast (fewer homes, lower pixel ratio); reduced-motion support.
5. Publish the test page, push, and report with screenshots.

## Status, 9 November 2026

Done and live on the test page (3D tab): steps 1 to 5. Homes rise on the real plots of each block and stay; a gold
route line grows from Block A to H; the page goes from day to night with lit windows; "Build your home" (plot size,
floors, style, day or night, drag to turn, share on WhatsApp, book a call about that plot size).
