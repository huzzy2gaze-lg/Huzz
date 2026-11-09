# Broadcast-style voice master (v2): fixes the "phone" sound of the cloned voice.
# usage: python3 master_pro.py <voice_dir> <prefix> <starts csv> <end> <music.wav> <video_in> <video_out>
#   expects <voice_dir>/<prefix>_0..N.wav (silence-trimmed lines); takes only the picture from video_in.
#
# Measured on the raw clone (vs 1 kHz): +5 dB boxy low-mids (100-350 Hz), -13 dB at 2.5-4 kHz, -21 dB at 4-6 kHz,
# and almost nothing above 12 kHz (phone / low-bitrate bandwidth). The chain:
#   1. 24 dB/oct high-pass at 85 Hz (rumble, plosives)
#   2. light spectral denoise + soft gate (keeps pauses clean once compression lifts them)
#   3. subtractive EQ: -3 dB 140 Hz, -4.5 dB 230 Hz (box), -2.5 dB 430 Hz (honk)
#   4. presence: +5 dB 3.2 kHz, +4 dB 5.6 kHz
#   5. harmonic exciter from 5.5 kHz up to 16 kHz + high shelf +4 dB at 9.5 kHz (rebuilds the missing "air")
#   6. de-esser after the brightening
#   7. two compressors: fast 3:1 for control, slow 2:1 for a steady level
#   8. no room reverb (dry and close, like a studio booth)
# Music: cut 2-4 kHz so the voice sits in front, ducked under speech. Bus: glue, limiter, -14 LUFS / -1.5 dBTP.
import sys, glob, subprocess, os
vdir, prefix, starts, END, music, vin, vout = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(',')], float(sys.argv[4]), sys.argv[5], sys.argv[6], sys.argv[7]
files = sorted(glob.glob(f"{vdir}/{prefix}_[0-9].wav"))
assert len(files) == len(starts), (files, starts)
SR = 48000
VOICE = ("highpass=f=85:p=2,highpass=f=85:p=2,afftdn=nr=12:nf=-50:tn=1,"
         "agate=threshold=0.02:ratio=3:range=0.08:attack=4:release=140:knee=3,"
         "equalizer=f=140:t=q:w=1.0:g=-3,equalizer=f=230:t=q:w=0.9:g=-4.5,equalizer=f=430:t=q:w=1.2:g=-2.5,"
         "equalizer=f=3200:t=q:w=0.9:g=5,equalizer=f=5600:t=q:w=1.0:g=4,"
         "aexciter=amount=2:drive=6:blend=0:freq=5500:ceil=16000,highshelf=f=9500:g=4,"
         "deesser=i=0.6:m=0.5:f=0.5:s=o,"
         "acompressor=threshold=-24dB:ratio=3:attack=3:release=70:knee=3:makeup=3,"
         "acompressor=threshold=-14dB:ratio=2:attack=15:release=160:makeup=1")
N = len(files); ins = []; fl = []
for i, f in enumerate(files):
    ins += ["-i", f]
    fl.append(f"[{i+1}:a]aresample={SR},afade=t=in:d=0.01,areverse,afade=t=in:d=0.08,areverse,adelay={int(starts[i]*1000)}:all=1[l{i}]")
mi = N + 1
fc = ";".join(fl) + ";" + "".join(f"[l{i}]" for i in range(N)) + f"amix=inputs={N}:normalize=0,apad=whole_dur={END}," + VOICE + \
  ",aformat=channel_layouts=mono,asplit=2[vo][sc];" \
  "[vo]pan=stereo|c0=c0|c1=c0[vs];" \
  f"[{mi}:a]aresample={SR},highpass=f=40,equalizer=f=250:t=q:w=1.0:g=-2,equalizer=f=3000:t=q:w=0.8:g=-6,volume=0.55,asplit=2[mL][mR0];" \
  "[mR0]adelay=11[mR];[mL][mR]join=inputs=2:channel_layout=stereo[mus];" \
  "[sc]pan=stereo|c0=c0|c1=c0[sc2];[mus][sc2]sidechaincompress=threshold=0.05:ratio=3:attack=25:release=600:knee=6[duck];" \
  "[vs][duck]amix=inputs=2:normalize=0,acompressor=threshold=-16dB:ratio=1.5:attack=25:release=250:makeup=1," \
  f"alimiter=limit=0.9:attack=4:release=50,loudnorm=I=-14:TP=-1.5:LRA=7,aresample={SR},alimiter=limit=0.82:attack=2:release=40:level=disabled[a]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", vin, *ins, "-i", music, "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", str(SR), "-t", str(END), "-movflags", "+faststart", vout], check=True)
print("wrote", vout)
