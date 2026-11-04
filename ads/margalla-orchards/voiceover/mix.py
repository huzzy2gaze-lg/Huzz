# Builds voice + music tracks (24 kHz) for the 15s ad. Usage: python mix.py <voice>
import sys, numpy as np, soundfile as sf
SR, DUR = 24000, 15.0
voice = sys.argv[1]
CUES = [0.45, 3.85, 6.95, 9.35]          # seconds: lines start on their on-screen moments

def trim(a, thr=0.012):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(0, idx[0]-240): idx[-1]+1200] if len(idx) else a

vo = np.zeros(int(SR*DUR))
for i, c in enumerate(CUES):
    a, sr = sf.read(f"{voice}_{i}.wav"); assert sr == SR
    a = trim(a); s = int(c*SR); e = min(len(vo), s+len(a))
    vo[s:e] += a[:e-s]
    print(f"line {i}: {c:.2f}s -> {c+len(a)/SR:.2f}s")
vo /= np.max(np.abs(vo)) + 1e-9; vo *= 0.89

# ---- ambient pad: Dmaj7 | Bm7 | Gmaj7 | A(add9) ----
t = np.arange(int(SR*DUR))/SR
hz = lambda m: 440*2**((m-69)/12)
chords = [[50,62,66,69,73],[47,62,66,69,71],[43,62,66,67,71],[45,61,64,69,71]]
pad = np.zeros_like(t)
for ci, ch in enumerate(chords):
    s0, s1 = ci*3.75, (ci+1)*3.75
    env = np.clip((t-s0)/0.9,0,1) * np.clip((s1+0.9-t)/0.9,0,1)
    for j, m in enumerate(ch):
        f = hz(m); amp = 0.5 if j == 0 else 0.22
        for det in (-0.6, 0.6):
            ph = 2*np.pi*(f+det)*t
            pad += env*amp*(np.sin(ph) + 0.25*np.sin(2*ph) + 0.08*np.sin(3*ph))
# slow shimmer + gentle pulse
pad *= 0.85 + 0.15*np.sin(2*np.pi*0.5*t)
pulse = np.zeros_like(t)
for b in np.arange(0.0, DUR, 0.5):           # soft heartbeat on every beat (120 bpm)
    k = t >= b; d = t[k]-b
    pulse[k] += 0.35*np.sin(2*np.pi*55*d)*np.exp(-d*9)
music = pad/np.max(np.abs(pad))*0.6 + pulse*0.5
# chimes: gold board lands (5.45s) and call bar (10.25s)
for at, notes in ((5.45, [86, 93]), (10.25, [81, 88, 93])):
    for n, m in enumerate(notes):
        k = t >= at + n*0.09; d = t[k]-(at + n*0.09)
        music[k] += 0.32*np.sin(2*np.pi*hz(m)*d)*np.exp(-d*3.2)
# fades
music *= np.clip(t/1.2,0,1) * np.clip((DUR-t)/1.3,0,1)
music /= np.max(np.abs(music))+1e-9; music *= 0.8
sf.write(f"voice_{voice}.wav", vo, SR); sf.write("music.wav", music, SR)
