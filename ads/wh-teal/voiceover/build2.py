# Build a voiced, mastered 9:16 video for an ad-set-2 layout.
# usage: python3 build2.py <layout> <voice_dir> <out.mp4>   (expects <voice_dir>/<layout>_0..N.wav)
import sys, os, glob, subprocess, numpy as np, wave
lay, vdir, out = sys.argv[1], sys.argv[2], sys.argv[3]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = sorted(glob.glob(f"{vdir}/{lay}_[0-9].wav"))
dur = lambda f: float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout)
L = [dur(f) for f in files]; GAP, START, HOLD = 0.5, 0.6, 2.6
S = [START]
for x in L[:-1]: S.append(S[-1] + x + GAP)
END = round(S[-1] + L[-1] + HOLD, 2)
print(lay, "starts", [round(x,2) for x in S], "end", END)
silent = out.replace(".mp4", "_silent.mp4")
subprocess.run(["node", f"{ROOT}/render2.js", "video", lay, silent, ",".join(f"{x:.3f}" for x in S), ",".join(f"{x:.3f}" for x in L), str(END)], check=True)

# music bed (warm pad + soft pulse), chime on the final call-to-action
SR = 48000; t = np.arange(int(SR*END))/SR; hz = lambda m: 440*2**((m-69)/12)
chords = [[50,62,66,69,73],[47,62,66,69,71],[43,62,66,67,71],[45,61,64,69,71]]
seg = END/4; pad = np.zeros_like(t)
for ci, ch in enumerate(chords):
    env = np.clip((t-ci*seg)/1.2,0,1)*np.clip(((ci+1)*seg+1.2-t)/1.2,0,1)
    for j, m in enumerate(ch):
        for det in (-0.6, 0.6):
            ph = 2*np.pi*(hz(m)+det)*t; pad += env*(0.5 if j == 0 else 0.22)*(np.sin(ph)+0.25*np.sin(2*ph)+0.08*np.sin(3*ph))
pad *= 0.85+0.15*np.sin(2*np.pi*0.4*t)
pulse = np.zeros_like(t)
for b in np.arange(0, END, 0.5):
    k = t >= b; d = t[k]-b; pulse[k] += 0.35*np.sin(2*np.pi*55*d)*np.exp(-d*9)
mus = pad/np.abs(pad).max()*0.6 + pulse*0.45
for n, m in enumerate([81, 88, 93]):
    at = S[-1] + 0.2 + n*0.09; k = t >= at; d = t[k]-at; mus[k] += 0.32*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*3.2)
mus *= np.clip(t/1.5,0,1)*np.clip((END-t)/1.8,0,1); mus = mus/np.abs(mus).max()*0.8
mf = f"{vdir}/music_{lay}.wav"
with wave.open(mf, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus*32767).astype(np.int16).tobytes())
# broadcast voice master (master_pro.py: EQ, exciter, de-ess, compression, -14 LUFS)
subprocess.run(["python3", f"{os.path.dirname(os.path.abspath(__file__))}/master_pro.py", vdir, lay, ",".join(f"{x:.3f}" for x in S), str(END), mf, silent, out], check=True)
os.remove(silent); print("wrote", out)
