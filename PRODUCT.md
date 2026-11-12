# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Investors in Pakistan** (Islamabad, Rawalpindi, Lahore and other cities) who buy a plot to sell it later at a profit.
- **Families who build to live**: they want a plot to build their own home.
- **Overseas Pakistanis** (Gulf, UK, US and others) who cannot visit. They decide by phone, WhatsApp and video call.
- **Other property dealers and agents** who look for stock or a partner.

Most visitors arrive on a phone, often from a Facebook or Instagram advertisement, and from Zameen.com listings (subscription active from November 2026). Their job: understand the scheme, see where a plot is, check the price, and talk to a person they can trust.

## Product Purpose

The public website of WH Ventures (Private) Limited sells residential plots in DHA Margalla Orchard, Islamabad. It turns a visitor into a call, a WhatsApp chat or a booked video call. Success is a booked call from a serious buyer, with the visitor's blocks, size, budget and source saved for the sales team.

The same codebase holds the internal sales system ("Orchard Sales") for the admins (Mr. Nadeem, Ghulam Murtaza, Huzaifa Murtaza) and the sales agents: stock, deals, documents, calendar, leads and the investor list. It is an Operate surface, separate from the public website.

## Positioning

- **Own stock:** WH Ventures holds its own plots, not only other people's listings.
- **With you to the transfer:** the team goes with the buyer through the token (Bayana), the NDC, the transfer with biometrics and the allotment letter.
- **Honest facts only:** FGEHA and market facts with dates and sources; outlook figures are marked as the team's view, not a promise.

## Operating Context

- The scheme: an FGEHA housing scheme on Main Park Road, Chak Shahzad, Islamabad, opposite COMSATS University, developed by DHA Islamabad (agreement September 2025). 4,781 residential plots, 8,432 kanals, 8 blocks (A to H). Plot sizes: 1 Kanal, 14 Marla, 10 Marla. Block A possession target: July 2027 (FGEHA).
- The official FGEHA layout plan is the source of every plot number. Plots, blocks and plot numbers must never be moved, invented or renumbered.
- Purchase steps: call, token (Bayana), NDC, transfer at the authority with biometrics, allotment letter.
- Contact: phone and WhatsApp +92 331 5223726, info@whventures.com.pk, Islamabad, Pakistan. Office hours 9 am to 9 pm (Pakistan time). Video calls through a Google Calendar booking page (Google Meet).
- Hosting: Cloudflare Pages (branch `claude/eager-newton-3ife5o`), domain www.whventures.com.pk. Data and sign-in: Supabase. E-mail: Zoho.

## Capabilities and Constraints

- Public website: a 3D master plan (three.js) as the home page; tap a block to fly into the numbered official plan; block cards with asking prices (dated) and the team's outlook; rendered videos and pictures of a home on a plot; timeline; how buying works; questions; a 4-step booking form; static pages for Block A, B, C and a buying guide; privacy policy.
- Phones first: tap-to-call, a fixed Call / WhatsApp / Book a call bar.
- All site facts live in `dha-orchard/app/web/src/content.js`; the static pages, structured data and `llms.txt` are built from the same file.
- Copy follows ASD-STE100 (Simplified Technical English): short sentences, simple words.
- No keys or passwords in frontend code. Do not change DNS mail records or nameservers.
- **Open decisions (not yet given):** office street address, SECP number, dealer licence, agent names and photos, Meta Pixel and analytics, Google Search Console and Business Profile, phone number on the first form step, Zameen.com agency profile link.

## Brand Commitments

- Name: WH Ventures; legal name WH Ventures (Private) Limited. Logo: the WH emblem in `dha-orchard/app/web/src/brand/`.
- Colour standard "Margalla Teal" (`src/brand/tokens.css`) for the website, the sales system, ads and social media. Rose is for calls to action and for highlighting plots.
- Block order is always A to H.
- Voice: plain, factual, helpful; no hype.

## Evidence on Hand

- The official FGEHA layout plan and the traced plot geometry (`public/plan.webp`, `public/plan-site.webp`, `public/plotdata.json`).
- Dated facts: FGEHA progress (50% development, October 2026), DHA Margalla Enclave published prices (March 2025 to September 2026), market asking prices (October 2026).
- Rendered home videos and pictures made in Blender (`public/renders/`); they are illustrations, not DHA or FGEHA designs.
- **Absent, never to be fabricated:** customer reviews, testimonials, ratings, sales counts, awards, guaranteed returns.

## Product Principles

1. Facts with a date and a source, or nothing.
2. The official plan is the truth: every plot where FGEHA put it, with its real number.
3. One tap to a person: call, WhatsApp or a video call is always within reach on a phone.
4. Serve the buyer who cannot visit as well as the one who can.
5. Plain English that a second-language reader understands at once.

## Accessibility & Inclusion

- Readers with English as a second language: ASD-STE100 style. An Urdu version is planned later.
- Phones on slow mobile networks: the page must stay fast (Lighthouse mobile performance target 90+) and work without WebGL.
- WCAG AA contrast in light and dark mode; reduced motion respected.
