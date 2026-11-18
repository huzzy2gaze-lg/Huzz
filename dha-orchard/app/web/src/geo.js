// Geometry of the scheme, traced from the official FGEHA layout plan (public/plotdata.json).
// The plot positions and numbers come only from the plan. Corrections (plot_fixes) can set a
// number that the plan reading missed, or a size. Nothing here moves a plot.

export const SIZES = {
  "1K": { label: "1 Kanal", dims: "50 × 90 ft", sqyd: 500 },
  "14M": { label: "14 Marla", dims: "40 × 80 ft", sqyd: 356 },
  "10M": { label: "10 Marla", dims: "32 × 70 ft", sqyd: 249 },
  X: { label: "Corner or irregular plot", dims: "size as on the plan", sqyd: null },
};
export const SIZE_ORDER = ["1K", "14M", "10M", "X"];
export const ACTIVE = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function plotKey(block, cx, cy, ox, oy) {
  return block + "-p" + Math.round((cx + ox) * 10) + "_" + Math.round((cy + oy) * 10);
}

export function buildGeo(data, fixes) {
  const blocks = {}, plots = {}, byKey = {};
  for (const id in data.blocks) {
    const b = data.blocks[id];
    const all = b.hull.flat();
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    blocks[id] = {
      id, hull: b.hull, label: b.label, grey: !ACTIVE.includes(id),
      bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      plots: [], sizes: new Set(),
    };
  }
  const ox = data.ox || 0, oy = data.oy || 0;
  data.plots.forEach((r) => {
    const [b, n0, size, flat, cx, cy, L] = r;
    const key = plotKey(b, cx, cy, ox, oy);
    const fx = fixes[key];
    const pts = [];
    for (let j = 0; j < flat.length; j += 2) pts.push([flat[j], flat[j + 1]]);
    const sz = fx && fx.size && SIZES[fx.size] ? fx.size : size;
    // the long side of the plot and its short width, for the size of the plot number
    let best = 0, ang = 0, area = 0;
    for (let j = 0; j < pts.length; j++) {
      const a = pts[j], c = pts[(j + 1) % pts.length];
      const dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy);
      area += a[0] * c[1] - c[0] * a[1];
      if (l > best) { best = l; ang = (Math.atan2(dy, dx) * 180) / Math.PI; }
    }
    if (ang > 90) ang -= 180;
    if (ang <= -90) ang += 180;
    const sh = Math.abs(area) / 2 / Math.max(best, 1);
    const p = {
      key, block: b, num: fx && fx.n ? fx.n : n0, read: n0, size: sz, planSize: size,
      pts, cx, cy, ph: L, ang, sh, grey: blocks[b].grey, fixed: !!(fx && fx.n),
    };
    blocks[b].plots.push(p);
    blocks[b].sizes.add(sz);
    byKey[key] = p;
  });
  for (const b in blocks) {
    const used = new Set();
    for (const p of blocks[b].plots) {
      if (p.num != null) {
        const id = b + "-" + p.num;
        if (used.has(id)) p.num = null;
        else { used.add(id); p.id = id; }
      }
    }
    for (const p of blocks[b].plots) {
      if (p.num == null) p.id = b + "-x" + p.key.split("-p")[1];
      if (!p.grey) plots[p.id] = p;
    }
    blocks[b].sizes = SIZE_ORDER.filter((z) => blocks[b].sizes.has(z));
  }
  return { blocks, plots, byKey };
}
