# WH Ventures website (whventures.com.pk)

The site code is in `dha-orchard/app/web` (Vite). Cloudflare Pages deploys the branch `claude/eager-newton-3ife5o`. Data and settings come from Supabase.

## Skills in this repo (.claude/skills)

Use the right skill for each job:

| Job | Skill |
|---|---|
| Check the site before or after a big change (security, legal, launch basics) | pre-launch-review |
| SEO check: titles, meta, speed, indexing | seo-audit |
| Show up in ChatGPT, Gemini, Perplexity answers | ai-seo |
| JSON-LD structured data (RealEstateAgent, FAQ, Offer) | schema |
| Page structure, menus, internal links | site-architecture |
| More bookings and calls from the same visitors | cro |
| Make the design look professional, find design problems | impeccable, design-taste-frontend |
| Colors, fonts, layout system | ui-ux-pro-max |
| Motion and animation | emil-design-eng, animate, improve-animations, review-animations |
| Write or fix page text | copywriting, copy-editing, humanizer |

## Rules

- Write site text and reports in ASD-STE100 style: short sentences, simple words.
- No fake numbers, fake reviews or "guaranteed returns". Only facts from FGEHA, the plan and the market.
- Do not change DNS mail records (MX, SPF, DKIM, DMARC, zoho verification) or nameservers.
- Never put keys or passwords in frontend code.
- Build with `npm run build` in `dha-orchard/app/web` before each push.
- The "Book a video call" link is `SITE_DEFAULTS.meet_link` in `src/site.js`.
