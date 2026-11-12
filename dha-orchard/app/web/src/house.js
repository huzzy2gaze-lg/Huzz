// An illustrative modern home on a plot, drawn to scale in three.js (1 unit = 1 metre), in the style of
// architectural renders: a white "frame" upper floor that reaches over a glass ground floor, deep overhangs
// with wooden ceilings and downlights, full-height glass with slim black frames, furnished rooms that glow
// behind the glass, glass rails, a pool, ornamental grasses and trees. A crane builds it part by part.
// The same function draws calmer finished homes for the neighbours.
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
// frame: the white upper "frame"; lower: the ground floor walls; band: the fascia under the slab
export const STYLES = {
  white: { label: "Modern white", frame: 0xf3f1ec, lower: 0xe6e1d8, band: 0x23282a, wood: 0xa8703f, stone: 0xffffff },
  brick: { label: "Warm brick", frame: 0xece6da, lower: 0xa85c3c, band: 0x2a2421, wood: 0x9a6236, stone: 0xffffff },
  dark: { label: "Contemporary dark", frame: 0x30373a, lower: 0xd8cfbf, band: 0x15191a, wood: 0xb78150, stone: 0xffffff },
};
export const STAGES = ["Plot", "Foundation", "Ground floor", "Upper floor", "Roof and terrace", "Glass and interiors", "Garden and boundary wall", "Your home is ready"];

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp = (v) => Math.max(0, Math.min(1, v));
function mulberry(a) { return () => { let t = (a += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function makeHouse({ size = "1K", floors = 2, style = "white", neighbor = false, seed = 1, rich = true } = {}) {
  const P = PLOTS[size] || PLOTS["1K"], S = STYLES[style] || STYLES.white;
  const W = P.w * FT, D = P.d * FT;
  const rnd = mulberry(seed * 97 + 13);
  const group = new THREE.Group();
  const parts = [], geos = [];
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    frame: std({ color: S.frame, roughness: 0.55, map: TEX.plaster.t() }),
    lower: std({ color: S.lower, roughness: 0.85, map: TEX.plaster.t() }),
    band: std({ color: S.band, roughness: 0.4, metalness: 0.5 }),
    stone: std({ color: S.stone, roughness: 0.95, map: TEX.stone.t() }),
    wood: std({ color: S.wood, roughness: 0.55, map: TEX.wood.t() }),
    deck: std({ color: 0x9a6a44, roughness: 0.7, map: TEX.wood.t() }),
    slab: std({ color: 0xeeeae3, roughness: 0.6 }),
    dark: std({ color: 0x14181a, roughness: 0.9 }),
    mullion: std({ color: 0x15191b, roughness: 0.3, metalness: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbfd4d8, roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.2, envMapIntensity: 0.9, specularIntensity: 0.8, depthWrite: false }),
    rail: new THREE.MeshPhysicalMaterial({ color: 0xd8eef0, roughness: 0.02, transparent: true, opacity: 0.18, envMapIntensity: 2, depthWrite: false }),
    // inside the home
    floor: std({ color: 0xc9a77f, roughness: 0.45, map: TEX.wood.t() }),
    inWall: std({ color: 0xefe7da, roughness: 0.9 }),
    sofa: std({ color: 0xd8d2c6, roughness: 0.95 }),
    sofa2: std({ color: 0x5a6266, roughness: 0.95 }),
    rug: std({ color: 0x8b7d6b, roughness: 1 }),
    shelf: std({ color: 0x3b2c22, roughness: 0.6 }),
    book: std({ color: 0xb59a74, roughness: 0.8 }),
    curtain: std({ color: 0xf4efe4, roughness: 1, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    warm: std({ color: 0xfff3dd, emissive: 0xffc27a, emissiveIntensity: 0 }), // lamps, cove lights and downlights
    // garden
    lawn: std({ color: 0xffffff, roughness: 1, map: TEX.grass.t() }),
    soil: std({ color: 0xffffff, roughness: 1, map: TEX.soil.t() }),
    pave: std({ color: 0xffffff, roughness: 0.75, map: TEX.paving.t() }),
    gravel: std({ color: 0xd9d3c7, roughness: 1, map: TEX.soil.t() }),
    coping: std({ color: 0xe8e2d6, roughness: 0.7 }),
    poolTile: std({ color: 0xffffff, roughness: 0.4, map: TEX.tile.t() }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x2f9fb4, roughness: 0.03, transparent: true, opacity: 0.8, envMapIntensity: 2, emissive: 0x1aa0b5, emissiveIntensity: 0.04, depthWrite: false }),
    grassA: std({ color: 0x8aa06a, roughness: 1, side: THREE.DoubleSide }),
    grassB: std({ color: 0xb3bfa3, roughness: 1, side: THREE.DoubleSide }),
    hedge: std({ color: 0x3e6a37, roughness: 1, flatShading: true }),
    leafA: std({ color: 0x4d8040, roughness: 0.9 }),
    leafB: std({ color: 0x386431, roughness: 0.9 }),
    leafC: std({ color: 0x6a9448, roughness: 0.9 }),
    trunk: std({ color: 0x5a4030, roughness: 1 }),
    rock: std({ color: 0x9a968e, roughness: 1, flatShading: true }),
    solar: std({ color: 0x1a2a44, roughness: 0.2, metalness: 0.6 }),
    tank: std({ color: 0xf1f1ee, roughness: 0.5 }),
    crane: std({ color: 0xd2a746, roughness: 0.5, metalness: 0.4 }),
    craneDark: std({ color: 0x23302f, roughness: 0.6 }),
    peg: std({ color: 0xd2a746, emissive: 0x53451f }),
    car: new THREE.MeshPhysicalMaterial({ color: 0xf1efe9, roughness: 0.15, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.05 }),
    carGlass: new THREE.MeshPhysicalMaterial({ color: 0x1b2326, roughness: 0.05, metalness: 0.3 }),
    tyre: std({ color: 0x141414, roughness: 0.9 }),
  };
  for (const k in M) M[k].name = k; // names, so an offline renderer can give each material its real optical properties
  const TILE = new Map([[M.frame, TEX.plaster.m], [M.lower, TEX.plaster.m], [M.stone, TEX.stone.m], [M.wood, TEX.wood.m], [M.deck, TEX.wood.m], [M.floor, TEX.wood.m], [M.lawn, TEX.grass.m], [M.soil, TEX.soil.m], [M.pave, TEX.paving.m], [M.gravel, 1], [M.poolTile, TEX.tile.m]]);
  function box(w, h, d, mat, x, y, z, stage = 0, delay = 0, anim = "grow", round = 0, shadow = true) {
    let g;
    if (round > 0) { g = new RoundedBoxGeometry(w, h, d, 2, Math.min(round, h / 2.01, w / 2.01, d / 2.01)); g.translate(0, h / 2, 0); }
    else g = texturedBox(w, h, d, TILE.get(mat) || 1);
    geos.push(g);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    const see = mat !== M.glass && mat !== M.rail && mat !== M.water && mat !== M.curtain;
    m.castShadow = shadow && see && h > 0.08; m.receiveShadow = see;
    group.add(m);
    parts.push({ obj: m, stage, delay, anim, y });
    return m;
  }
  function add(o, stage, delay, anim = "pop") { group.add(o); parts.push({ obj: o, stage, delay, anim, y: o.position.y }); return o; }
  function mesh(geo, mat) { geos.push(geo); const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }

  // ------------------------------------------------ stage 0: the plot (soil), pegs and a gold string
  box(W, 0.12, D, M.soil, 0, 0, 0, 0, 0, "grow");
  const pegs = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
  let string = null;
  if (!neighbor) {
    pegs.forEach(([x, z], i) => box(0.12, 0.9, 0.12, M.peg, x, 0.12, z, 0, 0.2 + i * 0.12, "drop"));
    string = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pegs.map(([x, z]) => new THREE.Vector3(x, 0.8, z))), new THREE.LineBasicMaterial({ color: 0xe3c98d, transparent: true, opacity: 0.85 }));
    group.add(string);
  }

  // the footprint (the front of the plot is +z, the road side)
  const front = D * 0.27, back = D * 0.07, side = Math.max(1, W * 0.06);
  const hw = W - side * 2, hd = D - front - back;
  const z0 = -D / 2 + back, z1 = z0 + hd;
  const fh = 3.4, g0 = 0.12 + 0.55, slabT = 0.42;
  const lights = []; // positions of warm interior lights (for point lights at dusk and night)

  // ------------------------------------------------ stage 1: plinth and wide entrance steps
  box(hw + 0.4, 0.55, hd + 0.4, M.slab, 0, 0.12, (z0 + z1) / 2, 1, 0, "grow");
  box(3.2, 0.18, 1.5, M.slab, -hw * 0.3, 0.12, z1 + 1.0, 1, 0.5, "grow");
  box(3.2, 0.18, 1.0, M.slab, -hw * 0.3, 0.3, z1 + 0.75, 1, 0.6, "grow");

  // ------------------------------------------------ stage 2: ground floor: rooms at the back, a glass living room in front
  const solidD = hd * 0.5, glassZ = z1 - 0.25; // the glass wall sits just behind the slab edge
  box(hw, fh, solidD, M.lower, 0, g0, z0 + solidD / 2, 2, 0, "grow");
  const entW = hw * 0.26, entX = -hw / 2 + entW / 2;
  box(entW, fh, z1 - (z0 + solidD), M.stone, entX, g0, z0 + solidD + (z1 - z0 - solidD) / 2, 2, 0.25, "grow"); // stone-clad entrance block
  box(1.4, 2.7, 0.12, M.wood, entX + entW * 0.15, g0, z1 + 0.02, 2, 0.6, "grow"); // tall pivot door
  // the living room inside the glass: floor, back wall, sofa, rug, table, shelves, curtains, lamps
  const lrX0 = entX + entW / 2, lrX1 = hw / 2, lrW = lrX1 - lrX0, lrCX = (lrX0 + lrX1) / 2, lrZ0 = z0 + solidD, lrD = glassZ - lrZ0;
  if (rich) {
    box(lrW, 0.05, lrD, M.floor, lrCX, g0, lrZ0 + lrD / 2, 2, 0.3, "grow", 0, false);
    box(lrW, fh, 0.12, M.inWall, lrCX, g0, lrZ0 + 0.06, 2, 0.3, "grow", 0, false);
    box(lrW * 0.42, fh * 0.75, 0.35, M.shelf, lrCX + lrW * 0.22, g0, lrZ0 + 0.3, 2, 0.5, "grow", 0, false);
    for (let i = 0; i < 4; i++) box(lrW * 0.38, 0.3, 0.25, M.book, lrCX + lrW * 0.22, g0 + 0.4 + i * 0.6, lrZ0 + 0.35, 2, 0.55, "grow", 0, false);
    box(lrW * 0.5, 0.02, lrD * 0.45, M.rug, lrCX - lrW * 0.05, g0 + 0.05, lrZ0 + lrD * 0.55, 2, 0.6, "grow", 0, false);
    box(lrW * 0.36, 0.45, 0.95, M.sofa, lrCX - lrW * 0.05, g0, lrZ0 + lrD * 0.3, 2, 0.65, "grow", 0.12, false);
    box(lrW * 0.36, 0.75, 0.25, M.sofa, lrCX - lrW * 0.05, g0, lrZ0 + lrD * 0.3 - 0.45, 2, 0.66, "grow", 0.1, false);
    box(0.95, 0.45, lrD * 0.3, M.sofa2, lrCX - lrW * 0.27, g0, lrZ0 + lrD * 0.55, 2, 0.68, "grow", 0.12, false);
    box(1.0, 0.35, 0.7, M.shelf, lrCX - lrW * 0.05, g0, lrZ0 + lrD * 0.6, 2, 0.7, "grow", 0.05, false);
    const lampG = new THREE.CylinderGeometry(0.22, 0.28, 0.4, 16); geos.push(lampG);
    const lamp = new THREE.Mesh(lampG, M.warm); lamp.position.set(lrCX + lrW * 0.18, g0 + 1.5, lrZ0 + lrD * 0.35); add(lamp, 2, 0.72);
    box(0.04, 1.3, 0.04, M.mullion, lrCX + lrW * 0.18, g0, lrZ0 + lrD * 0.35, 2, 0.72, "grow", 0, false);
    // sheer curtains at the sides of the glass
    box(0.9, fh - 0.2, 0.04, M.curtain, lrX0 + 0.6, g0 + 0.05, glassZ - 0.25, 5, 0.6, "grow", 0, false);
    box(0.9, fh - 0.2, 0.04, M.curtain, lrX1 - 0.6, g0 + 0.05, glassZ - 0.25, 5, 0.62, "grow", 0, false);
    // a cove of light along the ceiling, and pendants over a dining table
    box(lrW - 0.4, 0.06, 0.12, M.warm, lrCX, g0 + fh - 0.12, glassZ - 0.35, 2, 0.8, "grow", 0, false);
    box(1.8, 0.75, 0.9, M.shelf, lrCX + lrW * 0.3, g0, lrZ0 + lrD * 0.62, 2, 0.74, "grow", 0.03, false);
    for (let i = 0; i < 3; i++) { const pg = new THREE.SphereGeometry(0.16, 14, 10); geos.push(pg); const pd = new THREE.Mesh(pg, M.warm); pd.position.set(lrCX + lrW * 0.3 - 0.6 + i * 0.6, g0 + 2.2, lrZ0 + lrD * 0.62); add(pd, 2, 0.8); }
    lights.push(new THREE.Vector3(lrCX, g0 + 2.4, lrZ0 + lrD * 0.5));
  }

  // ------------------------------------------------ stage 3: the upper floor: a white frame that reaches forward over the terrace
  let y = g0 + fh;
  const reach = Math.min(2.4, front * 0.3); // how far the upper floor reaches forward
  const slabD = hd + reach + 0.3, slabZ = z0 - 0.15 + slabD / 2;
  box(hw + 0.5, slabT, slabD, M.slab, 0, y, slabZ, 3, 0, "drop", 0.04);
  box(hw + 0.52, 0.12, 0.06, M.band, 0, y + slabT * 0.35, z0 - 0.15 + slabD + 0.01, 3, 0.1, "grow"); // dark fascia line
  // downlights in the soffit under the reach
  if (rich) for (let i = 0; i < 6; i++) { const dg = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12); geos.push(dg); const dl = new THREE.Mesh(dg, M.warm); dl.position.set(-hw / 2 + 1 + (i * (hw - 2)) / 5, y - 0.01, z1 + reach * 0.45); add(dl, 5, 0.5 + i * 0.03); }
  y += slabT;
  const uppers = [];
  const frameT = 0.4, ffD = hd * 0.86 + reach, ffZ0 = z0 + hd * 0.14 - 0.15, ffZ1 = ffZ0 + ffD, ffW = hw * 0.86, ffX = hw * 0.07;
  const recess = 1.3; // glass set back inside the frame, with a balcony in front
  box(frameT, fh, ffD, M.frame, ffX - ffW / 2 + frameT / 2, y, ffZ0 + ffD / 2, 3, 0.2, "grow");
  box(frameT, fh, ffD, M.frame, ffX + ffW / 2 - frameT / 2, y, ffZ0 + ffD / 2, 3, 0.25, "grow");
  const roomD = 4.2; // a room behind the upper glass that you can see into
  box(ffW - frameT * 2, fh, ffD - recess - roomD, M.lower, ffX, y, ffZ0 + (ffD - recess - roomD) / 2, 3, 0.3, "grow"); // rooms at the back
  box(ffW - frameT * 2, 0.05, roomD, M.floor, ffX, y, ffZ1 - recess - roomD / 2, 3, 0.32, "grow", 0, false);
  box(ffW - frameT * 2, fh, 0.1, M.inWall, ffX, y, ffZ1 - recess - roomD + 0.05, 3, 0.34, "grow", 0, false);
  box(1.2, fh, 0.5, M.stone, ffX - ffW / 2 + frameT + 0.6, y, ffZ1 - recess - 0.25, 3, 0.45, "grow"); // a stone strip
  if (rich) { // the upper room behind the glass: floor, bed or lounge, a lamp
    box(ffW - frameT * 2 - 0.2, 0.05, recess - 0.2, M.deck, ffX, y, ffZ1 - recess / 2, 3, 0.4, "grow", 0, false); // balcony deck
    const rz = ffZ1 - recess - roomD;
    box(2.2, 0.5, 2.0, M.sofa, ffX + ffW * 0.12, y, rz + 1.4, 3, 0.6, "grow", 0.1, false); // a bed
    box(2.2, 0.9, 0.15, M.wood, ffX + ffW * 0.12, y, rz + 0.3, 3, 0.62, "grow", 0, false); // headboard
    box(ffW * 0.3, fh * 0.7, 0.3, M.shelf, ffX - ffW * 0.25, y, rz + 0.25, 3, 0.64, "grow", 0, false);
    box(0.9, fh - 0.3, 0.04, M.curtain, ffX - (ffW - frameT * 2) / 2 + 0.6, y + 0.1, ffZ1 - recess - 0.25, 5, 0.7, "grow", 0, false);
    box(ffW - frameT * 2 - 0.4, 0.06, 0.12, M.warm, ffX, y + fh - 0.12, rz + 0.2, 3, 0.8, "grow", 0, false); // a cove light over the bed wall
    const lg2 = new THREE.CylinderGeometry(0.18, 0.22, 0.3, 14); geos.push(lg2);
    const bl = new THREE.Mesh(lg2, M.warm); bl.position.set(ffX + ffW * 0.12 + 1.4, y + 0.9, rz + 0.6); add(bl, 3, 0.85);
    lights.push(new THREE.Vector3(ffX, y + 2.4, rz + 2));
  }
  y += fh;
  // the top of the frame, with a wooden ceiling under the front part
  box(ffW, slabT + 0.1, ffD, M.frame, ffX, y, ffZ0 + ffD / 2, 4, 0, "drop", 0.04);
  box(ffW - frameT * 2, 0.04, recess + 0.1, M.wood, ffX, y - 0.04, ffZ1 - recess / 2, 4, 0.2, "grow", 0, false);
  if (rich) for (let i = 0; i < 4; i++) { const dg = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12); geos.push(dg); const dl = new THREE.Mesh(dg, M.warm); dl.position.set(ffX - ffW / 2 + 1.2 + (i * (ffW - 2.4)) / 3, y - 0.05, ffZ1 - recess / 2); add(dl, 5, 0.6 + i * 0.03); }
  uppers.push({ y: y - fh, glassZ: ffZ1 - recess, w: ffW - frameT * 2, x: ffX });
  y += slabT + 0.1;
  if (floors >= 3) { // a smaller penthouse set back on the roof
    const pW = ffW * 0.55, pD = ffD * 0.5, pX = ffX - ffW * 0.18, pZ0 = ffZ0 + 0.4;
    box(pW, fh, pD, M.lower, pX, y, pZ0 + pD / 2, 4, 0.3, "grow");
    box(pW + 0.6, slabT, pD + 0.8, M.frame, pX, y + fh, pZ0 + pD / 2 + 0.2, 4, 0.5, "drop", 0.04);
    uppers.push({ y, glassZ: pZ0 + pD, w: pW * 0.8, x: pX });
  }
  // the roof: a slim parapet, the water tank and solar panels at the back (hidden from the street)
  const roofY = g0 + fh + slabT + fh + slabT + 0.1;
  box(ffW, 0.6, 0.15, M.frame, ffX, roofY, ffZ1 - 0.08, 4, 0.4, "grow");
  // with a penthouse, the tank and panels go on the penthouse roof; otherwise at the back of the main roof
  const pent = floors >= 3, tY = pent ? roofY + fh + slabT : roofY, tZ = pent ? ffZ0 + 1.4 : ffZ0 + 1.6, tX = pent ? ffX - ffW * 0.18 : ffX;
  const tankG = new THREE.CylinderGeometry(0.65, 0.65, 1.3, 20); geos.push(tankG);
  const tank = mesh(tankG, M.tank); tank.position.set(tX + ffW * (pent ? 0.15 : 0.3), tY + 0.65, tZ); add(tank, 4, 0.6);
  for (let i = 0; i < (pent ? 3 : 4); i++) { const pg = new THREE.BoxGeometry(1.0, 0.05, 1.7); geos.push(pg); const sp = mesh(pg, M.solar); sp.position.set(tX - ffW * (pent ? 0.15 : 0.25) + i * 1.12, tY + 0.6, tZ); sp.rotation.x = 0.45; add(sp, 4, 0.65 + i * 0.04); }
  // glass rails along the balcony and the terrace edge
  for (const u of uppers) box(u.w, 1.05, 0.04, M.rail, u.x, u.y, u.glassZ + recess - 0.15, 4, 0.8, "grow");

  // ------------------------------------------------ stage 5: full-height glass with slim black frames
  function glassWall(x, w, y0, h, z, delay) {
    box(w, h, 0.03, M.glass, x, y0, z, 5, delay, "grow");
    const n = Math.max(2, Math.round(w / 1.8));
    for (let i = 0; i <= n; i++) box(0.06, h, 0.09, M.mullion, x - w / 2 + (w * i) / n, y0, z, 5, delay + 0.05, "grow", 0, false);
    box(w, 0.07, 0.1, M.mullion, x, y0 + h - 0.07, z, 5, delay + 0.08, "grow", 0, false);
  }
  glassWall(lrCX, lrW, g0, fh, glassZ, 0);
  for (const u of uppers) glassWall(u.x, u.w, u.y, fh, u.glassZ, 0.3);

  // ------------------------------------------------ stage 6: garden: lawn, deck and pool, path of stepping stones, grasses, trees, boundary wall
  box(W - 0.5, 0.04, D - 0.5, M.lawn, 0, 0.12, 0, 6, 0, "grow");
  const gateW = Math.min(4.4, W * 0.34), gateX = W / 2 - 0.5 - gateW / 2;
  box(gateW, 0.05, front + 0.4, M.pave, gateX, 0.16, z1 + front / 2, 6, 0.08, "grow");
  for (let i = 0; i < Math.floor((front - 2) / 0.9); i++) box(1.1, 0.06, 0.6, M.pave, -hw * 0.3 + (i % 2 ? 0.15 : -0.15), 0.16, z1 + 1.9 + i * 0.9, 6, 0.1 + i * 0.02, "grow");
  if (!neighbor && W > 11) { // a deck and a pool with a stone edge in front of the living room
    const pw = Math.min(5.5, lrW * 0.7), pd = Math.min(front - 3.4, 4.2), pxp = lrCX - 0.4, pzp = z1 + 1.4 + pd / 2;
    box(pw + 2.4, 0.08, pd + 1.4, M.deck, pxp, 0.14, pzp, 6, 0.3, "grow");
    box(pw + 0.5, 0.1, pd + 0.5, M.coping, pxp, 0.18, pzp, 6, 0.35, "grow");
    box(pw, 0.03, pd, M.poolTile, pxp, 0.27, pzp, 6, 0.4, "grow", 0, false);
    const wg = new THREE.PlaneGeometry(pw, pd); geos.push(wg);
    const water = new THREE.Mesh(wg, M.water); water.rotation.x = -Math.PI / 2; water.position.set(pxp, 0.29, pzp);
    add(water, 6, 0.5, "pop"); water.userData.pool = { w: pw, d: pd };
  }
  // boundary wall: stone with a coping, and a dark gate with wooden slats
  const bwH = 1.8, fwH = 1.0; // tall side and back walls; a low wall on the street side, so the home shows
  const wallSeg = (w, d, x, z, delay, h = bwH) => { box(w, h, d, M.stone, x, 0.12, z, 6, delay, "grow"); box(w + 0.08, 0.08, d + 0.08, M.coping, x, 0.12 + h, z, 6, delay + 0.1, "drop"); };
  wallSeg(W, 0.24, 0, -D / 2 + 0.12, 0.2);
  wallSeg(0.24, D, -W / 2 + 0.12, 0, 0.22);
  wallSeg(0.24, D, W / 2 - 0.12, 0, 0.22);
  const fW = W - gateW - 1.6;
  wallSeg(fW, 0.24, -W / 2 + fW / 2, D / 2 - 0.12, 0.25, fwH);
  box(gateW, 1.1, 0.08, M.dark, gateX, 0.14, D / 2 - 0.06, 6, 0.45, "grow");
  for (let i = 0; i < 4; i++) box(gateW - 0.2, 0.15, 0.09, M.wood, gateX, 0.3 + i * 0.22, D / 2 - 0.02, 6, 0.5 + i * 0.02, "grow");
  for (const gx of [gateX - gateW / 2 - 0.35, gateX + gateW / 2 + 0.35]) { box(0.5, 1.5, 0.5, M.stone, gx, 0.12, D / 2 - 0.12, 6, 0.42, "grow"); box(0.3, 0.12, 0.3, M.warm, gx, 1.62, D / 2 - 0.12, 6, 0.6, "pop", 0, false); }
  // garden lights along the path (black bollards with a warm top)
  for (let i = 0; i < 3; i++) { box(0.16, 0.7, 0.16, M.dark, -hw * 0.3 - 1.0, 0.16, z1 + 2.2 + i * ((front - 2.8) / 2), 6, 0.6, "pop", 0, false); box(0.17, 0.08, 0.17, M.warm, -hw * 0.3 - 1.0, 0.86, z1 + 2.2 + i * ((front - 2.8) / 2), 6, 0.62, "pop", 0, false); }

  // ornamental grasses: many thin blades in tufts along the beds (one instanced mesh, fast)
  const sway = [];
  if (rich) {
    const blade = new THREE.ConeGeometry(0.03, 0.75, 3); blade.translate(0, 0.375, 0); geos.push(blade);
    const spots = [];
    for (let i = 0; i < 22; i++) spots.push([-W / 2 + 0.9 + rnd() * (W * 0.42), z1 + 0.6 + rnd() * 0.6]);
    for (let i = 0; i < 14; i++) spots.push([-W / 2 + 0.7 + rnd() * 0.6, z1 + 1 + rnd() * (front - 2)]);
    for (let i = 0; i < 10; i++) spots.push([gateX - gateW / 2 - 1.2 + rnd() * 0.5, z1 + 1 + rnd() * (front - 2)]);
    for (const mat of [M.grassA, M.grassB]) {
      const n = spots.length * 9;
      const inst = new THREE.InstancedMesh(blade, mat, n); inst.castShadow = false; inst.receiveShadow = true;
      const d = new THREE.Object3D(); let k = 0;
      for (const [sx, sz] of spots) for (let j = 0; j < 9; j++) {
        d.position.set(sx + (rnd() - 0.5) * 0.35, 0.16, sz + (rnd() - 0.5) * 0.35);
        d.rotation.set((rnd() - 0.5) * 0.7, rnd() * 6, (rnd() - 0.5) * 0.7);
        d.scale.setScalar(0.6 + rnd() * 0.7); d.updateMatrix(); inst.setMatrixAt(k++, d.matrix);
      }
      add(inst, 6, mat === M.grassA ? 0.55 : 0.6, "pop"); sway.push(inst);
    }
  }
  // shrubs, rocks and trees
  const shrub = (x, z, s, delay) => { const g = new THREE.IcosahedronGeometry(s, 1); geos.push(g); const m = new THREE.Mesh(g, M.hedge); m.position.set(x, 0.14 + s * 0.55, z); m.scale.y = 0.7; m.castShadow = true; return add(m, 6, delay); };
  for (let i = 0; i < 6; i++) shrub(lrX0 + 0.6 + i * (lrW / 6), glassZ + 0.6, 0.42, 0.5 + i * 0.03);
  for (let i = 0; i < 3; i++) { const rg = new THREE.DodecahedronGeometry(0.35 + rnd() * 0.25, 0); geos.push(rg); const r = mesh(rg, M.rock); r.position.set(-W / 2 + 1.5 + rnd() * 3, 0.2, D / 2 - 1.5 - rnd() * 2); r.scale.y = 0.55; add(r, 6, 0.6); }
  function tree(x, z, sc, delay) {
    const t = new THREE.Group(); t.position.set(x, 0.14, z);
    const tg = new THREE.CylinderGeometry(0.09 * sc, 0.16 * sc, 3 * sc, 7); geos.push(tg);
    const trunk = new THREE.Mesh(tg, M.trunk); trunk.position.y = 1.5 * sc; trunk.castShadow = true; t.add(trunk);
    const leaves = [M.leafA, M.leafB, M.leafC];
    for (let i = 0; i < 14; i++) {
      const lg = new THREE.IcosahedronGeometry((0.55 + rnd() * 0.5) * sc, 2); geos.push(lg);
      const pos = lg.attributes.position; for (let j = 0; j < pos.count; j++) pos.setXYZ(j, pos.getX(j) * (0.8 + rnd() * 0.4), pos.getY(j) * (0.75 + rnd() * 0.35), pos.getZ(j) * (0.8 + rnd() * 0.4));
      lg.computeVertexNormals();
      const c = new THREE.Mesh(lg, leaves[i % 3]); c.position.set((rnd() - 0.5) * 2.2 * sc, (3 + rnd() * 1.8) * sc, (rnd() - 0.5) * 2.2 * sc); c.castShadow = true; t.add(c);
    }
    return add(t, 6, delay);
  }
  const trees = [tree(-W * 0.38, -D / 2 + back * 0.5, 1.15, 0.5), tree(W * 0.36, -D / 2 + back * 0.6, 1.0, 0.55), tree(-W * 0.36, D / 2 - 1.6, 0.95, 0.65)];
  if (W > 11) trees.push(tree(W / 2 - 1.2, -D / 2 + back + 3, 0.8, 0.7));

  // ------------------------------------------------ the car and the crane (your own home only)
  let car = null, crane = null, head = null, trolley = null, cable = null, hook = null, jib = 0;
  const carPark = z1 + 2.8, carStart = D / 2 + 12;
  if (!neighbor) {
    car = new THREE.Group();
    const bg = new RoundedBoxGeometry(1.9, 0.6, 4.6, 4, 0.22); geos.push(bg);
    const body = mesh(bg, M.car); body.position.y = 0.62; car.add(body);
    const cg = new RoundedBoxGeometry(1.62, 0.52, 2.3, 4, 0.22); geos.push(cg);
    const cab = mesh(cg, M.carGlass); cab.position.set(0, 1.1, 0.25); car.add(cab);
    for (const [wx, wz] of [[-0.9, 1.45], [0.9, 1.45], [-0.9, -1.45], [0.9, -1.45]]) { const wg = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 18); geos.push(wg); const w = mesh(wg, M.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.35, wz); car.add(w); }
    for (const lx of [-0.62, 0.62]) { const lg = new THREE.BoxGeometry(0.34, 0.08, 0.05); geos.push(lg); const l = new THREE.Mesh(lg, M.warm); l.position.set(lx, 0.7, -2.3); car.add(l); }
    car.position.set(gateX, 0.16, carStart); group.add(car);

    crane = new THREE.Group();
    const craneH = roofY + 9; jib = Math.max(W, D) * 0.75;
    const mast = mesh(new THREE.BoxGeometry(0.7, craneH, 0.7), M.crane); mast.position.y = craneH / 2; crane.add(mast);
    for (let i = 1; i < craneH; i += 1.4) { const rr = mesh(new THREE.BoxGeometry(0.8, 0.08, 0.8), M.craneDark); rr.position.y = i; crane.add(rr); }
    head = new THREE.Group(); head.position.y = craneH; crane.add(head);
    const jm = mesh(new THREE.BoxGeometry(jib, 0.5, 0.6), M.crane); jm.position.x = jib / 2 - 1; head.add(jm);
    const cm = mesh(new THREE.BoxGeometry(5, 0.5, 0.6), M.crane); cm.position.x = -3.2; head.add(cm);
    const wt = mesh(new THREE.BoxGeometry(1.6, 1.2, 1.1), M.craneDark); wt.position.set(-5, -0.8, 0); head.add(wt);
    const cb = mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), M.craneDark); cb.position.set(0.6, -1.0, 0.7); head.add(cb);
    const pk = mesh(new THREE.ConeGeometry(0.5, 3, 4), M.crane); pk.position.y = 1.7; head.add(pk);
    trolley = new THREE.Group(); head.add(trolley);
    cable = mesh(new THREE.BoxGeometry(0.05, 1, 0.05), M.craneDark); trolley.add(cable);
    hook = mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), M.craneDark); trolley.add(hook);
    crane.position.set(-W / 2 - 2.5, 0, -D / 2 + 3);
    group.add(crane);
  }

  // ------------------------------------------------ animation and light
  function animPart(pt, k) {
    const o = pt.obj;
    o.visible = k > 0.001;
    if (!o.visible) return;
    if (pt.anim === "grow") { o.scale.y = Math.max(0.001, easeOut(k)); o.position.y = pt.y; }
    else if (pt.anim === "drop") { o.position.y = pt.y + (1 - easeBack(k)) * 7; }
    else { const s = Math.max(0.001, easeBack(k)); o.scale.setScalar(s); }
  }
  let mood = "day";
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
    trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * 0.7 + i) * 0.012; });
    sway.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.3 + i) * 0.02; });
    if (car) { const c = clamp((p - 7) / 0.9); car.visible = p > 7; car.position.z = carStart + (carPark - carStart) * (1 - Math.pow(1 - c, 2)); }
    const on = clamp((p - 5.3) / 0.6);
    M.warm.emissiveIntensity = (mood === "night" ? 3.2 : mood === "dusk" ? 2.6 : 0.9) * on;
  }
  function setMood(m) {
    mood = m;
    M.glass.opacity = m === "day" ? 0.22 : 0.12;
    M.curtain.emissive = new THREE.Color(m === "day" ? 0x000000 : 0x6b4a20);
    M.water.emissiveIntensity = m === "night" ? 0.7 : m === "dusk" ? 0.35 : 0.04;
  }
  const END = STAGES.length + 0.2;
  setProgress(END);
  return {
    group, setProgress, setMood, setNight: (n) => setMood(n ? "night" : "day"), end: END, lights,
    pool: group.children.find((o) => o.userData && o.userData.pool) || null,
    plot: { w: W, d: D, label: P.label, ft: [P.w, P.d] },
    height: roofY,
    eye: { z: z1 + front, h: roofY }, // for the camera: the street edge of the plot and the height of the home
    dispose() { geos.forEach((g) => g.dispose()); Object.values(M).forEach((m) => m.dispose()); if (string) { string.geometry.dispose(); string.material.dispose(); } },
  };
}
