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

STATUS: see the section below.

**Waiting for RAM (14:48 PKT).** LTX needs 7 GB free RAM; the PC had only 4.6–4.9 GB free for 25 min (Chrome uses ~3 GB). A watcher on the PC starts the render as soon as 7 GB is free. Video, tiles and verdict will be added here.
