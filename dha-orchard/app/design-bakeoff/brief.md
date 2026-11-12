# Brief: a better home page for www.whventures.com.pk

You design ONE complete home-page concept for WH Ventures. Three designers work in parallel on three different directions; the best one wins and is built into the real site. Work like an award-winning design director. You have full approval: decide, build, look at it, fix it, finish it.

## Read first (required)
- /home/user/Huzz/PRODUCT.md (users, purpose, positioning, principles) and /home/user/Huzz/DESIGN.md (the current system: you may evolve it, see "Brand" below).
- /home/user/Huzz/dha-orchard/app/web/src/content.js: ALL facts you may use (blocks, prices, timeline, steps, questions, contact, hours). Use no other facts. No invented numbers, reviews, ratings, awards, names or photos of people.
- Skills (read the SKILL.md and the references they point to that you need):
  - /home/user/Huzz/.claude/skills/impeccable/SKILL.md, then reference/new-work.md and reference/craft-floor.md (the craft floor and its bans apply).
  - /home/user/Huzz/.claude/skills/design-taste-frontend/SKILL.md
  - /home/user/Huzz/.claude/skills/ui-ux-pro-max/SKILL.md (use its data/scripts if helpful for palettes/fonts)
  - /home/user/Huzz/.claude/skills/emil-design-eng/SKILL.md (motion)
  - /home/user/Huzz/.claude/skills/cro/SKILL.md (bookings)
  - /home/user/Huzz/.claude/skills/copywriting/SKILL.md (copy must stay ASD-STE100: short sentences, simple words)

## The goal (unchanged)
A visitor (investor in Pakistan, family who builds to live, overseas Pakistani, or another dealer; mostly on a phone, often from a Facebook/Instagram ad or Zameen.com) understands the scheme, sees where a plot is on the official plan, checks the price, trusts WH Ventures, and books a call / taps WhatsApp / calls.

## Required content (order is your choice, but all must be there)
1. First screen: what we sell (DHA Margalla Orchard plots: 1 Kanal, 14 Marla, 10 Marla), the 1 Kanal asking range 3.65–4.55 crore (October 2026), "We help you choose, buy and transfer your plot", and the actions: Book a call, WhatsApp, Call (+92 331 5223726).
2. The scheme: 4,781 plots, 8,432 kanals, 8 blocks (A to H), FGEHA scheme developed by DHA Islamabad, Main Park Road opposite COMSATS, 50% development done (FGEHA, Oct 2026).
3. The official master plan, prominent, with a clear way to "find a plot / tap a block to see its plot numbers" (in the real site this opens the numbered official map; in your concept, show the entry point and the plan image; a static or lightly animated plan is fine; do NOT redraw, move or invent blocks or plots; use the plan image as it is).
4. Blocks A, B, C: their line from content.js, plot count, sizes, 1 Kanal asking range (Oct 2026), and the team outlook per block: Today, Jul 2027, Dec 2028 values = today-midpoint × 6.2/3.8 and × 7.3/3.8, with the badge "Up to +92% by Dec 2028" and the note "Outlook: our team's view, not a promise." (Block A midpoint 3.825, B 4.15, C 4.175.)
5. From plot to home: the build video (assets/home-build.mp4, poster assets/build-poster.webp), the dusk video (assets/home-dusk.mp4), and the renders (assets/*.webp: sizes 1K/14M/10M, styles white/brick/dark, day/dusk/night). Caption: rendered illustration, not a DHA or FGEHA design.
6. Progress timeline (content.js MILESTONES), dates shown as month + year in UTC (Jul 2027).
7. Next door: DHA Margalla Enclave 1 Kanal: Mar 2025 4.41 Cr, Dec 2025 5.60 Cr, Sep 2026 7.29 Cr (DHA's published prices) vs Margalla Orchard today 3.80 Cr (average asking, Oct 2026). Keep the line "The gap is the opportunity." Headline idea: "DHA's price for 1 Kanal next door rose 65% in 18 months".
8. How it works: the 5 steps (content.js STEPS).
9. Questions: the 6 FAQ items.
10. Book a call: a 4-step form (goal, budget + size, blocks, then name + phone with "Pakistan or abroad"), WhatsApp button, Google Meet video-call button, contact (phone, WhatsApp, e-mail info@whventures.com.pk, Islamabad, Pakistan, hours 9 am to 9 pm Pakistan time). In the concept the form can be a working front-end mock (no submit target).
11. Footer: WH Ventures (Private) Limited, contact, Privacy policy link, the source note ("Scheme facts: FGEHA, October 2026. Prices: asking prices in October 2026 and DHA's published Margalla Enclave prices. The outlook is our team's view, not a promise: prices can go up or down. The map is the official FGEHA layout plan.").
Phones: tap-to-call links, a thumb-reach way to Call / WhatsApp / Book at all times.

## Brand
- Name and logo: WH Ventures, emblem assets/wh-emblem.svg (gold emblem). Keep it.
- The Margalla Teal colour standard (teal #0B3A40, mist #EAF1EE, gold #D2A746, abyss #06252A, rose #B04761 for calls to act) is used in ads and social media too. Your direction may change proportions, add supporting neutrals or tints, change which is dominant, light vs dark, typography, layout and motion, but the core hues stay recognizable (do not replace teal/gold/rose with an unrelated palette). Fonts are your choice (Google Fonts only), with good fallbacks.
- Rules from DESIGN.md that stay: The One Rose Rule (rose = act / in focus), no label above headings (impeccable ban), no monospace as decoration, no fake proof.

## Deliverable
- A single self-contained page: <your folder>/index.html (inline CSS/JS; Google Fonts allowed; a CDN script from cdnjs/jsdelivr pinned to an exact version only if truly needed). Reference assets with the relative path ../assets/<file>. No build step.
- It must look excellent at 1440×900 and at 390×844 (phone), and pass: body text contrast ≥ 4.5:1, no horizontal scroll, prefers-reduced-motion respected, keyboard focus visible, fast (lazy-load videos and below-the-fold images; preload="none" for videos until near view).
- Verify by looking: serve the concepts folder with `python3 -m http.server <port> --directory <concepts folder>` (pick a port from your direction letter: a=8771, b=8772, c=8773) and use Playwright (require('playwright') works; chromium.launch()) to take screenshots: desktop 1440×900 at several scroll positions and a 390×844 phone with isMobile/hasTouch. Save them to <your folder>/shots/. Fix what you see, look once more, finish.
- Run `/home/user/Huzz/.claude/skills/impeccable/scripts/impeccable detect --json <your index.html>` once at the end and fix real findings.
- Do NOT edit anything in /home/user/Huzz (the repository). Only write inside your folder.

## Report (under 250 words)
The path, the direction name, the 3–5 key decisions (palette, type, layout, motion, the one memorable moment), how the CTA path works on a phone, what you checked, and anything unfinished.
