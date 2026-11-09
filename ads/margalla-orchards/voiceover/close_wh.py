# Generate the WH Ventures closing line (cloned voice v2, calm v4 settings). usage: python3 close.py <out_basename>
import sys, json, urllib.request, subprocess
text = "[confident] Call W.H. Ventures today: zero three three one... five two two... three seven two six. Limited plots available."
body = {"text": text, "model_id": "eleven_v4", "voice_settings": {"stability": 0.65, "similarity_boost": 0.85, "style": 0.12, "use_speaker_boost": True}}
req = urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/4s5bNOErd0CSLc5WtvkC?output_format=mp3_44100_128",
    data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
o = sys.argv[1]; open(o+".mp3","wb").write(urllib.request.urlopen(req, timeout=120).read())
subprocess.run(["ffmpeg","-v","error","-y","-i",o+".mp3","-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",o+".wav"],check=True)
t = json.loads(subprocess.run(["curl","-sS","-m","200","-X","POST","https://api.elevenlabs.io/v1/speech-to-text","-H","xi-api-key: proxy-injected","-F","model_id=scribe_v1","-F",f"file=@{o}.mp3;type=audio/mpeg"],capture_output=True,text=True).stdout).get("text")
d = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",o+".wav"],capture_output=True,text=True).stdout.strip()
print(o, d, "|", t)
