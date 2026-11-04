# Voice-over (English, 15s video)

Voice: Kokoro TTS (open source, runs locally). Model files from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 (kokoro-v1.0.onnx, voices-v1.0.bin).

Script (cue in seconds):
| Cue | Line |
|---|---|
| 0.45 | "DHA Margalla Orchards. Park Road, Islamabad." |
| 3.85 | "Not seven point three crore. Just three point five!" |
| 6.95 | "Save over three point eight crore, on one kanal." |
| 9.35 | "Call WH Ventures: 0331-5223726." |

```
pip install kokoro-onnx soundfile
python vo.py am_fenrir 1.12      # male   (af_heart = female)
python mix.py am_fenrir          # places lines on cues + builds the music bed
```
Then mix onto the video with ffmpeg (voice compressed, music side-chain ducked, loudnorm -14 LUFS).
