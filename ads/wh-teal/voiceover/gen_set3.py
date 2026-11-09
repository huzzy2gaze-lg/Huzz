# Voice lines for ad set 3 (cloned voice v2, eleven_v4, calm settings, "Maar-guh-la").
# usage: python3 gen_set3.py <ad>   -> <ad>_0..N.wav in the current folder, plus a speech-to-text check
import sys, json, urllib.request, subprocess
VID, M = "4s5bNOErd0CSLc5WtvkC", "Maar-guh-la"
CALL = "Call W.H. Ventures today: zero three three one... five two two... three seven two six."
SCRIPTS = {
 "home": [
  "[warm, inviting] Looking for the right place to build your family home?",
  f"[calm] It starts with the plot. One kanaal in D.H.A. {M} Orchards... fifty by ninety feet.",
  "[confident] First, the foundation. Then the columns... and the ground floor.",
  f"[warm] A second storey for the bedrooms... and a roof terrace facing the {M} Hills.",
  "[friendly] A lawn, a driveway, a gate... and by evening, the lights are on. Welcome home.",
  f"[confident] Your home starts with the right plot. {CALL}",
 ],
 "size": [
  "[curious, friendly] How big is one kanaal, really?",
  "[calm] One kanaal is fifty by ninety feet. That's four thousand five hundred square feet.",
  "[warm] Room for a two-storey home, a front lawn, and parking for two cars.",
  "[calm] Fourteen marla is forty by eighty feet. Ten marla is thirty-two by seventy.",
  f"[friendly] In D.H.A. {M} Orchards, you can choose from all three sizes.",
  f"[confident] Not sure which size fits your family? {CALL}",
 ],
 "checks": [
  "[serious, calm] Buying a plot? Check these five things first.",
  "[calm] One. The file type: F.G.E.H.A., S.C.B.A., or land sharing.",
  "[calm] Two. The block and plot number, on the official master plan.",
  "[calm] Three. The original letter... and the seller's I.D. card must match.",
  "[calm] Four. All dues, checked on the official F.G.E.H.A. portal.",
  "[calm] Five. Development charges: how much, and who pays.",
  f"[confident] We check every file with you. {CALL}",
 ],
 "steps": [
  f"[friendly] Buying a plot in D.H.A. {M} Orchards is simpler than you think.",
  "[calm] Step one. Choose your block and plot, on the official master plan.",
  "[calm] Step two. Sign the agreement, and pay the token.",
  "[calm] Step three. The N.D.C. from F.G.E.H.A. confirms there are no dues.",
  "[calm] Step four. The transfer, at the F.G.E.H.A. office in G-ten.",
  "[warm] Step five. The allotment letter... in your name.",
  f"[confident] We're with you at every step. {CALL}",
 ],
 "abroad": [
  "[warm] Living in Dubai, Riyadh, London or Toronto... and dreaming of a home in Islamabad?",
  f"[calm] D.H.A. {M} Orchards. On Main Park Road, Islamabad.",
  "[friendly] See your plot on a live video call, from wherever you are.",
  "[calm] We check every document, and send you copies on WhatsApp.",
  "[warm] And we stay with you through the transfer, step by step.",
  "[confident] Invest at home, from abroad. Call or WhatsApp W.H. Ventures: plus nine two... three three one... five two two... three seven two six.",
 ],
}
ad = sys.argv[1]
for i, text in enumerate(SCRIPTS[ad]):
    body = {"text": text, "model_id": "eleven_v4",
            "voice_settings": {"stability": 0.65, "similarity_boost": 0.85, "style": 0.12, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VID}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
    open(f"{ad}_{i}.mp3", "wb").write(urllib.request.urlopen(req, timeout=120).read())
    subprocess.run(["ffmpeg","-v","error","-y","-i",f"{ad}_{i}.mp3","-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",f"{ad}_{i}.wav"],check=True)
n = len(SCRIPTS[ad])
subprocess.run(["ffmpeg","-v","error","-y"]+sum([["-i",f"{ad}_{i}.wav"] for i in range(n)],[])+["-filter_complex",f"concat=n={n}:v=0:a=1","-b:a","96k",f"{ad}_all.mp3"],check=True)
txt = json.loads(subprocess.run(["curl","-sS","-m","200","-X","POST","https://api.elevenlabs.io/v1/speech-to-text","-H","xi-api-key: proxy-injected","-F","model_id=scribe_v1","-F",f"file=@{ad}_all.mp3;type=audio/mpeg"],capture_output=True,text=True).stdout).get("text")
lens = [float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{ad}_{i}.wav"],capture_output=True,text=True).stdout) for i in range(n)]
print(ad, [round(x,2) for x in lens], round(sum(lens),1), "\n  >", txt)
