# WH Ventures ads: Margalla Teal

The four ads re-made for WH Ventures in the brand colours (`/brand/README.md`): deep teal, sea mist, gold, and one
rose "Book now" button. The voice-overs (since 10 Nov 2026) use Asad and Huda in English and Reva in Urdu: see **Voices** below.

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

## Set 3: five new ideas (beyond price and location)
| Folder | Ad | Angle | Animation |
|---|---|---|---|
| `4-Build-Your-Dream-Home/` | Build your dream home | Emotion: the home, not the plot | 3D: a 1 Kanal (50 × 90 ft) home built stage by stage, to scale: pegs, foundation, columns, brick walls, first floor, roof terrace, plaster, windows, lawn, gate, car, evening lights |
| `5-How-Big-Is-1-Kanal/` | How big is 1 Kanal, really? | Education | The plot draws to scale, area counts to 4,500 sq ft, a home, lawn and 2 cars fill it; then 1 Kanal, 14 Marla and 10 Marla side by side, to scale |
| `6-Five-Checks-Before-You-Buy/` | 5 checks before you buy | Trust and safety | Five checks tick off one by one; "Every file checked with you" stamp |
| `7-How-Buying-Works/` | How buying works, in 5 steps | Process | A gold path through plot → token → NDC → transfer → allotment letter |
| `8-Buying-From-Abroad/` | Living abroad? Invest at home | Overseas Pakistanis | Flight arcs from Toronto, London, Riyadh and Dubai to Islamabad; a phone with a live video site visit, documents on WhatsApp, and the transfer steps |

Each has a voiced 9:16 video (Reels, TikTok, Shorts, Status) and a 4:5 post. Sources: `../set3/home3d.html` (three.js)
and `../set3/ads3.html`; voices `../voiceover/gen_set3.py`; build `../voiceover/build3.py <ad> <page> <voice_dir> <out.mp4> [layout=…]`.

**Check before posting:**
- Ad 4: the home is an illustration (marked on screen). A real design must follow DHA / FGEHA building bylaws.
- Ad 5: 10 Marla is shown as 32 × 70 ft (FGEHA's table); the traced map labels some as 35 × 70. Check the letter.
- Ads 6 and 7 are general guidance; confirm fees and steps with FGEHA for each file.
- Ad 8: we promise video visits, document checks and help through the transfer. Do not promise anything more
  (for example that the buyer never needs to come), unless you have confirmed it with FGEHA.

### Captions (set 3)
**Build your dream home**
```
Looking for the right place to build your family home? 🏡
It starts with the plot: 1 Kanal (50 × 90 ft) in DHA Margalla Orchards, Main Park Road.
Watch a family home rise, from the first peg to the evening lights.
📞 Book a free call: 0331-5223726 · link in bio
(Illustration only. Designs must follow the building bylaws.)
#DHAMargallaOrchard #1KanalHouse #HouseDesign #IslamabadRealEstate #WHVentures
```
**How big is 1 Kanal?**
```
How big is 1 Kanal, really? 📐
1 Kanal = 50 × 90 ft = 4,500 sq ft: room for a double-storey home, a lawn and 2 cars.
14 Marla = 40 × 80 ft. 10 Marla = 32 × 70 ft.
Not sure which size fits your family? Ask us.
📞 0331-5223726 · link in bio
#PlotSizes #Kanal #Marla #DHAMargallaOrchard #IslamabadRealEstate #WHVentures
```
**5 checks before you buy**
```
Buying a plot? Check these 5 things first ✅
1. File type: FGEHA, SCBA or land sharing
2. Block & plot number on the official master plan
3. Original letter + seller's CNIC
4. Dues on the official FGEHA portal
5. Development charges: how much, and who pays
Save this post. We check every file with you: 📞 0331-5223726
#PropertyTips #DHAMargallaOrchard #IslamabadRealEstate #WHVentures
```
**How buying works**
```
Buying a plot is simpler than you think 👇
1️⃣ Choose your plot  2️⃣ Agreement & token  3️⃣ NDC from FGEHA  4️⃣ Transfer at G-10  5️⃣ Allotment letter in your name
We're with you at every step. 📞 0331-5223726 · link in bio
#HowToBuyPlot #DHAMargallaOrchard #IslamabadRealEstate #WHVentures
```
**Buying from abroad**
```
Living in Dubai, Riyadh, London or Toronto? Invest at home. 🇵🇰
✔ Live video visit to your plot  ✔ Every document checked, copies on WhatsApp  ✔ With you through the transfer
DHA Margalla Orchards, Main Park Road, Islamabad.
WhatsApp: +92 331 5223726
#OverseasPakistanis #InvestInPakistan #DHAMargallaOrchard #IslamabadRealEstate #WHVentures
```

## Voices (10 Nov 2026)
Chosen from the voice audition (`../voice-audition/`). All on ElevenLabs Eleven v4, mastered with `master_pro.py`.
- **English:** Asad Raza (Pakistani English, Lahore; male) and Huda (Pakistani English; female).
  Asad: ads 0, 2, 5, 6, 8. Huda: ads 1, 3, 4, 7. (Change `EN_VOICE` in `../voiceover/scripts.py` to swap.)
- **Urdu:** Reva (warm female Urdu narrator) on every ad: the files ending `_UR_Video-…`.
  Margalla Sunrise has Urdu on-screen text; the other Urdu videos keep the English on-screen text with the Urdu voice.
- Scripts for both languages: `../voiceover/scripts.py`; generate with `../voiceover/gen_voice.py <ad> <en|ur> <dir>`.
  Every line was checked with speech-to-text. "D.H.A. Margalla Orchards" and "G-10" are written in English letters
  inside the Urdu text, because in Urdu script the voice said "Archards", "Marghazar" and "G-3".

### Urdu captions (ready to paste)
**0 · Margalla Sunrise**
```
وہی پرائم لوکیشن، آدھی سے بھی کم قیمت 🏔️
ڈی ایچ اے مارگلہ آرچرڈز میں ایک کنال صرف ساڑھے تین کروڑ میں۔ مارگلہ انکلیو: سات کروڑ تیس لاکھ سے زیادہ۔
📞 مفت مشورے کے لیے کال کریں: 0331-5223726
```
**1 · Location**
```
رئیل اسٹیٹ میں سب سے اہم چیز: لوکیشن 📍
مین پارک روڈ، کامسیٹس یونیورسٹی کے بالکل سامنے۔ فیض آباد صرف 10 منٹ۔
📞 0331-5223726
```
**2 · Why Pay Double**
```
دگنی قیمت کیوں دیں؟
مارگلہ انکلیو: ایک کنال 7.3 کروڑ سے زیادہ۔ ڈی ایچ اے مارگلہ آرچرڈز: صرف 3.5 کروڑ۔
📞 0331-5223726
```
**3 · Five Reasons**
```
ڈی ایچ اے مارگلہ آرچرڈز میں سرمایہ کاری کی 5 وجوہات 👇
1️⃣ ڈی ایچ اے ڈیولپ کر رہا ہے 2️⃣ کامسیٹس کے سامنے 3️⃣ فیض آباد 10 منٹ 4️⃣ انکلیو کی آدھی قیمت سے کم 5️⃣ ترقیاتی کام جاری
📞 0331-5223726
```
**4 · Build Your Dream Home**
```
اپنی فیملی کا گھر بنانے کے لیے صحیح جگہ ڈھونڈ رہے ہیں؟ 🏡
سب کچھ پلاٹ سے شروع ہوتا ہے: ایک کنال (50 × 90 فٹ)، ڈی ایچ اے مارگلہ آرچرڈز۔
📞 0331-5223726
(صرف خاکہ۔ ہر ڈیزائن بلڈنگ قوانین کے مطابق ہونا چاہیے۔)
```
**5 · How Big Is 1 Kanal**
```
ایک کنال اصل میں کتنا بڑا ہوتا ہے؟ 📐
1 کنال = 50 × 90 فٹ = 4,500 مربع فٹ۔ 14 مرلہ = 40 × 80 فٹ۔ 10 مرلہ = 32 × 70 فٹ۔
📞 0331-5223726
```
**6 · 5 Checks Before You Buy**
```
پلاٹ خرید رہے ہیں؟ پہلے یہ 5 چیزیں چیک کریں ✅
فائل کی قسم · ماسٹر پلان پر پلاٹ نمبر · اصل لیٹر اور شناختی کارڈ · واجبات · ترقیاتی چارجز
ہم ہر فائل آپ کے ساتھ چیک کرتے ہیں۔ 📞 0331-5223726
```
**7 · How Buying Works**
```
پلاٹ خریدنا آپ کی سوچ سے آسان ہے 👇
1️⃣ پلاٹ کا انتخاب 2️⃣ ایگریمنٹ اور ٹوکن 3️⃣ ایف جی ای ایچ اے سے این ڈی سی 4️⃣ G-10 میں ٹرانسفر 5️⃣ آپ کے نام الاٹمنٹ لیٹر
📞 0331-5223726
```
**8 · Buying From Abroad**
```
بیرونِ ملک رہتے ہیں؟ اپنے وطن میں سرمایہ کاری کریں 🇵🇰
✔ پلاٹ کی لائیو ویڈیو کال ✔ ہر دستاویز کی جانچ، کاپیاں واٹس ایپ پر ✔ ٹرانسفر کے ہر مرحلے پر ساتھ
واٹس ایپ: +92 331 5223726
```

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
