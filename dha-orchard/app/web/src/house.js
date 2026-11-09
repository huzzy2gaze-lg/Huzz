// An illustrative modern home on a plot, drawn to scale in three.js (1 unit = 1 metre), with a construction
// animation: a tower crane rises, the home is built part by part (each part drops in and settles), the crane
// lowers away, the garden grows, the lights come on and a car drives in.
// Plot sizes are the standard sizes on the plan: 1 Kanal 50 × 90 ft, 14 Marla 40 × 80 ft, 10 Marla 32 × 70 ft.
// The home itself is an illustration only (not a DHA or FGEHA design).
import * as THREE from "three";

const FT = 0.3048;
export const PLOTS = {
  "10M": { label: "10 Marla", w: 32, d: 70 },
  "14M": { label: "14 Marla", w: 40, d: 80 },
  "1K": { label: "1 Kanal", w: 50, d: 90 },
};
export const STYLES = {
  white: { label: "Modern white", wall: 0xe6e0d4, wall2: 0xc9bfae, frame: 0x2b3133, trim: 0xd2a746, stone: 0xcfc6b6, wood: 0x8a5a36 },
  brick: { label: "Warm brick", wall: 0xa95a3a, wall2: 0xe8dfcf, frame: 0x2b2522, trim: 0xd2a746, stone: 0xc9b79a, wood: 0x6e4528 },
  dark: { label: "Contemporary dark", wall: 0x30383a, wall2: 0xcdbf9f, frame: 0x14191a, trim: 0xd2a746, stone: 0x707572, wood: 0x9a6b42 },
};
// the build stages, in order (the animation runs from 0 to STAGES.length)
export const STAGES = ["Plot", "Foundation", "Ground floor", "Upper floor", "Roof and terrace", "Windows and lights", "Garden and boundary wall", "Your home is ready"];

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp = (v) => Math.max(0, Math.min(1, v));

export function makeHouse({ size = "1K", floors = 2, style = "white" } = {}) {
  const P = PLOTS[size] || PLOTS["1K"], S = STYLES[style] || STYLES.white;
  const W = P.w * FT, D = P.d * FT; // plot, metres
  const group = new THREE.Group();
  const parts = []; // { obj, stage, delay, anim, base }
  const M = {
    wall: new THREE.MeshStandardMaterial({ color: S.wall, roughness: 0.85 }),
    wall2: new THREE.MeshStandardMaterial({ color: S.wall2, roughness: 0.8 }),
    slab: new THREE.MeshStandardMaterial({ color: 0xd8d3c8, roughness: 0.75 }),
    frame: new THREE.MeshStandardMaterial({ color: S.frame, roughness: 0.4, metalness: 0.6 }),
    trim: new THREE.MeshStandardMaterial({ color: S.trim, roughness: 0.3, metalness: 0.8 }),
    stone: new THREE.MeshStandardMaterial({ color: S.stone, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: S.wood, roughness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb8bd, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.55, envMapIntensity: 1.4, emissive: 0xffc46a, emissiveIntensity: 0 }),
    rail: new THREE.MeshPhysicalMaterial({ color: 0xcfe3e6, roughness: 0.05, transparent: true, opacity: 0.28 }),
    lawn: new THREE.MeshStandardMaterial({ color: 0x5f8f55, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 1 }),
    pave: new THREE.MeshStandardMaterial({ color: 0xc8c0b0, roughness: 0.9 }),
    hedge: new THREE.MeshStandardMaterial({ color: 0x3e6e3a, roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x4a7f3f, roughness: 0.95, flatShading: true }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5e4129, roughness: 1 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x3fb8c9, roughness: 0.05, metalness: 0.1, emissive: 0x1aa0b5, emissiveIntensity: 0.15, transparent: true, opacity: 0.9 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffb04a, emissiveIntensity: 0 }),
    crane: new THREE.MeshStandardMaterial({ color: 0xd2a746, roughness: 0.5, metalness: 0.4 }),
    craneDark: new THREE.MeshStandardMaterial({ color: 0x23302f, roughness: 0.6 }),
    peg: new THREE.MeshStandardMaterial({ color: 0xd2a746, emissive: 0x53451f }),
    car: new THREE.MeshStandardMaterial({ color: 0xece7dc, roughness: 0.25, metalness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
  };
  const geoBox = new THREE.BoxGeometry(1, 1, 1); geoBox.translate(0, 0.5, 0); // base at y = 0
  // a box with its base at (x, y, z); anim: "grow" (rises from the ground), "drop" (falls in and settles), "pop"
  function box(w, h, d, mat, x, y, z, stage, delay = 0, anim = "drop") {
    const m = new THREE.Mesh(geoBox, mat);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = h > 0.08; m.receiveShadow = true;
    group.add(m);
    parts.push({ obj: m, stage, delay, anim, base: { y, sx: w, sy: h, sz: d } });
    return m;
  }
  function obj(o, stage, delay = 0, anim = "pop") { group.add(o); parts.push({ obj: o, stage, delay, anim, base: { y: o.position.y, sx: o.scale.x, sy: o.scale.y, sz: o.scale.z } }); return o; }

  // ------------------------------------------------ stage 0: the plot, soil, pegs
  box(W, 0.12, D, M.soil, 0, 0, 0, 0, 0, "grow");
  const pegs = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
  pegs.forEach(([x, z], i) => box(0.12, 0.9, 0.12, M.peg, x, 0.12, z, 0, 0.2 + i * 0.12, "drop"));
  // a thin gold string between the pegs, at peg height (until the boundary wall is built)
  const string = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pegs.map(([x, z]) => new THREE.Vector3(x, 0.8, z))), new THREE.LineBasicMaterial({ color: 0xe3c98d, transparent: true, opacity: 0.85 }));
  group.add(string);

  // the home footprint (the front of the plot is +z, the road side)
  const front = D * 0.25, back = D * 0.07, side = Math.max(1, W * 0.06);
  const hw = W - side * 2, hd = D - front - back;
  const z0 = -D / 2 + back, z1 = z0 + hd, cz = (z0 + z1) / 2; // back and front of the home
  const fh = 3.3, slabT = 0.3, plinth = 0.6, g = 0.12 + plinth;

  // ------------------------------------------------ stage 1: foundation (plinth, entrance step)
  box(hw + 0.6, plinth, hd + 0.6, M.stone, 0, 0.12, cz, 1, 0, "grow");
  box(2.4, 0.3, 1.2, M.stone, -hw * 0.2, 0.12, z1 + 0.9, 1, 0.5, "grow");

  // ------------------------------------------------ stage 2: ground floor (solid back, glass living room at the front)
  const gfDepthSolid = hd * 0.62;
  box(hw, fh, gfDepthSolid, M.wall, 0, g, z0 + gfDepthSolid / 2, 2, 0, "grow");
  box(hw * 0.38, fh, hd - gfDepthSolid, M.wall2, -hw * 0.31, g, z0 + gfDepthSolid + (hd - gfDepthSolid) / 2, 2, 0.3, "grow");
  const lrW = hw * 0.62, lrD = hd - gfDepthSolid, lrX = hw * 0.19, lrZ = z0 + gfDepthSolid + lrD / 2;
  box(lrW, fh, lrD, M.glass, lrX, g, lrZ, 5, 0, "grow");
  for (let i = 0; i <= 4; i++) box(0.12, fh, 0.12, M.frame, lrX - lrW / 2 + (lrW * i) / 4, g, z1, 2, 0.5 + i * 0.08, "grow");
  box(1.2, 2.4, 0.12, M.wood, -hw * 0.2, g, z1 + 0.02, 2, 0.8, "grow"); // front door

  // ------------------------------------------------ stage 3: upper floor(s); each one sits on a full slab
  let y = g + fh;
  const ffD = hd * 0.86, ffZ = z0 + ffD / 2 + hd * 0.08; // the first floor reaches forward over the porch
  box(hw + 0.3, slabT, hd + 0.3, M.slab, 0, y, cz, 3, 0, "drop");
  y += slabT;
  const uppers = [];
  box(hw, fh, ffD, M.wall, 0, y, ffZ, 3, 0.25, "grow");
  uppers.push({ y, d: ffD, z: ffZ, w: hw, x: 0 });
  box(0.45, fh + slabT, ffD, M.trim, -hw / 2 + 0.6, y, ffZ, 3, 0.6, "grow"); // gold fin
  y += fh;
  if (floors >= 3) {
    const sfD = ffD * 0.62, sfZ = ffZ - ffD / 2 + sfD / 2, sfW = hw * 0.78;
    box(hw + 0.3, slabT, ffD + 0.3, M.slab, 0, y, ffZ, 3, 0.7, "drop");
    y += slabT;
    box(sfW, fh, sfD, M.wall2, -hw * 0.11, y, sfZ, 3, 0.85, "grow");
    uppers.push({ y, d: sfD, z: sfZ, w: sfW, x: -hw * 0.11, terrace: true });
    y += fh;
  }
  const top = uppers[uppers.length - 1];
  // ------------------------------------------------ stage 4: roof slab (matches the top floor, small overhang), stair room, pergola on posts, glass rails
  box(top.w + 0.8, slabT, top.d + 0.8, M.slab, top.x, y, top.z, 4, 0, "drop");
  const roofY = y + slabT;
  box(top.w * 0.28, 2.5, top.d * 0.32, M.wall2, top.x - top.w * 0.3, roofY, top.z - top.d * 0.28, 4, 0.3, "grow");
  const pgW = top.w * 0.45, pgD = top.d * 0.4, pgX = top.x + top.w * 0.2, pgZ = top.z + top.d * 0.15, pgH = 2.5;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(0.14, pgH, 0.14, M.trim, pgX + (sx * pgW) / 2, roofY, pgZ + (sz * pgD) / 2, 4, 0.5, "grow");
  for (let i = 0; i < 7; i++) box(pgW + 0.3, 0.1, 0.16, M.trim, pgX, roofY + pgH, pgZ - pgD / 2 + (pgD * i) / 6, 4, 0.7 + i * 0.03, "drop");
  box(top.w * 0.9, 1.0, 0.06, M.rail, top.x, roofY, top.z + top.d / 2 + 0.3, 4, 0.8, "grow");
  if (top.terrace) box(hw * 0.9, 1.0, 0.06, M.rail, 0, top.y, ffZ + ffD / 2 + 0.1, 4, 0.85, "grow");
  box(hw * 0.5, 1.0, 0.06, M.rail, hw * 0.2, g + fh + slabT, z1 + 0.13, 4, 0.9, "grow"); // balcony rail over the porch

  // ------------------------------------------------ stage 5: windows (a ribbon window on each upper floor, side windows)
  for (const u of uppers) {
    box(u.w * 0.62, fh * 0.55, 0.1, M.glass, u.x + u.w * 0.1, u.y + fh * 0.25, u.z + u.d / 2 + 0.03, 5, 0.1, "grow");
    box(0.1, fh * 0.55, u.d * 0.45, M.glass, u.x + u.w / 2 + 0.03, u.y + fh * 0.25, u.z, 5, 0.35, "grow");
  }
  box(0.1, fh * 0.5, gfDepthSolid * 0.4, M.glass, hw / 2 + 0.03, g + fh * 0.3, z0 + gfDepthSolid * 0.5, 5, 0.5, "grow");

  // ------------------------------------------------ stage 6: garden, paving, boundary wall, gate, lamps, hedge, pool, trees
  box(W - 0.6, 0.06, front - 0.4, M.lawn, 0, 0.12, D / 2 - front / 2, 6, 0, "grow");
  box(W - 0.6, 0.06, back, M.lawn, 0, 0.12, -D / 2 + back / 2 + 0.15, 6, 0, "grow");
  const gateW = Math.min(4.2, W * 0.35), gateX = W / 2 - 0.6 - gateW / 2;
  box(gateW, 0.08, front + 0.6, M.pave, gateX, 0.12, D / 2 - front / 2, 6, 0.1, "grow"); // driveway
  box(1.4, 0.08, front - 1.2, M.pave, -hw * 0.2, 0.12, z1 + (front - 1.2) / 2 + 0.6, 6, 0.15, "grow"); // path to the door
  const bwH = 1.7, bw = M.stone;
  box(W, bwH, 0.22, bw, 0, 0.12, -D / 2 + 0.11, 6, 0.2, "grow");
  box(0.22, bwH, D, bw, -W / 2 + 0.11, 0.12, 0, 6, 0.25, "grow");
  box(0.22, bwH, D, bw, W / 2 - 0.11, 0.12, 0, 6, 0.25, "grow");
  box(W - gateW - 1.2, bwH, 0.22, bw, -W / 2 + (W - gateW - 1.2) / 2, 0.12, D / 2 - 0.11, 6, 0.3, "grow");
  box(gateW, bwH * 0.92, 0.1, M.trim, gateX, 0.12, D / 2 - 0.05, 6, 0.55, "grow"); // gate
  for (const gx of [gateX - gateW / 2 - 0.3, gateX + gateW / 2 + 0.3]) {
    box(0.5, 2.1, 0.5, M.frame, gx, 0.12, D / 2 - 0.11, 6, 0.45, "grow");
    box(0.34, 0.34, 0.34, M.lamp, gx, 2.22, D / 2 - 0.11, 6, 0.6, "pop");
  }
  box(0.6, 0.7, front - 1, M.hedge, -W / 2 + 0.6, 0.12, D / 2 - front / 2, 6, 0.4, "grow");
  for (let i = 0; i < 3; i++) box(0.16, 0.6, 0.16, M.lamp, -hw * 0.2 - 1, 0.12, z1 + 1.2 + i * ((front - 2) / 2), 6, 0.6 + i * 0.05, "pop");
  if (W > 14) { // a pool on the larger plots
    const pw = Math.min(3.4, W * 0.22), pd = Math.min(front - 2.2, 6), px = -W / 2 + 1.8 + pw / 2;
    box(pw + 0.6, 0.14, pd + 0.6, M.pave, px, 0.12, D / 2 - front / 2 + 0.3, 6, 0.5, "grow");
    box(pw, 0.12, pd, M.water, px, 0.2, D / 2 - front / 2 + 0.3, 6, 0.65, "grow");
  }
  const trees = [];
  [[-W * 0.38, -D / 2 + back * 0.5], [W * 0.36, -D / 2 + back * 0.5], [-W * 0.05, D / 2 - front * 0.75], [-W * 0.42, D / 2 - 0.9]].forEach(([x, z], i) => {
    const t = new THREE.Group(); t.position.set(x, 0.12, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2, 6), M.trunk); trunk.position.y = 1; trunk.castShadow = true; t.add(trunk);
    for (const [ox, oy, oz, r] of [[0, 2.6, 0, 1.25], [0.5, 2.2, 0.3, 0.85], [-0.45, 2.3, -0.2, 0.8]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M.leaf); c.position.set(ox, oy, oz); c.castShadow = true; t.add(c); }
    obj(t, 6, 0.5 + i * 0.1, "pop"); trees.push(t);
  });

  // ------------------------------------------------ stage 7: a car drives in through the gate and parks
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 4.3), M.car); body.position.y = 0.55; body.castShadow = true; car.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), M.glass); cab.position.set(0, 1.12, -0.2); car.add(cab);
  for (const [wx, wz] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), M.tyre); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.34, wz); car.add(w); }
  for (const lx of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), M.lamp); l.position.set(lx, 0.62, -2.16); car.add(l); }
  car.position.set(gateX, 0.12, D / 2 + 10); group.add(car);
  const carPark = z1 + 2.8, carStart = D / 2 + 10;

  // ------------------------------------------------ the tower crane (rises, swings, lowers away)
  const crane = new THREE.Group();
  const craneH = y + 9, jib = Math.max(W, D) * 0.75;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.7, craneH, 0.7), M.crane); mast.position.y = craneH / 2; mast.castShadow = true; crane.add(mast);
  for (let i = 1; i < craneH; i += 1.4) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.78), M.craneDark); r.position.y = i; crane.add(r); }
  const head = new THREE.Group(); head.position.y = craneH; crane.add(head);
  const jibM = new THREE.Mesh(new THREE.BoxGeometry(jib, 0.5, 0.6), M.crane); jibM.position.x = jib / 2 - 1; jibM.castShadow = true; head.add(jibM);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 0.6), M.crane); counter.position.x = -3.2; head.add(counter);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.1), M.craneDark); weight.position.set(-5, -0.8, 0); head.add(weight);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), M.craneDark); cabin.position.set(0.6, -1.0, 0.7); head.add(cabin);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3, 4), M.crane); peak.position.y = 1.7; head.add(peak);
  const trolley = new THREE.Group(); trolley.position.x = jib * 0.6; head.add(trolley);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), M.craneDark); trolley.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), M.craneDark); trolley.add(hook);
  crane.position.set(-W / 2 - 2.5, 0, -D / 2 + 3);
  group.add(crane);

  // ------------------------------------------------ animation
  function animPart(pt, k) {
    const o = pt.obj, b = pt.base;
    o.visible = k > 0.001;
    if (!o.visible) return;
    if (pt.anim === "grow") { o.scale.y = Math.max(0.001, b.sy * easeOut(k)); o.position.y = b.y; }
    else if (pt.anim === "drop") { o.position.y = b.y + (1 - easeBack(k)) * 7; o.scale.y = b.sy; }
    else { const s = Math.max(0.001, easeBack(k)); o.scale.set(b.sx * s, b.sy * s, b.sz * s); }
  }
  let night = false;
  function setProgress(p, t = 0) {
    for (const pt of parts) animPart(pt, clamp((p - pt.stage - pt.delay * 0.55) / 0.42));
    string.visible = p > 0.3 && p < 6.4;
    string.material.opacity = 0.85 * clamp((p - 0.3) / 0.5) * (1 - clamp((p - 5.9) / 0.5));
    const up = easeOut(clamp((p - 0.4) / 0.8)), down = easeOut(clamp((p - 6.2) / 0.7));
    crane.visible = up > 0.001 && down < 0.999;
    crane.scale.y = Math.max(0.001, up * (1 - down));
    head.rotation.y = Math.sin(t * 0.5) * 0.9 + 0.4;
    trolley.position.x = jib * (0.45 + 0.2 * Math.sin(t * 0.7));
    const drop = 4 + 3 * Math.sin(t * 1.1);
    cable.scale.y = drop; cable.position.y = -drop / 2; hook.position.y = -drop;
    trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * 0.8 + i) * 0.02; });
    const c = clamp((p - 7) / 0.9), e = 1 - Math.pow(1 - c, 2);
    car.visible = p > 7;
    car.position.z = carStart + (carPark - carStart) * e;
    M.lamp.emissiveIntensity = (night ? 3 : 0.4) * clamp((p - 6.6) / 0.5);
    M.glass.emissiveIntensity = night ? 0.55 * clamp((p - 5.2) / 0.6) : 0;
    M.water.emissiveIntensity = night ? 0.9 : 0.15;
  }
  function setNight(on) { night = on; M.glass.opacity = on ? 0.75 : 0.55; }
  const END = STAGES.length + 0.2;
  setProgress(END);
  return {
    group, setProgress, setNight, end: END,
    plot: { w: W, d: D, label: P.label, ft: [P.w, P.d] },
    height: y + slabT,
    dispose() { group.traverse((o) => { if (o.geometry && o.geometry !== geoBox) o.geometry.dispose(); }); geoBox.dispose(); Object.values(M).forEach((m) => m.dispose()); },
  };
}
