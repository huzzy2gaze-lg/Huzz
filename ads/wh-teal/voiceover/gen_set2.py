# usage: python3 gen.py <ad>   -> <ad>_0..N.wav  (cloned voice v2, eleven_v4, calm settings, "Maar-guh-la")
import sys, json, urllib.request, subprocess
VID, M = "4s5bNOErd0CSLc5WtvkC", "Maar-guh-la"
SCRIPTS = {
 "loc": [
  "[calm, confident] In real estate, location is everything.",
  f"[warm] D.H.A. {M} Orchards. On Main Park Road, right opposite COMSATS University.",
  "[friendly] Faizabad, just ten minutes away. The Serena Hotel and the Secretariat, ten to fifteen.",
  "[warm] One kanaal for just three point five karor.",
  "[confident] Call W.H. Ventures today: zero three three one... five two two... three seven two six. Limited plots available.",
 ],
 "dbl": [
  "[calm, confident] Why pay double for a prime Islamabad address?",
  f"[warm] In {M} Enclave, one kanaal costs over seven point three karor.",
  f"[friendly] In D.H.A. {M} Orchards... just three point five.",
  "[warm] That's a saving of over three point eight karor, on one plot.",
  "[confident] Call W.H. Ventures today: zero three three one... five two two... three seven two six. Limited plots available.",
 ],
 "rsn": [
  f"[calm, confident] Five reasons to invest in D.H.A. {M} Orchards.",
  "[warm] One. It's developed by D.H.A.",
  "[warm] Two. It's right opposite COMSATS University.",
  "[warm] Three. Faizabad is just ten minutes away.",
  f"[friendly] Four. One kanaal is three point five karor... less than half the price of {M} Enclave.",
  "[warm] And five. Development work is in full swing.",
  "[confident] Call W.H. Ventures today: zero three three one... five two two... three seven two six. Limited plots available.",
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
