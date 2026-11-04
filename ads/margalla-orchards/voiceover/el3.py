# Calmer v4 lines (~60% energy) with a respelled "Margalla". usage: python3 el3.py <voice> <tag> <margalla-spelling> [line0only]
import sys, json, urllib.request, subprocess
vid, tag, M = sys.argv[1], sys.argv[2], sys.argv[3]; only0 = len(sys.argv) > 4
LINES = [
 f"[calm, confident] D.H.A. {M} Orchards. Park Road, Islamabad.",
 "[warm] Not seven point three karor... just three point five.",
 "[friendly] Save over three point eight karor on one kanaal. Right opposite COMSATS, just ten minutes from Faizabad.",
 "[confident] Call W.H. Ventures today: zero three three one... five two two... three seven two six. Limited plots.",
]
for i, text in enumerate(LINES[:1] if only0 else LINES):
    body = {"text": text, "model_id": "eleven_v4",
            "voice_settings": {"stability": 0.65, "similarity_boost": 0.85, "style": 0.12, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
    open(f"{tag}_{i}.mp3", "wb").write(urllib.request.urlopen(req, timeout=120).read())
    subprocess.run(["ffmpeg","-v","error","-y","-i",f"{tag}_{i}.mp3","-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",f"{tag}_{i}.wav"],check=True)
    print(tag, i, subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{tag}_{i}.wav"],capture_output=True,text=True).stdout.strip())
