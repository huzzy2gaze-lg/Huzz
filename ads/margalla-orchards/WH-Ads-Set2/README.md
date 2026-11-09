# WH Ventures — Ad Set 2 (DHA Margalla Orchards)

Three new ads, each with 3 images + a voiced 9:16 video (your cloned voice, mastered mix).

| Ad | Style | Video |
|---|---|---|
| 1 · Location Is Everything | Light travel-time map | 29s |
| 2 · Why Pay Double? | Dark, bold, growing price bars | 27s |
| 3 · Five Reasons | Numbered countdown list | 35s |

**Where each file goes**
- `Video-9x16` → Instagram Reels & Stories, Facebook Reels & Stories, WhatsApp Status, **YouTube Shorts** (all under 60s)
- `Post-4x5` → Instagram / Facebook feed
- `Square-1x1` → Facebook posts & ads, Instagram grid, WhatsApp chats
- `Story-9x16` → WhatsApp Status, Instagram / Facebook Stories (still image)

## Voice-over scripts
**1 · Location** — "In real estate, location is everything. DHA Margalla Orchards. On Main Park Road, right opposite COMSATS University. Faizabad, just ten minutes away. The Serena Hotel and the Secretariat, ten to fifteen. One kanal for just three point five crore. Call WH Ventures today: 0331-5223726. Limited plots available."

**2 · Why Pay Double** — "Why pay double for a prime Islamabad address? In Margalla Enclave, one kanal costs over seven point three crore. In DHA Margalla Orchards… just three point five. That's a saving of over three point eight crore, on one plot. Call WH Ventures today: 0331-5223726. Limited plots available."

**3 · Five Reasons** — "Five reasons to invest in DHA Margalla Orchards. One. It's developed by DHA. Two. It's right opposite COMSATS University. Three. Faizabad is just ten minutes away. Four. One kanal is three point five crore… less than half the price of Margalla Enclave. And five. Development work is in full swing. Call WH Ventures today: 0331-5223726. Limited plots available."

## Suggested captions
**YouTube Shorts titles:** "Location is everything | DHA Margalla Orchards, Islamabad #shorts" · "Why pay double? 1 Kanal for 3.5 Crore in Islamabad #shorts" · "5 reasons to invest in DHA Margalla Orchards #shorts"

**Hashtags:** #DHAMargallaOrchards #DHAIslamabad #IslamabadRealEstate #ParkRoad #PlotsForSale #InvestInIslamabad #WHVentures #RealEstatePakistan

Rebuild: `node render2.js static <loc|dbl|rsn> <dir> <name>`; video: `python3 voiceover/build2.py <loc|dbl|rsn> <voice_dir> <out.mp4>` (voice lines from `voiceover/gen_set2.py`).
