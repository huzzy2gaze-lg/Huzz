// "Build your home": a small 3D studio in the 3D website. The visitor chooses a plot size (to scale), the number
// of floors and a style; the home builds itself on the plot, stage by stage. Drag to turn it; day or night.
// The home is an illustration only. Plot sizes are the standard sizes of the plan.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { S, esc } from "./core.js";
import { makeHouse, PLOTS, STYLES, STAGES } from "./house.js";
import { TEX, texturedBox } from "./textures.js";
import { shareLink } from "./site-extras.js";

const st = { size: "1K", floors: 2, style: "white", night: false };
let R = null; // { renderer, scene, camera, controls, house, host, p, raf, visible, io }
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function chip(key, val, label, on) { return `<button type="button" class="xchip${on ? " on" : ""}" data-studio="${key}:${val}" aria-pressed="${on}">${label}</button>`; }
function controls() {
  const P = PLOTS[st.size];
  return `<div class="xs-row"><span class="xs-l">Plot size</span>${Object.entries(PLOTS).map(([k, p]) => chip("size", k, p.label, st.size === k)).join("")}</div>
    <div class="xs-row"><span class="xs-l">Floors</span>${chip("floors", 2, "2 floors", st.floors === 2)}${chip("floors", 3, "3 floors", st.floors === 3)}</div>
    <div class="xs-row"><span class="xs-l">Style</span>${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="xswatch${st.style === k ? " on" : ""}" data-studio="style:${k}" title="${s.label}" aria-label="${s.label}" style="--c:#${s.wall.toString(16).padStart(6, "0")};--a:#${s.wall2.toString(16).padStart(6, "0")}"></button>`).join("")}<span class="xs-name">${STYLES[st.style].label}</span></div>
    <div class="xs-row"><span class="xs-l">Light</span>${chip("night", 0, "☀ Day", !st.night)}${chip("night", 1, "☾ Night", st.night)}<button type="button" class="xchip" data-studio="rebuild:1">↻ Build again</button></div>
    <div class="xs-stage"><span class="xs-stagename">${esc(STAGES[0])}</span><i><i></i></i></div>
    <p class="xfine">${P.label}: ${P.w} × ${P.d} ft, the standard size on the plan. The home is an illustration only: a real design must follow the building bylaws.</p>
    <div class="xrow"><a href="#book" class="xbtn goldbtn" data-studiobook="${P.label}" data-magnet>Book a call about a ${P.label} plot</a>
      <a class="xbtn ghost" target="_blank" rel="noopener" href="${shareLink(`My ${P.label} home in DHA Margalla Orchard (${st.floors} floors, ${STYLES[st.style].label.toLowerCase()}). Plan yours here:`)}">Share on WhatsApp</a></div>`;
}
export function studioSection() {
  return `<section class="xch xstudio" data-cam="studio" id="x-studio"><div class="xs-grid">
    <div class="xcard"><div class="xkicker">Build your home</div><h2><span class="xw"><span>Your</span></span> <span class="xw"><span style="--d:.06s">plot,</span></span> <span class="xw"><span style="--d:.12s">your</span></span> <span class="xw gold"><span style="--d:.18s">home.</span></span></h2>
      <p class="xlead">Choose a plot size, the floors and a style. Watch your home rise on the plot, to scale. Drag to turn it.</p>
      <div class="xs-ctrls">${controls()}</div></div>
    <div class="xs-view"><div class="xs-canvas" aria-label="3D illustration of a home on the chosen plot"></div><div class="xs-hint">Drag to turn · pinch or scroll inside to zoom</div></div>
  </div></section>`;
}

// ---------------------------------------------------------------- the world around the home
// the sky is a real sky photo (from Poly Haven, free to use, made into a small WebP image); it also lights the scene
const SKY = { day: "sky-day.webp", night: "sky-night.webp" };
function loadSky(kind) {
  if (R.sky[kind]) return Promise.resolve(R.sky[kind]);
  return new THREE.TextureLoader().loadAsync(SKY[kind]).then((tex) => {
    if (!R) return null;
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(R.renderer);
    const env = pm.fromEquirectangular(tex).texture; pm.dispose();
    R.sky[kind] = { tex, env };
    return R.sky[kind];
  }).catch(() => null);
}
function streetLamp(x, z, mats) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.5, 8), mats.pole); pole.position.y = 3.25; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), mats.pole); arm.position.set(0, 6.4, 0.75); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.7), mats.lampHead); head.position.set(0, 6.3, 1.45); g.add(head);
  return g;
}
// street in front, neighbours on both sides and across the road, hills far away
function buildContext() {
  if (R.ctx) { R.scene.remove(R.ctx.group); R.ctx.dispose(); }
  const big = innerWidth > 760;
  const { w: W, d: D } = R.house.plot;
  const group = new THREE.Group(), geos = [], mats = {
    pole: new THREE.MeshStandardMaterial({ color: 0x2a3133, roughness: 0.5, metalness: 0.6 }),
    lampHead: new THREE.MeshStandardMaterial({ color: 0xf6f0e0, emissive: 0xffc77a, emissiveIntensity: 0 }),
    road: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, map: TEX.asphalt.t() }),
    path: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: TEX.paving.t() }),
    kerb: new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: 0.9 }),
    mark: new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.6 }),
    hill: new THREE.MeshStandardMaterial({ color: 0x4d6b55, roughness: 1, flatShading: true }),
  };
  const add = (geo, mat, x, y, z, shadow = false) => { geos.push(geo); const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = shadow; group.add(m); return m; };
  const L = 220, roadZ = D / 2 + 2.6 + 4.5;
  add(texturedBox(L, 0.06, 2.6, TEX.paving.m), mats.path, 0, 0.02, D / 2 + 1.3);
  add(texturedBox(L, 0.16, 0.25, 1), mats.kerb, 0, 0, D / 2 + 2.6);
  add(texturedBox(L, 0.04, 9, TEX.asphalt.m), mats.road, 0, 0, roadZ);
  for (let x = -L / 2; x < L / 2; x += 6) add(new THREE.BoxGeometry(3, 0.02, 0.15), mats.mark, x, 0.05, roadZ);
  add(texturedBox(L, 0.16, 0.25, 1), mats.kerb, 0, 0, roadZ + 4.6);
  add(texturedBox(L, 0.06, 2.6, TEX.paving.m), mats.path, 0, 0.02, roadZ + 4.5 + 1.4);
  for (let x = -W * 2.5; x <= W * 2.5; x += 18) group.add(streetLamp(x, D / 2 + 2.2, mats));
  // neighbours: finished homes in calm colours, on plots of the same size (an illustration)
  const homes = [];
  const spots = [[-W, 0, 0, "white", 3], [W, 0, 0, "dark", 2]];
  if (big) spots.push([-2 * W, 0, 0, "brick", 2], [2 * W, 0, 0, "white", 2]);
  const across = roadZ + 4.5 + 2.8 + D / 2;
  if (big) spots.push([0, across, Math.PI, "white", 2], [-W, across, Math.PI, "brick", 3], [W, across, Math.PI, "dark", 2]); // phones: only the two side neighbours (faster)
  spots.forEach(([x, z, rot, style, fl], i) => {
    const h = makeHouse({ size: st.size, floors: fl, style, neighbor: true, seed: i + 3 });
    h.group.position.set(x, 0, z); h.group.rotation.y = rot;
    if (!big) h.group.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    group.add(h.group); homes.push(h);
    if (rot) h.acrossZ = z - D / 2 - 1; // the front of a home across the road
  });
  // far hills, softened by the haze
  const r = mulberry(7);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + r() * 0.15, dist = 330 + r() * 140, hgt = 18 + r() * 38;
    const hg = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); geos.push(hg);
    const m = new THREE.Mesh(hg, mats.hill); m.scale.set(70 + r() * 70, hgt, 50 + r() * 40); m.position.set(Math.cos(a) * dist, -2, Math.sin(a) * dist); m.rotation.y = -a; group.add(m);
  }
  R.scene.add(group);
  R.ctx = { group, homes, mats, dispose() { geos.forEach((g) => g.dispose()); homes.forEach((h) => h.dispose()); Object.values(mats).forEach((m) => m.dispose()); group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } };
}
function mulberry(a) { return () => { let t = (a += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function light(scene) {
  const hemi = new THREE.HemisphereLight(0xeaf4ff, 0x4a5a3a, 0.35);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2); sun.position.set(-40, 55, 30); sun.castShadow = true;
  const big = innerWidth > 760;
  sun.shadow.mapSize.set(big ? 4096 : 1024, big ? 4096 : 1024); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
  scene.add(hemi, sun, sun.target); return { hemi, sun };
}
function applyNight() {
  if (!R) return;
  const n = st.night;
  R.house.setNight(n); R.house.setProgress(R.p, 0);
  if (R.ctx) { R.ctx.homes.forEach((h) => { h.setNight(n); h.setProgress(h.end); }); R.ctx.mats.lampHead.emissiveIntensity = n ? 4 : 0; }
  R.lights.hemi.intensity = n ? 0.25 : 0.35; R.lights.hemi.color.set(n ? 0x6070a0 : 0xeaf4ff);
  R.lights.sun.intensity = n ? 0.35 : 3.2; R.lights.sun.color.set(n ? 0x9fb4ff : 0xfff0d8);
  R.scene.fog.color.set(n ? 0x0b1418 : 0xc9d6da);
  R.scene.fog.near = n ? 80 : 140; R.scene.fog.far = n ? 330 : 460;
  R.renderer.toneMappingExposure = n ? 0.9 : 0.75;
  if (R.bloom) { R.bloom.strength = n ? 0.65 : 0.08; R.bloom.threshold = n ? 0.8 : 0.98; R.bloom.radius = 0.45; }
  R.ground.material.color.set(n ? 0x55615a : 0xb9c7a6);
  const kind = n ? "night" : "day";
  loadSky(kind).then((sk) => { if (!R || !sk || (st.night ? "night" : "day") !== kind) return; R.scene.background = sk.tex; R.scene.environment = sk.env; R.scene.environmentIntensity = n ? 0.9 : 1.6; R.scene.backgroundIntensity = n ? 1.0 : 1.15; });
}
function newHouse() {
  if (R.house) { R.scene.remove(R.house.group); R.house.dispose(); }
  R.house = makeHouse({ size: st.size, floors: st.floors, style: st.style });
  R.scene.add(R.house.group);
  buildContext();
  const d = Math.max(R.house.plot.w, R.house.plot.d);
  R.d = d;
  R.controls.target.set(0, 3.5, 0);
  R.p = 0; R.t0 = performance.now(); R.userMoved = false;
  R.house.setProgress(0, 0);
  applyNight();
  placeCamera(0);
}
// the camera starts low, at the street corner, then rises and turns around the home while it is built
function placeCamera(k) {
  const e = 1 - Math.pow(1 - k, 2);
  const ang = 0.95 + e * 0.95, dist = R.d * (2.1 - e * 0.35), h = 2.6 + e * R.d * 0.75;
  R.camera.position.set(Math.cos(ang) * dist, h, Math.sin(ang) * dist);
}
function paintCtrls() { const c = document.querySelector(".xs-ctrls"); if (c) c.innerHTML = controls(); }

function loop() {
  if (!R) return;
  R.raf = requestAnimationFrame(loop);
  if (!R.visible || document.hidden) { R.last = 0; return; }
  const now = performance.now(), dt = Math.min(0.25, (now - (R.last || now)) / 1000); R.last = now;
  const t = (now - R.t0) / 1000;
  const end = R.house.end;
  if (R.p < end) {
    R.p = reduce() ? end : Math.min(end, R.p + dt * 0.9); // about 9 seconds for the whole home
    const name = document.querySelector(".xs-stagename"), bar = document.querySelector(".xs-stage i i");
    if (name) name.textContent = R.p >= end - 0.15 ? "Your home is ready" : STAGES[Math.min(STAGES.length - 1, Math.floor(R.p))];
    if (bar) bar.style.width = Math.min(100, (R.p / end) * 100) + "%";
    if (!R.userMoved && !reduce()) placeCamera(Math.min(1, R.p / end));
  }
  R.house.setProgress(R.p, t);
  // homes across the road hide while the camera is behind them, so they never block the view
  if (R.ctx) for (const h of R.ctx.homes) if (h.acrossZ) h.group.visible = R.camera.position.z < h.acrossZ;
  R.controls.autoRotate = !reduce() && (R.p >= end || R.userMoved);
  R.controls.update();
  if (R.composer) R.composer.render(); else R.renderer.render(R.scene, R.camera);
}

export function studioAfterRender() {
  const host = document.querySelector(".xs-canvas");
  if (!host) { stopStudio(); return; }
  if (R && R.host === host) return;
  stopStudio();
  let renderer;
  const big = innerWidth > 760;
  try { renderer = new THREE.WebGLRenderer({ antialias: !big, alpha: false, powerPreference: "high-performance" }); } catch { host.innerHTML = `<p class="xfine" style="padding:20px">3D is not available on this device.</p>`; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, big ? 1.5 : 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.75;
  host.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, 0.3, 1200);
  scene.background = new THREE.Color(0xc9d6da);
  const lights = light(scene);
  scene.fog = new THREE.Fog(0xc9d6da, 140, 460);
  // a wide lawn all around (the neighbourhood sits on it)
  const gtex = TEX.grass.t().clone(); gtex.needsUpdate = true; gtex.repeat.set(260, 260);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(700, 48), new THREE.MeshStandardMaterial({ color: 0xb9c7a6, roughness: 1, map: gtex }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
  const controlsObj = new OrbitControls(camera, renderer.domElement);
  Object.assign(controlsObj, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 10, maxDistance: 140, maxPolarAngle: Math.PI * 0.485, autoRotate: false, autoRotateSpeed: 0.45 });
  R = { renderer, scene, camera, controls: controlsObj, lights, ground, host, p: 0, visible: false, house: null, sky: {}, gtex };
  controlsObj.addEventListener("start", () => { R.userMoved = true; });
  // laptops: soft shading in corners (ambient occlusion), a glow on lights at night, smooth edges
  if (big && !reduce()) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 800, 600);
    ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 0.9;
    ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1 });
    composer.addPass(ao);
    R.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.08, 0.45, 0.98);
    composer.addPass(R.bloom); composer.addPass(new OutputPass()); composer.addPass(new SMAAPass(800, 600));
    R.composer = composer;
  }
  const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); if (R.composer) R.composer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
  size(); R.onResize = size; addEventListener("resize", size);
  newHouse();
  R.io = new IntersectionObserver(([e]) => { R.visible = e.isIntersecting; }, { threshold: 0.15 });
  R.io.observe(host);
  R.raf = requestAnimationFrame(loop);
}

// controls (called from the page's click handler)
export function studioClick(target) {
  const btn = target.closest("[data-studio]");
  if (btn) {
    const [k, v] = btn.dataset.studio.split(":");
    if (k === "size") st.size = v;
    if (k === "floors") st.floors = Number(v);
    if (k === "style") st.style = v;
    if (k === "night") { st.night = v === "1"; paintCtrls(); applyNight(); return true; }
    paintCtrls();
    if (R) newHouse();
    return true;
  }
  const book = target.closest("[data-studiobook]");
  if (book) { S.bookAns = { ...(S.bookAns || {}), size: book.dataset.studiobook }; S.siteSent = false; }
  return false;
}

export function stopStudio() {
  if (!R) return;
  cancelAnimationFrame(R.raf); R.io.disconnect(); removeEventListener("resize", R.onResize);
  R.controls.dispose();
  if (R.house) R.house.dispose();
  if (R.ctx) R.ctx.dispose();
  for (const k in R.sky) { R.sky[k].tex.dispose(); R.sky[k].env.dispose(); }
  R.gtex.dispose();
  if (R.composer) R.composer.dispose?.();
  R.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  R.renderer.dispose(); R.renderer.domElement.remove();
  R = null;
}
