import time, os, sys
sys.path.insert(0, r"E:\AI\tests\setup_check")
import run_images as base
from PIL import Image, ImageDraw, ImageFont

OUT = r"E:\AI\tests\wh_gate"
PROMPT = ("Keep this exact photograph: the same camera position, lens, framing, perspective and horizon, the same concrete gate beam, "
"the same white letters MARGALLA ORCHARDS exactly as they are, the same central pillar and the same road. Show the gate finished at "
"early dusk: no scaffolding, no red concrete pump, no green net, no workers, no truck; the central pillar clad in honey-beige limestone "
"panels with thin dark joints and a polished dark granite base; the beam finished in smooth light-grey stone with a row of warm white "
"downlights underneath; warm golden uplights wash the pillar; a neat kerb and planted median with trimmed grass, low green shrubs and "
"young date palms at the pillar's base; fresh dark asphalt with crisp white lane markings; clear dusk sky from deep blue to soft orange "
"at the horizon, the low forested ridge of the Margalla Hills faint in the haze. A Pakistani housing-scheme entrance in Islamabad, not "
"European. Realistic architectural photograph, natural colours, slight film grain, no people, no other text, no logos, no watermarks.")
W, H = 768, 1344

def wf(seed):
    w = base.klein(f"whgate_{seed}")
    w["5"]["inputs"]["text"] = PROMPT
    w["20"] = {"class_type": "LoadImage", "inputs": {"image": "gate_real.jpg"}}
    w["21"] = {"class_type": "ImageScaleToTotalPixels", "inputs": {"image": ["20", 0], "upscale_method": "lanczos", "megapixels": 1.0, "resolution_steps": 16}}
    w["22"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["21", 0], "vae": ["3", 0]}}
    w["23"] = {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["5", 0], "latent": ["22", 0]}}
    w["6"]["inputs"]["conditioning"] = ["23", 0]
    w["11"]["inputs"]["noise_seed"] = seed
    w["7"]["inputs"]["width"], w["7"]["inputs"]["height"] = W, H
    w["13"]["inputs"]["width"], w["13"]["inputs"]["height"] = W, H
    return w

real = Image.open(os.path.join(OUT, "gate_real_768x1344.jpg")).convert("RGB")
res = []
for s in (101, 202, 303):
    t = time.time()
    h = base.wait(base.post(wf(s)))
    img = h["outputs"]["10"]["images"][0]
    src = os.path.join(r"E:\AI\ComfyUI_windows_portable\ComfyUI\output", img.get("subfolder", ""), img["filename"])
    im = Image.open(src).convert("RGB")
    dst = os.path.join(OUT, f"flux_finished_seed{s}.png"); im.save(dst)
    Image.blend(real, im.resize(real.size), 0.5).save(os.path.join(OUT, f"overlay_seed{s}.jpg"), quality=90)
    print("seed", s, round(time.time() - t, 1), "s", im.size, flush=True)
    res.append((s, im))

tw, th = 384, 672
sheet = Image.new("RGB", (tw * 4, th + 30), "white"); d = ImageDraw.Draw(sheet)
try: f = ImageFont.truetype("arial.ttf", 18)
except Exception: f = ImageFont.load_default()
for i, (lab, im) in enumerate([("REAL", real)] + [(f"seed {s}", im) for s, im in res]):
    sheet.paste(im.resize((tw, th)), (i * tw, 30)); d.text((i * tw + 6, 6), lab, fill="black", font=f)
sheet.save(os.path.join(OUT, "_flux_compare.jpg"), quality=90)
open(os.path.join(OUT, "flux_prompt.txt"), "w", encoding="utf-8").write(PROMPT)
print("FLUX DONE")
