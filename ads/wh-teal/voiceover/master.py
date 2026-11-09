# Mastered mix: de-essed, denoised, warmer voice glued into the music with a short stereo room.
# usage: python3 master.py <voice_dir> <tag> <starts csv> <end> <music.wav> <video_in> <video_out>
import sys, subprocess, numpy as np, wave
vdir, tag, starts, END, music, vin, vout = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(',')], float(sys.argv[4]), sys.argv[5], sys.argv[6], sys.argv[7]
SR = 48000
# --- stereo room impulse response: 15 ms pre-delay, ~0.9 s decay, darkened ---
rng = np.random.default_rng(3); n = int(SR*1.1); t = np.arange(n)/SR
ir = []
for ch in range(2):
    x = rng.standard_normal(n) * np.exp(-t*6.5)
    x[:int(SR*0.015)] = 0
    k = np.exp(-np.arange(64)/9.0); x = np.convolve(x, k/k.sum(), mode="same")   # soften highs
    ir.append(x/np.abs(x).max())
ir = np.stack(ir, 1) * 0.5
with wave.open(f"{vdir}/room_ir.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((ir*32767).astype(np.int16).tobytes())

ins, fl = [], []
for i in range(4):
    ins += ["-i", f"{vdir}/{tag}_{i}.wav"]
    fl.append(f"[{i+1}:a]aresample={SR},afftdn=nr=14:nf=-48:tn=1,afade=t=in:d=0.015,areverse,afade=t=in:d=0.12,areverse,adelay={int(starts[i]*1000)}:all=1[l{i}]")
fc = ";".join(fl) + f""";
[l0][l1][l2][l3]amix=inputs=4:normalize=0,apad=whole_dur={END},
 highpass=f=90,equalizer=f=280:t=q:w=1.1:g=-2.5,equalizer=f=4200:t=q:w=1.4:g=-1.5,highshelf=f=8000:g=-2.5,
 deesser=i=0.8:m=0.55:f=0.45:s=o,
 acompressor=threshold=-22dB:ratio=2.5:attack=8:release=180:knee=4:makeup=2,
 aformat=channel_layouts=mono,asplit=3[vdry][vrv][sc];
[vrv]pan=stereo|c0=c0|c1=c0,afir=dry=0:wet=10[rv0];[rv0]volume=0.16[rv];
[vdry]pan=stereo|c0=c0|c1=c0[vd];
[5:a]aresample={SR},equalizer=f=2500:t=q:w=1.0:g=-4,volume=0.68,asplit=2[mL][mR0];
[mR0]adelay=11[mR];[mL][mR]join=inputs=2:channel_layout=stereo[mus];
[sc]pan=stereo|c0=c0|c1=c0[sc2];
[mus][sc2]sidechaincompress=threshold=0.07:ratio=2:attack=35:release=1000:knee=6[duck];
[vd][rv][duck]amix=inputs=3:normalize=0,
 acompressor=threshold=-18dB:ratio=1.6:attack=20:release=250:makeup=1,
 alimiter=limit=0.89:attack=5:release=60,loudnorm=I=-16:TP=-2:LRA=8,aresample={SR},alimiter=limit=0.75:attack=2:release=50:level=disabled[a]"""
fc = fc.replace("\n", "")
subprocess.run(["ffmpeg","-v","error","-y","-i",vin,*ins,"-i",music,"-i",f"{vdir}/room_ir.wav","-filter_complex",
    fc.replace("afir=dry=0:wet=10","[6:a]afir=dry=0:wet=10").replace("[vrv]pan=stereo|c0=c0|c1=c0,[6:a]afir","[vrv]pan=stereo|c0=c0|c1=c0[vrs];[vrs][6:a]afir"),
    "-map","0:v","-map","[a]","-c:v","copy","-c:a","aac","-b:a","192k","-t",str(END),"-movflags","+faststart",vout], check=True)
print("wrote", vout)
