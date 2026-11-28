# Test clips for "real site → finished project" (ad set 5), 9:16, 8 s, 30 fps.
#   python3 compose_test.py sweep <real.jpg> <future.png> <out.mp4>       method A: real photo → light-sweep reveal of the finished frame
#   python3 compose_test.py build <real.jpg> <stages_dir> <out.mp4>       method C: real photo → Blender build-up stages
# Labels say "TODAY" over the real photo and "ARTIST'S IMPRESSION" over anything that is not built yet.
import sys, os, glob, subprocess, tempfile, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
mode, real_p, fut_p, out = sys.argv[1:5]
W, H, FPS, DUR = 1080, 1920, 30, 8.0
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
GOLD = (210, 167, 70); TEAL = (11, 58, 64)

def fit(im):  # cover-crop to 1080x1920
    im = im.convert("RGB"); r = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))

def push(im, z):  # zoom in by z around the centre
    w, h = round(W / z), round(H / z); x, y = (W - w) // 2, (H - h) // 2
    return im.crop((x, y, x + w, y + h)).resize((W, H), Image.BICUBIC)

ease = lambda t: t * t * (3 - 2 * t)
clamp = lambda t: max(0.0, min(1.0, t))

def label(im, text, sub, alpha):
    if alpha <= 0: return im
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    f1, f2 = ImageFont.truetype(FB, 40), ImageFont.truetype(FR, 30)
    tw = d.textlength(text, font=f1); pad = 26
    d.rounded_rectangle((60, 150, 60 + tw + 2 * pad + 34, 150 + 76), 38, fill=(*TEAL, int(215 * alpha)), outline=(*GOLD, int(255 * alpha)), width=3)
    d.ellipse((60 + pad, 150 + 28, 60 + pad + 20, 150 + 48), fill=((229, 72, 77) if text == "TODAY" else GOLD) + (int(255 * alpha),))
    d.text((60 + pad + 34, 150 + 15), text, font=f1, fill=(234, 241, 238, int(255 * alpha)))
    if sub: d.text((64, 245), sub, font=f2, fill=(234, 241, 238, int(230 * alpha)), stroke_width=2, stroke_fill=(6, 37, 42, int(200 * alpha)))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")

def caption(im, line1, line2):
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    for i in range(420):  # bottom scrim
        d.line([(0, H - i), (W, H - i)], fill=(6, 37, 42, int(200 * (1 - i / 420) ** 1.5)))
    d.text((60, H - 330), line1, font=ImageFont.truetype(FB, 60), fill=(234, 241, 238, 255))
    d.text((60, H - 250), line2, font=ImageFont.truetype(FR, 34), fill=(227, 201, 141, 255))
    return Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")

real = fit(Image.open(real_p))
tmp = tempfile.mkdtemp(prefix="c5-")
N = int(DUR * FPS)
if mode == "sweep":
    fut = fit(Image.open(fut_p))
    for f in range(N):
        t = f / FPS; z = 1.0 + 0.10 * (t / DUR)
        a, b = push(real, z), push(fut, z)
        k = ease(clamp((t - 2.4) / 1.6))                 # sweep position 0 → 1 between 2.4 s and 4.0 s
        if k <= 0: fr = a
        elif k >= 1: fr = b
        else:
            x = int(k * (W + 240)) - 120
            m = Image.new("L", (W, H), 0); ImageDraw.Draw(m).rectangle((0, 0, max(0, x), H), fill=255) if x > 0 else None
            m = m.filter(ImageFilter.GaussianBlur(30))
            fr = Image.composite(b, a, m)
            glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
            for w_, al in ((70, 50), (24, 120), (6, 255)):
                gd.rectangle((x - w_, 0, x + w_, H), fill=(255, 226, 160, al))
            fr = Image.alpha_composite(fr.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(10))).convert("RGB")
        fr = caption(fr, "Margalla Orchards gate", "Main Park Road, Islamabad")
        fr = label(fr, "TODAY", "Filmed at the site, Nov 2026", 1 - clamp((t - 2.6) / 0.4))
        fr = label(fr, "ARTIST'S IMPRESSION", "The finished gate", clamp((t - 3.6) / 0.5))
        fr.save(f"{tmp}/f{f:04d}.jpg", quality=92)
else:
    st = [fit(Image.open(p)) for p in sorted(glob.glob(os.path.join(fut_p, "s*.png")))]
    for f in range(N):
        t = f / FPS; z = 1.0 + 0.10 * (t / DUR)
        if t < 2.0: fr = push(real, z)
        else:
            u = clamp((t - 2.0) / 5.0) * (len(st) - 1); i = min(int(u), len(st) - 2); w = u - i
            cg = Image.blend(push(st[i], z), push(st[i + 1], z), w)
            fr = Image.blend(push(real, z), cg, ease(clamp((t - 2.0) / 0.8)))
        fr = caption(fr, "Margalla Orchards gate", "Main Park Road, Islamabad")
        fr = label(fr, "TODAY", "Filmed at the site, Nov 2026", 1 - clamp((t - 2.0) / 0.4))
        fr = label(fr, "ARTIST'S IMPRESSION", "The finished gate (3D)", clamp((t - 2.6) / 0.5))
        fr.save(f"{tmp}/f{f:04d}.jpg", quality=92)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", f"{tmp}/f%04d.jpg", "-c:v", "libx264", "-crf", "18",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", out], check=True)
print("wrote", out)
