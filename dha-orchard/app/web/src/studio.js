// "Build your home": a small 3D studio in the 3D website. The visitor chooses a plot size (to scale), the number
// of floors and a style; the home builds itself on the plot, stage by stage. Drag to turn it; day or night.
// The home is an illustration only. Plot sizes are the standard sizes of the plan.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { S, esc } from "./core.js";
import { makeHouse, PLOTS, STYLES, STAGES } from "./house.js";
import { TEX, texturedBox } from "./textures.js";
import { shareLink } from "./site-extras.js";

const st = { size: "1K", floors: 2, style: "white", mood: "dusk" };
let R = null; // { renderer, scene, camera, controls, house, host, p, raf, visible, io }
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function chip(key, val, label, on) { return `<button type="button" class="xchip${on ? " on" : ""}" data-studio="${key}:${val}" aria-pressed="${on}">${label}</button>`; }
function controls() {
  const P = PLOTS[st.size];
  return `<div class="xs-row"><span class="xs-l">Plot size</span>${Object.entries(PLOTS).map(([k, p]) => chip("size", k, p.label, st.size === k)).join("")}</div>
    <div class="xs-row"><span class="xs-l">Floors</span>${chip("floors", 2, "2 floors", st.floors === 2)}${chip("floors", 3, "3 floors", st.floors === 3)}</div>
    <div class="xs-row"><span class="xs-l">Style</span>${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="xswatch${st.style === k ? " on" : ""}" data-studio="style:${k}" title="${s.label}" aria-label="${s.label}" style="--c:#${s.frame.toString(16).padStart(6, "0")};--a:#${s.lower.toString(16).padStart(6, "0")}"></button>`).join("")}<span class="xs-name">${STYLES[st.style].label}</span></div>
    <div class="xs-row"><span class="xs-l">Light</span>${chip("mood", "day", "☀ Day", st.mood === "day")}${chip("mood", "dusk", "◐ Dusk", st.mood === "dusk")}${chip("mood", "night", "☾ Night", st.mood === "night")}<button type="button" class="xchip" data-studio="rebuild:1">↻ Build again</button></div>
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
const SKY = { night: "sky-night.webp" }; // day and dusk use a physical sky (below)
function loadSky(kind) {
  if (R.skyPhotos[kind]) return Promise.resolve(R.skyPhotos[kind]);
  return new THREE.TextureLoader().loadAsync(SKY[kind]).then((tex) => {
    if (!R) return null;
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(R.renderer);
    const env = pm.fromEquirectangular(tex).texture; pm.dispose();
    R.skyPhotos[kind] = { tex, env };
    return R.skyPhotos[kind];
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
  for (const x of [-W * 1.5, -W / 2, W / 2, W * 1.5]) group.add(streetLamp(x, D / 2 + 2.2, mats)); // at the plot boundaries, out of the main view
  // neighbours: finished homes in calm colours, on plots of the same size (an illustration)
  const homes = [];
  const spots = [[-W, 0, 0, "white", 3], [W, 0, 0, "dark", 2]];
  if (big) spots.push([-2 * W, 0, 0, "brick", 2], [2 * W, 0, 0, "white", 2]);
  const across = roadZ + 4.5 + 2.8 + D / 2;
  if (big) spots.push([0, across, Math.PI, "white", 2], [-W, across, Math.PI, "brick", 3], [W, across, Math.PI, "dark", 2]); // phones: only the two side neighbours (faster)
  spots.forEach(([x, z, rot, style, fl], i) => {
    const h = makeHouse({ size: st.size, floors: fl, style, neighbor: true, seed: i + 3, rich: big && i < 2 });
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
// the three moods. Day and dusk: a physical sky (sun height, haze) that also lights the scene; night: a night sky photo
const MOODS = {
  day: { elev: 38, azi: 135, turb: 5, ray: 1.4, sun: 2.6, sunColor: 0xfff1dc, hemi: 0.3, exp: 0.46, fog: 0xcfdbe0, fogN: 140, fogF: 520, lamps: 0, inside: 0, bloom: [0.06, 0.98] },
  dusk: { elev: 2.2, azi: 120, turb: 9, ray: 3.2, sun: 1.1, sunColor: 0xffa860, hemi: 0.28, exp: 0.62, fog: 0x8d8fa0, fogN: 110, fogF: 460, lamps: 2.5, inside: 14, bloom: [0.55, 0.82] },
  night: { sun: 0.3, sunColor: 0x9fb4ff, hemi: 0.22, exp: 0.9, fog: 0x0b1418, fogN: 80, fogF: 330, lamps: 4, inside: 18, bloom: [0.7, 0.78] },
};
function applyMood() {
  if (!R) return;
  const m = st.mood, c = MOODS[m];
  R.house.setMood(m); R.house.setProgress(R.p, 0);
  if (R.ctx) { R.ctx.homes.forEach((h) => { h.setMood(m); h.setProgress(h.end); }); R.ctx.mats.lampHead.emissiveIntensity = c.lamps; }
  R.lights.hemi.intensity = c.hemi; R.lights.sun.intensity = c.sun; R.lights.sun.color.set(c.sunColor);
  R.inside.forEach((l) => { l.intensity = c.inside; });
  R.scene.fog.color.set(c.fog); R.scene.fog.near = c.fogN; R.scene.fog.far = c.fogF;
  R.renderer.toneMappingExposure = c.exp;
  if (R.bloom) { R.bloom.strength = c.bloom[0]; R.bloom.threshold = c.bloom[1]; R.bloom.radius = 0.5; }
  if (m === "night") {
    R.sky.visible = false;
    R.lights.sun.position.set(-40, 50, 30);
    loadSky("night").then((sk) => { if (!R || !sk || st.mood !== "night") return; R.scene.background = sk.tex; R.scene.environment = sk.env; R.scene.environmentIntensity = 0.8; });
    return;
  }
  // the sun: its height and direction set the sky colours, the shadows and the light from the sky
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - c.elev), THREE.MathUtils.degToRad(c.azi));
  const u = R.sky.material.uniforms;
  u.sunPosition.value.copy(sunDir); u.turbidity.value = c.turb; u.rayleigh.value = c.ray; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.8;
  R.sky.visible = true; R.scene.background = null;
  R.lights.sun.position.copy(sunDir).multiplyScalar(80).setY(Math.max(8, sunDir.y * 80));
  // light from the sky: render the sky alone into an environment map
  if (R.skyEnv) R.skyEnv.dispose();
  const pm = new THREE.PMREMGenerator(R.renderer), sc = new THREE.Scene(), clone = new Sky(); clone.scale.setScalar(1000);
  Object.keys(u).forEach((k) => { clone.material.uniforms[k].value = u[k].value; });
  sc.add(clone);
  R.skyEnv = pm.fromScene(sc).texture; pm.dispose(); clone.geometry.dispose(); clone.material.dispose();
  R.scene.environment = R.skyEnv; R.scene.environmentIntensity = m === "dusk" ? 0.6 : 0.75;
}
function newHouse() {
  if (R.house) { R.scene.remove(R.house.group); R.house.dispose(); }
  R.house = makeHouse({ size: st.size, floors: st.floors, style: st.style });
  R.scene.add(R.house.group);
  buildContext();
  const d = Math.max(R.house.plot.w, R.house.plot.d);
  R.d = d;
  R.p = 0; R.t0 = performance.now(); R.userMoved = false;
  R.house.setProgress(0, 0);
  // warm lights inside the rooms (they glow at dusk and at night)
  R.inside.forEach((l) => R.scene.remove(l)); R.inside = [];
  for (const p of R.house.lights) { const l = new THREE.PointLight(0xffc27a, 0, 10, 2); l.position.copy(p); R.scene.add(l); R.inside.push(l); }
  // the pool reflects the home and the sky (laptops)
  if (R.mirror) { R.scene.remove(R.mirror); R.mirror.dispose(); R.mirror = null; }
  const pool = R.house.pool;
  if (pool && innerWidth > 760) {
    const { w, d } = pool.userData.pool;
    R.mirror = new Reflector(new THREE.PlaneGeometry(w, d), { textureWidth: 512, textureHeight: 512, color: 0x6fa9b3, clipBias: 0.003 });
    R.mirror.rotation.x = -Math.PI / 2; R.mirror.position.set(pool.position.x, pool.position.y - 0.005, pool.position.z);
    R.mirror.visible = false; R.scene.add(R.mirror);
  }
  applyMood();
  placeCamera(0);
}
// the camera starts high, over the crane, and comes down to eye level on the street, like an architectural render
function placeCamera(k) {
  const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const { w: W, d: D } = R.house.plot, eye = R.house.eye;
  // the end view: eye level, from across the road, far enough to see the whole home and some sky
  const back = Math.max(17, W * 1.25);
  const front = eye.z - D * 0.27; // the front of the home
  const start = new THREE.Vector3(R.d * 1.25, R.d * 1.05, R.d * 1.2), end = new THREE.Vector3(W * 0.16, 1.9, front + back);
  const t0 = new THREE.Vector3(0, 2, 0), t1 = new THREE.Vector3(-W * 0.02, eye.h * 0.48, front - 3);
  R.camera.position.lerpVectors(start, end, e);
  R.controls.target.lerpVectors(t0, t1, e);
}
function paintCtrls() { const c = document.querySelector(".xs-ctrls"); if (c) c.innerHTML = controls(); }

function loop() {
  if (!R) return;
  R.raf = requestAnimationFrame(loop);
  if (!R.visible || document.hidden) { R.last = 0; return; }
  const now = performance.now(), dt = Math.min(0.25, (now - (R.last || now)) / 1000); R.last = now;
  // quality adapts to the device: when frames are slow, the heaviest effects switch off one by one
  if (dt > 0.045) R.slow = (R.slow || 0) + 1; else R.slow = Math.max(0, (R.slow || 0) - 1);
  if (R.slow > 20) {
    R.slow = 0;
    if (R.ao && R.ao.enabled) R.ao.enabled = false;
    else if (R.mirror && !R.noMirror) { R.noMirror = true; R.mirror.visible = false; }
    else if (R.composer) { R.composer = null; }
    else if (R.renderer.getPixelRatio() > 1) R.renderer.setPixelRatio(1);
  }
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
  if (R.mirror && R.house.pool) R.mirror.visible = !R.noMirror && R.house.pool.visible && R.p > 6.6;
  R.controls.autoRotate = false;
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
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.3, 2500);
  scene.background = new THREE.Color(0xc9d6da);
  const lights = light(scene);
  scene.fog = new THREE.Fog(0xc9d6da, 140, 460);
  // a wide lawn all around (the neighbourhood sits on it)
  const gtex = TEX.grass.t().clone(); gtex.needsUpdate = true; gtex.repeat.set(260, 260);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(700, 48), new THREE.MeshStandardMaterial({ color: 0xb9c7a6, roughness: 1, map: gtex }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; scene.add(ground);
  const controlsObj = new OrbitControls(camera, renderer.domElement);
  Object.assign(controlsObj, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 10, maxDistance: 140, maxPolarAngle: Math.PI * 0.485, autoRotate: false, autoRotateSpeed: 0.45 });
  R = { renderer, scene, camera, controls: controlsObj, lights, ground, host, p: 0, visible: false, house: null, sky: {}, gtex, inside: [] };
  const skyObj = new Sky(); skyObj.scale.setScalar(1000); scene.add(skyObj); R.sky = skyObj; R.skyPhotos = {};
  controlsObj.addEventListener("start", () => { R.userMoved = true; });
  // laptops: soft shading in corners (ambient occlusion), a glow on lights at night, smooth edges
  if (big && !reduce()) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 800, 600); R.ao = ao;
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
    if (k === "mood") { st.mood = v; paintCtrls(); applyMood(); return true; }
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
  for (const k in R.skyPhotos) { R.skyPhotos[k].tex.dispose(); R.skyPhotos[k].env.dispose(); }
  if (R.skyEnv) R.skyEnv.dispose();
  if (R.mirror) R.mirror.dispose();
  R.gtex.dispose();
  if (R.composer) R.composer.dispose?.();
  R.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  R.renderer.dispose(); R.renderer.domElement.remove();
  R = null;
}
