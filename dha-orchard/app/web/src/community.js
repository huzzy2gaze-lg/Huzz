// "Future homes": illustrative homes that rise on the real plots of a block, on the 3D master plan.
// Each home sits inside its own plot shape from the official plan, turned the way the plot is turned. Nothing moves.
// All the homes of a block are drawn with instancing (3 draw calls), so it stays fast on phones.
import * as THREE from "three";

const WIDTH_FT = { "1K": 50, "14M": 40, "10M": 32, X: 40 };
const FLOOR_FT = 11; // one floor, about 3.35 m

// toWorld(x, y) -> [wx, wz] in scene units
export function makeCommunity(geo, blocks, toWorld, { maxPerBlock = 1200 } = {}) {
  const out = {};
  const dummy = new THREE.Object3D();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.02 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3532, roughness: 0.6 });
  const winMat = new THREE.MeshStandardMaterial({ color: 0x1f2a2e, roughness: 0.2, metalness: 0.5, emissive: 0xffc46a, emissiveIntensity: 0 });
  const unit = new THREE.BoxGeometry(1, 1, 1); unit.translate(0, 0.5, 0); // base at y = 0
  const tints = [0xf3efe6, 0xe9e2d3, 0xf7f4ee, 0xd9cdb8, 0xc98a62, 0xeae6df];
  for (const b of blocks) {
    const plots = geo.blocks[b].plots.slice(0, maxPerBlock);
    const n = plots.length;
    const body = new THREE.InstancedMesh(unit, bodyMat, n), roof = new THREE.InstancedMesh(unit, roofMat, n), win = new THREE.InstancedMesh(unit, winMat, n);
    const items = [];
    const lb = geo.blocks[b].label, [lx, lz] = toWorld(lb[0], lb[1]);
    plots.forEach((p, i) => {
      // the plot's centre, long side and short width, in scene units
      let ax = 0, az = 0, best = 0, ang = 0;
      const pts = p.pts.map(([x, y]) => toWorld(x, y));
      pts.forEach(([x, z]) => { ax += x; az += z; });
      ax /= pts.length; az /= pts.length;
      let area = 0;
      for (let j = 0; j < pts.length; j++) {
        const a = pts[j], c = pts[(j + 1) % pts.length];
        const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
        area += a[0] * c[1] - c[0] * a[1];
        if (l > best) { best = l; ang = Math.atan2(c[1] - a[1], c[0] - a[0]); }
      }
      const short = Math.abs(area) / 2 / Math.max(best, 1e-6);
      const perFt = short / (WIDTH_FT[p.size] || 40);
      const floors = p.size === "1K" ? 2 + (i % 5 === 0 ? 1 : 0) : 2;
      const h = floors * FLOOR_FT * perFt;
      const fw = short * 0.72, fl = best * 0.62;
      const dist = Math.hypot(ax - lx, az - lz);
      items.push({ x: ax, z: az, ang, fw, fl, h, dist, k: 0 });
      body.setColorAt(i, new THREE.Color(tints[(i * 7) % tints.length]));
    });
    const maxD = Math.max(...items.map((t) => t.dist), 1e-6);
    items.forEach((t) => { t.delay = (t.dist / maxD) * 0.8; });
    for (const m of [body, roof, win]) { m.renderOrder = 1; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; m.visible = false; }
    out[b] = { body, roof, win, items, p: 0, target: 0 };
    update(out[b], 0);
  }
  function update(c, p) {
    c.items.forEach((t, i) => {
      const k = Math.max(0, Math.min(1, (p - t.delay) / 0.4)), e = 1 - Math.pow(1 - k, 3);
      const h = Math.max(1e-4, t.h * e);
      dummy.position.set(t.x, 0.002, t.z); dummy.rotation.set(0, -t.ang, 0);
      dummy.scale.set(t.fl, h, t.fw); dummy.updateMatrix(); c.body.setMatrixAt(i, dummy.matrix);
      dummy.position.set(t.x, h, t.z); dummy.scale.set(t.fl * 1.04, Math.max(1e-4, t.h * 0.06 * e), t.fw * 1.04); dummy.updateMatrix(); c.roof.setMatrixAt(i, dummy.matrix);
      dummy.position.set(t.x, h * 0.18, t.z); dummy.scale.set(t.fl * 1.01, Math.max(1e-4, h * 0.6), t.fw * 0.5); dummy.updateMatrix(); c.win.setMatrixAt(i, dummy.matrix);
    });
    for (const m of [c.body, c.roof, c.win]) { m.instanceMatrix.needsUpdate = true; m.visible = p > 0.001; }
    if (c.body.instanceColor) c.body.instanceColor.needsUpdate = true;
  }
  return {
    blocks: out,
    meshes: Object.values(out).flatMap((c) => [c.body, c.roof, c.win]),
    // move each block's homes towards its target (0 = flat, 1.6 = all built); call every frame
    step(rate = 0.02) {
      for (const b in out) {
        const c = out[b];
        if (Math.abs(c.target - c.p) < 1e-3) continue;
        c.p += Math.sign(c.target - c.p) * Math.min(Math.abs(c.target - c.p), rate);
        update(c, c.p);
      }
    },
    setNight(on) { winMat.emissiveIntensity = on ? 1.5 : 0; winMat.color.set(on ? 0x4a3a1e : 0x1f2a2e); },
  };
}
