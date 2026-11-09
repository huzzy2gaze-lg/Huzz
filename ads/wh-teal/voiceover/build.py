# Build a voiced video whose animation follows the voice-over.
# Usage: python3 build.py <tag> <voice_dir>   (expects <voice_dir>/<tag>_0..3.wav, silence-trimmed)
import sys, subprocess, numpy as np, wave, os, json
tag, vdir = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
dur_of = lambda f: float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout)
L = [dur_of(f"{vdir}/{tag}_{i}.wav") for i in range(4)]
GAP, START, HOLD = 0.45, 0.6, 2.4
S = [START]
for i in range(1, 4): S.append(S[-1] + L[i-1] + GAP)
END = round(S[3] + L[3] + HOLD, 2)
# real -> animation-time anchors (anim times come from anim.js timeline)
MAP = [(0,0), (S[1],3.75), (S[1]+0.55*L[1],5.4), (S[2],6.9), (S[2]+0.5*L[2],8.0), (S[3],9.9), (S[3]+1.4,11.3), (END,15)]
inv = lambda a: next(r0+(r1-r0)*(a-a0)/(a1-a0) for (r0,a0),(r1,a1) in zip(MAP,MAP[1:]) if a0 <= a <= a1)
print("lines", [round(x,2) for x in L], "starts", [round(x,2) for x in S], "end", END)

name = "WH-0-Margalla-Sunrise_EN_Video-9x16_Reels-Shorts-Status"
silent = f"{ROOT}/video/_silent-{tag}.mp4"
subprocess.run(["node", f"{ROOT}/render-video.js", "en", "--dur", str(END), "--out", os.path.basename(silent),
    "--map", ",".join(f"{r:.3f}:{a}" for r, a in MAP)], check=True, env={**os.environ})

# ---- music bed sized to END, chimes on the gold drop and the call bar ----
SR = 48000; t = np.arange(int(SR*END))/SR
hz = lambda m: 440*2**((m-69)/12)
chords = [[50,62,66,69,73],[47,62,66,69,71],[43,62,66,67,71],[45,61,64,69,71]]
seg = END/4; pad = np.zeros_like(t)
for ci, ch in enumerate(chords):
    s0, s1 = ci*seg, (ci+1)*seg
    env = np.clip((t-s0)/1.2,0,1)*np.clip((s1+1.2-t)/1.2,0,1)
    for j, m in enumerate(ch):
        a = 0.5 if j == 0 else 0.22
        for det in (-0.6, 0.6):
            ph = 2*np.pi*(hz(m)+det)*t; pad += env*a*(np.sin(ph)+0.25*np.sin(2*ph)+0.08*np.sin(3*ph))
pad *= 0.85+0.15*np.sin(2*np.pi*0.4*t)
pulse = np.zeros_like(t)
for b in np.arange(0, END, 0.5):
    k = t >= b; d = t[k]-b; pulse[k] += 0.35*np.sin(2*np.pi*55*d)*np.exp(-d*9)
mus = pad/np.abs(pad).max()*0.6 + pulse*0.45
for at, notes in ((inv(5.45), [86,93]), (inv(10.25), [81,88,93])):
    for n, m in enumerate(notes):
        k = t >= at+n*0.09; d = t[k]-(at+n*0.09); mus[k] += 0.32*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*3.2)
mus *= np.clip(t/1.5,0,1)*np.clip((END-t)/1.8,0,1); mus = mus/np.abs(mus).max()*0.8
mf = f"{vdir}/music_{tag}.wav"
with wave.open(mf, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus*32767).astype(np.int16).tobytes())

# ---- mastered mix (master.py: denoise, de-ess, compress, room, ducked music, -16 LUFS) ----
out = f"{ROOT}/WH-Teal-Ads/0-Margalla-Sunrise/English/{name}.mp4"
subprocess.run(["python3", f"{HERE}/master.py", vdir, tag, ",".join(f"{x:.3f}" for x in S), str(END), mf, silent, out], check=True)
os.remove(silent)
print("wrote", out)
