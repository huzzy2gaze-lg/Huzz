# WH Ventures ads: Margalla Teal

The four ads re-made for WH Ventures in the brand colours (`/brand/README.md`): deep teal, sea mist, gold, and one
rose "Book now" button. The voice-overs use the owner's cloned voice ("WH Ventures Voice v2", calm settings, as
before) and end with "Call WH Ventures today: 0331-5223726".

**Sound (v2, broadcast master):** the clone was trained on a phone recording, so its raw sound is boxy (+5 dB at
100–350 Hz), dull (-13 to -21 dB at 2.5–6 kHz) and has almost nothing above 12 kHz. `voiceover/master_pro.py` fixes
this: high-pass, cuts at 140/230/430 Hz, presence at 3.2 and 5.6 kHz, a harmonic exciter and air shelf that rebuild
the highs, de-esser, two-stage compression, no room echo; the music is cut at 3 kHz so the voice sits in front.
Loudness -14 LUFS, peak -1.6 dBFS (what Instagram, TikTok and YouTube play at).

| Folder | Ad | Images | Video |
|---|---|---|---|
| `0-Margalla-Sunrise/` | Same prime location, less than half the price | English **and Urdu**: post, square, story | English, voiced |
| `1-Location-Is-Everything/` | Travel-time map | post, square, story | voiced |
| `2-Why-Pay-Double/` | Price bars, Enclave vs Orchard | post, square, story | voiced |
| `3-Five-Reasons/` | Numbered list | post, square, story | voiced |

## Where each file goes
- `Video-9x16_Reels-Shorts-Status` → Instagram Reels and Stories, Facebook Reels and Stories, TikTok, YouTube
  Shorts, WhatsApp Status (all under 60 seconds).
- `Post-4x5` → Instagram and Facebook feed (the best size for feed ads).
- `Square-1x1` → Facebook posts and ads, the Instagram grid, LinkedIn, WhatsApp chats.
- `Story-9x16` → still image for WhatsApp Status and Instagram or Facebook Stories.

For the ad tests in `/social-media/3-AD-PLAN.md`: ads 1, 2 and 3 are the three videos, and ad 4 is the Margalla
Sunrise post. For the English vs Urdu test, use the two Margalla Sunrise posts.

## Voice-over scripts
**0 · Margalla Sunrise:** "DHA Margalla Orchards. Park Road, Islamabad. Not seven point three crore... just three
point five. Save over three point eight crore on one kanal. Right opposite COMSATS, just ten minutes from Faizabad.
Call WH Ventures today: 0331-5223726. Limited plots."

**1 · Location:** "In real estate, location is everything. DHA Margalla Orchards. On Main Park Road, right opposite
COMSATS University. Faizabad, just ten minutes away. The Serena Hotel and the Secretariat, ten to fifteen. One kanal
for just three point five crore. Call WH Ventures today: 0331-5223726. Limited plots available."

**2 · Why Pay Double:** "Why pay double for a prime Islamabad address? In Margalla Enclave, one kanal costs over
seven point three crore. In DHA Margalla Orchards... just three point five. That's a saving of over three point eight
crore, on one plot. Call WH Ventures today: 0331-5223726. Limited plots available."

**3 · Five Reasons:** "Five reasons to invest in DHA Margalla Orchards. One. It's developed by DHA. Two. It's right
opposite COMSATS University. Three. Faizabad is just ten minutes away. Four. One kanal is three point five crore...
less than half the price of Margalla Enclave. And five. Development work is in full swing. Call WH Ventures today:
0331-5223726. Limited plots available."

## Captions (ready to paste)
**Margalla Sunrise**
```
Same prime location. Less than half the price. 🏔️
1 Kanal in DHA Margalla Orchards: PKR 3.5 crore. Margalla Enclave: 7.3 crore+.
Main Park Road, opposite COMSATS · Faizabad 10 min.
📞 Book a free call: 0331-5223726 · link in bio
#DHAMargallaOrchard #IslamabadRealEstate #ParkRoad #PlotsForSale #WHVentures
```
**Location Is Everything**
```
In real estate, location is everything. 📍
Main Park Road, right opposite COMSATS University. Faizabad 10 min, Serena and the Secretariat 10–15 min.
1 Kanal from PKR 3.5 crore.
📞 Book a free call: 0331-5223726 · link in bio
#DHAMargallaOrchard #IslamabadRealEstate #ParkRoad #InvestInIslamabad #WHVentures
```
**Why Pay Double?**
```
Why pay double for a prime Islamabad address?
Margalla Enclave: 7.3 crore+ for 1 Kanal. DHA Margalla Orchards: 3.5 crore. That is 3.8 crore+ less.
📞 Book a free call: 0331-5223726 · link in bio
#DHAMargallaOrchard #MargallaEnclave #IslamabadRealEstate #PlotsForSale #WHVentures
```
**Five Reasons**
```
5 reasons to invest in DHA Margalla Orchards:
1️⃣ Developed by DHA  2️⃣ Opposite COMSATS  3️⃣ Faizabad 10 min  4️⃣ Less than half the Enclave price  5️⃣ Development in full swing
📞 Book a free call: 0331-5223726 · link in bio
#DHAMargallaOrchard #IslamabadRealEstate #OverseasPakistanis #WHVentures
```
**YouTube Shorts titles:** "Location is everything | DHA Margalla Orchards, Islamabad #shorts" ·
"Why pay double? 1 Kanal for 3.5 Crore in Islamabad #shorts" · "5 reasons to invest in DHA Margalla Orchards #shorts"

## Before you post
- **Prices** (3.5 crore for 1 Kanal; 7.3 crore+ for Margalla Enclave, 3rd-ballot lump sum, 2026) must still be true
  on the day you post. If the market moves, change them in the templates and re-render (below).
- **"Limited plots"** only while it is true.
- The ads say "Developed by DHA" as a fact. They do not use the DHA logo. Keep it that way unless DHA gives written
  permission.
- Every ad needs its tracked link from `/social-media/utm-links.csv`.

## Re-make (for example, after a price or phone change)
From `ads/wh-teal/`:
```bash
node render.js final
```
Makes the Margalla Sunrise images (English and Urdu).
```bash
node render2.js static loc WH-Teal-Ads/1-Location-Is-Everything WH-1-Location-Is-Everything
```
Makes the Location images (use `dbl` / `rsn` with their folders for the other two).

Videos: generate the voice lines with `voiceover/el3.py` (Sunrise) or `voiceover/gen_set2.py <loc|dbl|rsn>`, then
`voiceover/build.py sun <voice_dir>` or `voiceover/build2.py <ad> <voice_dir> <out.mp4>`. The ElevenLabs key is added
by the session's network proxy.
Text and prices: `T` in `variants.html` (Sunrise) and the layouts in `ads2.html` (set 2). Colours: `.t-sunrise` in
`variants.html` and `:root` in `ads2.html`, both from `/brand/tokens.css`.
