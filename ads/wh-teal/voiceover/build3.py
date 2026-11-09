# Build a voiced, mastered 9:16 video for an ad-set-3 page.
# usage: python3 build3.py <ad> <page> <voice_dir> <out.mp4> [query]   (expects <voice_dir>/<ad>_0..N.wav)
# The animation follows the voice lines; each ad gets its own chord progression so the four do not sound alike.
import sys, os, glob, subprocess, numpy as np, wave
ad, page, vdir, out = sys.argv[1:5]; query = sys.argv[5] if len(sys.argv) > 5 else ""
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
files = sorted(glob.glob(f"{vdir}/{ad}_[0-9].wav"))
dur = lambda f: float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout)
L = [dur(f) for f in files]; GAP, START, HOLD = 0.5, 0.6, 2.6
S = [START]
for x in L[:-1]: S.append(S[-1] + x + GAP)
END = round(S[-1] + L[-1] + HOLD, 2)
print(ad, "starts", [round(x,2) for x in S], "end", END, flush=True)
silent = out.replace(".mp4", "_silent.mp4")
subprocess.run(["node", f"{ROOT}/set3/render3.js", "video", page, silent, ",".join(f"{x:.3f}" for x in S), ",".join(f"{x:.3f}" for x in L), str(END), query], check=True)

# music bed: warm pad + soft pulse, a different progression and tempo per ad; chime on the call to action
PROG = {  # MIDI chords (root + voicing)
  "home":   ([[48,60,64,67,71],[45,60,64,67,69],[41,60,65,69,72],[43,59,62,67,74]], 0.55),   # Cmaj7 Am7 Fmaj7 G6: hopeful
  "size":   ([[50,62,66,69,73],[47,62,66,69,71],[43,62,66,67,71],[45,61,64,69,71]], 0.5),
  "checks": ([[45,57,60,64,67],[41,57,60,65,69],[48,55,60,64,67],[43,55,59,62,67]], 0.6),   # Am F C G: steady, serious
  "steps":  ([[43,55,59,62,66],[40,55,59,62,64],[36,55,60,64,67],[38,57,62,66,69]], 0.5),   # Gmaj7 Em C D: forward
  "abroad": ([[46,58,62,65,69],[43,58,62,65,67],[39,58,63,67,70],[41,57,60,65,72]], 0.62),  # Bbmaj7 Gm7 Ebmaj7 F: warm, longing
}
chords, beat = PROG.get(ad, PROG["size"])
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
# soft plucked arpeggio on the chord tones (gives each ad movement)
arp = np.zeros_like(t)
for ci, ch in enumerate(chords):
    for n_, bt in enumerate(np.arange(ci*seg, (ci+1)*seg, beat)):
        m = ch[1 + n_ % 4] + 12; k = t >= bt; d = t[k]-bt
        arp[k] += 0.12*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*5)
mus = pad/np.abs(pad).max()*0.6 + pulse*0.4 + arp
for n, m in enumerate([81, 88, 93]):
    at = S[-1] + 0.2 + n*0.09; k = t >= at; d = t[k]-at; mus[k] += 0.32*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*3.2)
mus *= np.clip(t/1.5,0,1)*np.clip((END-t)/1.8,0,1); mus = mus/np.abs(mus).max()*0.8
mf = f"{vdir}/music_{ad}.wav"
with wave.open(mf, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mus*32767).astype(np.int16).tobytes())
subprocess.run(["python3", f"{HERE}/master_pro.py", vdir, ad, ",".join(f"{x:.3f}" for x in S), str(END), mf, silent, out], check=True)
os.remove(silent); print("wrote", out)
