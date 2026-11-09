// An illustrative modern home on a plot, drawn to scale in three.js (1 unit = 1 metre), with a construction
// animation: a tower crane rises, the home is built part by part, the crane lowers away, the garden grows,
// the lights come on and a car drives in. The same function draws calmer finished homes for the neighbours.
// Plot sizes are the standard sizes on the plan: 1 Kanal 50 × 90 ft, 14 Marla 40 × 80 ft, 10 Marla 32 × 70 ft.
// The home is an illustration only (not a DHA or FGEHA design).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { TEX, texturedBox } from "./textures.js";

const FT = 0.3048;
export const PLOTS = {
  "10M": { label: "10 Marla", w: 32, d: 70 },
  "14M": { label: "14 Marla", w: 40, d: 80 },
  "1K": { label: "1 Kanal", w: 50, d: 90 },
};
export const STYLES = {
  white: { label: "Modern white", wall: 0xece7dd, wall2: 0xd8d0c2, frame: 0x262b2d, trim: 0xd2a746, stone: 0xc9bfae, wood: 0xa06a3e },
  brick: { label: "Warm brick", wall: 0xb0603e, wall2: 0xe9e1d2, frame: 0x262220, trim: 0xd2a746, stone: 0xcbb99c, wood: 0x8a5632 },
  dark: { label: "Contemporary dark", wall: 0x3a4244, wall2: 0xd9ccb0, frame: 0x121516, trim: 0xd2a746, stone: 0x8d8a83, wood: 0xb07a48 },
};
export const STAGES = ["Plot", "Foundation", "Ground floor", "Upper floor", "Roof and terrace", "Windows and lights", "Garden and boundary wall", "Your home is ready"];

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp = (v) => Math.max(0, Math.min(1, v));

export function makeHouse({ size = "1K", floors = 2, style = "white", neighbor = false, seed = 1 } = {}) {
  const P = PLOTS[size] || PLOTS["1K"], S = STYLES[style] || STYLES.white;
  const W = P.w * FT, D = P.d * FT;
  const group = new THREE.Group();
  const parts = [], geos = [];
  const M = {
    wall: new THREE.MeshStandardMaterial({ color: S.wall, roughness: 0.92, map: TEX.plaster.t() }),
    wall2: new THREE.MeshStandardMaterial({ color: S.wall2, roughness: 0.9, map: TEX.plaster.t() }),
    stone: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: TEX.stone.t() }),
    wood: new THREE.MeshStandardMaterial({ color: S.wood, roughness: 0.65, map: TEX.wood.t() }),
    slab: new THREE.MeshStandardMaterial({ color: 0xe4e0d8, roughness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1f20, roughness: 0.9 }),
    frame: new THREE.MeshStandardMaterial({ color: S.frame, roughness: 0.35, metalness: 0.7 }),
    trim: new THREE.MeshStandardMaterial({ color: S.trim, roughness: 0.28, metalness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x7f97a0, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.5, envMapIntensity: 1.6, emissive: 0xffbf66, emissiveIntensity: 0 }),
    rail: new THREE.MeshPhysicalMaterial({ color: 0xd9eef0, roughness: 0.03, transparent: true, opacity: 0.22, envMapIntensity: 1.5 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: TEX.grass.t() }),
    soil: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, map: TEX.soil.t() }),
    pave: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: TEX.paving.t() }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x3c6b35, roughness: 1, flatShading: true }),
    leafA: new THREE.MeshStandardMaterial({ color: 0x4f8a3f, roughness: 0.95, flatShading: true }),
    leafB: new THREE.MeshStandardMaterial({ color: 0x3f7434, roughness: 0.95, flatShading: true }),
    leafC: new THREE.MeshStandardMaterial({ color: 0x6b9a45, roughness: 0.95, flatShading: true }),
    flower: new THREE.MeshStandardMaterial({ color: 0xd85a7a, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5a3d26, roughness: 1 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x48c0d2, roughness: 0.02, metalness: 0.05, transparent: true, opacity: 0.88, envMapIntensity: 1.8, emissive: 0x1aa0b5, emissiveIntensity: 0.05 }),
    poolTile: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: TEX.tile.t() }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffb04a, emissiveIntensity: 0 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: 0.2, metalness: 0.6 }),
    tank: new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.5 }),
    crane: new THREE.MeshStandardMaterial({ color: 0xd2a746, roughness: 0.5, metalness: 0.4 }),
    craneDark: new THREE.MeshStandardMaterial({ color: 0x23302f, roughness: 0.6 }),
    peg: new THREE.MeshStandardMaterial({ color: 0xd2a746, emissive: 0x53451f }),
    car: new THREE.MeshPhysicalMaterial({ color: 0xe9e4da, roughness: 0.18, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.1 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }),
  };
  // texture scale per material
  const TILE = { wall: TEX.plaster.m, wall2: TEX.plaster.m, stone: TEX.stone.m, wood: TEX.wood.m, lawn: TEX.grass.m, soil: TEX.soil.m, pave: TEX.paving.m, poolTile: TEX.tile.m };
  const tileOf = (mat) => { for (const k in TILE) if (M[k] === mat) return TILE[k]; return 1; };
  // a box with its base at (x, y, z). anim: "grow" (rises up), "drop" (falls in and settles), "pop" (scales up)
  function box(w, h, d, mat, x, y, z, stage = 0, delay = 0, anim = "grow", round = 0) {
    let g;
    if (round > 0) { g = new RoundedBoxGeometry(w, h, d, 2, Math.min(round, h / 2.01, w / 2.01, d / 2.01)); g.translate(0, h / 2, 0); }
    else g = texturedBox(w, h, d, tileOf(mat));
    geos.push(g);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z); m.castShadow = h > 0.1 && mat !== M.glass && mat !== M.rail; m.receiveShadow = true;
    group.add(m);
    parts.push({ obj: m, stage, delay, anim, y });
    return m;
  }
  function add(o, stage, delay, anim = "pop") { group.add(o); parts.push({ obj: o, stage, delay, anim, y: o.position.y }); return o; }
  // a window: glass with a slim frame and a middle bar, set just in front of the wall (n = facing +z, +x or -x)
  function windowAt(w, h, x, y, z, face, stage, delay) {
    const t = 0.07, out = 0.06;
    const along = face === "z" ? [w, h, t] : [t, h, w];
    const g = new THREE.Group(); g.position.set(x, y, z);
    const mk = (sx, sy, sz, mat, ox, oy, oz) => { const geo = new THREE.BoxGeometry(sx, sy, sz); geos.push(geo); const m = new THREE.Mesh(geo, mat); m.position.set(ox, oy, oz); m.castShadow = false; m.receiveShadow = true; g.add(m); };
    if (face === "z") {
      mk(w, h, 0.04, M.glass, 0, h / 2, out);
      mk(w + 0.12, 0.1, 0.12, M.frame, 0, 0, out); mk(w + 0.12, 0.1, 0.12, M.frame, 0, h, out);
      mk(0.1, h, 0.12, M.frame, -w / 2, h / 2, out); mk(0.1, h, 0.12, M.frame, w / 2, h / 2, out);
      for (let i = 1; i < Math.round(w / 1.6); i++) mk(0.05, h, 0.08, M.frame, -w / 2 + (w * i) / Math.round(w / 1.6), h / 2, out);
    } else {
      const s = face === "x" ? 1 : -1;
      mk(0.04, h, w, M.glass, s * out, h / 2, 0);
      mk(0.12, 0.1, w + 0.12, M.frame, s * out, 0, 0); mk(0.12, 0.1, w + 0.12, M.frame, s * out, h, 0);
      mk(0.12, h, 0.1, M.frame, s * out, h / 2, -w / 2); mk(0.12, h, 0.1, M.frame, s * out, h / 2, w / 2);
    }
    group.add(g); parts.push({ obj: g, stage, delay, anim: "pop", y });
    void along;
  }
  function tree(x, z, sc, stage, delay) {
    const t = new THREE.Group(); t.position.set(x, 0.14, z);
    const r = mulberry(seed * 31 + Math.round(x * 13 + z * 7));
    const tg = new THREE.CylinderGeometry(0.1 * sc, 0.16 * sc, 2.2 * sc, 7); geos.push(tg);
    const trunk = new THREE.Mesh(tg, M.trunk); trunk.position.y = 1.1 * sc; trunk.castShadow = true; t.add(trunk);
    const leaves = [M.leafA, M.leafB, M.leafC];
    for (let i = 0; i < 6; i++) {
      const lg = new THREE.IcosahedronGeometry((0.7 + r() * 0.6) * sc, 1); geos.push(lg);
      const pos = lg.attributes.position; for (let j = 0; j < pos.count; j++) pos.setXYZ(j, pos.getX(j) * (0.85 + r() * 0.3), pos.getY(j) * (0.8 + r() * 0.3), pos.getZ(j) * (0.85 + r() * 0.3));
      lg.computeVertexNormals();
      const c = new THREE.Mesh(lg, leaves[i % 3]); c.position.set((r() - 0.5) * 1.6 * sc, (2.3 + r() * 1.2) * sc, (r() - 0.5) * 1.6 * sc); c.castShadow = true; t.add(c);
    }
    return add(t, stage, delay, "pop");
  }
  function shrub(x, z, s, stage, delay) {
    const g = new THREE.IcosahedronGeometry(s, 1); geos.push(g);
    const m = new THREE.Mesh(g, M.hedge); m.position.set(x, 0.14 + s * 0.6, z); m.scale.y = 0.75; m.castShadow = true;
    return add(m, stage, delay, "pop");
  }

  // ------------------------------------------------ stage 0: the plot (soil), corner pegs and a gold string
  box(W, 0.12, D, M.soil, 0, 0, 0, 0, 0, "grow");
  const pegs = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
  let string = null;
  if (!neighbor) {
    pegs.forEach(([x, z], i) => box(0.12, 0.9, 0.12, M.peg, x, 0.12, z, 0, 0.2 + i * 0.12, "drop"));
    string = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pegs.map(([x, z]) => new THREE.Vector3(x, 0.8, z))), new THREE.LineBasicMaterial({ color: 0xe3c98d, transparent: true, opacity: 0.85 }));
    group.add(string);
  }

  // the home footprint (the front of the plot is +z, the road side)
  const front = D * 0.26, back = D * 0.07, side = Math.max(1, W * 0.06);
  const hw = W - side * 2, hd = D - front - back;
  const z0 = -D / 2 + back, z1 = z0 + hd, cz = (z0 + z1) / 2;
  const fh = 3.3, slabT = 0.32, g0 = 0.12 + 0.6;

  // ------------------------------------------------ stage 1: plinth and entrance steps
  box(hw + 0.6, 0.6, hd + 0.6, M.stone, 0, 0.12, cz, 1, 0, "grow");
  box(2.6, 0.2, 1.4, M.stone, -hw * 0.22, 0.12, z1 + 1.0, 1, 0.5, "grow");
  box(2.6, 0.2, 0.9, M.stone, -hw * 0.22, 0.32, z1 + 0.75, 1, 0.6, "grow");

  // ------------------------------------------------ stage 2: ground floor
  const solidD = hd * 0.62, lrD = hd - solidD;
  box(hw, fh, solidD, M.wall, 0, g0, z0 + solidD / 2, 2, 0, "grow"); // back rooms
  box(hw * 0.36, fh, lrD, M.stone, -hw * 0.32, g0, z0 + solidD + lrD / 2, 2, 0.25, "grow"); // stone-clad entrance block
  const lrW = hw * 0.64, lrX = hw * 0.18, lrZ = z0 + solidD + lrD / 2;
  box(lrW, fh, lrD, M.glass, lrX, g0, lrZ, 5, 0, "grow"); // the glass living room
  for (let i = 0; i <= 4; i++) box(0.12, fh, 0.14, M.frame, lrX - lrW / 2 + (lrW * i) / 4, g0, z1 - 0.07, 2, 0.45 + i * 0.06, "grow");
  box(lrW, 0.14, 0.14, M.frame, lrX, g0 + fh - 0.14, z1 - 0.07, 2, 0.75, "grow");
  box(1.3, 2.5, 0.14, M.wood, -hw * 0.22, g0, z1 + 0.02, 2, 0.8, "grow"); // front door
  box(2.8, 0.18, 1.6, M.slab, -hw * 0.22, g0 + 2.85, z1 + 0.8, 2, 0.9, "drop", 0.05); // entrance canopy
  windowAt(hw * 0.3, 1.6, hw / 2 + 0.01, g0 + 0.9, z0 + solidD * 0.45, "x", 5, 0.4);

  // ------------------------------------------------ stage 3: upper floor(s), each on a full slab
  let y = g0 + fh;
  const ffD = hd * 0.88, ffZ = z0 + ffD / 2 + hd * 0.09; // reaches forward over the porch
  box(hw + 0.4, slabT, hd + 0.5, M.slab, 0, y, cz + 0.1, 3, 0, "drop", 0.08);
  box(hw + 0.42, 0.06, hd + 0.52, M.dark, 0, y - 0.06, cz + 0.1, 3, 0.05, "grow"); // shadow line under the slab
  y += slabT;
  const uppers = [];
  box(hw, fh, ffD, M.wall, 0, y, ffZ, 3, 0.2, "grow");
  uppers.push({ y, d: ffD, z: ffZ, w: hw, x: 0 });
  // wooden louvres over part of the front of the first floor
  const lvW = hw * 0.32, lvX = -hw / 2 + lvW / 2 + 0.3;
  for (let i = 0; i < Math.floor(lvW / 0.22); i++) box(0.08, fh - 0.3, 0.16, M.wood, lvX - lvW / 2 + i * 0.22, y + 0.15, ffZ + ffD / 2 + 0.12, 3, 0.55 + i * 0.008, "grow");
  box(0.4, fh + slabT, 0.5, M.trim, hw / 2 - 0.2, y - slabT, ffZ + ffD / 2 - 0.2, 3, 0.6, "grow"); // gold corner fin
  y += fh;
  if (floors >= 3) {
    const sfD = ffD * 0.6, sfZ = ffZ - ffD / 2 + sfD / 2, sfW = hw * 0.76;
    box(hw + 0.4, slabT, ffD + 0.4, M.slab, 0, y, ffZ, 3, 0.7, "drop", 0.08);
    y += slabT;
    box(sfW, fh, sfD, M.wall2, -hw * 0.12, y, sfZ, 3, 0.85, "grow");
    uppers.push({ y, d: sfD, z: sfZ, w: sfW, x: -hw * 0.12, terrace: true });
    // planters on the terrace in front of the top floor
    for (let i = 0; i < 3; i++) { box(1.2, 0.5, 0.6, M.stone, -hw * 0.3 + i * hw * 0.3, y, ffZ + ffD / 2 - 0.6, 6, 0.3 + i * 0.05, "grow"); shrub(-hw * 0.3 + i * hw * 0.3, ffZ + ffD / 2 - 0.6, 0.45, 6, 0.4 + i * 0.05).position.y = y + 0.75; }
    y += fh;
  }
  const top = uppers[uppers.length - 1];

  // ------------------------------------------------ stage 4: roof slab, parapet, stair room, water tank, solar panels, pergola, glass rails
  box(top.w + 0.6, slabT, top.d + 0.6, M.slab, top.x, y, top.z, 4, 0, "drop", 0.08);
  const roofY = y + slabT;
  const px0 = top.x - (top.w + 0.6) / 2, px1 = top.x + (top.w + 0.6) / 2, pz0 = top.z - (top.d + 0.6) / 2, pz1 = top.z + (top.d + 0.6) / 2;
  box(top.w + 0.6, 0.9, 0.18, M.wall, top.x, roofY, pz0 + 0.09, 4, 0.2, "grow");
  box(0.18, 0.9, top.d + 0.6, M.wall, px0 + 0.09, roofY, top.z, 4, 0.22, "grow");
  box(0.18, 0.9, top.d + 0.6, M.wall, px1 - 0.09, roofY, top.z, 4, 0.22, "grow");
  box(top.w * 0.5, 0.9, 0.18, M.wall, px0 + top.w * 0.25 + 0.3, roofY, pz1 - 0.09, 4, 0.24, "grow");
  box(top.w * 0.5 - 0.3, 1.0, 0.05, M.rail, px1 - top.w * 0.25, roofY, pz1 - 0.09, 4, 0.3, "grow");
  const stX = top.x - top.w * 0.28, stZ = top.z - top.d * 0.26;
  box(top.w * 0.26, 2.6, top.d * 0.3, M.wall2, stX, roofY, stZ, 4, 0.35, "grow");
  box(top.w * 0.26 + 0.3, 0.2, top.d * 0.3 + 0.3, M.slab, stX, roofY + 2.6, stZ, 4, 0.5, "drop", 0.04);
  // water tank on legs (common on homes in Islamabad)
  const tankG = new THREE.CylinderGeometry(0.7, 0.7, 1.4, 20); geos.push(tankG);
  const tank = new THREE.Mesh(tankG, M.tank); tank.position.set(stX, roofY + 2.8 + 0.7, stZ); tank.castShadow = true;
  add(tank, 4, 0.65, "pop");
  // solar panels, tilted to the sun
  const spX = top.x + top.w * 0.12, spZ = top.z - top.d * 0.2;
  for (let i = 0; i < 4; i++) {
    const pg = new THREE.BoxGeometry(1.0, 0.05, 1.7); geos.push(pg);
    const sp = new THREE.Mesh(pg, M.solar); sp.position.set(spX + i * 1.12 - 1.7, roofY + 0.7, spZ); sp.rotation.x = -0.45; sp.castShadow = true;
    add(sp, 4, 0.7 + i * 0.05, "pop");
  }
  // pergola on four posts over a seating corner
  const pgW = top.w * 0.34, pgD = top.d * 0.34, pgX = top.x + top.w * 0.24, pgZ = top.z + top.d * 0.18, pgH = 2.5;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(0.14, pgH, 0.14, M.trim, pgX + (sx * pgW) / 2, roofY, pgZ + (sz * pgD) / 2, 4, 0.5, "grow");
  for (let i = 0; i < 8; i++) box(pgW + 0.3, 0.1, 0.14, M.wood, pgX, roofY + pgH, pgZ - pgD / 2 + (pgD * i) / 7, 4, 0.75 + i * 0.03, "drop");
  box(hw * 0.5, 1.0, 0.05, M.rail, hw * 0.18, g0 + fh + slabT, z1 + 0.25, 4, 0.9, "grow"); // balcony rail over the porch
  if (top.terrace) box(hw * 0.86, 1.0, 0.05, M.rail, 0, top.y, ffZ + ffD / 2 + 0.15, 4, 0.92, "grow");

  // ------------------------------------------------ stage 5: framed windows on each upper floor
  for (const u of uppers) {
    windowAt(u.w * 0.5, fh * 0.56, u.x + u.w * 0.16, u.y + fh * 0.22, u.z + u.d / 2, "z", 5, 0.1);
    windowAt(u.d * 0.4, fh * 0.5, u.x + u.w / 2, u.y + fh * 0.25, u.z, "x", 5, 0.3);
    windowAt(u.d * 0.3, fh * 0.5, u.x - u.w / 2, u.y + fh * 0.25, u.z - u.d * 0.1, "-x", 5, 0.45);
  }

  // ------------------------------------------------ stage 6: garden, paving, porch, boundary wall, gate, lamps, pool, trees
  box(W - 0.5, 0.04, D - 0.5, M.lawn, 0, 0.12, 0, 6, 0, "grow");
  const gateW = Math.min(4.4, W * 0.36), gateX = W / 2 - 0.5 - gateW / 2;
  box(gateW, 0.06, front + 0.5, M.pave, gateX, 0.16, D / 2 - front / 2, 6, 0.1, "grow"); // driveway
  box(1.5, 0.06, front - 1.6, M.pave, -hw * 0.22, 0.16, z1 + (front - 1.6) / 2 + 1.6, 6, 0.15, "grow"); // path to the door
  // car porch: a slab on two slim columns over the driveway
  const porchZ = z1 + 2.4;
  for (const sx of [-1, 1]) box(0.22, 2.9, 0.22, M.frame, gateX + sx * (gateW / 2 - 0.2), 0.16, porchZ + 1.6, 6, 0.2, "grow");
  box(gateW + 0.4, 0.2, 4.2, M.slab, gateX, 3.06, porchZ - 0.2, 6, 0.3, "drop", 0.05);
  // boundary wall with stone, coping and pillars
  const bwH = 1.8;
  const wallSeg = (w, d, x, z, delay) => { box(w, bwH, d, M.stone, x, 0.12, z, 6, delay, "grow"); box(w + 0.1, 0.1, d + 0.1, M.slab, x, 0.12 + bwH, z, 6, delay + 0.1, "drop"); };
  wallSeg(W, 0.24, 0, -D / 2 + 0.12, 0.2);
  wallSeg(0.24, D, -W / 2 + 0.12, 0, 0.25);
  wallSeg(0.24, D, W / 2 - 0.12, 0, 0.25);
  const fW = W - gateW - 1.6;
  wallSeg(fW, 0.24, -W / 2 + fW / 2, D / 2 - 0.12, 0.3);
  // a sliding gate: dark frame with wooden slats
  box(gateW, 1.75, 0.08, M.frame, gateX, 0.14, D / 2 - 0.06, 6, 0.5, "grow");
  for (let i = 0; i < 6; i++) box(gateW - 0.2, 0.16, 0.1, M.wood, gateX, 0.35 + i * 0.26, D / 2 - 0.02, 6, 0.55 + i * 0.02, "grow");
  for (const gx of [gateX - gateW / 2 - 0.35, gateX + gateW / 2 + 0.35]) {
    box(0.55, 2.2, 0.55, M.stone, gx, 0.12, D / 2 - 0.12, 6, 0.45, "grow");
    box(0.3, 0.3, 0.3, M.lamp, gx, 2.36, D / 2 - 0.12, 6, 0.6, "pop");
  }
  box(0.9, 0.3, 0.04, M.trim, gateX - gateW / 2 - 1.4, 1.2, D / 2 + 0.01, 6, 0.65, "pop"); // name plate
  // hedges, shrubs, flower beds and path lights
  box(0.6, 0.75, front - 1.2, M.hedge, -W / 2 + 0.7, 0.14, D / 2 - front / 2, 6, 0.4, "grow");
  for (let i = 0; i < 5; i++) shrub(-hw * 0.38 + i * 0.8, z1 + 0.6, 0.38, 6, 0.45 + i * 0.03);
  for (let i = 0; i < 8; i++) box(0.25, 0.25, 0.25, M.flower, -W / 2 + 1.4 + (i % 4) * 0.5, 0.14, D / 2 - 1.2 - Math.floor(i / 4) * 0.5, 6, 0.6 + i * 0.02, "pop");
  for (let i = 0; i < 3; i++) box(0.14, 0.6, 0.14, M.lamp, -hw * 0.22 - 1.05, 0.16, z1 + 2 + i * ((front - 2.6) / 2), 6, 0.6 + i * 0.05, "pop");
  // a pool with tiles on the larger plots
  if (W > 14 && !neighbor) {
    const pw = Math.min(3.6, W * 0.22), pd = Math.min(front - 3, 6.2), pxp = -W / 2 + 2.2 + pw / 2, pzp = D / 2 - front / 2 + 0.6;
    box(pw + 0.8, 0.12, pd + 0.8, M.pave, pxp, 0.14, pzp, 6, 0.5, "grow");
    box(pw, 0.05, pd, M.poolTile, pxp, 0.2, pzp, 6, 0.6, "grow");
    box(pw, 0.06, pd, M.water, pxp, 0.24, pzp, 6, 0.7, "grow");
  }
  const trees = [
    tree(-W * 0.36, -D / 2 + back * 0.55, 1.1, 6, 0.5), tree(W * 0.34, -D / 2 + back * 0.55, 0.95, 6, 0.55),
    tree(-W * 0.06, D / 2 - front * 0.72, 1.0, 6, 0.6), tree(-W * 0.4, D / 2 - 1.0, 0.8, 6, 0.65),
  ];

  // ------------------------------------------------ the car and the crane (only for your own home)
  let car = null, crane = null, head = null, trolley = null, cable = null, hook = null, jib = 0;
  const carPark = porchZ, carStart = D / 2 + 12;
  if (!neighbor) {
    car = new THREE.Group();
    const bg = new RoundedBoxGeometry(1.85, 0.62, 4.4, 3, 0.18); geos.push(bg);
    const body = new THREE.Mesh(bg, M.car); body.position.y = 0.6; body.castShadow = true; car.add(body);
    const cg = new RoundedBoxGeometry(1.6, 0.55, 2.3, 3, 0.2); geos.push(cg);
    const cab = new THREE.Mesh(cg, M.glass); cab.position.set(0, 1.12, 0.2); car.add(cab);
    for (const [wx, wz] of [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]]) { const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16); geos.push(wg); const w = new THREE.Mesh(wg, M.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.34, wz); car.add(w); }
    for (const lx of [-0.6, 0.6]) { const lg = new THREE.BoxGeometry(0.32, 0.1, 0.05); geos.push(lg); const l = new THREE.Mesh(lg, M.lamp); l.position.set(lx, 0.66, -2.2); car.add(l); }
    car.position.set(gateX, 0.16, carStart); group.add(car);

    crane = new THREE.Group();
    const craneH = y + 9; jib = Math.max(W, D) * 0.75;
    const mk = (geo, mat) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
    const mast = mk(new THREE.BoxGeometry(0.7, craneH, 0.7), M.crane); mast.position.y = craneH / 2; crane.add(mast);
    for (let i = 1; i < craneH; i += 1.4) { const rr = mk(new THREE.BoxGeometry(0.8, 0.08, 0.8), M.craneDark); rr.position.y = i; crane.add(rr); }
    head = new THREE.Group(); head.position.y = craneH; crane.add(head);
    const jm = mk(new THREE.BoxGeometry(jib, 0.5, 0.6), M.crane); jm.position.x = jib / 2 - 1; head.add(jm);
    const cm = mk(new THREE.BoxGeometry(5, 0.5, 0.6), M.crane); cm.position.x = -3.2; head.add(cm);
    const wt = mk(new THREE.BoxGeometry(1.6, 1.2, 1.1), M.craneDark); wt.position.set(-5, -0.8, 0); head.add(wt);
    const cb = mk(new THREE.BoxGeometry(1.4, 1.2, 1.2), M.craneDark); cb.position.set(0.6, -1.0, 0.7); head.add(cb);
    const pk = mk(new THREE.ConeGeometry(0.5, 3, 4), M.crane); pk.position.y = 1.7; head.add(pk);
    trolley = new THREE.Group(); head.add(trolley);
    cable = mk(new THREE.BoxGeometry(0.05, 1, 0.05), M.craneDark); trolley.add(cable);
    hook = mk(new THREE.BoxGeometry(0.5, 0.4, 0.5), M.craneDark); trolley.add(hook);
    crane.position.set(-W / 2 - 2.5, 0, -D / 2 + 3);
    group.add(crane);
  }

  // ------------------------------------------------ animation
  function animPart(pt, k) {
    const o = pt.obj;
    o.visible = k > 0.001;
    if (!o.visible) return;
    if (pt.anim === "grow") { o.scale.y = Math.max(0.001, easeOut(k)); o.position.y = pt.y; }
    else if (pt.anim === "drop") { o.position.y = pt.y + (1 - easeBack(k)) * 7; }
    else { const s = Math.max(0.001, easeBack(k)); o.scale.setScalar(s); }
  }
  let night = false;
  function setProgress(p, t = 0) {
    for (const pt of parts) animPart(pt, clamp((p - pt.stage - pt.delay * 0.55) / 0.42));
    if (string) { string.visible = p > 0.3 && p < 6.4; string.material.opacity = 0.85 * clamp((p - 0.3) / 0.5) * (1 - clamp((p - 5.9) / 0.5)); }
    if (crane) {
      const up = easeOut(clamp((p - 0.4) / 0.8)), down = easeOut(clamp((p - 6.2) / 0.7));
      crane.visible = up > 0.001 && down < 0.999;
      crane.scale.y = Math.max(0.001, up * (1 - down));
      head.rotation.y = Math.sin(t * 0.5) * 0.9 + 0.4;
      trolley.position.x = jib * (0.45 + 0.2 * Math.sin(t * 0.7));
      const drop = 4 + 3 * Math.sin(t * 1.1);
      cable.scale.y = drop; cable.position.y = -drop / 2; hook.position.y = -drop;
    }
    trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * 0.8 + i) * 0.015; });
    if (car) { const c = clamp((p - 7) / 0.9); car.visible = p > 7; car.position.z = carStart + (carPark - carStart) * (1 - Math.pow(1 - c, 2)); }
    M.lamp.emissiveIntensity = (night ? 3 : 0.3) * clamp((p - 6.6) / 0.5);
    M.glass.emissiveIntensity = night ? 0.5 * clamp((p - 5.2) / 0.6) : 0;
    M.water.emissiveIntensity = night ? 0.8 : 0.05;
  }
  function setNight(on) { night = on; M.glass.opacity = on ? 0.72 : 0.5; }
  const END = STAGES.length + 0.2;
  setProgress(END);
  return {
    group, setProgress, setNight, end: END,
    plot: { w: W, d: D, label: P.label, ft: [P.w, P.d] },
    height: y + slabT,
    dispose() { geos.forEach((g) => g.dispose()); Object.values(M).forEach((m) => m.dispose()); if (string) { string.geometry.dispose(); string.material.dispose(); } },
  };
}

function mulberry(a) { return () => { let t = (a += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
