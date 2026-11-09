// "Build your home": a small 3D studio in the 3D website. The visitor chooses a plot size (to scale), the number
// of floors and a style; the home builds itself on the plot, stage by stage. Drag to turn it; day or night.
// The home is an illustration only. Plot sizes are the standard sizes of the plan.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { S, esc } from "./core.js";
import { makeHouse, PLOTS, STYLES, STAGES } from "./house.js";
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

function skyTexture(night) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 512;
  const g = c.getContext("2d"), grd = g.createLinearGradient(0, 0, 0, 512);
  if (night) { grd.addColorStop(0, "#04161a"); grd.addColorStop(0.55, "#0b3a40"); grd.addColorStop(1, "#1d5158"); }
  else { grd.addColorStop(0, "#6f9fa3"); grd.addColorStop(0.5, "#b7d0cd"); grd.addColorStop(1, "#e3ece8"); }
  g.fillStyle = grd; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function stars() {
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2, r = 300; pos[i * 3] = Math.cos(a) * Math.cos(e) * r; pos[i * 3 + 1] = Math.sin(e) * r; pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf4ead3, size: 1.4, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
}
function light(scene) {
  const hemi = new THREE.HemisphereLight(0xfff3d6, 0x2f5d55, 0.7);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.0); sun.position.set(-30, 26, 26); sun.castShadow = true;
  const big = innerWidth > 760;
  sun.shadow.mapSize.set(big ? 2048 : 1024, big ? 2048 : 1024); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 140 });
  // warm light from the windows at night
  const glow = new THREE.PointLight(0xffb35c, 0, 30, 2); glow.position.set(0, 4, 8);
  scene.add(hemi, sun, glow); return { hemi, sun, glow };
}
// day: a soft teal-to-mist sky; night: deep abyss with stars (the sky is CSS behind the transparent canvas)
function applyNight() {
  if (!R) return;
  R.house.setNight(st.night);
  const n = st.night;
  R.lights.hemi.intensity = n ? 0.32 : 0.7; R.lights.hemi.color.set(n ? 0x8090c0 : 0xfff3d6);
  R.lights.sun.intensity = n ? 0.22 : 2.0; R.lights.sun.color.set(n ? 0x9ab0ff : 0xffd9a0);
  R.lights.glow.intensity = n ? 9 : 0;
  R.scene.environmentIntensity = n ? 0.14 : 0.35;
  R.ground.material.color.set(n ? 0x17393d : 0x2f5d55);
  R.scene.fog.color.set(n ? 0x1d5158 : 0x9db9b6);
  if (R.bloom) { R.bloom.strength = n ? 0.55 : 0.12; R.bloom.threshold = n ? 0.82 : 0.96; R.bloom.radius = 0.5; }
  R.scene.background = n ? R.skyNight : R.skyDay; R.stars.visible = n;
  R.host.closest(".xs-view")?.classList.toggle("night", n);
}
function newHouse() {
  if (R.house) { R.scene.remove(R.house.group); R.house.dispose(); }
  R.house = makeHouse({ size: st.size, floors: st.floors, style: st.style });
  R.scene.add(R.house.group);
  const d = Math.max(R.house.plot.w, R.house.plot.d);
  R.d = d;
  R.controls.target.set(0, 4, 0);
  // the camera starts high and far, then glides in and turns around the home while it is built
  R.camera.position.set(d * 1.6, d * 1.5, d * 1.8);
  R.p = 0; R.t0 = performance.now(); R.userMoved = false;
  R.house.setProgress(0, 0);
  applyNight();
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
    R.p = reduce() ? end : Math.min(end, R.p + dt * 0.95); // about 8.5 seconds for the whole home
    const name = document.querySelector(".xs-stagename"), bar = document.querySelector(".xs-stage i i");
    if (name) name.textContent = R.p >= end - 0.15 ? "Your home is ready" : STAGES[Math.min(STAGES.length - 1, Math.floor(R.p))];
    if (bar) bar.style.width = Math.min(100, (R.p / end) * 100) + "%";
    // camera glide while building (until the visitor drags)
    if (!R.userMoved && !reduce()) {
      const k = 1 - Math.pow(1 - Math.min(1, R.p / end), 2);
      const ang = 0.7 + k * 1.15, dist = R.d * (2.5 - k * 0.85), h = R.d * (1.45 - k * 0.95);
      R.camera.position.set(Math.cos(ang) * dist, h, Math.sin(ang) * dist);
    }
  }
  R.house.setProgress(R.p, t);
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
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { host.innerHTML = `<p class="xfine" style="padding:20px">3D is not available on this device.</p>`; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
  host.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  const lights = light(scene);
  scene.fog = new THREE.Fog(0x9db9b6, 70, 190);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x2f5d55, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const controlsObj = new OrbitControls(camera, renderer.domElement);
  Object.assign(controlsObj, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 14, maxPolarAngle: Math.PI * 0.46, autoRotate: false, autoRotateSpeed: 0.5, maxDistance: 120 });
  R = { renderer, scene, camera, controls: controlsObj, lights, ground, host, p: 0, visible: false, house: null, skyDay: skyTexture(false), skyNight: skyTexture(true), stars: stars() };
  scene.add(R.stars);
  controlsObj.addEventListener("start", () => { R.userMoved = true; });
  // a soft glow on lit windows and lamps (laptops and tablets; phones skip it to stay fast)
  if (innerWidth > 760 && !reduce()) {
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    R.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.18, 0.6, 0.92);
    composer.addPass(R.bloom); composer.addPass(new OutputPass());
    R.composer = composer;
  }
  const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); if (R.composer) R.composer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
  size(); R.onResize = size; addEventListener("resize", size);
  newHouse();
  // build when the studio comes into view; pause when it is out of view
  R.io = new IntersectionObserver(([e]) => { R.visible = e.isIntersecting; if (e.isIntersecting && R.p === 0 && !R.started) { R.started = true; } }, { threshold: 0.15 });
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
  R.skyDay.dispose(); R.skyNight.dispose(); if (R.scene.environment) R.scene.environment.dispose();
  if (R.composer) R.composer.dispose?.();
  R.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  R.renderer.dispose(); R.renderer.domElement.remove();
  R = null;
}
