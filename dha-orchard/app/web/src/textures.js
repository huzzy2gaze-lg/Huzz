// Procedural textures for the 3D home (drawn on a canvas; no image files): plaster, stone cladding, wood slats,
// paving, grass, asphalt and roof tiles. Each texture tiles, so a box can repeat it at real-world scale.
import * as THREE from "three";

const cache = {};
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function tex(key, size, draw, aniso = 8) {
  if (cache[key]) return cache[key];
  const c = document.createElement("canvas"); c.width = c.height = size;
  draw(c.getContext("2d"), size, rnd(key.length * 9973 + size));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return (cache[key] = t);
}
const noise = (g, s, r, n, a, color) => { for (let i = 0; i < n; i++) { g.fillStyle = color(r()); g.globalAlpha = a * r(); const w = 1 + r() * 3; g.fillRect(r() * s, r() * s, w, w); } g.globalAlpha = 1; };

export const TEX = {
  // tile sizes in metres: one copy of the texture covers this many metres
  plaster: { m: 2.0, t: () => tex("plaster", 256, (g, s, r) => { g.fillStyle = "#fff"; g.fillRect(0, 0, s, s); noise(g, s, r, 5000, 0.08, (v) => (v > 0.5 ? "#000" : "#fff")); }) },
  stone: { m: 1.2, t: () => tex("stone", 512, (g, s, r) => {
    g.fillStyle = "#6f6a62"; g.fillRect(0, 0, s, s);
    let y = 0;
    while (y < s) {
      const h = s / (5 + Math.floor(r() * 3)); let x = -r() * 60;
      while (x < s) { const w = 50 + r() * 110, l = 150 + r() * 70; g.fillStyle = `rgb(${l},${l - 6 - r() * 8},${l - 16 - r() * 10})`; g.fillRect(x + 2, y + 2, w - 4, h - 4); noise(g, s, r, 4, 0.2, () => "#000"); x += w; }
      y += h;
    }
    noise(g, s, r, 6000, 0.12, (v) => (v > 0.5 ? "#3b3630" : "#f2ece2"));
  }) },
  wood: { m: 1.0, t: () => tex("wood", 256, (g, s, r) => {
    for (let x = 0; x < s; x += 16) { const l = 110 + r() * 40; g.fillStyle = `rgb(${l + 40},${l - 5},${l - 45})`; g.fillRect(x, 0, 14, s); g.fillStyle = "rgba(20,10,0,.55)"; g.fillRect(x + 14, 0, 2, s); }
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.12})`; g.beginPath(); const x = r() * s; g.moveTo(x, 0); g.bezierCurveTo(x + r() * 6 - 3, s / 3, x + r() * 6 - 3, (2 * s) / 3, x + r() * 4 - 2, s); g.stroke(); }
  }) },
  paving: { m: 1.2, t: () => tex("paving", 256, (g, s, r) => {
    g.fillStyle = "#8f877a"; g.fillRect(0, 0, s, s);
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 196 + r() * 22; g.fillStyle = `rgb(${l},${l - 6},${l - 16})`; g.fillRect(i * w + 2, j * w + 2, w - 4, w - 4); }
    noise(g, s, r, 3000, 0.1, () => "#5a5246");
  }) },
  grass: { m: 3.0, t: () => tex("grass", 512, (g, s, r) => {
    g.fillStyle = "#4f7d3e"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26000; i++) { const v = r(); g.fillStyle = v > 0.66 ? "#6a9a4c" : v > 0.33 ? "#3d6a31" : "#7aa65a"; g.globalAlpha = 0.35 + r() * 0.4; g.fillRect(r() * s, r() * s, 1.2, 2 + r() * 3); }
    g.globalAlpha = 1;
  }) },
  asphalt: { m: 4.0, t: () => tex("asphalt", 512, (g, s, r) => { g.fillStyle = "#3c4042"; g.fillRect(0, 0, s, s); noise(g, s, r, 30000, 0.35, (v) => (v > 0.5 ? "#55595b" : "#2a2d2f")); }) },
  soil: { m: 2.0, t: () => tex("soil", 256, (g, s, r) => { g.fillStyle = "#8a7356"; g.fillRect(0, 0, s, s); noise(g, s, r, 9000, 0.35, (v) => (v > 0.5 ? "#6d5a42" : "#a48b6b")); }) },
  tile: { m: 0.6, t: () => tex("tile", 128, (g, s) => { g.fillStyle = "#2f8ea0"; g.fillRect(0, 0, s, s); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * s) / 4); g.lineTo(s, (i * s) / 4); g.moveTo((i * s) / 4, 0); g.lineTo((i * s) / 4, s); g.stroke(); } }) },
};

// a box (base at y = 0) whose texture repeats at real size on every face
export function texturedBox(w, h, d, tileM = 1) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  const uv = g.attributes.uv;
  // BoxGeometry faces: +x, -x (d × h), +y, -y (w × d), +z, -z (w × h); 4 vertices each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, (uv.getX(i) * dims[f][0]) / tileM, (uv.getY(i) * dims[f][1]) / tileM); }
  uv.needsUpdate = true;
  return g;
}
