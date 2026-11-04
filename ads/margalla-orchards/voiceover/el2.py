# usage: python3 el2.py <voice_id> <model> <tag> <stability> [notags]
import sys, json, urllib.request, urllib.error, subprocess
vid, model, tag, stab = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
notags = len(sys.argv) > 5
LINES = [
 ("[warm, confident]", "D.H.A. Margalla Orchards. Park Road, Islamabad."),
 ("[playful]", "Not seven point three karor... [excited] just three point five!"),
 ("[enthusiastic]", "Save over three point eight karor on one kanaal. Right opposite COMSATS, just ten minutes from Faizabad."),
 ("[confident, friendly]", "Call W.H. Ventures today: zero three three one... five two two... three seven two six. Limited plots!"),
]
for i, (t0, t) in enumerate(LINES):
    text = t if notags else f"{t0} {t}"
    if notags: text = text.replace("[excited] ", "")
    body = {"text": text, "model_id": model, "voice_settings": {"stability": stab, "similarity_boost": 0.85, "style": 0.3, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
    try: open(f"{tag}_{i}.mp3", "wb").write(urllib.request.urlopen(req, timeout=120).read())
    except urllib.error.HTTPError as e: print("ERR", e.code, e.read()[:300]); sys.exit(1)
    subprocess.run(["ffmpeg","-v","error","-y","-i",f"{tag}_{i}.mp3","-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",f"{tag}_{i}.wav"],check=True)
# transcribe the 4 lines joined, to verify words (and that tags weren't read aloud)
subprocess.run(["ffmpeg","-v","error","-y"]+sum([["-i",f"{tag}_{i}.wav"] for i in range(4)],[])+["-filter_complex","concat=n=4:v=0:a=1","-b:a","96k",f"{tag}_all.mp3"],check=True)
out = subprocess.run(["curl","-sS","-m","200","-X","POST","https://api.elevenlabs.io/v1/speech-to-text","-H","xi-api-key: proxy-injected","-F","model_id=scribe_v1","-F",f"file=@{tag}_all.mp3;type=audio/mpeg"],capture_output=True,text=True).stdout
d = [float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{tag}_{i}.wav"],capture_output=True,text=True).stdout) for i in range(4)]
print(tag, [round(x,2) for x in d], "|", json.loads(out).get("text"))
