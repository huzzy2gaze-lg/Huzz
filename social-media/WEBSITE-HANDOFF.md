# Message for the website session

The website and the sales system are built in the other Claude chat ("DHA Orchard land sharing plots dataset",
branch `claude/eager-newton-3ife5o`). Copy the text below into that chat when you are ready. It is written so that
chat can do the work without this one.

---

```
Please update the website to the new WH Ventures brand standard and add ad tracking.

1. Colours: we chose the "Margalla Teal" palette. The colour values, fonts and rules are in branch
   claude/serene-fermi-tuv8hc, folder brand/ (README.md, tokens.css, tokens.json, wh-emblem.svg).
   - Deep teal #0B3A40 is the main colour (about 61.8% of the screen), sea mist #EAF1EE second (23.6%), gold #D2A746
     accent (14.6%). Abyss #06252A for footers. Rose clay #B04761 ONLY for "Book a call" / WhatsApp buttons, with
     white text. Sage #A9C4C4 for body text on teal; slate #4A6B6E on mist; gold ink #7A5F22 for gold words on mist.
   - Keep Gloock + Albert Sans. Text sizes 13/21/34/55/89 and spacing 8/13/21/34/55/89 (golden ratio / Fibonacci).
   - Replace the forest green with teal in the public website. In the sales system, keep the plot status colours
     (available, pre-booked, sold) as they are, so the team is not confused; change only the frame colours.
   - Use wh-emblem.svg (vector) in place of the small PNG logo.
2. Tracking (I will send the IDs when the accounts exist):
   - Meta Pixel with PageView on every page and a "Lead" event when the Book-a-call form is sent successfully
     (and "Contact" when someone taps WhatsApp or Call).
   - TikTok Pixel with the same events (SubmitForm / Contact).
   - Google tag (gtag) with a "generate_lead" conversion for Google Ads.
   - Load them only after the visitor accepts the cookie notice, if we show one.
3. Footer: add links to our profiles (handle whventurespk on Instagram, Facebook, TikTok, YouTube, LinkedIn).
4. The website already saves utm_source, utm_campaign, fbclid and gclid with each booking. Please also save
   utm_medium and utm_content, because our ad links use them (see social-media/utm-links.csv on the same branch).
```
