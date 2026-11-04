# Voice-over (English, 15s video)

**Engine: ElevenLabs** (`eleven_multilingual_v2`). API key is injected by the session's network proxy
(saved as a network secret for api.elevenlabs.io), so scripts send `xi-api-key: proxy-injected`.

Script — words spelled phonetically so they're said the Pakistani way (karor = crore, kanaal = kanal):
| Cue | Line |
|---|---|
| 0.40s | "DHA Margalla Orchards, Park Road, Islamabad." |
| 3.70s | "Not seven point three karor. Just three point five!" |
| 6.85s | "Save over three point eight karor, on one kanaal." |
| 9.80s | "Call WH Ventures: 0331-5223726." |

```
python el.py <voice_id> <tag> 1.15      # writes <tag>_0..3.mp3
# trim silences to <tag>_N.wav (ffmpeg silenceremove), then:
./mixel.sh <tag> out.mp4                # places lines on cues, ducked music bed, -14 LUFS
```
Ready-made voices used: George `JBFqnCBsd6RMkjVDRZzb` (British, warm), Brian `nPczCjzI2devNBz1zQrb` (deep, American).
`vo.py`/`mix.py` are the earlier Kokoro (local) attempt; mix.py also generates the music bed (music.wav).
