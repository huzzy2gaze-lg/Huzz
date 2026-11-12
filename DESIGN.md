---
name: Margalla Teal Estate
description: The visual system of the WH Ventures website for plots in DHA Margalla Orchard, Islamabad.
colors:
  margalla-teal: "#0B3A40"
  abyss-teal: "#06252A"
  night-teal: "#061414"
  mist: "#EAF1EE"
  sage: "#A9C4C4"
  slate: "#4A6B6E"
  orchard-gold: "#D2A746"
  gold-light: "#E3C98D"
  gold-ink: "#7A5F22"
  call-rose: "#B04761"
  call-rose-hover: "#C4526F"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(46px, 8vw, 124px)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Gloock, Georgia, serif"
    fontSize: "clamp(34px, 4.2vw, 58px)"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Albert Sans, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "12px"
  card: "24px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "13px"
  md: "21px"
  lg: "34px"
  xl: "55px"
  xxl: "89px"
components:
  button-primary:
    backgroundColor: "{colors.call-rose}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "15px 28px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.call-rose-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "15px 28px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.mist}"
    rounded: "{rounded.pill}"
    padding: "7px 13px"
  card-on-plan:
    backgroundColor: "{colors.abyss-teal}"
    textColor: "{colors.mist}"
    rounded: "{rounded.card}"
    padding: "28px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.abyss-teal}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
---

# Design System: Margalla Teal Estate

## Overview

A calm, premium property brand at dusk. The official FGEHA master plan, drawn in 3D, is the stage: deep teal sky around it, the plan itself quiet and neutral, and dark teal cards floating over it with the facts. Gold is the warm light of the brand (logo, key words, prices). Rose is the one colour that asks the visitor to act: the call buttons and the block in focus.

The tone is trustworthy and exact rather than flashy. Every number has a date and a source, and the design gives those facts room. Motion is slow and guided (the camera flies over the plan as the visitor scrolls), never busy.

**The colour standard lives in code.** `dha-orchard/app/web/src/brand/tokens.css` is the source of the Margalla Teal values (`--wh-*`). The same standard is used for the website, the sales system, ads and social media. Never type a new hex code by hand.

## Colors

### Primary
- **Margalla Teal** (#0B3A40): the dominant colour, about 62% of any composition. Headers, bands, footers, the brand surface.
- **Abyss Teal** (#06252A) and **Night Teal** (#061414): the deep ground of the 3D page and the cards that sit on the plan; also the text colour on gold and on mist.

### Secondary
- **Mist** (#EAF1EE): light surfaces (forms, static pages) and the main text on teal.
- **Sage** (#A9C4C4) and **Slate** (#4A6B6E): secondary text, on teal and on mist.

### Tertiary
- **Orchard Gold** (#D2A746), **Gold Light** (#E3C98D) and **Gold Ink** (#7A5F22): accents only, about 15%: the logo, highlighted words in headings, prices and outlook bars, focus rings. Gold Ink is for gold text on mist, where plain gold is too light.
- **Call Rose** (#B04761, hover #C4526F): calls to action and the plot or block in focus. Nothing else.

### Named Rules
**The One Rose Rule.** Rose means "act here" or "this is the one". It is on the call buttons (Book a call, Call, WhatsApp bar) and on the block or plot in focus. It is never a decoration, a background band or a text colour for reading.

**The Quiet Plan Rule.** The 3D plan stays neutral: a mist outline on every block, a very light fill. Rose appears only on the block the visitor looks at or taps. A pink wash over the whole plan is a regression.

## Typography

Gloock (display, headings) with Albert Sans (everything else). JetBrains Mono only for data: dates in the timeline, measurements.

### Hierarchy
- **Display** (Gloock, 46 to 124px, line height 0.95): the first-screen heading only. "DHA Margalla Orchard." is in Gold Light.
- **Headline** (Gloock, 34 to 58px): the heading of each card or section, balanced lines.
- **Title** (Albert Sans 700, 16 to 19px): small headings, button text.
- **Body** (Albert Sans 400, 16px, line height 1.55, at most about 65 characters a line).
- **Label** (Albert Sans 600, 12.5px): field names and small facts ("Phone", "Plots").
- **Data** (JetBrains Mono 500, 12 to 13px): dates and figures where they line up.

### Named Rules
**The No Kicker Rule.** No small uppercase label above a heading. The heading says enough. One pill (for example "First block for possession") is allowed when it carries a fact the heading does not.

**The Plain English Rule.** Copy follows ASD-STE100: short sentences, simple words, active voice. Buttons name the action ("Book a call", "See the plots of Block B").

## Layout

- One long page that the visitor scrolls; each chapter is one card over the 3D plan. On a wide screen the card sits left and the plan on the right; on a phone the plan is at the top and the card below.
- Spacing follows the Fibonacci scale in the tokens (8, 13, 21, 34, 55, 89px).
- Phones (640px and below): a fixed bottom bar with Call, WhatsApp and Book a call; the first-screen buttons are hidden because the bar has the same actions; "Book a call" stays in the header.
- Wide screens: a soft dark shade behind the first-screen text keeps it readable over the plan.
- Static pages (block pages, buying guide, privacy): one centred column, at most 820px, on mist.

## Elevation & Depth

Depth comes from the 3D scene itself; the interface is layered, not lifted. Cards on the plan are solid dark teal (no blur over the canvas: blur caused flicker), with a fine gold border at 22% opacity and one deep, soft shadow (0 30px 80px, dark). Light surfaces (the booking form) use a single soft shadow (0 24px 60px at 10%). No hard offset shadows, no glows except the soft rose halo on the main call button.

## Shapes

- Pills (999px) for every button and chip.
- Large, gentle cards (24px corners) on the plan; forms 22px; inputs 12px; small elements 6 to 8px.
- Thin borders (1 to 1.5px). No thick coloured side stripes on the public website. The sales system may use a status stripe where it marks a state (overdue, pending).

## Components

### Buttons
- **Primary** (Call Rose, white text, pill, 15px 28px): the main action of each screen. Hover: Call Rose Hover.
- **Ghost** (transparent, white text, white border at 40%): the second action next to a primary one.
- **Bar buttons** (phones): Call (white button, teal text), WhatsApp (outlined), Book a call (rose).

### Chips (if used)
Pills with a gold border at 35% and mist text on teal (size, style and light choices in "From plot to home"); the selected chip fills.

### Cards / Containers
**Card on the plan:** solid Abyss Teal, 24px corners, 28px padding, gold hairline border. One card per chapter; never cards inside cards.

### Inputs / Fields
White field on the form card, 12px corners, 1.5px border; on focus a gold border and a soft gold ring. Labels above the field in Label style. The caret is rose.

### Navigation
The header has only the logo and one primary button (plus "Sign in" on wide screens). No menu tabs on the home page. Static pages have a short text menu in Gold Light.

### The Plot Map (signature component)
The official FGEHA plan with every plot number. A tap on a block flies the 3D camera down to it and the numbered map fades in at the same place and scale. Plot numbers are dark ink (#06252A) with a thin mist outline, always, also in dark mode. Hover never hides the numbers.

## Do's and Don'ts

### Do:
- Do use the `--wh-*` tokens from `src/brand/tokens.css` for every colour.
- Do keep rose for the call to act and the plot or block in focus (The One Rose Rule).
- Do put a date and a source next to every price or outlook figure.
- Do test every change on a 390px phone and a laptop, in light and dark mode.
- Do keep the plan, its blocks and plot numbers exactly as FGEHA drew them, block order A to H.

### Don't:
- Don't put a label above a heading (The No Kicker Rule).
- Don't wash the plan in rose or any strong colour (The Quiet Plan Rule).
- Don't use the monospace face for decoration; it is for data only.
- Don't add blur or glass over the 3D canvas.
- Don't add reviews, ratings, awards or "guaranteed returns".
