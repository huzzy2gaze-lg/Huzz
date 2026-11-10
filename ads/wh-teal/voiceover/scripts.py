# Voice-over scripts for all nine ads, in English and Urdu, line by line.
# Each Urdu script has the same number of lines as the English one, so the animations (timed per line) still fit.
# "D.H.A. Margalla Orchards" and "G-10" stay in Latin letters in the Urdu text: in Urdu script the voice says
# "Archards", "Marghazar" and "G-3". English says "Comsats" (spelled "Comsats", one voice says "Kamsats").

CALL_EN = "Call W.H. Ventures today: zero three three one... five two two... three seven two six."
CALL_UR = "آج ہی ڈبلیو ایچ وینچرز کو کال کریں: صفر تین تین ایک... پانچ دو دو... تین سات دو چھ۔"
LTD_EN, LTD_UR = "Limited plots available.", "محدود پلاٹ دستیاب ہیں۔"
DHA_UR = "D.H.A. Margalla Orchards"   # in Latin letters: in Urdu script the voice drifts to "Marghazar"

EN = {
 "sun": [
  "[calm, confident] D.H.A. Margalla Orchards. Park Road, Islamabad.",
  "[warm] Not seven point three crore... just three point five.",
  "[friendly] Save over three point eight crore on one kanal. Right opposite Comsats, just ten minutes from Faizabad.",
  f"[confident] {CALL_EN} Limited plots.",
 ],
 "loc": [
  "[calm, confident] In real estate, location is everything.",
  "[warm] D.H.A. Margalla Orchards. On Main Park Road, right opposite Comsats University.",
  "[friendly] Faizabad, just ten minutes away. The Serena Hotel and the Secretariat, ten to fifteen.",
  "[warm] One kanal for just three point five crore.",
  f"[confident] {CALL_EN} {LTD_EN}",
 ],
 "dbl": [
  "[calm, confident] Why pay double for a prime Islamabad address?",
  "[warm] In Margalla Enclave, one kanal costs over seven point three crore.",
  "[friendly] In D.H.A. Margalla Orchards... just three point five.",
  "[warm] That's a saving of over three point eight crore, on one plot.",
  f"[confident] {CALL_EN} {LTD_EN}",
 ],
 "rsn": [
  "[calm, confident] Five reasons to invest in D.H.A. Margalla Orchards.",
  "[warm] One. It's developed by D.H.A.",
  "[warm] Two. It's right opposite Comsats University.",
  "[warm] Three. Faizabad is just ten minutes away.",
  "[friendly] Four. One kanal is three point five crore... less than half the price of Margalla Enclave.",
  "[warm] And five. Development work is in full swing.",
  f"[confident] {CALL_EN} {LTD_EN}",
 ],
 "home": [
  "[warm, inviting] Looking for the right place to build your family home?",
  "[calm] It starts with the plot. One kanal in D.H.A. Margalla Orchards... fifty by ninety feet.",
  "[confident] First, the foundation. Then the columns... and the ground floor.",
  "[warm] A second storey for the bedrooms... and a roof terrace facing the Margalla Hills.",
  "[friendly] A lawn, a driveway, a gate... and by evening, the lights are on. Welcome home.",
  f"[confident] Your home starts with the right plot. {CALL_EN}",
 ],
 "size": [
  "[curious, friendly] How big is one kanal, really?",
  "[calm] One kanal is fifty by ninety feet. That's four thousand five hundred square feet.",
  "[warm] Room for a two-storey home, a front lawn, and parking for two cars.",
  "[calm] Fourteen marla is forty by eighty feet. Ten marla is thirty-two by seventy.",
  "[friendly] In D.H.A. Margalla Orchards, you can choose from all three sizes.",
  f"[confident] Not sure which size fits your family? {CALL_EN}",
 ],
 "checks": [
  "[serious, calm] Buying a plot? Check these five things first.",
  "[calm] One. The file type: F.G.E.H.A., S.C.B.A., or land sharing.",
  "[calm] Two. The block and plot number, on the official master plan.",
  "[calm] Three. The original letter... and the seller's I.D. card must match.",
  "[calm] Four. All dues, checked on the official F.G.E.H.A. portal.",
  "[calm] Five. Development charges: how much, and who pays.",
  f"[confident] We check every file with you. {CALL_EN}",
 ],
 "steps": [
  "[friendly] Buying a plot in D.H.A. Margalla Orchards is simpler than you think.",
  "[calm] Step one. Choose your block and plot, on the official master plan.",
  "[calm] Step two. Sign the agreement, and pay the token.",
  "[calm] Step three. The N.D.C. from F.G.E.H.A. confirms there are no dues.",
  "[calm] Step four. The transfer, at the F.G.E.H.A. office in G-ten.",
  "[warm] Step five. The allotment letter... in your name.",
  f"[confident] We're with you at every step. {CALL_EN}",
 ],
 "abroad": [
  "[warm] Living in Dubai, Riyadh, London or Toronto... and dreaming of a home in Islamabad?",
  "[calm] D.H.A. Margalla Orchards. On Main Park Road, Islamabad.",
  "[friendly] See your plot on a live video call, from wherever you are.",
  "[calm] We check every document, and send you copies on WhatsApp.",
  "[warm] And we stay with you through the transfer, step by step.",
  "[confident] Invest at home, from abroad. Call or WhatsApp W.H. Ventures: plus nine two... three three one... five two two... three seven two six.",
 ],
}

UR = {
 "sun": [
  f"{DHA_UR}۔ پارک روڈ، اسلام آباد۔",
  "سات کروڑ تیس لاکھ نہیں... صرف ساڑھے تین کروڑ۔",
  "ایک کنال پر تین کروڑ اسّی لاکھ سے زیادہ کی بچت۔ کامسیٹس کے بالکل سامنے، فیض آباد سے صرف دس منٹ۔",
  f"{CALL_UR} محدود پلاٹ۔",
 ],
 "loc": [
  "رئیل اسٹیٹ میں سب سے اہم چیز ہے... لوکیشن۔",
  f"{DHA_UR}۔ مین پارک روڈ پر، کامسیٹس یونیورسٹی کے بالکل سامنے۔",
  "فیض آباد صرف دس منٹ۔ سرینا ہوٹل اور سیکرٹریٹ، دس سے پندرہ منٹ۔",
  "ایک کنال، صرف ساڑھے تین کروڑ میں۔",
  f"{CALL_UR} {LTD_UR}",
 ],
 "dbl": [
  "اسلام آباد کے پرائم ایڈریس کے لیے دگنی قیمت کیوں دیں؟",
  "مارگلہ انکلیو میں ایک کنال سات کروڑ تیس لاکھ سے زیادہ کا ہے۔",
  f"{DHA_UR} میں... صرف ساڑھے تین کروڑ۔",
  "یعنی ایک پلاٹ پر تین کروڑ اسّی لاکھ سے زیادہ کی بچت۔",
  f"{CALL_UR} {LTD_UR}",
 ],
 "rsn": [
  f"{DHA_UR} میں سرمایہ کاری کی پانچ وجوہات۔",
  "ایک۔ اسے D.H.A. develop کر رہا ہے۔",
  "دو۔ یہ کامسیٹس یونیورسٹی کے بالکل سامنے ہے۔",
  "تین۔ فیض آباد صرف دس منٹ کے فاصلے پر ہے۔",
  "چار۔ ایک کنال صرف ساڑھے تین کروڑ میں... مارگلہ انکلیو کی آدھی قیمت سے بھی کم۔",
  "اور پانچ۔ ترقیاتی کام زور و شور سے جاری ہے۔",
  f"{CALL_UR} {LTD_UR}",
 ],
 "home": [
  "اپنی فیملی کا گھر بنانے کے لیے صحیح جگہ ڈھونڈ رہے ہیں؟",
  f"سب کچھ پلاٹ سے شروع ہوتا ہے۔ {DHA_UR} میں ایک کنال... پچاس بائی نوّے فٹ۔",
  "پہلے بنیاد۔ پھر کالم... اور گراؤنڈ فلور۔",
  "بیڈ رومز کے لیے دوسری منزل... اور مارگلہ کی پہاڑیوں کی طرف کھلتا روف ٹیرس۔",
  "لان، ڈرائیو وے، گیٹ... اور شام ہوتے ہی روشنیاں جل اٹھیں۔ خوش آمدید، اپنے گھر میں۔",
  f"آپ کا گھر صحیح پلاٹ سے شروع ہوتا ہے۔ {CALL_UR}",
 ],
 "size": [
  "ایک کنال اصل میں کتنا بڑا ہوتا ہے؟",
  "ایک کنال ہے پچاس بائی نوّے فٹ۔ یعنی چار ہزار پانچ سو مربع فٹ۔",
  "دو منزلہ گھر، سامنے لان، اور دو گاڑیوں کی پارکنگ کے لیے کافی جگہ۔",
  "چودہ مرلہ ہے چالیس بائی اسّی فٹ۔ دس مرلہ ہے بتیس بائی ستّر۔",
  f"{DHA_UR} میں آپ تینوں سائز میں سے انتخاب کر سکتے ہیں۔",
  f"نہیں معلوم کون سا سائز آپ کی فیملی کے لیے بہتر ہے؟ {CALL_UR}",
 ],
 "checks": [
  "پلاٹ خرید رہے ہیں؟ پہلے یہ پانچ چیزیں چیک کریں۔",
  "ایک۔ فائل کی قسم: ایف جی ای ایچ اے، ایس سی بی اے، یا لینڈ شیئرنگ۔",
  "دو۔ بلاک اور پلاٹ نمبر، سرکاری ماسٹر پلان پر۔",
  "تین۔ اصل لیٹر... اور بیچنے والے کا شناختی کارڈ ملنا چاہیے۔",
  "چار۔ تمام واجبات، ایف جی ای ایچ اے کے سرکاری پورٹل پر چیک کریں۔",
  "پانچ۔ ترقیاتی چارجز: کتنے ہیں، اور کون ادا کرے گا۔",
  f"ہم ہر فائل آپ کے ساتھ چیک کرتے ہیں۔ {CALL_UR}",
 ],
 "steps": [
  f"{DHA_UR} میں پلاٹ خریدنا، آپ کی سوچ سے کہیں آسان ہے۔",
  "پہلا قدم۔ سرکاری ماسٹر پلان پر اپنا بلاک اور پلاٹ چنیں۔",
  "دوسرا قدم۔ ایگریمنٹ سائن کریں، اور ٹوکن ادا کریں۔",
  "تیسرا قدم۔ ایف جی ای ایچ اے کا این ڈی سی، کہ کوئی واجبات باقی نہیں۔",
  "چوتھا قدم۔ G-10 میں ایف جی ای ایچ اے کے دفتر میں ٹرانسفر۔",
  "پانچواں قدم۔ الاٹمنٹ لیٹر... آپ کے نام۔",
  f"ہم ہر قدم پر آپ کے ساتھ ہیں۔ {CALL_UR}",
 ],
 "abroad": [
  "دبئی، ریاض، لندن یا ٹورنٹو میں رہتے ہیں... اور اسلام آباد میں گھر کا خواب دیکھتے ہیں؟",
  f"{DHA_UR}۔ مین پارک روڈ، اسلام آباد۔",
  "جہاں بھی ہوں، لائیو ویڈیو کال پر اپنا پلاٹ دیکھیں۔",
  "ہم ہر دستاویز چیک کرتے ہیں، اور کاپیاں آپ کو واٹس ایپ پر بھیجتے ہیں۔",
  "اور ٹرانسفر کے ہر مرحلے پر، ہم آپ کے ساتھ رہتے ہیں۔",
  "اپنے وطن میں سرمایہ کاری کریں، باہر رہتے ہوئے بھی۔ ڈبلیو ایچ وینچرز کو کال یا واٹس ایپ کریں: پلس نائن ٹو... تین تین ایک... پانچ دو دو... تین سات دو چھ۔",
 ],
}

VOICES = {  # name: (ElevenLabs voice id, stability, similarity, style)
  "asad": ("MV3SFjHrg9SHgVQsAGo7", 0.5, 0.8, 0.2),    # Asad Raza: Pakistani English (Lahore), calm and clear
  "huda": ("HHJcozd8AgLT2VmACyDV", 0.5, 0.8, 0.2),    # Huda: Pakistani English, female, calm and confident
  "reva": ("UT6USLtoAlXHj5k4sOLY", 0.5, 0.8, 0.15),   # Reva: warm Urdu narrator, female
}
# which English voice reads which ad (Urdu is always Reva)
EN_VOICE = {"sun": "asad", "loc": "huda", "dbl": "asad", "rsn": "huda", "home": "huda",
            "size": "asad", "checks": "asad", "steps": "huda", "abroad": "asad"}
assert all(len(EN[k]) == len(UR[k]) for k in EN), "Urdu and English scripts must have the same number of lines"
