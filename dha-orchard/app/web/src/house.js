// An illustrative modern home on a plot, drawn to scale in three.js (1 unit = 1 metre).
// Plot sizes are the standard sizes on the plan: 1 Kanal 50 × 90 ft, 14 Marla 40 × 80 ft, 10 Marla 32 × 70 ft.
// The home itself is an illustration only (not a DHA or FGEHA design): it shows what a buyer could build.
import * as THREE from "three";

const FT = 0.3048;
export const PLOTS = {
  "10M": { label: "10 Marla", w: 32, d: 70 },
  "14M": { label: "14 Marla", w: 40, d: 80 },
  "1K": { label: "1 Kanal", w: 50, d: 90 },
};
export const STYLES = {
  white: { label: "Modern white", wall: 0xf2efe8, accent: 0x2b2f2e, trim: 0xc9a227, stone: 0xd8cfc0 },
  brick: { label: "Warm brick", wall: 0xb5643f, accent: 0xefe6d6, trim: 0x3a2a20, stone: 0xcbb89c },
  dark: { label: "Contemporary dark", wall: 0x2e3532, accent: 0xd9c7a3, trim: 0xc9a227, stone: 0x6b6f6a },
};
// the build stages, in order; each part of the home belongs to one stage
export const STAGES = ["Plot", "Foundation", "Ground floor", "First floor", "Roof and terrace", "Windows and lights", "Garden and boundary wall"];

const mats = {};
function mat(key, color, opts = {}) {
  const k = key + color + JSON.stringify(opts);
  if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });
  return mats[k];
}
function box(w, h, d, m, x, y, z, stage, parent) {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  g.position.set(x, y + h / 2, z); g.castShadow = true; g.receiveShadow = true;
  g.userData.stage = stage; g.userData.baseY = y + h / 2; g.userData.h = h;
  parent.add(g); return g;
}

// returns { group, setProgress(p 0..STAGES.length), setNight(on), plot:{w,d} }
export function makeHouse({ size = "1K", floors = 2, style = "white" } = {}) {
  const P = PLOTS[size] || PLOTS["1K"], S = STYLES[style] || STYLES.white;
  const W = P.w * FT, D = P.d * FT; // plot in metres
  const group = new THREE.Group();
  const parts = [];
  const add = (...a) => { const m = box(...a, group); parts.push(m); return m; };

  // stage 0: the plot (grass), pegs at the corners and the plot line
  const grass = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D), mat("grass", 0x6f9a5a, { roughness: 1 }));
  grass.position.y = 0.06; grass.receiveShadow = true; grass.userData.stage = 0; grass.userData.baseY = 0.06; grass.userData.h = 0.12;
  group.add(grass); parts.push(grass);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe7cf7a });
  const pl = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]].map(([x, z]) => new THREE.Vector3(x, 0.14, z))), lineMat);
  pl.userData.stage = 0; group.add(pl);
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]]) add(0.12, 0.9, 0.12, mat("peg", 0xc9a227, { emissive: 0x5a4208 }), x, 0.12, z, 0);

  // the home: setbacks in front (z+) and behind, a little at the sides
  const front = D * 0.22, back = D * 0.08, side = Math.max(1, W * 0.06);
  const hw = W - side * 2, hd = D - front - back, cz = (-D / 2 + back + (D / 2 - front)) / 2;
  const fh = 3.35; // floor height
  // stage 1: foundation / plinth
  add(hw + 0.4, 0.6, hd + 0.4, mat("plinth", S.stone), 0, 0.12, cz, 1);
  // stage 2: ground floor: main mass plus a glass living room at the front corner
  const g0 = 0.72;
  add(hw * 0.68, fh, hd * 0.92, mat("wall", S.wall), -hw * 0.16, g0, cz - hd * 0.04, 2);
  add(hw * 0.3, fh, hd * 0.55, mat("glassbox", 0x9fc3cf, { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 }), hw * 0.35, g0, cz + hd * 0.18, 2);
  add(hw * 0.3, fh, hd * 0.36, mat("wall2", S.wall), hw * 0.35, g0, cz - hd * 0.27, 2);
  // stage 3: first floor (and second, for 3 floors): a mass that cantilevers over the porch
  const levels = Math.max(1, floors - 1);
  for (let i = 0; i < levels; i++) {
    const y = g0 + fh * (i + 1) + 0.25 * i;
    add(hw * 0.98, 0.25, hd * 0.98, mat("slab", S.accent), 0, y - 0.25 + 0.25, cz, 3);
    const k = i === levels - 1 && floors > 2 ? 0.7 : 1;
    add(hw * 0.86 * k, fh, hd * 0.72, mat("wall", S.wall), hw * 0.07, y + 0.25, cz + hd * 0.1, 3);
    add(0.5, fh, hd * 0.72, mat("fin", S.trim, { metalness: 0.5, roughness: 0.35 }), -hw * 0.36 * k + hw * 0.07, y + 0.25, cz + hd * 0.1, 3);
  }
  const top = g0 + fh * (levels + 1) + 0.25 * levels;
  // stage 4: roof slab, parapet and a shaded roof terrace
  add(hw, 0.3, hd * 0.98, mat("roof", S.accent), 0, top, cz, 4);
  add(hw * 0.5, 0.9, 0.2, mat("parapet", S.wall), hw * 0.2, top + 0.3, cz + hd * 0.47, 4);
  add(hw * 0.32, 2.4, hd * 0.3, mat("stair", S.wall), -hw * 0.3, top + 0.3, cz - hd * 0.3, 4);
  add(hw * 0.5, 0.15, hd * 0.35, mat("pergola", S.trim, { metalness: 0.5, roughness: 0.35 }), hw * 0.15, top + 2.6, cz + hd * 0.18, 4);
  // stage 5: windows: dark glass in the day, warm light at night
  const glass = mat("glass", 0x1c2a30, { roughness: 0.15, metalness: 0.6, emissive: 0xffc66b, emissiveIntensity: 0 });
  const winZ = cz + hd * 0.46 + 0.08; // a little in front of the wall, so the glass shows
  for (let i = 0; i < levels; i++) {
    const y = g0 + fh * (i + 1) + 0.25 * i + 0.25 + 0.6;
    add(hw * 0.5, fh - 1.3, 0.08, glass, hw * 0.12, y, winZ, 5);
  }
  add(hw * 0.36, fh - 1.1, 0.08, glass, -hw * 0.18, g0 + 0.55, cz + hd * 0.42 + 0.08, 5);
  add(0.08, fh - 1.2, hd * 0.4, glass, -hw * 0.5 - 0.08, g0 + 0.6, cz, 5);
  // stage 6: boundary wall, gate, driveway, trees
  const bw = mat("bwall", S.stone), bh = 1.6;
  add(W, bh, 0.22, bw, 0, 0.12, -D / 2 + 0.11, 6);
  add(0.22, bh, D, bw, -W / 2 + 0.11, 0.12, 0, 6);
  add(0.22, bh, D, bw, W / 2 - 0.11, 0.12, 0, 6);
  add(W * 0.55, bh, 0.22, bw, -W * 0.225, 0.12, D / 2 - 0.11, 6);
  add(W * 0.3, bh * 0.9, 0.12, mat("gate", S.trim, { metalness: 0.6, roughness: 0.3 }), W * 0.3, 0.12, D / 2 - 0.11, 6);
  add(W * 0.3, 0.05, front - 0.4, mat("drive", 0xbdb6a8), W * 0.3, 0.12, D / 2 - front / 2, 6);
  const trunk = mat("trunk", 0x6b4a2b), leaf = mat("leaf", 0x3f7a3a, { roughness: 0.9 });
  const trees = [[-W * 0.32, D / 2 - front * 0.45], [-W * 0.08, D / 2 - front * 0.6], [W * 0.38, -D / 2 + back * 0.5]];
  for (const [x, z] of trees) {
    add(0.25, 1.6, 0.25, trunk, x, 0.12, z, 6);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), leaf);
    c.position.set(x, 2.9, z); c.castShadow = true; c.userData.stage = 6; c.userData.baseY = 2.9; c.userData.h = 2.8;
    group.add(c); parts.push(c);
  }

  // build animation: each part rises out of the ground when its stage starts
  function setProgress(p) {
    for (const m of [...parts, pl]) {
      const st = m.userData.stage;
      const k = Math.max(0, Math.min(1, p - st));
      const e = 1 - Math.pow(1 - k, 3);
      m.visible = k > 0.001;
      if (m.isLine) continue;
      const h = m.userData.h || 1;
      m.scale.y = Math.max(0.001, e);
      m.position.y = m.userData.baseY - (h / 2) * (1 - e);
    }
  }
  function setNight(on) { glass.emissiveIntensity = on ? 1.6 : 0; glass.color.set(on ? 0x3a2e1a : 0x1c2a30); }
  setProgress(STAGES.length);
  return { group, setProgress, setNight, plot: { w: W, d: D, label: P.label, ft: [P.w, P.d] } };
}
