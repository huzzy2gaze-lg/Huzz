# Voice audition: the same ad script ("Why Pay Double") read by several ElevenLabs voices, each mixed exactly like the
# real ads (music bed + master_pro voice chain, -14 LUFS), so the voices can be compared fairly.
# usage: python3 vo_samples.py <out_dir> [voice_key ...]
import sys, os, json, subprocess, urllib.request, numpy as np, wave
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
only = set(sys.argv[2:])

EN = [
  "[calm, confident] Why pay double for a prime Islamabad address?",
  "[warm] In Margalla Enclave, one kanal costs over seven point three crore.",
  "[friendly] In D.H.A. Margalla Orchards... just three point five.",
  "[warm] That's a saving of over three point eight crore, on one plot.",
  "[confident] Call W.H. Ventures today: zero three three one... five two two... three seven two six.",
]
UR = [
  "اسلام آباد کے پرائم ایڈریس کے لیے دگنی قیمت کیوں دیں؟",
  "مارگلہ انکلیو میں ایک کنال سات کروڑ تیس لاکھ سے زیادہ کا ہے۔",
  "ڈی ایچ اے مارگلہ آرچرڈز میں... صرف ساڑھے تین کروڑ۔",
  "یعنی ایک پلاٹ پر تین کروڑ اسّی لاکھ سے زیادہ کی بچت۔",
  "آج ہی ڈبلیو ایچ وینچرز کو کال کریں: صفر تین تین ایک... پانچ دو دو... تین سات دو چھ۔",
]
CLONE_EN = [l.replace("Margalla", "Maar-guh-la").replace("kanal", "kanaal").replace("crore", "karor") for l in EN]
VOICES = {  # key: (voice_id, label, lines, voice settings)
  "01-hamza":   ("Tf0KgoctXIPeWJa1L6jE", "Hamza · Pakistani-British English, serious and trustworthy", EN, (0.5, 0.8, 0.2)),
  "02-asad":    ("MV3SFjHrg9SHgVQsAGo7", "Asad Raza · Pakistani English (Lahore), calm and clear", EN, (0.5, 0.8, 0.2)),
  "03-habban":  ("hV1InkNCNhrjdXJO4OkG", "Habban · Pakistani English, articulate", EN, (0.5, 0.8, 0.2)),
  "04-huda":    ("HHJcozd8AgLT2VmACyDV", "Huda · Pakistani English, female, calm and confident", EN, (0.5, 0.8, 0.2)),
  "05-hale":    ("dXtC3XhB9GtPusIpNtQx", "Hale · American, smooth commercial voice", EN, (0.45, 0.8, 0.25)),
  "06-rudra":   ("N9rZ3GaL6nwOrNUEMppm", "Rudra · deep, cinematic luxury ad voice", EN, (0.5, 0.8, 0.2)),
  "07-amjid-ur": ("vH5LP38dcYJ3CIbC2rKX", "Amjid · Urdu, deep professional documentary voice", UR, (0.5, 0.8, 0.15)),
  "08-reva-ur":  ("UT6USLtoAlXHj5k4sOLY", "Reva · Urdu, warm female narrator", UR, (0.5, 0.8, 0.15)),
  "09-naqsh-ur": ("L1f58R08RFtEqY28c3BT", "Naqsh · Urdu, documentary / social media", UR, (0.5, 0.8, 0.15)),
  "10-your-clone": ("4s5bNOErd0CSLc5WtvkC", "Your cloned voice (current ads), for reference", CLONE_EN, (0.65, 0.85, 0.12)),
}

def tts(vid, text, settings, path, model="eleven_v4"):
    st, sim, sty = settings
    if any("؀" <= c <= "ۿ" for c in text): text = text  # Urdu text: no English emotion tags
    body = {"text": text, "model_id": model, "voice_settings": {"stability": st, "similarity_boost": sim, "style": sty, "use_speaker_boost": True}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "xi-api-key": "proxy-injected"})
    open(path, "wb").write(urllib.request.urlopen(req, timeout=120).read())

dur = lambda f: float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout)
for key, (vid, label, lines, settings) in VOICES.items():
    if only and key not in only: continue
    d = os.path.join(out, "_lines"); os.makedirs(d, exist_ok=True)
    for i, text in enumerate(lines):
        mp3 = f"{d}/{key}_{i}.mp3"; tts(vid, text, settings, mp3)
        subprocess.run(["ffmpeg","-v","error","-y","-i",mp3,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",f"{d}/{key}_{i}.wav"],check=True)
    L = [dur(f"{d}/{key}_{i}.wav") for i in range(len(lines))]
    S = [0.6]
    for x in L[:-1]: S.append(S[-1] + x + 0.45)
    END = round(S[-1] + L[-1] + 1.6, 2)
    # music bed (same as the ads), a black video so master_pro can run, then keep the audio
    SR = 48000; t = np.arange(int(SR * END)) / SR; hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    chords = [[50,62,66,69,73],[47,62,66,69,71],[43,62,66,67,71],[45,61,64,69,71]]; seg = END / 4; pad = np.zeros_like(t)
    for ci, ch in enumerate(chords):
        env = np.clip((t-ci*seg)/1.2,0,1)*np.clip(((ci+1)*seg+1.2-t)/1.2,0,1)
        for j, m in enumerate(ch):
            for det in (-0.6, 0.6): ph = 2*np.pi*(hz(m)+det)*t; pad += env*(0.5 if j == 0 else 0.22)*(np.sin(ph)+0.25*np.sin(2*ph))
    pulse = np.zeros_like(t)
    for b in np.arange(0, END, 0.5): k = t >= b; dd = t[k]-b; pulse[k] += 0.35*np.sin(2*np.pi*55*dd)*np.exp(-dd*9)
    mus = pad/np.abs(pad).max()*0.6 + pulse*0.4; mus *= np.clip(t/1.0,0,1)*np.clip((END-t)/1.2,0,1); mus = mus/np.abs(mus).max()*0.8
    mf = f"{d}/{key}_music.wav"
    with wave.open(mf, "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus*32767).astype(np.int16).tobytes())
    blank = f"{d}/{key}_blank.mp4"
    subprocess.run(["ffmpeg","-v","error","-y","-f","lavfi","-i",f"color=c=0x0B3A40:s=320x240:d={END}","-c:v","libx264","-pix_fmt","yuv420p",blank],check=True)
    mixed = f"{d}/{key}_mix.mp4"
    subprocess.run(["python3", f"{HERE}/master_pro.py", d, key, ",".join(f"{x:.3f}" for x in S), str(END), mf, blank, mixed], check=True)
    final = os.path.join(out, f"{key}.m4a")
    subprocess.run(["ffmpeg","-v","error","-y","-i",mixed,"-vn","-c:a","copy","-metadata",f"title={label}",final],check=True)
    print(f"{key}: {round(END,1)}s  {label}", flush=True)
