// The 3D version of the website ("#experience"), inspired by immersive studio sites and award-winning real estate sites.
// Its one idea: the official FGEHA master plan comes alive. The plan lies in 3D, each block rises out of it in gold,
// and the camera flies from block to block (A to H) while the visitor scrolls. The block shapes are the hulls traced
// from the official plan, at their own positions: nothing is moved or made up. The booking form is the real one.
import * as THREE from "three";
import { S, G, esc } from "./core.js";
import { ACTIVE } from "./geo.js";
const TOUR = ["A", "B", "C"]; // the blocks the page flies to, in order
import { outlookFor } from "./showcase.js";
import { MILESTONES } from "./site-extras.js";
import { makeCommunity } from "./community.js";
import { studioSection, studioAfterRender, studioClick, stopStudio } from "./studio.js";

let cfg = null; // { BLOCKS, bookSection, waLink, company, logo } from site.js
export function setExperience(c) { cfg = c; }

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const f2 = (v) => v.toFixed(2), f1 = (v) => v.toFixed(1);

// ---------------------------------------------------------------- the page (HTML over the 3D scene)
function words(text, cls = "") {
  return text.split(" ").map((w, i) => `<span class="xw ${cls}"><span style="--d:${i * 0.06}s">${esc(w)}</span></span>`).join(" ");
}
function blockChapter(b, i) {
  const info = cfg.BLOCKS[b], o = outlookFor(b);
  let money = `<p class="xmuted">Prices change from plot to plot in this block. Ask us for today's prices.</p>`;
  if (o) {
    const max = o.y28 * 1.04, gain = Math.round(((o.y28 - o.mid) / o.mid) * 100);
    const row = (l, v, cls) => `<div class="xg ${cls}"><span>${l}</span><div class="xgt"><i style="--w:${((v / max) * 100).toFixed(1)}%"></i></div><b data-to="${v.toFixed(2)}">${f2(v)}</b><small>Cr</small></div>`;
    money = `<div class="xgrow">${row("Today", o.mid, "now")}${row("Jul 2027", o.y27, "mid")}${row("Dec 2028", o.y28, "end")}</div>
      <p class="xfine"><span class="xbadge">+${gain}% by Dec 2028</span> One ${esc(info.size)} plot. Today: market asks ${o.today[1] > o.today[0] ? `${f2(o.today[0])}–${f2(o.today[1])}` : f2(o.today[0])} Cr (Oct 2026). July 2027: Block A possession target. Outlook: our team's view, not a promise.</p>`;
  }
  return `<section class="xch xblock" data-cam="${b}" id="x-${b}"><div class="xcard">
      <div class="xkicker"><span class="xnum">0${i + 1}</span> Block ${b}${b === "A" ? " · first possession" : ""}</div>
      <h2>${words("Block " + b)}</h2>
      <p class="xlead">${esc(info.line)}</p>
      <dl class="xfacts"><div><dt>Plots</dt><dd>about ${info.plots.toLocaleString("en-IN")}</dd></div><div><dt>Sizes</dt><dd>${esc(info.sizes)}</dd></div></dl>
      ${money}
      <a href="#book" class="xbtn goldbtn" data-act="askPlot" data-block="${b}" data-magnet>Book a call about Block ${b}</a>
    </div></section>`;
}
export function experiencePage(c) {
  if (c) cfg = c;
  const now = Date.now();
  const tl = MILESTONES.map(([d, t, s]) => `<li class="${Date.parse(d) <= now ? "done" : "next"}"><time>${new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</time><b>${esc(t)}</b><span>${esc(s)}</span></li>`).join("");
  const enc = [["Margalla Enclave, Mar 2025", 4.41], ["Margalla Enclave, Dec 2025", 5.6], ["Margalla Enclave, Sep 2026", 7.29], ["Margalla Orchard, today", 3.8]];
  const wa = cfg.waLink();
  return `<div class="xp">
    <div class="xloader" aria-hidden="true"><div class="xlogo">${cfg.logo()}</div><b class="xcount">0</b><span>Loading the official master plan</span></div>
    <div class="xcursor" aria-hidden="true"><span></span></div>
    <div class="xtip" aria-hidden="true"></div>
    <section class="xch xhero" data-cam="hero">
      <div class="xkicker">DHA Margalla Orchard · Islamabad</div>
      <h1>${words("Your plot in")}<br>${words("DHA Margalla Orchard.", "gold")}</h1>
      <p class="xlead">The official FGEHA master plan, in 3D. Scroll to fly over Blocks A, B and C, then build your home.</p>
      <div class="xrow"><a href="#book" class="xbtn" data-magnet>Book a call</a>${wa ? `<a href="${wa}" class="xbtn ghost" target="_blank" rel="noopener" data-magnet>WhatsApp</a>` : ""}</div>
      <div class="xscroll"><i></i>Scroll</div>
    </section>
    <section class="xch xnumbers" data-cam="overview"><div class="xcard wide">
      <div class="xkicker">The whole scheme</div>
      <h2>${words("4,781 plots. 8 blocks. One master plan.")}</h2>
      <div class="xstats"><div><b data-count="4781">0</b><span>residential plots</span></div><div><b data-count="8432">0</b><span>kanals of land</span></div><div><b data-count="50">0</b><span>% of development done</span></div></div>
      <p class="xmuted">Developed by DHA Islamabad on Main Park Road, opposite COMSATS University. Every plot has a number on FGEHA's approved layout plan. Move your mouse over a block, or tap it.</p>
    </div></section>
    ${TOUR.map(blockChapter).join("")}
    ${studioSection()}
    <section class="xch" data-cam="timeline"><div class="xcard wide">
      <div class="xkicker">Progress</div><h2>${words("From development to possession")}</h2>
      <ol class="xtl">${tl}</ol></div></section>
    <section class="xch" data-cam="enclave"><div class="xcard wide">
      <div class="xkicker">Next door</div><h2>${words("DHA's price for 1 Kanal next door rose 65% in 18 months")}</h2>
      <div class="xbars">${enc.map(([l, v], i) => `<div class="${i === 3 ? "orc" : ""}"><span>${l}</span><div class="xgt"><i style="--w:${((v / 7.29) * 100).toFixed(1)}%"></i></div><b>${v.toFixed(2)} Cr</b></div>`).join("")}</div>
      <p class="xfine">DHA Margalla Enclave, about 4 km away: DHA's published prices. Margalla Orchard: average asking price, October 2026. <b>The gap is the opportunity.</b></p>
    </div></section>
    <div class="xbook" data-cam="book">${cfg.bookSection()}</div>
    <footer class="xfoot"><span>${esc(cfg.company())}</span><a href="#home">Classic website</a><a href="#plan">Master plan with every plot</a></footer>
  </div>`;
}

// ---------------------------------------------------------------- the 3D scene (lives outside #app, so re-drawing the page keeps it)
let X = null; // { renderer, scene, camera, blocks:{b:{mesh,edge,h}}, ... }
const SCALE = 10; // the plan is 10 units wide

function toWorld(px, py) { const W = G.world[2], H = G.world[3]; return [(px - W / 2) * (SCALE / W), (py - H / 2) * (SCALE / W)]; }
function planSize() { const W = G.world[2], H = G.world[3]; return [SCALE, (H / W) * SCALE]; }

function camFor(key) {
  const [pw, ph] = planSize();
  const wide = innerWidth / innerHeight;
  const phone = innerWidth < 760;
  if (ACTIVE.includes(key)) {
    // fit the whole block into the part of the screen that the card does not cover:
    // a wide screen: the right 55%; a phone: the top 45% (the card is at the bottom)
    const bb = G.geo.blocks[key].bbox;
    const [x0, z0] = toWorld(bb[0], bb[1]), [x1, z1] = toWorld(bb[2], bb[3]);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, dz = z1 - z0;
    const el = 0.98; // the camera looks down at about 56 degrees
    const tanV = Math.tan((42 * Math.PI) / 360), tanH = tanV * wide;
    const fx = phone ? 0.86 : 0.5, fy = phone ? 0.5 : 0.78;
    const D = 1.12 * Math.max(w / (2 * tanH * fx), (dz * Math.sin(el) + 0.2) / (2 * tanV * fy), 0.9);
    const viewW = 2 * D * tanH, viewH = 2 * D * tanV;
    const lx = phone ? cx : cx - viewW * 0.2;               // the block sits right of centre
    const lz = phone ? cz + (viewH * 0.24) / Math.sin(el) : cz; // on a phone the block sits in the top part
    return { pos: [lx, D * Math.sin(el), lz + D * Math.cos(el)], look: [lx, 0, lz], fit: true };
  }
  const D = Math.max(pw, ph) * (phone ? 1.45 : 1.0) / Math.min(1.6, wide);
  if (key === "hero") return { pos: [phone ? 0 : -pw * 0.22, D * 0.8, D * 0.9], look: [phone ? 0 : -pw * 0.3, 0, phone ? 1.2 : 0.2] };
  if (key === "studio") return { pos: [pw * 0.15, D * 1.05, D * 0.35], look: [pw * 0.15, 0, 0] };
  if (key === "timeline") return { pos: [-D * 0.55, D * 0.6, D * 0.7], look: [0, 0, 0] };
  if (key === "enclave") return { pos: [D * 0.6, D * 0.5, D * 0.75], look: [0, 0, 0] };
  if (key === "book") return { pos: [0, D * 1.15, D * 0.2], look: [0, 0, 0] };
  return { pos: [0, D * 0.9, D * 0.6], look: [0, 0, 0] }; // overview
}

function loadPlan(renderer, onProgress) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = Math.min(renderer.capabilities.maxTextureSize, innerWidth < 760 ? 2048 : 4096);
      let w = img.naturalWidth, h = img.naturalHeight;
      const k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement("canvas");
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      onProgress(1); resolve(tex);
    };
    img.onerror = () => resolve(null);
    img.src = "plan.webp";
    // the plan is big: show a counter while it loads
    let p = 0; const t = setInterval(() => { if (img.complete) return clearInterval(t); p = Math.min(0.92, p + (0.92 - p) * 0.08); onProgress(p); }, 60);
  });
}

function build() {
  const canvas = document.createElement("canvas");
  canvas.className = "xcanvas";
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch { return null; }
  document.body.prepend(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x061414, 14, 30);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.15, 60); // a nearer start gives finer depth, so small homes do not flicker
  const hemi = new THREE.HemisphereLight(0xfff3d6, 0x0b3a40, 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2a8, 2.2); sun.position.set(-6, 10, 6); scene.add(sun);

  const [pw, ph] = planSize();
  // the official plan
  const planMat = new THREE.MeshBasicMaterial({ color: 0x8fa3a3, transparent: true, opacity: 0 }); // the plan, a little darker, so the gold blocks and the text stand out
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), planMat);
  plan.rotation.x = -Math.PI / 2; scene.add(plan);
  // a dark ground with a soft grid of dots around the plan
  const dots = []; for (let x = -16; x <= 16; x += 0.5) for (let z = -12; z <= 12; z += 0.5) { if (Math.abs(x) < pw / 2 + 0.3 && Math.abs(z) < ph / 2 + 0.3) continue; dots.push(x, -0.01, z); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(dots, 3));
  scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x2e5f65, size: 0.035, sizeAttenuation: true })));
  // fireflies: gold specks that rise slowly over the orchard
  const N = innerWidth < 760 ? 140 : 320, fp = new Float32Array(N * 3), fs = new Float32Array(N);
  for (let i = 0; i < N; i++) { fp[i * 3] = (Math.random() - 0.5) * pw * 1.4; fp[i * 3 + 1] = Math.random() * 3; fp[i * 3 + 2] = (Math.random() - 0.5) * ph * 1.4; fs[i] = 0.2 + Math.random() * 0.6; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.BufferAttribute(fp, 3));
  const flies = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xe3c98d, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(flies);

  // the blocks, extruded from the hulls of the official plan
  const blocks = {};
  for (const b of ACTIVE) {
    const shapes = G.geo.blocks[b].hull.map((poly) => new THREE.Shape(poly.map(([x, y]) => { const [wx, wz] = toWorld(x, y); return new THREE.Vector2(wx, -wz); })));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd8b25a, emissive: 0xd2a746, emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const mesh = new THREE.Mesh(geo, mat); mesh.userData.block = b;
    // a clean gold outline at the base and at the top of the block (the top line goes up with the block)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xeedbb8, transparent: true, opacity: 0.9 });
    const group = new THREE.Group(); group.add(mesh);
    for (const poly of G.geo.blocks[b].hull) {
      const pts = poly.map(([x, y]) => { const [wx, wz] = toWorld(x, y); return new THREE.Vector3(wx, 0, wz); });
      const lg = new THREE.BufferGeometry().setFromPoints(pts);
      const base = new THREE.LineLoop(lg, lineMat); base.position.y = 0.006; base.renderOrder = 3;
      const top = new THREE.LineLoop(lg, lineMat); top.position.y = 1; top.renderOrder = 3;
      scene.add(base); group.add(top); // the base line is not scaled with the block, so it never sinks into the plan
    }
    group.scale.y = 0.001; group.position.y = 0.003; mesh.renderOrder = 2; scene.add(group);
    const edge = { material: lineMat };
    const lb = G.geo.blocks[b].label, [lx, lz] = toWorld(lb[0], lb[1]);
    blocks[b] = { mesh, edge, group, h: 0.001, target: 0.06, label: new THREE.Vector3(lx, 0, lz) };
  }
  // homes that rise on the real plots of each block (illustrations)
  const comm = makeCommunity(G.geo, TOUR, toWorld); // a home on every plot of the block (instancing keeps it fast on phones)
  comm.meshes.forEach((m) => scene.add(m));
  // a line of gold light that traces the route from Block A to Block H as the visitor scrolls
  const route = new THREE.CatmullRomCurve3(TOUR.map((b) => blocks[b].label.clone().setY(0.08)));
  const routeGeo = new THREE.BufferGeometry().setFromPoints(route.getPoints(400));
  routeGeo.setDrawRange(0, 0);
  const routeLine = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: 0xeedbb8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(routeLine);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf4ead3 }));
  scene.add(head);
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(-9, -9);
  const st = { renderer, scene, camera, plan, planMat, hemi, sun, comm, route, routeGeo, head, visited: new Set(), routeP: 0, night: 0, flies, fp, fs, blocks, ray, mouse, pointer: [0, 0], cam: camFor("hero"), cur: null, active: "hero", hover: null, loaded: false, t0: performance.now(), raf: 0, alive: true };
  st.cur = { pos: new THREE.Vector3(...st.cam.pos).add(new THREE.Vector3(0, 6, 6)), look: new THREE.Vector3(...st.cam.look) };
  camera.position.copy(st.cur.pos); camera.lookAt(st.cur.look);
  return st;
}

function frame(now) {
  if (!X || !X.alive) return;
  X.raf = requestAnimationFrame(frame);
  if (document.hidden) return;
  const rm = reduce(), t = (now - X.t0) / 1000;
  // camera: ease towards the chapter's view, plus a small move with the pointer
  const fdt = Math.min(0.25, (now - (X.camT || now)) / 1000); X.camT = now;
  const k = rm ? 1 : 1 - Math.exp(-fdt * 2.6); // time-based: the camera arrives in about 1.5 s on any device
  const tp = new THREE.Vector3(...X.cam.pos), tl = new THREE.Vector3(...X.cam.look);
  const par = X.cam.fit ? 0.12 : 1;
  if (!rm) { tp.x += X.pointer[0] * 0.6 * par; tp.y += X.pointer[1] * 0.35 * par; if (X.active === "overview" || X.active === "book") { tp.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(t * 0.12) * 0.25); } }
  X.cur.pos.lerp(tp, k); X.cur.look.lerp(tl, k);
  X.camera.position.copy(X.cur.pos); X.camera.lookAt(X.cur.look);
  // blocks rise; the active one rises highest and glows
  for (const b of ACTIVE) {
    const o = X.blocks[b];
    const inBlock = ACTIVE.includes(X.active);
    const on = X.active === b || (X.hover === b && !inBlock);
    if (on && o.lit !== true) { o.lit = true; } else if (!on) o.lit = false;
    const here = X.active === b;
    o.target = !X.loaded ? 0.001 : here ? 0.006 : X.comm.blocks[b] && X.comm.blocks[b].p > 0.6 && !on ? 0.02 : on ? 0.55 + Math.sin(t * 2) * 0.03 : ACTIVE.includes(X.active) ? 0.05 : 0.14 + 0.04 * Math.sin(t * 1.2 + ACTIVE.indexOf(b));
    o.h += (o.target - o.h) * (rm ? 1 : 0.07);
    o.group.scale.y = Math.max(0.001, o.h);
    const built = !!(X.comm.blocks[b] && X.comm.blocks[b].p > 0.6);
    o.mesh.material.opacity += ((here ? 0.2 : on ? 0.5 : built ? 0.04 : ACTIVE.includes(X.active) ? 0.12 : 0.26) - o.mesh.material.opacity) * 0.08;
    o.mesh.material.emissiveIntensity += ((on ? 1.4 : 0.25) - o.mesh.material.emissiveIntensity) * 0.08;
    o.edge.material.opacity += ((on ? 1 : ACTIVE.includes(X.active) ? 0.15 : built ? 0.45 : 0.85) - o.edge.material.opacity) * 0.08;
  }
  document.body.dataset.xlit = ACTIVE.filter((b) => X.blocks[b].lit).join("");
  if (X.loaded && X.planMat.transparent) { X.planMat.opacity += (1 - X.planMat.opacity) * 0.05; if (X.planMat.opacity > 0.985) { X.planMat.opacity = 1; X.planMat.transparent = false; X.planMat.needsUpdate = true; } }
  // homes: they rise on a block when the camera arrives, and stay; at the end of the page the whole town is built
  if (X.loaded) {
    if (ACTIVE.includes(X.active)) X.visited.add(X.active);
    const all = ["studio", "timeline", "enclave", "book"].includes(X.active) && X.visited.size >= 2;
    for (const b of TOUR) X.comm.blocks[b].target = X.visited.has(b) || all ? 1.3 : 0;
    const dt = Math.min(0.25, (now - (X.lastT || now)) / 1000); X.lastT = now;
    X.comm.step(rm ? 2 : dt * 0.55); // a block's homes take about 2.5 s to rise
  }
  // day to night down the page: the light falls and the windows light up
  const scrollMax = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const nightT = Math.max(0, Math.min(1, (scrollY / scrollMax - 0.6) / 0.22));
  X.night += (nightT - X.night) * (rm ? 1 : 0.05);
  X.hemi.intensity = 1.4 - X.night * 1.05; X.sun.intensity = 2.2 - X.night * 1.9;
  X.dim = (X.dim || 1) + (((ACTIVE.includes(X.active) || X.active === "overview" || X.active === "timeline" || X.active === "enclave") ? 0.88 : 1) - (X.dim || 1)) * 0.06;
  X.planMat.color.setRGB((0.561 - X.night * 0.27) * X.dim, (0.639 - X.night * 0.29) * X.dim, (0.639 - X.night * 0.26) * X.dim);
  X.comm.setNight(X.night > 0.5);
  // the gold route line grows with the block chapters
  const idx = TOUR.indexOf(X.active);
  const routeT = idx >= 0 ? idx / (TOUR.length - 1) : ["studio", "timeline", "enclave", "book"].includes(X.active) ? 1 : 0;
  X.routeP += (routeT - X.routeP) * (rm ? 1 : 0.04);
  const cnt = Math.round(X.routeP * 400);
  X.routeGeo.setDrawRange(0, cnt);
  X.head.visible = cnt > 2 && cnt < 399;
  if (X.head.visible) { X.head.position.copy(X.route.getPoint(Math.min(1, X.routeP))); X.head.scale.setScalar(1 + Math.sin(t * 6) * 0.25); }
  // fireflies
  if (!rm) { const p = X.fp; for (let i = 0; i < X.fs.length; i++) { p[i * 3 + 1] += X.fs[i] * 0.004; p[i * 3] += Math.sin(t + i) * 0.0015; if (p[i * 3 + 1] > 3.2) p[i * 3 + 1] = 0; } X.flies.geometry.attributes.position.needsUpdate = true; }
  // hover: which block is under the pointer
  if (X.mouse.x > -2) {
    X.ray.setFromCamera(X.mouse, X.camera);
    const hit = X.ray.intersectObjects(ACTIVE.map((b) => X.blocks[b].mesh))[0];
    const hb = hit ? hit.object.userData.block : null;
    if (hb !== X.hover) { X.hover = hb; showTip(hb); }
  }
  X.renderer.render(X.scene, X.camera);
}

function showTip(b) {
  const tip = document.querySelector(".xtip"), cur = document.querySelector(".xcursor");
  if (cur) cur.classList.toggle("big", !!b);
  document.body.style.cursor = b ? "pointer" : "";
  if (!tip) return;
  if (!b) { tip.classList.remove("on"); return; }
  const info = cfg.BLOCKS[b], o = outlookFor(b);
  tip.innerHTML = `<b>Block ${b}</b><span>about ${info.plots.toLocaleString("en-IN")} plots · ${esc(info.sizes)}</span>${o ? `<span>Today ${f2(o.today[0])}${o.today[1] > o.today[0] ? "–" + f2(o.today[1]) : ""} Cr · Dec 2028 ≈ ${f1(o.y28)} Cr</span>` : ""}${TOUR.includes(b) ? "<i>Click to fly there</i>" : ""}`;
  tip.classList.add("on");
}

// ---------------------------------------------------------------- page life
let bound = false, io = null;
function onScroll() {
  if (!X) return;
  const secs = document.querySelectorAll(".xp [data-cam]");
  let best = null, bd = 1e9;
  const mid = innerHeight * 0.5;
  secs.forEach((s) => { const r = s.getBoundingClientRect(); const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid)); if (d < bd) { bd = d; best = s; } });
  const key = best ? best.dataset.cam : "hero";
  if (key !== X.active) { X.active = key; X.cam = camFor(key); document.body.dataset.xactive = key; }
  const bar = document.querySelector(".xprog i");
  if (bar) bar.style.width = (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)) * 100 + "%";
}
function onResize() { if (!X) return; X.renderer.setSize(innerWidth, innerHeight); X.camera.aspect = innerWidth / innerHeight; X.camera.updateProjectionMatrix(); X.cam = camFor(X.active); }
function onMove(e) {
  if (!X) return;
  if (e.pointerType && e.pointerType !== "mouse") { X.mouse.set(-9, -9); if (X.hover) { X.hover = null; showTip(null); } return; }
  X.pointer = [(e.clientX / innerWidth - 0.5) * 2, -(e.clientY / innerHeight - 0.5) * 2];
  const over = e.target.closest && e.target.closest(".xcard,.xbook,a,button,input,textarea,header,.floatcta");
  X.mouse.set(over ? -9 : X.pointer[0], over ? -9 : X.pointer[1]);
  const cur = document.querySelector(".xcursor");
  if (cur) { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; cur.classList.toggle("link", !!(e.target.closest && e.target.closest("a,button"))); }
  const tip = document.querySelector(".xtip");
  if (tip) tip.style.transform = `translate(${Math.min(e.clientX + 18, innerWidth - 260)}px,${e.clientY + 18}px)`;
  // magnetic buttons
  document.querySelectorAll("[data-magnet]").forEach((m) => {
    const r = m.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    m.style.transform = d < 90 && !reduce() ? `translate(${dx * 0.25}px,${dy * 0.3}px)` : "";
  });
}
function onClick(e) {
  if (studioClick(e.target)) return;
  if (matchMedia("(pointer: coarse)").matches) return; // phones: taps are handled by onTouch
  if (!X || !X.hover || (e.target.closest && e.target.closest(".xcard,.xbook,a,button,header"))) return;
  const s = document.getElementById("x-" + X.hover);
  if (s) s.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "center" });
}
let touch0 = null;
function onTouchStart(e) { const t = e.touches && e.touches[0]; touch0 = t ? { x: t.clientX, y: t.clientY, t: performance.now(), sy: scrollY } : null; }
function onTouch(e) { // a short tap on a block flies there; a swipe (a scroll) does nothing
  if (!X || !touch0 || !e.changedTouches || !e.changedTouches[0]) return;
  const t = e.changedTouches[0], t0 = touch0; touch0 = null;
  if (Math.hypot(t.clientX - t0.x, t.clientY - t0.y) > 10 || performance.now() - t0.t > 350 || Math.abs(scrollY - t0.sy) > 4) return;
  if (e.target.closest && e.target.closest(".xcard,.xbook,.xs-view,a,button,header,input,textarea")) return;
  const m = new THREE.Vector2((t.clientX / innerWidth - 0.5) * 2, -(t.clientY / innerHeight - 0.5) * 2);
  X.ray.setFromCamera(m, X.camera);
  const hit = X.ray.intersectObjects(ACTIVE.map((b) => X.blocks[b].mesh))[0];
  const s = hit && document.getElementById("x-" + hit.object.userData.block);
  if (s) { e.preventDefault?.(); s.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "center" }); }
}

function counters(root) {
  root.querySelectorAll("[data-count]:not([data-done])").forEach((el) => {
    el.dataset.done = 1;
    const to = Number(el.dataset.count), t0 = performance.now();
    const step = (n) => { const k = Math.min(1, (n - t0) / 1400), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e).toLocaleString("en-US"); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  root.querySelectorAll(".xgrow b[data-to]").forEach((el, k) => {
    const to = parseFloat(el.dataset.to), t0 = performance.now() + 300 + (k % 3) * 400;
    const step = (n) => { const q = Math.max(0, Math.min(1, (n - t0) / 1000)), e = 1 - Math.pow(1 - q, 3); el.textContent = f2(to * e); if (q < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

export function experienceAfterRender() {
  const page = document.querySelector(".xp");
  if (!page) { stopExperience(); return; }
  document.body.classList.add("xmode");
  if (!document.querySelector(".xprog")) { const p = document.createElement("div"); p.className = "xprog"; p.innerHTML = "<i></i>"; document.body.append(p); }
  // the text comes in when its chapter comes into view
  if (io) io.disconnect();
  io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); counters(en.target); } }), { threshold: 0.25 });
  page.querySelectorAll(".xch,.xbook").forEach((s) => (reduce() ? (s.classList.add("in"), counters(s)) : io.observe(s)));
  if (!bound) {
    bound = true;
    addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onResize);
    addEventListener("pointermove", onMove, { passive: true }); addEventListener("click", onClick); addEventListener("touchstart", onTouchStart, { passive: true }); addEventListener("touchend", onTouch, { passive: true });
  }
  studioAfterRender();
  const loader = page.querySelector(".xloader");
  if (X) { loader.remove(); onScroll(); return; }
  if (!G.geo) return;
  try { X = build(); } catch (e) { console.error(e); document.querySelectorAll(".xcanvas").forEach((c) => c.remove()); X = null; }
  if (!X) { document.body.classList.add("xnogl"); loader.remove(); return; } // no WebGL: the page still works, over a still picture of the plan
  const count = loader.querySelector(".xcount");
  // if the plan is slow, the page opens after 15 s anyway (the plan comes in when it arrives)
  const slow = new Promise((r) => setTimeout(() => r("slow"), 15000));
  const plan = loadPlan(X.renderer, (p) => { if (count) count.textContent = Math.round(p * 100); });
  plan.then((tex) => { if (X && tex) { X.planMat.map = tex; X.planMat.needsUpdate = true; } });
  Promise.race([plan, slow]).then(() => {
    if (!X) return;
    X.loaded = true;
    const l = document.querySelector(".xloader"); if (l) { l.classList.add("done"); setTimeout(() => l.remove(), 900); }
    document.querySelector(".xhero")?.classList.add("in");
  });
  onScroll();
  X.raf = requestAnimationFrame(frame);
}

export function stopExperience() {
  stopStudio();
  document.body.classList.remove("xmode", "xnogl");
  document.body.style.cursor = "";
  document.querySelector(".xprog")?.remove();
  if (io) { io.disconnect(); io = null; }
  if (bound) {
    bound = false;
    removeEventListener("scroll", onScroll); removeEventListener("resize", onResize);
    removeEventListener("pointermove", onMove); removeEventListener("click", onClick); removeEventListener("touchstart", onTouchStart); removeEventListener("touchend", onTouch);
  }
  if (!X) return;
  X.alive = false; cancelAnimationFrame(X.raf);
  X.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  X.renderer.dispose();
  document.querySelectorAll(".xcanvas").forEach((c) => c.remove());
  X = null;
}
