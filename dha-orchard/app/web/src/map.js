// The map: the official layout plan with our plots coloured on it. Zoom, pan, pinch, block hover, search.
import { S, G, hooks, esc, ptsStr, statusOf, blockStats, STATUS, cr, sizeLabel } from "./core.js";
import { ACTIVE } from "./geo.js";

const PLAN = "plan.webp";

// ---------------------------------------------------------------- navigation
export function go(view, block, plot, { push = true } = {}) {
  const geo = G.geo;
  const fromKey = vbKey(), toKey = view === "block" ? "block-" + block : "all";
  const fromVB = geo ? (S.vb[fromKey] || defaultVB()).slice() : null;
  if (geo && fromKey !== toKey) {
    if (view === "block") delete S.vb[toKey]; // a block always opens fitted to the screen
    S._anim = { from: fromVB };
  }
  if (geo && S._focusVB) { S.vb[toKey] = S._focusVB; S._focusVB = null; S._anim = { from: fromVB }; }
  if (view === "block" && block) S.findBlock = block;
  S.tab = "map";
  S.view = view; S.block = block || null; S.plot = plot || null; S.ui = {};
  if (view !== "block" || block !== S._selBlock) { S.sel = new Set(); S.multi = false; }
  S._selBlock = block;
  setHash(plot ? "plot-" + plot : block ? "block-" + block : "", push);
  hooks.render();
  // phone and tablet: the page scrolls; bring the map back into view when it is out of sight
  const m = document.querySelector(".mapwrap");
  if (m) {
    const r = m.getBoundingClientRect();
    if (r.top < -10 || r.top > innerHeight * 0.6) window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
}
export function setHash(h, push = true) {
  if (!push || location.hash.slice(1) === h) return;
  S._hashLock = true;
  if (h) location.hash = h;
  else history.replaceState(null, "", location.pathname + location.search);
}
export function blinkPlot(id) {
  S.blink = { id, until: Date.now() + 6500 };
  clearTimeout(blinkPlot._t);
  blinkPlot._t = setTimeout(() => { S.blink = null; document.querySelectorAll(".beacon").forEach((e) => e.remove()); }, 6600);
}
// open a plot and zoom the big map smoothly to it, with its street around it
export function focusPlot(id) {
  const p = G.geo && G.geo.plots[id];
  if (!p) return;
  const z = Math.max(p.ph * 9, 120);
  S._focusVB = [p.cx - z / 2, p.cy - z / 2, z, z];
  go("block", p.block, id);
}
export function fromHash() {
  if (!G.geo) return;
  const h = decodeURIComponent(location.hash.slice(1));
  let m;
  if (["sales", "approvals", "team"].includes(h)) { S.tab = h; hooks.render(); return; }
  if ((m = h.match(/^plot-([A-Z])-(x?[0-9_]+)$/)) && G.geo.plots[m[1] + "-" + m[2]]) return go("block", m[1], m[1] + "-" + m[2], { push: false });
  if ((m = h.match(/^block-([A-Z])$/)) && ACTIVE.includes(m[1])) return go("block", m[1], null, { push: false });
  go("all", null, null, { push: false });
}

// ---------------------------------------------------------------- drawing
// plot number on a coloured plot, always level and upright
export function pnText(p, on, big) {
  const fs = Math.max(1.4, Math.min(p.sh * (big ? 0.62 : 0.5), p.ph * 0.3));
  return `<text class="pn${on ? " on" : ""}" x="${p.cx.toFixed(1)}" y="${p.cy.toFixed(1)}" font-size="${fs.toFixed(2)}" dominant-baseline="central" text-anchor="middle">${p.num != null ? p.num : "?"}</text>`;
}
function plotCls(p, mode) {
  const d = S.plots[p.id];
  const st = d ? d.status : null;
  let cls = "p";
  if (st) cls += " " + st + (d.kind === "listing" ? " listing" : "");
  let fade = false;
  if (S.size !== "all" && p.size !== S.size) fade = true;
  if (mode === "block" && S.statusFilter !== "all" && st !== S.statusFilter) fade = true;
  if (fade && st) cls += " fade";
  if (S.plot === p.id) cls += " sel";
  if (S.sel.has(p.id)) cls += " msel";
  if (p.num == null) cls += " unread";
  return { cls, st };
}
export function mapSVG(mode) {
  const geo = G.geo, blk = S.block, W = G.world[2], H = G.world[3];
  let s = `<rect x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}" style="fill:var(--ground)"/>`;
  const hulls = Object.values(geo.blocks).flatMap((b) => b.hull).map((h) => ptsStr(h));
  s += `<defs><clipPath id="bclip-${mode}">${hulls.map((h) => `<polygon points="${h}"/>`).join("")}</clipPath></defs>`;
  s += `<image href="${PLAN}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" clip-path="url(#bclip-${mode})" class="plan${S.show === "ours" && mode === "all" ? " dim" : ""}"/>`;
  s += `<g>${hulls.map((h) => `<polygon class="bglow" points="${h}"/>`).join("")}${hulls.map((h) => `<polygon class="bgap" points="${h}"/>`).join("")}</g>`;
  if (mode !== "all" && blk) {
    const hp = geo.blocks[blk].hull.map((h) => `<polygon points="${ptsStr(h)}" fill="black"/>`).join("");
    s += `<defs><mask id="mk-${mode}"><rect x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}" fill="white"/>${hp}</mask></defs><rect class="veil" x="${-W}" y="${-H}" width="${W * 3}" height="${H * 3}" mask="url(#mk-${mode})"/>`;
  }
  for (const id in geo.blocks) {
    const b = geo.blocks[id];
    for (const h of b.hull) s += `<polygon class="bcard${b.grey ? " grey" : " hit"}" ${b.grey ? "" : `data-b="${id}"`} points="${ptsStr(h)}"/>`;
  }
  let lab = "", labOn = "";
  for (const id in geo.blocks) {
    const b = geo.blocks[id];
    if (b.grey) continue;
    for (const p of b.plots) {
      const { cls, st } = plotCls(p, mode);
      const hi = st || S.plot === p.id || S.sel.has(p.id);
      if (p.num != null && !hi) lab += pnText(p, false, false);
      s += `<polygon class="${cls}" data-p="${p.id}" points="${ptsStr(p.pts)}"/>`;
      if (hi) labOn += pnText(p, !!st, S.plot === p.id);
    }
  }
  s += `<g class="labels">${lab}</g><g class="labels-on">${labOn}</g>`;
  if (S.blink && Date.now() < S.blink.until && geo.plots[S.blink.id]) s += `<polygon class="beacon" points="${ptsStr(geo.plots[S.blink.id].pts)}"/>`;
  return s;
}
function fitBox(bb, pad) { return [bb[0] - pad, bb[1] - pad, bb[2] - bb[0] + pad * 2, bb[3] - bb[1] + pad * 2]; }
function vbKey() { return S.view === "block" ? "block-" + S.block : "all"; }
function defaultVB() {
  if (S.view === "block") return fitBox(G.geo.blocks[S.block].bbox, 20);
  const W = G.world[2], H = G.world[3];
  return [-W * 0.07, -H * 0.07, W * 1.14, H * 1.14];
}

// ---------------------------------------------------------------- interaction
let ZA = null; // the zoom that is running: {key, fr, to, t0}
export function attachMap(wrap) {
  const svg = wrap.querySelector("svg");
  const key = vbKey();
  let vb = S.vb[key] || defaultVB();
  let animId = 0;
  const setVB = (v) => {
    svg.setAttribute("viewBox", v.map((n) => n.toFixed(2)).join(" "));
    const r = svg.getBoundingClientRect();
    const sc = Math.min(r.width / v[2], r.height / v[3]);
    svg.classList.toggle("far", !(sc >= 0.85));
  };
  const apply = () => { setVB(vb); S.vb[key] = vb; };
  const stopAnim = () => {
    if (animId) { cancelAnimationFrame(animId); animId = 0; }
    if (ZA && ZA.key === key) { S.vb[key] = vb; ZA = null; }
  };
  if (S._anim && !matchMedia("(prefers-reduced-motion: reduce)").matches) ZA = { key, fr: S._anim.from, to: vb.slice(), t0: performance.now() };
  S._anim = null;
  if (ZA && ZA.key === key) {
    const { fr, to, t0 } = ZA, DUR = 650;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const fc = [fr[0] + fr[2] / 2, fr[1] + fr[3] / 2], tc = [to[0] + to[2] / 2, to[1] + to[3] / 2];
    const lw = [Math.log(fr[2]), Math.log(to[2])], lh = [Math.log(fr[3]), Math.log(to[3])];
    const step = (now) => {
      if (!svg.isConnected) { animId = 0; return; }
      const t = Math.min(1, (now - t0) / DUR), e = ease(t);
      // the centre moves in a straight line; the size changes on a log scale, so the zoom speed feels even
      const w = Math.exp(lw[0] + (lw[1] - lw[0]) * e), h = Math.exp(lh[0] + (lh[1] - lh[0]) * e);
      const cx = fc[0] + (tc[0] - fc[0]) * e, cy = fc[1] + (tc[1] - fc[1]) * e;
      vb = t < 1 ? [cx - w / 2, cy - h / 2, w, h] : to;
      setVB(vb);
      if (t < 1) animId = requestAnimationFrame(step);
      else { animId = 0; ZA = null; S.vb[key] = to; }
    };
    S.vb[key] = to;
    step(performance.now());
  } else apply();
  const toWorld = (cx, cy) => {
    const r = svg.getBoundingClientRect();
    const s = Math.max(vb[2] / r.width, vb[3] / r.height);
    const ox = (r.width * s - vb[2]) / 2, oy = (r.height * s - vb[3]) / 2;
    return [vb[0] - ox + (cx - r.left) * s, vb[1] - oy + (cy - r.top) * s, s];
  };
  const zoomAt = (f, cx, cy) => {
    stopAnim();
    const [wx, wy] = toWorld(cx, cy);
    const nw = Math.min(Math.max(vb[2] * f, 25), G.world[2] * 1.6), k = nw / vb[2];
    vb = [wx - (wx - vb[0]) * k, wy - (wy - vb[1]) * k, nw, vb[3] * k];
    apply();
  };
  const centre = () => { const r = svg.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  wrap.querySelector("[data-z='in']").onclick = () => zoomAt(0.75, ...centre());
  wrap.querySelector("[data-z='out']").onclick = () => zoomAt(1.33, ...centre());
  wrap.querySelector("[data-z='fit']").onclick = () => { stopAnim(); vb = defaultVB(); apply(); };
  svg.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.deltaY > 0 ? 1.12 : 0.89, e.clientX, e.clientY); }, { passive: false });
  const ptrs = new Map();
  let drag = null, pinch = null, moved = false;
  svg.addEventListener("pointerdown", (e) => {
    stopAnim();
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    svg.setPointerCapture(e.pointerId);
    moved = false;
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, vb: vb.slice() };
    else if (ptrs.size === 2) {
      const a = [...ptrs.values()];
      pinch = { d: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), vb: vb.slice(), mx: (a[0][0] + a[1][0]) / 2, my: (a[0][1] + a[1][1]) / 2 };
      drag = null;
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) {
      const a = [...ptrs.values()];
      const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
      vb = pinch.vb.slice();
      zoomAt(pinch.d / d, pinch.mx, pinch.my);
      moved = true;
      return;
    }
    if (drag) {
      const r = svg.getBoundingClientRect();
      const s = Math.max(drag.vb[2] / r.width, drag.vb[3] / r.height);
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) { vb = [drag.vb[0] - dx * s, drag.vb[1] - dy * s, drag.vb[2], drag.vb[3]]; apply(); }
    } else if (S.view === "all" && e.pointerType === "mouse") hoverAt(e, wrap);
  });
  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) {
      if (!moved && e.type === "pointerup") {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el) clickMap(el, e);
      }
      drag = null;
    }
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("pointerleave", () => {
    if (S.view === "all") { const t = wrap.querySelector(".tip"); if (t) t.hidden = true; setLift(wrap, null); }
  });
}
function hoverAt(e, wrap) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const tip = wrap.querySelector(".tip");
  if (!tip) return;
  let b = null, p = null;
  if (el && el.dataset) { if (el.dataset.p) { p = el.dataset.p; b = p.split("-")[0]; } else if (el.dataset.b) b = el.dataset.b; }
  setLift(wrap, b && G.geo.blocks[b] && !G.geo.blocks[b].grey ? b : null);
  if (!b) { tip.hidden = true; return; }
  const s = blockStats(b);
  let html;
  if (p) {
    const d = S.plots[p];
    const n = S.demand[p] || 0;
    html = `<span class="k">Plot ${esc(p)} · ${sizeLabel(G.geo.plots[p].size)}</span><b>${d ? STATUS[d.status].label + " · " + cr(d.price) + " Cr" : "Not in our stock"}</b>${d && d.tags && d.tags.length ? `<span class="tiptags">${esc(d.tags.join(" · "))}</span>` : ""}<span class="meta">${n} interested · tap to open</span>`;
  } else html = `<span class="k">Block ${b}</span><b>${s.available} available</b><span class="meta">${s.prebooked} pre-booked · ${s.sold + s.sold_pending} sold · tap to open the block</span>`;
  tip.innerHTML = html;
  tip.hidden = false;
}
// the block under the mouse rises 7% with a red outline; it stays clickable
let LIFT = null;
export function resetLift() { LIFT = null; }
function setLift(wrap, b) {
  const svg = wrap.querySelector("svg");
  if (!svg) return;
  let L = svg.querySelector("#lift");
  if (LIFT === b && (L || !b)) return;
  LIFT = b;
  if (L) L.remove();
  if (!b) return;
  const blk = G.geo.blocks[b];
  const cx = (blk.bbox[0] + blk.bbox[2]) / 2, cy = (blk.bbox[1] + blk.bbox[3]) / 2;
  const hull = blk.hull.map((h) => ptsStr(h));
  let s = `<g id="lift" class="lift" style="transform-origin:${cx.toFixed(1)}px ${cy.toFixed(1)}px">`;
  s += `<defs><clipPath id="liftclip">${hull.map((h) => `<polygon points="${h}"/>`).join("")}</clipPath><filter id="liftshadow" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-opacity=".38"/></filter></defs>`;
  s += `<g filter="url(#liftshadow)">${hull.map((h) => `<polygon class="liftbase" points="${h}"/>`).join("")}</g>`;
  s += `<image href="${PLAN}" x="0" y="0" width="${G.world[2]}" height="${G.world[3]}" preserveAspectRatio="none" class="plan" clip-path="url(#liftclip)"/>`;
  s += hull.map((h) => `<polygon class="lifthit" data-b="${b}" points="${h}"/>`).join("");
  for (const p of blk.plots) {
    const { cls, st } = plotCls(p, "all");
    s += `<polygon class="${cls}" data-p="${p.id}" points="${ptsStr(p.pts)}"/>`;
    if (st) s += pnText(p, true, false);
  }
  s += hull.map((h) => `<polygon class="liftline" points="${h}"/>`).join("") + `</g>`;
  svg.insertAdjacentHTML("beforeend", s);
  L = svg.querySelector("#lift");
  requestAnimationFrame(() => requestAnimationFrame(() => { if (L.isConnected) L.classList.add("up"); }));
}
function clickMap(el, ev) {
  const d = el.dataset || {};
  if (S.view === "block" && d.p && d.p.split("-")[0] === S.block && (S.multi || (ev && (ev.shiftKey || ev.ctrlKey || ev.metaKey)))) {
    if (!S.multi) { S.multi = true; if (S.plot && G.geo.plots[S.plot]) S.sel.add(S.plot); }
    if (S.sel.has(d.p)) S.sel.delete(d.p);
    else S.sel.add(d.p);
    S.ui.bulkConfirm = false;
    hooks.render();
    return;
  }
  const b = d.p ? d.p.split("-")[0] : d.b || null;
  // in a block, a tap outside that block closes it and the map zooms back out
  if (S.view === "block" && b !== S.block) { go("all"); return; }
  if (d.p) { go("block", b, d.p); return; }
  if (d.b && S.view !== "block") go("block", b, null);
}
