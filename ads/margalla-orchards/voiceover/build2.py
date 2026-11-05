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
# stereo room IR
rng = np.random.default_rng(3); n = int(SR*1.1); tt = np.arange(n)/SR; ir = []
for ch in range(2):
    x = rng.standard_normal(n)*np.exp(-tt*6.5); x[:int(SR*0.015)] = 0
    k = np.exp(-np.arange(64)/9.0); x = np.convolve(x, k/k.sum(), mode="same"); ir.append(x/np.abs(x).max())
irf = f"{vdir}/room_ir.wav"
with wave.open(irf, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.stack(ir,1)*0.5*32767).astype(np.int16).tobytes())

# mastered mix (same chain as master.py): denoise, de-ess, compress, room, ducked music, limiter, -16 LUFS
N = len(files); ins = []; fl = []
for i, f in enumerate(files):
    ins += ["-i", f]
    fl.append(f"[{i+1}:a]aresample={SR},afftdn=nr=14:nf=-48:tn=1,afade=t=in:d=0.015,areverse,afade=t=in:d=0.12,areverse,adelay={int(S[i]*1000)}:all=1[l{i}]")
mi, ii = N+1, N+2
fc = ";".join(fl) + ";" + "".join(f"[l{i}]" for i in range(N)) + f"amix=inputs={N}:normalize=0,apad=whole_dur={END}," \
 "highpass=f=90,equalizer=f=280:t=q:w=1.1:g=-2.5,equalizer=f=4200:t=q:w=1.4:g=-1.5,highshelf=f=8000:g=-2.5," \
 "deesser=i=0.8:m=0.55:f=0.45:s=o,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=180:knee=4:makeup=2," \
 "aformat=channel_layouts=mono,asplit=3[vdry][vrv][sc];" \
 f"[vrv]pan=stereo|c0=c0|c1=c0[vrs];[vrs][{ii}:a]afir=dry=0:wet=10[rv0];[rv0]volume=0.16[rv];[vdry]pan=stereo|c0=c0|c1=c0[vd];" \
 f"[{mi}:a]aresample={SR},equalizer=f=2500:t=q:w=1.0:g=-4,volume=0.68,asplit=2[mL][mR0];[mR0]adelay=11[mR];[mL][mR]join=inputs=2:channel_layout=stereo[mus];" \
 "[sc]pan=stereo|c0=c0|c1=c0[sc2];[mus][sc2]sidechaincompress=threshold=0.07:ratio=2:attack=35:release=1000:knee=6[duck];" \
 f"[vd][rv][duck]amix=inputs=3:normalize=0,acompressor=threshold=-18dB:ratio=1.6:attack=20:release=250:makeup=1,alimiter=limit=0.89:attack=5:release=60," \
 f"loudnorm=I=-16:TP=-2:LRA=8,aresample={SR},alimiter=limit=0.75:attack=2:release=50:level=disabled[a]"
subprocess.run(["ffmpeg","-v","error","-y","-i",silent,*ins,"-i",mf,"-i",irf,"-filter_complex",fc,"-map","0:v","-map","[a]",
    "-c:v","copy","-c:a","aac","-b:a","192k","-t",str(END),"-movflags","+faststart",out], check=True)
os.remove(silent); print("wrote", out)
