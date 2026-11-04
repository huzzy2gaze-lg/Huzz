# Generate the 4 voice-over lines with ElevenLabs. Usage: python el.py <voice_id> <tag> [speed]
import sys, json, subprocess, urllib.request
vid, tag = sys.argv[1], sys.argv[2]; speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
LINES = [
 "D.H.A. Margalla Orchards. Park Road, Islamabad.",
 "Not seven point three karor... Just three point five!",
 "Save over three point eight karor on one kanaal. Right opposite COMSATS, just ten minutes from Faizabad.",
 "Call W.H. Ventures today: zero three three one, five two two, three seven two six. Limited plots!",
]
for i, t in enumerate(LINES):
    body = {"text": t, "model_id": "eleven_multilingual_v2",
            "previous_text": LINES[i-1] if i else None, "next_text": LINES[i+1] if i+1 < len(LINES) else None,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": speed}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
    open(f"{tag}_{i}.mp3", "wb").write(urllib.request.urlopen(req, timeout=60).read())
    d = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{tag}_{i}.mp3"],capture_output=True,text=True).stdout.strip()
    print(tag, i, d)
