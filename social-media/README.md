# WH Ventures: social media launch kit

Everything needed to open the company's social media accounts, post, run small ads, and send visitors to the website,
in the chosen brand colours (**Margalla Teal**, see `../brand/README.md`).

## Start here, in this order
1. **`1-ACCOUNT-SETUP.md`**: create the accounts, step by step (WhatsApp Business, Facebook + Instagram through a Meta
   business account, TikTok, YouTube, Google Business Profile, LinkedIn). About 3 hours.
2. **`2-PROFILE-TEXT.md`**: names, handles, bios and About texts to copy and paste, checked against each platform's
   character limits.
3. **`brand-kit/`**: profile pictures and covers at each platform's exact size.
4. **`utm-links.csv`**: a different website link for each platform and ad, so the sales system shows where every
   booking came from.
5. **`4-CONTENT-CALENDAR.md`**: the first 30 days of posts, with caption ideas.
6. **`3-AD-PLAN.md`**: how to spend PKR 50,000–100,000 a month: free trial reels, small daily A/B tests, retargeting,
   Google Search.
7. **`WEBSITE-HANDOFF.md`**: a message to paste into the website chat, so the website uses the same colours and gets
   the Meta, TikTok and Google tracking.

## Brand kit
| File | Size | Use for |
|---|---|---|
| `brand-kit/profile.png` | 1080×1080 | Profile picture on every platform (it is safe inside a circle) |
| `brand-kit/profile-light.png` | 1080×1080 | Light version, for places with a white background |
| `brand-kit/facebook-cover.png` | 1640×624 | Facebook Page cover (the text stays in the middle, so phones show it all) |
| `brand-kit/youtube-banner.png` | 2560×1440 | YouTube banner (the text is inside the area that every device shows) |
| `brand-kit/linkedin-cover.png` | 1128×191 | LinkedIn company page cover |
| `brand-kit/google-business-cover.png` | 1200×675 | Google Business Profile cover |
| `brand-kit/instagram-highlights/*.png` | 1080×1920 | Instagram story-highlight covers: prices, blocks, location, how to buy, site updates, FAQ, site visit |

Re-make them (for example, after a phone number change): `cd brand-kit/source && node render.js`.
The text and layouts are in `brand-kit/source/kit.html`.

## Colour themes
`color-themes/` has the four options that were compared (9 Nov 2026). Option 4, **Margalla Teal**, was chosen.

## Who does what
- **You:** create the accounts (they need your phone, ID checks and payment card), post, and answer messages.
- **Claude:** graphics, videos, captions, the ad plan and the website changes.

## Still open
- The **website domain**: replace `YOUR-DOMAIN` in `utm-links.csv` and in the profiles when it works.
- The **existing ads** say "Sigma Developers" and use the old colours. They need to be re-made as WH Ventures in
  Margalla Teal before posting.
