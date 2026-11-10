# Generate the voice lines for one ad in one language: <out_dir>/<ad>_0..N.wav (silence-trimmed),
# then a speech-to-text check of the whole read.
# usage: python3 gen_voice.py <ad> <en|ur> <out_dir>
import sys, os, json, subprocess, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scripts import EN, UR, VOICES, EN_VOICE
ad, lang, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
lines = (EN if lang == "en" else UR)[ad]
vid, st, sim, sty = VOICES[EN_VOICE[ad] if lang == "en" else "reva"]
for i, text in enumerate(lines):
    body = {"text": text, "model_id": "eleven_v4", "voice_settings": {"stability": st, "similarity_boost": sim, "style": sty, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
    mp3 = f"{out}/{ad}_{i}.mp3"
    open(mp3, "wb").write(urllib.request.urlopen(req, timeout=120).read())
    subprocess.run(["ffmpeg","-v","error","-y","-i",mp3,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",f"{out}/{ad}_{i}.wav"], check=True)
n = len(lines)
allf = f"{out}/{ad}_all.mp3"
subprocess.run(["ffmpeg","-v","error","-y"] + sum([["-i", f"{out}/{ad}_{i}.wav"] for i in range(n)], []) + ["-filter_complex", f"concat=n={n}:v=0:a=1", "-b:a", "96k", allf], check=True)
txt = json.loads(subprocess.run(["curl","-sS","-m","200","-X","POST","https://api.elevenlabs.io/v1/speech-to-text","-H","xi-api-key: proxy-injected","-F","model_id=scribe_v1","-F",f"file=@{allf};type=audio/mpeg"], capture_output=True, text=True).stdout).get("text")
lens = [float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{out}/{ad}_{i}.wav"], capture_output=True, text=True).stdout) for i in range(n)]
print(f"{ad} {lang}", [round(x, 2) for x in lens], round(sum(lens), 1), "\n  >", txt, flush=True)
