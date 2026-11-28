# Pin the finished-gate frame onto the moving gate clip (2D tracking), as a test of the "tracked" transition.
# For every frame of the clip, SIFT features of the gate are matched to the straight-on photo the finished frame was
# made from; a homography (RANSAC, smoothed over time) warps the finished frame onto the moving shot.
# usage: python3 track_gate.py <photo.jpg> <future.png> <clip.mp4> <t_end> <out_dir>
#   photo   = IMG_0917 developed (4032x3024); future = the finished 9:16 frame made from its crop (x 1351, w 1701)
# Writes <out_dir>/real_NNNN.jpg and fut_NNNN.jpg (landscape, 1920x1080) plus track.json (gate centre per frame).
import sys, os, json, cv2, numpy as np
photo_p, fut_p, clip_p, t_end, out = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5]
os.makedirs(out, exist_ok=True)
CROP_X, CROP_W = 1351, 1701
P = cv2.imread(photo_p)                                     # 4032 x 3024
F = cv2.imread(fut_p); F = cv2.resize(F, (CROP_W, P.shape[0]), interpolation=cv2.INTER_LANCZOS4)
FULL = P.copy(); FULL[:, CROP_X:CROP_X + CROP_W] = F      # finished frame placed back into the photo
MASKF = np.zeros(P.shape[:2], np.uint8); MASKF[:, CROP_X:CROP_X + CROP_W] = 255

S = 0.5                                                     # match at half size
sift = cv2.SIFT_create(6000)
Pg = cv2.cvtColor(cv2.resize(P, None, fx=S, fy=S), cv2.COLOR_BGR2GRAY)
roi = np.zeros_like(Pg); h = Pg.shape[0]; roi[int(h * .45):int(h * .75), :] = 255   # gate beam, pillars, horizon
kp_p, de_p = sift.detectAndCompute(Pg, roi)
flann = cv2.FlannBasedMatcher(dict(algorithm=1, trees=5), dict(checks=60))

cap = cv2.VideoCapture(clip_p); fps = cap.get(cv2.CAP_PROP_FPS); n = int(t_end * fps)
Hs, frames = [], []
for i in range(n):
    ok, V = cap.read()
    if not ok: break
    Vg = cv2.cvtColor(cv2.resize(V, None, fx=S, fy=S), cv2.COLOR_BGR2GRAY)
    kp_v, de_v = sift.detectAndCompute(Vg, None)
    m = [a for a, b in flann.knnMatch(de_p, de_v, k=2) if a.distance < 0.72 * b.distance]
    src = np.float32([kp_p[x.queryIdx].pt for x in m]) / S; dst = np.float32([kp_v[x.trainIdx].pt for x in m]) / S
    H, inl = cv2.findHomography(src, dst, cv2.RANSAC, 6.0) if len(m) >= 12 else (None, None)
    Hs.append(H); frames.append(V); print(i, len(m), int(inl.sum()) if inl is not None else 0, flush=True)

# smooth: track the four corners of the photo through each H, average over a 9-frame window, rebuild H
Wp, Hp = P.shape[1], P.shape[0]; C = np.float32([[0, 0], [Wp, 0], [Wp, Hp], [0, Hp]]).reshape(-1, 1, 2)
pts = []
for i, H in enumerate(Hs):
    if H is None: H = Hs[i - 1] if i else np.eye(3)
    Hs[i] = H; pts.append(cv2.perspectiveTransform(C, H).reshape(-1))
pts = np.array(pts); k = 4; sm = np.array([pts[max(0, i - k):i + k + 1].mean(0) for i in range(len(pts))])
track = []
for i, V in enumerate(frames):
    H = cv2.getPerspectiveTransform(C.reshape(-1, 2), sm[i].reshape(-1, 2).astype(np.float32))
    warp = cv2.warpPerspective(FULL, H, (V.shape[1], V.shape[0]), flags=cv2.INTER_LINEAR)
    wm = cv2.warpPerspective(MASKF, H, (V.shape[1], V.shape[0]))
    # gate centre (the pillar, photo x ≈ crop x + 0.45 * crop w, y at the beam) in this frame
    c = cv2.perspectiveTransform(np.float32([[[CROP_X + 0.45 * CROP_W, 0.52 * Hp]]]), H).reshape(-1)
    track.append([float(c[0]), float(c[1])])
    cv2.imwrite(f"{out}/real_{i:04d}.jpg", cv2.resize(V, (1920, 1080)), [cv2.IMWRITE_JPEG_QUALITY, 93])
    cv2.imwrite(f"{out}/fut_{i:04d}.jpg", cv2.resize(warp, (1920, 1080)), [cv2.IMWRITE_JPEG_QUALITY, 93])
    cv2.imwrite(f"{out}/futmask_{i:04d}.png", cv2.resize(wm, (1920, 1080)))
json.dump({"fps": fps, "size": [frames[0].shape[1], frames[0].shape[0]], "centre": track}, open(f"{out}/track.json", "w"))
print("frames", len(frames))
