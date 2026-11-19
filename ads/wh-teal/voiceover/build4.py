# Build a voiced, mastered 9:16 ad from real site footage (ad set 4).
# usage: python3 build4.py <ad> <voice_dir> <shots.json> <out.mp4>     (expects <voice_dir>/<ad>_0..N.wav)
# shots.json: {"<ad>": [[source_file, in_seconds, crop_x 0..1], ...]}, one shot per voice line (the last one is
# under the end card). Each shot is cropped to 9:16 from the landscape footage, with a slow push-in and a light grade;
# the transparent caption layer (set4/overlay.html) goes on top, then the voice and music are mixed by master_pro.py.
import sys, os, json, glob, shutil, subprocess, tempfile, numpy as np, wave
ad, vdir, shots_json, out = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
files = sorted(glob.glob(f"{vdir}/{ad}_[0-9].wav"))
dur = lambda f: float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout)
L = [dur(f) for f in files]; GAP, START, HOLD = 0.5, 0.6, 3.4
S = [START]
for x in L[:-1]: S.append(S[-1] + x + GAP)
END = round(S[-1] + L[-1] + HOLD, 2)
shots = json.load(open(shots_json))[ad]
assert len(shots) == len(S), f"{ad}: {len(shots)} shots for {len(S)} voice lines"
print(ad, "starts", [round(x, 2) for x in S], "end", END, flush=True)
tmp = tempfile.mkdtemp(prefix=f"b4-{ad}-")
# cut points: each shot starts 0.15 s before its voice line (the first at 0), the last runs to the end
cuts = [0.0] + [s - 0.15 for s in S[1:]] + [END]
parts = []
for i, (src, t_in, cx) in enumerate(shots):
    d = round(cuts[i + 1] - cuts[i], 3); p = f"{tmp}/s{i}.mp4"
    zoom = "(1+0.07*t/%.3f)" % d          # slow push-in over the shot
    vf = (f"crop=w=ih*9/16:h=ih:x=(iw-ih*9/16)*{cx}:y=0,scale=1080:1920:flags=lanczos,"
          f"scale=w='trunc(1080*{zoom}/2)*2':h='trunc(1920*{zoom}/2)*2':eval=frame:flags=bicubic,crop=1080:1920,"
          "eq=contrast=1.06:saturation=1.1:gamma=0.98,colorbalance=rs=.02:bs=-.03:rh=.02,fps=30,format=yuv420p")
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(t_in),"-t",str(d),"-i",src,"-vf",vf,"-an","-c:v","libx264","-crf","16","-preset","fast",p], check=True)
    parts.append(p)
with open(f"{tmp}/list.txt", "w") as f: f.writelines(f"file '{p}'\n" for p in parts)
bg = f"{tmp}/bg.mp4"
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",f"{tmp}/list.txt","-t",str(END),"-c:v","libx264","-crf","16","-preset","fast","-pix_fmt","yuv420p",bg], check=True)
# caption layer
cues, lens = ",".join(f"{x:.3f}" for x in S), ",".join(f"{x:.3f}" for x in L)
subprocess.run(["node", f"{ROOT}/set4/render4.js", "frames", f"{tmp}/ov", ad, cues, lens, str(END)], check=True)
silent = f"{tmp}/silent.mp4"
subprocess.run(["ffmpeg","-v","error","-y","-i",bg,"-framerate","30","-i",f"{tmp}/ov/o%04d.png","-filter_complex","[0:v][1:v]overlay=0:0:format=auto,format=yuv420p",
                "-t",str(END),"-c:v","libx264","-crf","18","-preset","slow","-movflags","+faststart",silent], check=True)

# music bed: warm pad + soft pulse + plucked arpeggio, a different progression per ad; chime on the call to action
PROG = {
  "live":   ([[43,55,59,62,66],[40,55,59,62,64],[36,55,60,64,67],[38,57,62,66,69]], 0.48),   # Gmaj7 Em C D: forward, busy
  "drive":  ([[48,60,64,67,71],[45,60,64,67,69],[41,60,65,69,72],[43,59,62,67,74]], 0.5),    # Cmaj7 Am7 Fmaj7 G6: open road
  "real":   ([[45,57,60,64,67],[41,57,60,65,69],[48,55,60,64,67],[43,55,59,62,67]], 0.6),    # Am F C G: serious, steady
  "overseas": ([[46,58,62,65,69],[43,58,62,65,67],[39,58,63,67,70],[41,57,60,65,72]], 0.62),   # Bbmaj7 Gm7 Ebmaj7 F: longing
}
chords, beat = PROG.get(ad, PROG["live"])
SR = 48000; t = np.arange(int(SR*END))/SR; hz = lambda m: 440*2**((m-69)/12)
seg = END/len(chords); pad = np.zeros_like(t)
for ci, ch in enumerate(chords):
    env = np.clip((t-ci*seg)/1.2,0,1)*np.clip(((ci+1)*seg+1.2-t)/1.2,0,1)
    for j, m in enumerate(ch):
        for det in (-0.6, 0.6):
            ph = 2*np.pi*(hz(m)+det)*t; pad += env*(0.5 if j == 0 else 0.22)*(np.sin(ph)+0.25*np.sin(2*ph)+0.08*np.sin(3*ph))
pad *= 0.85+0.15*np.sin(2*np.pi*0.4*t)
pulse = np.zeros_like(t)
for b in np.arange(0, END, beat):
    k = t >= b; d = t[k]-b; pulse[k] += 0.35*np.sin(2*np.pi*55*d)*np.exp(-d*9)
arp = np.zeros_like(t)
for ci, ch in enumerate(chords):
    for n_, bt in enumerate(np.arange(ci*seg, (ci+1)*seg, beat)):
        m = ch[1 + n_ % 4] + 12; k = t >= bt; d = t[k]-bt
        arp[k] += 0.12*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*5)
mus = pad/np.abs(pad).max()*0.6 + pulse*0.4 + arp
for n, m in enumerate([81, 88, 93]):
    at = S[-1] + 0.2 + n*0.09; k = t >= at; d = t[k]-at; mus[k] += 0.32*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*3.2)
mus *= np.clip(t/1.5,0,1)*np.clip((END-t)/1.8,0,1); mus = mus/np.abs(mus).max()*0.8
mf = f"{vdir}/music4_{ad}.wav"
with wave.open(mf, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus*32767).astype(np.int16).tobytes())
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
subprocess.run(["python3", f"{HERE}/master_pro.py", vdir, ad, ",".join(f"{x:.3f}" for x in S), str(END), mf, silent, out], check=True)
shutil.rmtree(tmp, ignore_errors=True); print("wrote", out)
