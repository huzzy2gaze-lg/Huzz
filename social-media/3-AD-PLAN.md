# Ad plan: small daily budgets, A/B tests, trial reels

**Budget:** PKR 50,000–100,000 a month. Start at about **PKR 2,000 a day** (about PKR 60,000–67,000 in month 1). Keep the
rest to give more money to the ads that win.

**Goal:** people who **book a call** on the website (and WhatsApp chats). Likes and views are only a means.
The number that matters most is the **cost per booked call**, and later the **cost per token payment**.

**Main rule:** test **one thing at a time** (the video, or the language, or the audience), with the same budget for each
version, until each has spent enough to judge.

---

## Before you spend (week 0)
1. Accounts ready (`1-ACCOUNT-SETUP.md`).
2. **6–9 posts already on the profile** (days 1–7 of `4-CONTENT-CALENDAR.md`). People check the profile before they
   call. An empty profile wastes ad money.
3. **Meta Pixel on the website**, with a **"Lead" event** when someone sends the Book-a-call form (see
   `WEBSITE-HANDOFF.md`). Until it works, use the "landing page views" goal (below).
4. Every ad uses a tracked link (`utm-links.csv`). The website already saves where each booking came from, so the
   sales system shows which ad brought which client.

## Free tests first: Instagram trial reels
Instagram's **trial reels** show a reel only to people who **do not** follow you. Your followers do not see it.
After about 24 hours you see the views and the watch time. Then you can share it to everyone, or delete it.
- When you share a reel, turn on **"Trial"** (it shows for professional accounts; if you do not see it yet, Instagram
  has not given it to your account).
- **Use:** post the same video with **3 different first 3 seconds (hooks)** as 3 trial reels. For example:
  1. "1 Kanal in Islamabad for 3.5 crore?"
  2. "Why pay double for a prime Islamabad address?"
  3. Drone or map shot with the text "Main Park Road, opposite COMSATS".
- **Winner:** the trial with the highest average watch time and the most shares. Only winners get ad money.
- Do 3 trial reels a week. They cost nothing and pick the ads for you.

## Weeks 1–2: which ad works? (creative test)
**Meta (Facebook + Instagram), PKR 2,000 a day:**

| Campaign | Ad sets | Budget a day |
|---|---|---|
| `WH_META_TRAFFIC_TEST` | 4 ad sets, **one ad each**, same audience: (1) Location video, (2) Why Pay Double video, (3) Five Reasons video, (4) Margalla Sunrise picture | PKR 400 each = 1,600 |
| `WH_META_WHATSAPP_TEST` | 1 ad set, the same winner-candidate video, button "Send WhatsApp message" | PKR 400 |

- **Goal:** "Traffic" → optimise for **landing page views**. When the pixel has about 15–20 Lead events, switch to
  "Leads" with the **Lead** (booking) event.
- **Audience for the test:** Islamabad and Rawalpindi + 30 km; age 25–65+; no interests (let Meta find the people;
  the video does the choosing).
- **Placements:** Advantage+ placements (automatic). The videos are 9:16, so they fit Reels and Stories.
- **Special ad category:** when Ads Manager asks, choose **Housing** if it says the category is needed for real
  estate ads in your country. It limits targeting by age, gender and postcode, but the ad runs. Do not avoid this
  question; Meta can block the ad account.
- **Language test (after the video test):** the winning video in English vs in Urdu, PKR 500 a day each, 5 days.

**When to decide:** when each ad has spent at least **PKR 2,500** (about 6 days). Before that, the numbers are luck.

| Measure | Where to see it | Keep the ad if |
|---|---|---|
| Hook rate (3-second views ÷ impressions) | Ads Manager → columns → Video engagement | 25% or more |
| Link click-through rate (CTR, link) | Ads Manager → Performance and clicks | 1% or more |
| Cost per landing page view | Ads Manager | Among the cheapest half |
| Bookings (calls booked on the website) | **Sales system** → enquiries, filter by campaign | The most bookings per rupee wins, even if other numbers are worse |

Turn off the worst half. Move their budget to the best ones (not more than +30% a day per ad set, so Meta does not
start learning again).

## Weeks 3–4: who buys? (audience test) + retargeting
With the **winning ad**, PKR 1,500 a day in 3 ad sets of PKR 500:
- **A. Islamabad + Rawalpindi**, 30 km, 25–65+.
- **B. Overseas Pakistanis:** UAE, Saudi Arabia, Qatar, UK. Use the audience "Lived in Pakistan (formerly Expats –
  Pakistan)" if Ads Manager offers it; otherwise, people in these countries whose language is Urdu. Overseas clicks
  cost more, but these buyers often have bigger budgets.
- **C. All of Pakistan, broad** (Advantage+ audience).

**Retargeting**, from week 2, PKR 300 a day (`WH_META_RETARGET`):
- Who: website visitors (last 30 days) + people who watched 50% of a video (last 30 days) + people who interacted
  with the Page or Instagram (last 60 days).
- What: the "How to buy" and "Documents you receive" posts, client stories, and a direct "Book your free call".

## Boosting a post
- Boost **only posts that already do well without money** (more saves, shares and comments than usual).
- Boost from **Ads Manager**, not the "Boost" button, when you can: you get the test rules above and the tracked link.
  If you use the Boost button, choose "More website visits", and paste the tracked link from `utm-links.csv`.
- PKR 500 a day for 3 days, then check.

## Other platforms
- **Google Search** (from week 2, PKR 400 a day): people who search "DHA Margalla Orchard plots", "Margalla Orchard
  plot for sale", "Park Road Housing Scheme plots", "DHA Margalla Orchard price" are ready to buy. Send them to the
  website. Google may not allow "DHA" in the ad text, because it is another organisation's name; use it in the
  keywords, and write the ad as "Plots in Margalla Orchard, Main Park Road".
- **TikTok:** TikTok Ads Manager needs a large minimum daily budget per ad group (about USD 20 a day), too much for
  this plan. Use the in-app **Promote** button on the best organic TikTok, about PKR 1,000 once a week.
- **YouTube:** post every video as a **Short** (free). No YouTube ads in month 1.
- **LinkedIn:** no ads (too expensive per click). Post the same content for free; it is good for overseas
  professionals.

## Month 1 budget (PKR)

| Item | Days | A day | Total |
|---|---:|---:|---:|
| Meta creative test | 14 | 1,600 | 22,400 |
| Meta WhatsApp test | 14 | 400 | 5,600 |
| Meta audience test (winner) | 14 | 1,500 | 21,000 |
| Meta retargeting | 21 | 300 | 6,300 |
| Google Search | 21 | 400 | 8,400 |
| TikTok Promote | 3 times | – | 3,000 |
| **Planned** | | | **66,700** |
| Spare for winners (up to the monthly limit) | | | up to 33,300 |

## Names (so the reports are easy to read)
`WH_<PLATFORM>_<GOAL>_<AUDIENCE>_<AD>_<START DATE>`, for example `WH_META_LEADS_ISB_WHYDOUBLE_EN_1125`.
Use the same name in the link's `utm_campaign` and `utm_content` (see `utm-links.csv`). Meta can fill them in
automatically with `{{campaign.name}}` and `{{ad.name}}`.

## The weekly check (every Monday, 20 minutes)
Write one row in a sheet: spend · impressions · link clicks · landing page views · WhatsApp chats · **booked calls**
(from the sales system) · calls held · site visits · tokens. Divide spend by each one.
After 2 weeks you know your real numbers. Use those, not general guesses.

## Rules for the ad text (to avoid blocks and complaints)
- No promised profit ("double your money", "guaranteed return"). Meta blocks these, and the outlook is not a promise.
  Show prices and facts; say "expected" or "our view" for the future.
- Prices must be real and current ("from PKR 3.5 crore for 1 Kanal, Nov 2026"). Update them when the market moves.
- **Do not use the DHA logo** or make the ad look like it comes from DHA, unless DHA gave written permission.
  "Developed by DHA Islamabad" as a fact is fine.
- "Limited plots available" only while it is true.
- One rose "Book a call" button per ad (the brand standard in `../brand/README.md`).

## Next creative to make
The existing ads say "Sigma Developers" and use the old colours. Before ads start, re-make them as **WH Ventures in
Margalla Teal** (the images and the videos, with the voice saying "Call WH Ventures today").
