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
  sheet: "#F3F5F5"
  rule-line: "#C9D8D3"
  rule-line-strong: "#9DB5AF"
  call-rose-deep: "#9C3D55"
typography:
  home-display:
    fontFamily: "Libre Caslon Display, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(40px, 4.6vw, 70px)"
    fontWeight: 400
    lineHeight: 0.98
    letterSpacing: "-0.005em"
  home-price:
    fontFamily: "Libre Caslon Display, Georgia, serif"
    fontSize: "clamp(50px, 5.6vw, 86px)"
    fontWeight: 400
    lineHeight: 1
  home-text:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
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
  home-button-whatsapp:
    backgroundColor: "{colors.margalla-teal}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
  home-sheet:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.margalla-teal}"
    rounded: "0px"
    padding: "18px"
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

Two worlds share one colour standard.

**The home page is "Daylight Survey" (light).** The official FGEHA layout plan is shown as a survey sheet on mist: a pale sheet, a thin gold frame line, teal ink, ruled lines, a title block with the scheme facts. It is calm and exact, like a drawing that a buyer can trust. A buyer sees the plan, the price and the way to call on the first screen. The home page stays light also when the phone is in dark mode (its colours are explicit): it is a drawing sheet in daylight.

**The 3D page (#3d) stays dark ("dusk").** The plan in 3D, deep teal sky, dark teal cards over the plan, gold accents. The numbered plot map (#plan) is the light official plan, the same on both.

Gold is the warm line of the brand (logo, frame lines, the outlook bars, highlighted words). Rose is the one colour that asks the visitor to act: the call buttons and the block in focus.

**The colour standard lives in code.** `dha-orchard/app/web/src/brand/tokens.css` is the source of the Margalla Teal values (`--wh-*`), including the sheet and rule colours of the home page (`--wh-sheet`, `--wh-line`, `--wh-line-strong`, `--wh-rose-deep`). The home page styles are in `src/home.css`, all scoped under `.dsv`. Never type a new hex code by hand.

## Colors

### Primary
- **Margalla Teal** (#0B3A40): the ink of the home page (headings, figures, lines), the booking band, the WhatsApp button; the dominant surface of the 3D page.
- **Abyss Teal** (#06252A) and **Night Teal** (#061414): body text on the light page; the footer; the deep ground of the 3D page.

### Secondary
- **Mist** (#EAF1EE): the ground of the home page and of forms.
- **Sheet** (#F3F5F5): the survey sheet, the title block and the chart panels.
- **Rule lines** (#C9D8D3, #9DB5AF): ruled lines and borders on the sheet.
- **Slate** (#4A6B6E): secondary text on mist (5:1). **Sage** (#A9C4C4) and teal-100: text on teal.

### Tertiary
- **Orchard Gold** (#D2A746), **Gold Light** (#E3C98D) and **Gold Ink** (#7A5F22): the sheet frame line, the survey line, the outlook bars, the "Today" marker, the logo. Gold Ink is for gold text on mist (headline words, step numbers) and the focus ring.
- **Call Rose** (#B04761, hover #9C3D55 on light, #C4526F on dark): calls to action and the block or plot in focus. Nothing else.

### Named Rules
**The One Rose Rule.** Rose means "act here" or "this is the one". It is on the call buttons (Book a call, the phone bar) and on the block in focus (the pressed block button and pin, the block in focus in 3D). It is never a decoration, a background band or a text colour for reading. WhatsApp is teal, filled; moving on the plan ("See the plot numbers of Block B") is teal.

**The Honest Sheet Rule** (replaces the Quiet Plan Rule). The plan is shown as FGEHA issued it: never recoloured, redrawn or washed. Marks on it (block letters, the block in focus) sit on top as small pins at the printed block labels. In 3D the same holds: a mist outline on each block and rose only on the block the visitor looks at.

**The Final Figure Rule.** Prices and outlook figures show their final values from the first paint. No count-up from zero; bars are drawn at their final length.

## Typography

**Home page:** Libre Caslon Display (headings, prices, figures) with Schibsted Grotesk (everything else). Both load after the first picture (one Google Fonts link in `src/main.js`), with Georgia and system fallbacks.
**3D page and sales system:** Gloock (display) with Albert Sans; JetBrains Mono only for data in the sales system.

### Hierarchy (home)
- **Display** (Caslon, 40 to 70px, line height 0.98): the first-screen heading. "DHA Margalla Orchard" in Gold Ink.
- **Price** (Caslon, 50 to 86px): the 1 Kanal asking range on the first screen.
- **Headline** (Caslon, 32 to 58px): one per section, balanced lines.
- **Title** (Schibsted 600, 15 to 19px): small headings, buttons, block names.
- **Body** (Schibsted 400, 16px, line height 1.55, at most about 60 characters a line).
- **Label** (Schibsted 500 to 600, 13 to 14px, slate): field names and sources ("1 Kanal asking price, October 2026"). Sentence case, never uppercase tracking.

### Named Rules
**The No Kicker Rule.** No small label above a heading. The heading says enough. A label may sit beside a big block letter or above a figure when it names the figure.

**The Plain English Rule.** Copy follows ASD-STE100: short sentences, simple words, active voice. Buttons name the action ("Book a call", "See the plot numbers of Block B").

**No tabular figures in Schibsted text.** Its tabular setting widens the comma and the point ("1 , 128"). Use tabular lining figures only in the Caslon figures.

## Layout

- Home: one page, sections in this order: first screen (copy left, survey sheet right; block buttons A to H with plot counts under the plan), the scheme title block, Blocks A, B and C (ledger with price and outlook) and a table of D to H, next door, the dusk band ("First the plot. Then the home."), from plot to home, timeline with a "Today" marker, how you buy, questions, the booking band (teal), footer.
- Width 1328px at most, side gutter clamp(16px, 4vw, 56px); section padding clamp(50px, 6.3vw, 90px).
- The header menu is in-page: buttons scroll to the section (no hash routes). Routes: #home, #book (the same page, at the form), #plan (numbered map), #3d (3D page).
- Phones (760px and below): one column; the fixed bottom bar with Call, WhatsApp and Book a call; the first-screen buttons are hidden because the bar has them; the header keeps a rose "Book a call" button.
- Static pages (block pages, buying guide, privacy): one centred column, at most 820px, on mist.

## Elevation & Depth

The home page is flat paper: ruled lines and thin borders carry the structure. The sheet has one soft shadow (0 24px 50px -30px), the form card on the teal band one deeper soft shadow. The block note over the plan: white, a rule border, a soft shadow. On the 3D page, cards are solid dark teal with a gold hairline and one deep soft shadow; no blur over the canvas. No hard offset shadows, no glows.

## Shapes

- Pills (999px) for buttons, chips and block buttons; round pins for block letters.
- The sheet, the title block, the charts and the form card are square or nearly square (0 to 6px): drawing paper, not app cards.
- Thin borders (1 to 1.5px). No thick coloured side stripes on the public website.

## Components

### Buttons
- **Book a call** (Call Rose, white text, pill): the main action. Hover: Rose Deep.
- **WhatsApp** (Margalla Teal, filled, white text, WhatsApp mark).
- **Call** (white, teal text, rule border): the quiet third choice.
- **Line** (teal outline): "See the plot numbers of Block A".
- **Phone bar:** Call (white), WhatsApp (teal), Book a call (rose).

### The survey sheet (signature component)
The official plan in a sheet with a gold frame line, a title row and a foot with a compass mark and "Find a plot number". Pins sit at the printed block labels. A tap on a pin or a block button shows the block note (plots, sizes, line, asking price) with "See the plot numbers of Block X", which opens the real numbered map (#plan) zoomed to that block. Motion: once per visit, a gold survey line crosses the sheet, the plan is drawn behind it, then the pins land (about 1.8 s); reduced motion shows it at once. The plan image is a light 760/1200px version (`plan-hero*.webp`, high fetch priority); the full plan loads only on #plan.

### Block ledger and table
Blocks A to C: big Caslon letter, the line, plots and sizes, the 1 Kanal asking range, three outlook bars (Today, Jul 2027, Dec 2028 from `outlookFor`) with the badge "Up to +92% by Dec 2028" and "Outlook: our team's view, not a promise." beside it. Blocks D to H: a table (cards on phones).

### Inputs / Fields (booking form)
White fields, 10px corners, rule border; focus: Gold Ink border and a soft gold ring; rose caret. Chips: white with a slate border (strong contrast), selected chips fill teal.

### The Plot Map
The official FGEHA plan with every plot number. Plot numbers are dark ink (#06252A) with a thin mist outline, always. Hover never hides the numbers.

## Do's and Don'ts

### Do:
- Do use the `--wh-*` tokens for every colour; scope home styles under `.dsv`.
- Do keep rose for the call to act and the block in focus (The One Rose Rule).
- Do put a date and a source next to every price or outlook figure.
- Do test every change on a 390px phone and a laptop.
- Do keep the plan, its blocks and plot numbers exactly as FGEHA drew them, block order A to H.

### Don't:
- Don't put a label above a heading (The No Kicker Rule).
- Don't recolour or wash the plan (The Honest Sheet Rule).
- Don't count figures up from zero (The Final Figure Rule).
- Don't use a monospace face for decoration.
- Don't add blur or glass over the 3D canvas.
- Don't add reviews, ratings, awards or "guaranteed returns".
