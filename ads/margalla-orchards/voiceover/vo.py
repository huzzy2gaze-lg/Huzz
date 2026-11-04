import sys, json, soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
LINES = [
 "D. H. A. Margalla Orchards. Park Road, Islamabad.",
 "Not seven point three crore. Just three point five!",
 "Save over three point eight crore, on one kanal.",
 "Call W. H. Ventures: zero three three one, five two two, three seven two six.",
]
voice = sys.argv[1]; speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
out = []
for i, t in enumerate(LINES):
    a, sr = k.create(t, voice=voice, speed=speed, lang="en-us" if voice[0]=="a" else "en-gb")
    sf.write(f"{voice}_{i}.wav", a, sr); out.append(round(len(a)/sr, 2))
print(voice, speed, out, sum(out))
