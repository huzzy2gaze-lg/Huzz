# Voice-over (English, 15s video)

**Engine: ElevenLabs** (`eleven_multilingual_v2`). API key is injected by the session's network proxy
(saved as a network secret for api.elevenlabs.io), so scripts send `xi-api-key: proxy-injected`.

Script (natural pace; words spelled the Pakistani way: karor = crore, kanaal = kanal):
1. "DHA Margalla Orchards. Park Road, Islamabad."
2. "Not seven point three karor... Just three point five!"
3. "Save over three point eight karor on one kanaal. Right opposite COMSATS, just ten minutes from Faizabad."
4. "Call WH Ventures today: 0331-5223726. Limited plots!"

The video length follows the voice (~24-25s): `build.py` places the lines with 0.45s gaps and maps
the 15s animation timeline onto them (gold board on "three point five", checklist on "COMSATS",
call bar on "Call WH Ventures"), generates a matching music bed, ducks it and normalises to -14 LUFS.
```
python el.py <voice_id> <tag> 1.0        # writes <tag>_0..3.mp3 (then trim silences to .wav)
python build.py <tag> <dir-with-wavs>    # renders video/WH-Margalla-Sunrise_EN_Video-9x16_Voiceover-<Tag>.mp4
```
Ready-made voices used: George `JBFqnCBsd6RMkjVDRZzb` (British, warm), Brian `nPczCjzI2devNBz1zQrb` (deep, American).
`vo.py`/`mix.py` are the earlier Kokoro (local) attempt; mix.py also generates the music bed (music.wav).
