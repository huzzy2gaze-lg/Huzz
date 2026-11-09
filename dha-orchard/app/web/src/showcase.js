// Two parts of the home page that play by themselves, again and again:
// 1. the hero map: it zooms to each block in turn and a card shows its plots, sizes, price today and our outlook;
// 2. "Where one plot could go": block by block, the price today, at Block A possession (July 2027) and in December 2028.
// The map is the official plan; the tour only moves the view. Nothing is shifted or made up.
import { S, G, esc } from "./core.js";

const HERO = ["A", "C", "B", "G", "E", "D", "F", "H"];
const GROW = ["A", "C", "B", "G", "E"];
const HERO_MS = 4800, WHOLE_MS = 3200, GROW_MS = 6500;
let cfg = null; // { BLOCKS, OUT_2027, OUT_2028 } from site.js
let heroI = 0, growI = 0, lastHero = 0, lastGrow = 0, started = false, anim = 0;

export function setShowcase(c) { cfg = c; }
const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const mid = (b) => { const p = cfg.BLOCKS[b].price; return p ? (p[0] + p[1]) / 2 : null; };
export function outlookFor(b) {
  const m = mid(b);
  return m ? { today: cfg.BLOCKS[b].price, y27: m * cfg.OUT_2027, y28: m * cfg.OUT_2028, mid: m } : null;
}
const f2 = (v) => v.toFixed(2), f1 = (v) => v.toFixed(1);

// ---------------------------------------------------------------- the hero tour
function fullBox() { const W = G.world[2], H = G.world[3]; return [-W * 0.04, -H * 0.04, W * 1.08, H * 1.08]; }
// on a wide map the card is at the bottom left, so the block goes to the upper right; on a phone the card is below the map
function blockBox(b) {
  const bb = G.geo.blocks[b].bbox, pad = 50, W = G.world[2], H = G.world[3], ar = W / H;
  const w = bb[2] - bb[0] + pad * 2, h = bb[3] - bb[1] + pad * 2, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  const side = innerWidth > 640;
  const fx = side ? 0.5 : 1, fy = side ? 0.8 : 0.9; // the part of the map that the block may use
  const vw = Math.max(w / fx, (h / fy) * ar), vh = vw / ar;
  return side ? [cx - 0.71 * vw, cy - 0.44 * vh, vw, vh] : [cx - vw / 2, cy - 0.48 * vh, vw, vh];
}
function zoom(svg, box, ms) {
  cancelAnimationFrame(anim);
  if (reduce() || !ms) { svg.setAttribute("viewBox", box.map((v) => v.toFixed(1)).join(" ")); return; }
  const from = svg.getAttribute("viewBox").split(/\s+/).map(Number), t0 = performance.now();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms), e = ease(k);
    svg.setAttribute("viewBox", from.map((v, i) => (v + (box[i] - v) * e).toFixed(1)).join(" "));
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}
// step 0 is the whole scheme, then one step for each block
export function heroCard(i) {
  if (i === 0) return `<div class="hc-eyebrow">The whole scheme</div><div class="hc-title">8 blocks · 4,781 plots</div>
    <div class="hc-line">1 Kanal, 14 Marla and 10 Marla plots on the official FGEHA master plan.</div>
    <div class="hc-row"><a href="#book" class="sitebtn solid">Book a call</a></div>`;
  const b = HERO[i - 1], info = cfg.BLOCKS[b], o = outlookFor(b);
  const price = o ? `<div class="hc-prices"><div><span>Today</span><b>${o.today[1] > o.today[0] ? `${f2(o.today[0])}–${f2(o.today[1])}` : f2(o.today[0])} Cr</b></div>
      <div><span>Jul 2027 outlook</span><b>≈ ${f1(o.y27)} Cr</b></div><div><span>Dec 2028 outlook</span><b class="gold">≈ ${f1(o.y28)} Cr</b></div></div>
      <div class="hc-fine">${esc(info.size)} plot. Today: market asking prices, Oct 2026. Outlook: our team's view, not a promise.</div>`
    : `<div class="hc-line">Prices change from plot to plot here. Ask us for today's prices.</div>`;
  return `<div class="hc-eyebrow">Block ${b}${b === "A" ? " · first possession" : ""}</div><div class="hc-title">Block ${b} · about ${info.plots.toLocaleString("en-IN")} plots</div>
    <div class="hc-line">${esc(info.sizes)}</div>${price}
    <div class="hc-row"><a href="#book" class="sitebtn solid" data-act="askPlot" data-block="${b}">Book a call about Block ${b}</a></div>`;
}
function heroDots(i) {
  return ["All", ...HERO].map((l, k) => `<button class="hdot${k === i ? " on" : ""}" data-herostep="${k}" aria-label="${k ? "Block " + l : "Whole scheme"}">${l}</button>`).join("");
}
function paintHero(animate) {
  const box = document.querySelector(".herotour");
  if (!box) return;
  const svg = box.querySelector("svg.bmap");
  const b = heroI ? HERO[heroI - 1] : null;
  zoom(svg, b ? blockBox(b) : fullBox(), animate ? 1300 : 0);
  svg.querySelectorAll(".bmblock").forEach((g) => g.classList.toggle("focus", g.dataset.sblock === b));
  svg.classList.toggle("whole", !b);
  const card = box.querySelector(".herocard");
  card.innerHTML = heroCard(heroI);
  if (animate && !reduce()) { card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); }
  box.querySelector(".herodots").innerHTML = heroDots(heroI);
  const bar = box.querySelector(".herobar i");
  if (bar) { bar.style.transition = "none"; bar.style.width = "0%"; void bar.offsetWidth; bar.style.transition = `width ${heroI ? HERO_MS : WHOLE_MS}ms linear`; bar.style.width = "100%"; }
}
export function heroJump(i) { heroI = Math.max(0, Math.min(HERO.length, i)); lastHero = Date.now(); paintHero(true); }

// ---------------------------------------------------------------- where one plot could go
export function growthPanel(b) {
  const o = outlookFor(b), info = cfg.BLOCKS[b];
  const max = o.y28 * 1.12;
  const bar = (v, label, sub, cls) => `<div class="gcol ${cls}"><b class="gval" data-to="${v.toFixed(2)}">${f2(v)}</b><span class="gcr">Cr</span>
    <div class="gtrack"><i style="--h:${((v / max) * 100).toFixed(1)}%"></i></div><span class="glabel">${label}</span><small>${sub}</small></div>`;
  const gain = Math.round(((o.y28 - o.mid) / o.mid) * 100);
  return `<div class="gtitle"><span class="eyebrow">Block ${b}</span><h3>One ${esc(info.size)} plot in Block ${b}</h3><span class="gbadge">+${gain}% by Dec 2028</span></div>
    <div class="gbars">${bar(o.mid, "Today", "market asks " + (o.today[1] > o.today[0] ? `${f2(o.today[0])}–${f2(o.today[1])}` : f2(o.today[0])) + " Cr", "now")}${bar(o.y27, "July 2027", "Block A possession", "mid")}${bar(o.y28, "December 2028", "our outlook", "end")}</div>`;
}
function growthDots(i) { return GROW.map((b, k) => `<button class="hdot${k === i ? " on" : ""}" data-growstep="${k}" aria-label="Block ${b}">${b}</button>`).join(""); }
function paintGrowth(animate) {
  const box = document.querySelector(".growth");
  if (!box) return;
  const b = GROW[growI];
  box.querySelectorAll(".gmap .bmblock").forEach((g) => g.classList.toggle("focus", g.dataset.sblock === b));
  const panel = box.querySelector(".gpanel");
  panel.innerHTML = growthPanel(b);
  box.querySelector(".growdots").innerHTML = growthDots(growI);
  if (!animate || reduce()) { panel.classList.add("in"); return; }
  panel.classList.remove("in"); void panel.offsetWidth;
  requestAnimationFrame(() => panel.classList.add("in"));
  // the numbers count up with the bars
  panel.querySelectorAll(".gval").forEach((el, k) => {
    const to = parseFloat(el.dataset.to), t0 = performance.now() + k * 350;
    const step = (now) => { const t = Math.max(0, Math.min(1, (now - t0) / 1100)), e = 1 - Math.pow(1 - t, 3); el.textContent = f2(to * e); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
export function growJump(i) { growI = Math.max(0, Math.min(GROW.length - 1, i)); lastGrow = Date.now(); paintGrowth(true); }

// ---------------------------------------------------------------- one timer for both
const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 80 && r.top < innerHeight - 80; };
let growSeen = false;
function tick() {
  if (document.hidden || !cfg) return;
  const now = Date.now();
  const hero = document.querySelector(".herotour");
  if (hero && !hero.matches(":hover") && now - lastHero > (heroI ? HERO_MS : WHOLE_MS)) { heroI = (heroI + 1) % (HERO.length + 1); lastHero = now; paintHero(true); }
  const grow = document.querySelector(".growth");
  if (grow) {
    if (!inView(grow)) { growSeen = false; return; }
    if (!growSeen) { growSeen = true; lastGrow = now; paintGrowth(true); return; } // start when it comes into view
    if (!grow.matches(":hover") && now - lastGrow > GROW_MS) { growI = (growI + 1) % GROW.length; lastGrow = now; paintGrowth(true); }
  }
}
// after each drawing of the page: show the current step at once, then the timer moves on
export function showcaseAfterRender() {
  if (!document.querySelector(".herotour") && !document.querySelector(".growth")) return;
  paintHero(false); paintGrowth(false);
  if (!lastHero) lastHero = Date.now();
  if (!started) { started = true; setInterval(tick, 200); }
}
