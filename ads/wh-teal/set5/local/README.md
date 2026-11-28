# Set 5 gate transition — local models test (Dell G15, RTX 3060 6 GB, 16 GB RAM)

One of three methods for the "real site → finished gate" shot (others: Higgsfield cloud, Blender).

## Step 1 — finished frame, FLUX.2 klein 4B edit mode (ComfyUI)

- Input: `../plates/gate_real_768x1344.jpg` (Higgsfield frame NOT used as input).
- Graph: LoadImage → ImageScaleToTotalPixels (1 MP, lanczos) → VAEEncode (flux2-vae) → ReferenceLatent on the text conditioning → BasicGuider; euler, Flux2Scheduler, 4 steps, cfg 1, 768x1344.
- Model: flux-2-klein-4b-fp8, text encoder qwen_3_4b, ComfyUI `--lowvram`.
- Seeds: 101, 202, 303. Time: 32 s (first, includes load), then 22 s each.
- Script: `run_flux_edit.py`.

Prompt:

> Keep this exact photograph: the same camera position, lens, framing, perspective and horizon, the same concrete gate beam, the same white letters MARGALLA ORCHARDS exactly as they are, the same central pillar and the same road. Show the gate finished at early dusk: no scaffolding, no red concrete pump, no green net, no workers, no truck; the central pillar clad in honey-beige limestone panels with thin dark joints and a polished dark granite base; the beam finished in smooth light-grey stone with a row of warm white downlights underneath; warm golden uplights wash the pillar; a neat kerb and planted median with trimmed grass, low green shrubs and young date palms at the pillar's base; fresh dark asphalt with crisp white lane markings; clear dusk sky from deep blue to soft orange at the horizon, the low forested ridge of the Margalla Hills faint in the haze. A Pakistani housing-scheme entrance in Islamabad, not European. Realistic architectural photograph, natural colours, slight film grain, no people, no other text, no logos, no watermarks.

### Result

- `flux_compare_real_vs_seeds.jpg`: real frame next to the 3 seeds.
- `flux_overlays_50pct.jpg`: each seed over the real frame at 50%.
- **Pick: seed 303.** Letters, beam edge and pillar line up almost exactly with the real frame. It also has the row of beam downlights and lit letters.
- Seed 101: also well aligned; has the planted median kerb, but no beam downlights.
- Seed 202: pillar drawn wider than the real one.
- Letters: clean "MARGALLA ORCHARDS" in all 3 seeds. Not garbled.
- Weak points (all seeds): no white lane markings, road texture is the same as the real (tyre marks kept), Margalla ridge is a bit too tall and peaky, no granite base visible in 101.

## Step 2 — video, LTX-2.3 first + last frame (WanGP)

- WanGP's LTX-2 handler supports start and end image (`image_prompt_type: "SE"`).
- Job: `ltx_flf.json` — ltx2_22B_distilled_gguf_q4_k_m, 544x960, 121 frames (~5 s), 8 steps, seed 11, start = real frame, end = FLUX seed 303.

- Run: WanGP `--profile 5` (Very low RAM, models sent to the GPU part by part). Free RAM was only ~5 GB (Chrome open), so profile 4 + the 7 GB rule blocked it. Profile 5 ran fine: GPU 99%, ~2 GB VRAM used, free RAM fell to ~250 MB but nothing crashed.
- Time: 4 min 16 s generation, 5 min 27 s total with model load. 8 steps at ~17 s each.
- Output: `ltx23_flf_512x896.mp4` — WanGP rounded 544x960 down to **512x896**, 24 fps, 5.04 s, with audio.
- Tiles: `ltx23_flf_tile.jpg` (3x2, one frame per second), `ltx23_flf_tile_dense.jpg` (5x2, every 0.5 s).

## Step 3 — check

- Camera: **stays locked.** No pan, no zoom, beam and pillar stay in the same place for all 5 s. (Real photo plates hold much better than 2D doodle art did.)
- Letters: **readable in every frame**, no warping.
- Real look: good. Reads as a real photo. Small cars and specks appear and vanish near the gate in the middle.
- Timing (main weak point): the build is **front-loaded** — scaffolding is gone and the stone pillar is there by ~1 s. Then ~3 s of near-static daylight. Then the dusk light, hills and pillar uplights **pop in during the last ~0.5 s**. It does not "sweep up" or switch lights on one by one.
- Sound: wind and ambience present (not checked in detail).
- No VRAM errors.

## Verdict

Local LTX-2.3 first+last frame **works** for this shot: locked camera, clean letters, real look, ~5 min per try, free. It is weaker than a good cloud result on **pacing**: the change is fast at the start and the dusk snaps at the end. Fix ideas: (1) retime in edit — slow the first 1.5 s with minterpolate and cut the static middle; (2) add a middle keyframe (finished pillar in daylight) at frame ~60 so the dusk change spreads over the second half; (3) try 2-3 more seeds. Usable as a draft or B-roll; for the hero shot compare against the Higgsfield and Blender versions.
