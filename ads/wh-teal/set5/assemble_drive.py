# Assemble the tracked gate shot: real approach (slowed) → tracked light sweep → AI drive through the finished gate.
# usage: python3 assemble_drive.py <tracked_frames_dir> <drive_through.mp4> <sweep_start_s> <out.mp4>
# The tracked frames end exactly on the AI video's first frame, so the cut between them is invisible.
import sys, os, glob, subprocess, tempfile
from PIL import Image, ImageDraw, ImageFont
fr_dir, ai, SW0, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
W, H, FPS = 1080, 1920, 30
SLOW = 0.6                       # the real part plays at 60% speed (frames interpolated)
tmp = tempfile.mkdtemp(prefix="asm-")
# 1. tracked frames → slowed clip
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS * SLOW), "-i", f"{fr_dir}/f%04d.jpg",
                "-vf", f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:vsbmc=1", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p", f"{tmp}/a.mp4"], check=True)
# 2. AI drive-through → 1080x1920, 30 fps
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ai, "-vf", f"scale={W}:{H}:flags=lanczos,fps={FPS}", "-c:v", "libx264", "-crf", "14",
                "-pix_fmt", "yuv420p", f"{tmp}/b.mp4"], check=True)
dur = lambda p: float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout)
da = dur(f"{tmp}/a.mp4")
os.makedirs(f"{tmp}/fr")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{tmp}/a.mp4", "-i", f"{tmp}/b.mp4", "-filter_complex", "[0:v][1:v]concat=n=2:v=1[v]", "-map", "[v]",
                "-q:v", "2", f"{tmp}/fr/%05d.jpg"], check=True)
# 3. labels: TODAY while the real site shows, ARTIST'S IMPRESSION once the sweep has passed
FB, FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
GOLD, TEAL = (210, 167, 70), (11, 58, 64)
clamp = lambda t: max(0.0, min(1.0, t))
sw_mid = (SW0 + 0.5 * (51 / 30 - SW0)) / SLOW
def label(d, text, sub, a, red):
    if a <= 0: return
    f1, f2 = ImageFont.truetype(FB, 40), ImageFont.truetype(FR, 30); tw = d.textlength(text, font=f1)
    d.rounded_rectangle((60, 150, 60 + tw + 86, 226), 38, fill=(*TEAL, int(215 * a)), outline=(*GOLD, int(255 * a)), width=3)
    d.ellipse((86, 178, 106, 198), fill=((229, 72, 77) if red else GOLD) + (int(255 * a),))
    d.text((120, 165), text, font=f1, fill=(234, 241, 238, int(255 * a)))
    d.text((64, 245), sub, font=f2, fill=(234, 241, 238, int(230 * a)), stroke_width=2, stroke_fill=(6, 37, 42, int(200 * a)))
files = sorted(glob.glob(f"{tmp}/fr/*.jpg"))
scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(scrim)
for i in range(420): sd.line([(0, H - i), (W, H - i)], fill=(6, 37, 42, int(190 * (1 - i / 420) ** 1.5)))
for n, p in enumerate(files):
    t = n / FPS; im = Image.open(p).convert("RGBA"); im = Image.alpha_composite(im, scrim)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    label(d, "TODAY", "Filmed at the site, Nov 2026", 1 - clamp((t - (sw_mid - 0.3)) / 0.3), True)
    label(d, "ARTIST'S IMPRESSION", "The finished gate", clamp((t - (sw_mid + 0.4)) / 0.4), False)
    d.text((60, H - 330), "Margalla Orchards", font=ImageFont.truetype(FB, 60), fill=(234, 241, 238, 255))
    d.text((60, H - 250), "Main Park Road, Islamabad", font=ImageFont.truetype(FR, 34), fill=(227, 201, 141, 255))
    Image.alpha_composite(im, ov).convert("RGB").save(p, quality=93)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", f"{tmp}/fr/%05d.jpg", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", out], check=True)
print("wrote", out, "real part", round(da, 2), "s, total", round(len(files) / FPS, 2), "s")
