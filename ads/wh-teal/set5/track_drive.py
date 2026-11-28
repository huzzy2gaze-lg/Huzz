# Tracked "today → finished" sweep on the moving gate clip, ending exactly on the frame the AI drive-through starts from.
# The finished frame was made (AI edit) from one frame of the clip itself (the reference frame). For every earlier
# frame, SIFT matches (upper part of the picture: gate, trees, horizon) give a homography ref → frame (RANSAC, smoothed),
# which carries the finished frame, and the vertical 9:16 crop window, along with the camera.
# usage: python3 track_drive.py <clip.mp4> <ref_index> <future.png> <crop_cx_at_ref> <sweep_start_s> <out_dir> [G.npy]
# G.npy (optional): a fixed 2x3 similarity that maps the real reference frame onto the finished frame, for when the AI
# edit shifted the picture; every real frame is reframed by it (the sky is extended into the gap at the top).
import sys, os, cv2, numpy as np
clip, REF, fut_p, CX, SW0, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
G = np.load(sys.argv[7]) if len(sys.argv) > 7 else None
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(clip); fps = cap.get(cv2.CAP_PROP_FPS)
frames = []
for i in range(REF + 1):
    ok, f = cap.read()
    if G is not None: f = cv2.warpAffine(f, G, (f.shape[1], f.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    frames.append(f)
R = frames[REF]; Hh, Ww = R.shape[:2]
F = cv2.resize(cv2.imread(fut_p), (Ww, Hh), interpolation=cv2.INTER_LANCZOS4)
S = 0.5; sift = cv2.SIFT_create(6000); flann = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=60))
def feats(img):
    g = cv2.cvtColor(cv2.resize(img, None, fx=S, fy=S), cv2.COLOR_BGR2GRAY); m = np.zeros_like(g); m[: int(g.shape[0] * 0.62), :] = 255
    return sift.detectAndCompute(g, m)
kr, dr = feats(R)
C = np.float32([[0, 0], [Ww, 0], [Ww, Hh], [0, Hh]]).reshape(-1, 1, 2); pts = []
for i, f in enumerate(frames):
    if i == REF: pts.append(C.reshape(-1)); continue
    kf, df = feats(f); m = [a for a, b in flann.knnMatch(dr, df, k=2) if a.distance < 0.72 * b.distance]
    src = np.float32([kr[x.queryIdx].pt for x in m]) / S; dst = np.float32([kf[x.trainIdx].pt for x in m]) / S
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    pts.append(cv2.perspectiveTransform(C, H).reshape(-1)); print(i, len(m), int(inl.sum()), flush=True)
pts = np.array(pts); k = 3
sm = np.array([pts[max(0, i - k):i + k + 1].mean(0) for i in range(len(pts))]); sm[REF] = C.reshape(-1)   # the last frame is exact
cw = int(Hh * 9 / 16)
for i, f in enumerate(frames):
    H = cv2.getPerspectiveTransform(C.reshape(-1, 2), sm[i].reshape(-1, 2).astype(np.float32))
    warp = cv2.warpPerspective(F, H, (Ww, Hh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    cx = cv2.perspectiveTransform(np.float32([[[CX, Hh * 0.5]]]), H).reshape(-1)[0]        # crop follows the gate
    x0 = int(np.clip(cx - cw / 2, 0, Ww - cw))
    t = i / fps; k01 = np.clip((t - SW0) / max(0.01, REF / fps - SW0), 0, 1); k01 = k01 * k01 * (3 - 2 * k01)
    real = cv2.resize(f[:, x0:x0 + cw], (1080, 1920), interpolation=cv2.INTER_AREA)
    fut = cv2.resize(warp[:, x0:x0 + cw], (1080, 1920), interpolation=cv2.INTER_AREA)
    if k01 <= 0: fr = real
    elif k01 >= 1: fr = fut
    else:   # soft-edged sweep from left to right with a warm light line
        X = int(k01 * (1080 + 240)) - 120; xs = np.arange(1080)[None, :, None]
        a = np.clip((X - xs) / 60.0 + 0.5, 0, 1).astype(np.float32)
        fr = (fut * a + real * (1 - a)).astype(np.float32)
        glow = np.exp(-((xs - X) / 22.0) ** 2)[..., :1] * 1.0 + np.exp(-((xs - X) / 80.0) ** 2)[..., :1] * 0.35
        fr = np.clip(fr + glow * np.array([160, 226, 255], np.float32), 0, 255).astype(np.uint8)
    cv2.imwrite(f"{out}/f{i:04d}.jpg", fr, [cv2.IMWRITE_JPEG_QUALITY, 94])
print("wrote", len(frames), "frames, fps", fps)
