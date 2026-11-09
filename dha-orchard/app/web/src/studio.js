// "Build your home": a small 3D studio in the 3D website. The visitor chooses a plot size (to scale), the number
// of floors and a style; the home builds itself on the plot, stage by stage. Drag to turn it; day or night.
// The home is an illustration only. Plot sizes are the standard sizes of the plan.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
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
    <div class="xs-row"><span class="xs-l">Style</span>${Object.entries(STYLES).map(([k, s]) => `<button type="button" class="xswatch${st.style === k ? " on" : ""}" data-studio="style:${k}" title="${s.label}" aria-label="${s.label}" style="--c:#${s.wall.toString(16).padStart(6, "0")};--a:#${s.accent.toString(16).padStart(6, "0")}"></button>`).join("")}<span class="xs-name">${STYLES[st.style].label}</span></div>
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

function light(scene) {
  const hemi = new THREE.HemisphereLight(0xfff3d6, 0x0b3a40, 1.3);
  const sun = new THREE.DirectionalLight(0xffe2a8, 2.4); sun.position.set(-25, 40, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 120 });
  scene.add(hemi, sun); return { hemi, sun };
}
function applyNight() {
  if (!R) return;
  R.house.setNight(st.night);
  R.lights.hemi.intensity = st.night ? 0.28 : 1.3; R.lights.hemi.color.set(st.night ? 0x8090c0 : 0xfff3d6);
  R.lights.sun.intensity = st.night ? 0.35 : 2.4; R.lights.sun.color.set(st.night ? 0x8aa0ff : 0xffe2a8);
  R.ground.material.color.set(st.night ? 0x071b1d : 0x123f45);
  R.scene.fog.color.set(st.night ? 0x061414 : 0x0b3a40);
}
function newHouse(rebuild) {
  if (R.house) { R.scene.remove(R.house.group); R.house.group.traverse((o) => o.geometry && o.geometry.dispose()); }
  R.house = makeHouse({ size: st.size, floors: st.floors, style: st.style });
  R.scene.add(R.house.group);
  const d = Math.max(R.house.plot.w, R.house.plot.d);
  R.controls.target.set(0, 3, 0);
  if (rebuild !== false) R.camera.position.set(d * 0.95, d * 0.65, d * 0.95);
  R.p = rebuild === false ? STAGES.length : 0;
  R.house.setProgress(R.p);
  applyNight();
}
function paintCtrls() { const c = document.querySelector(".xs-ctrls"); if (c) c.innerHTML = controls(); }

function loop() {
  if (!R) return;
  R.raf = requestAnimationFrame(loop);
  if (!R.visible || document.hidden) { R.last = 0; return; }
  const now = performance.now(), dt = Math.min(0.25, (now - (R.last || now)) / 1000); R.last = now;
  if (R.p < STAGES.length) {
    R.p = reduce() ? STAGES.length : Math.min(STAGES.length, R.p + dt * 1.25); // about 6 seconds for the whole home
    R.house.setProgress(R.p);
    const name = document.querySelector(".xs-stagename"), bar = document.querySelector(".xs-stage i i");
    if (name) name.textContent = R.p >= STAGES.length ? "Your home is ready" : STAGES[Math.floor(R.p)];
    if (bar) bar.style.width = (R.p / STAGES.length) * 100 + "%";
  }
  R.controls.update();
  R.renderer.render(R.scene, R.camera);
}

export function studioAfterRender() {
  const host = document.querySelector(".xs-canvas");
  if (!host) { stopStudio(); return; }
  if (R && R.host === host) return;
  stopStudio();
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { host.innerHTML = `<p class="xfine" style="padding:20px">3D is not available on this device.</p>`; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  const lights = light(scene);
  scene.fog = new THREE.Fog(0x0b3a40, 60, 160);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x123f45, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const controlsObj = new OrbitControls(camera, renderer.domElement);
  Object.assign(controlsObj, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 14, maxDistance: 80, maxPolarAngle: Math.PI * 0.47, autoRotate: !reduce(), autoRotateSpeed: 0.6 });
  R = { renderer, scene, camera, controls: controlsObj, lights, ground, host, p: 0, visible: false, house: null };
  const size = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
  size(); R.onResize = size; addEventListener("resize", size);
  newHouse(true); R.p = 0; R.house.setProgress(0);
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
    if (R) newHouse(k !== "style" || true);
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
  R.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  R.renderer.dispose(); R.renderer.domElement.remove();
  R = null;
}
