// The hero map of the home page plays by itself, again and again: it zooms to each block in turn (A to H), and a card
// under the map shows the plots and sizes and, for blocks with market prices, three growing bars:
// the price today, at Block A possession (July 2027) and in December 2028 (our outlook).
// The map is the official plan; the tour only moves the view. Nothing is shifted or made up.
import { S, G, esc } from "./core.js";

const HERO = ["A", "B", "C", "D", "E", "F", "G", "H"];
const HERO_MS = 6000, WHOLE_MS = 3200;
let cfg = null; // { BLOCKS, OUT_2027, OUT_2028 } from site.js
let heroI = 0, lastHero = 0, started = false, anim = 0;

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
function blockBox(b) {
  const bb = G.geo.blocks[b].bbox, pad = 50, W = G.world[2], H = G.world[3], ar = W / H;
  const w = bb[2] - bb[0] + pad * 2, h = bb[3] - bb[1] + pad * 2, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  const side = false; // the card is below the map on every screen, so the block goes in the middle
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
  let price = `<div class="hc-line">Prices change from plot to plot here. Ask us for today's prices.</div>`;
  if (o) {
    const max = o.y28 * 1.04, gain = Math.round(((o.y28 - o.mid) / o.mid) * 100);
    const row = (label, v, cls) => `<div class="hg-row ${cls}"><span>${label}</span><div class="hg-track"><i style="--w:${((v / max) * 100).toFixed(1)}%"></i></div><b class="hg-val" data-to="${v.toFixed(2)}">${f2(v)}</b><small>Cr</small></div>`;
    price = `<div class="hc-growth">${row("Today", o.mid, "now")}${row("Jul 2027", o.y27, "mid")}${row("Dec 2028", o.y28, "end")}</div>
      <div class="hc-fine"><span class="gbadge">+${gain}% by Dec 2028</span> One ${esc(info.size)} plot. July 2027: Block A possession target. Today: market asks ${o.today[1] > o.today[0] ? `${f2(o.today[0])}–${f2(o.today[1])}` : f2(o.today[0])} Cr (Oct 2026). Outlook: our team's view, not a promise.</div>`;
  }
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
  if (animate && !reduce()) {
    card.classList.remove("pop", "barson"); void card.offsetWidth; card.classList.add("pop");
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("barson")));
    card.querySelectorAll(".hg-val").forEach((el, k) => {
      const to = parseFloat(el.dataset.to), t0 = performance.now() + 250 + k * 450;
      const step = (now) => { const t = Math.max(0, Math.min(1, (now - t0) / 1000)), e = 1 - Math.pow(1 - t, 3); el.textContent = f2(to * e); if (t < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  } else card.classList.add("barson");
  box.querySelector(".herodots").innerHTML = heroDots(heroI);
  const bar = box.querySelector(".herobar i");
  if (bar) { bar.style.transition = "none"; bar.style.width = "0%"; void bar.offsetWidth; bar.style.transition = `width ${heroI ? HERO_MS : WHOLE_MS}ms linear`; bar.style.width = "100%"; }
}
export function heroJump(i) { heroI = Math.max(0, Math.min(HERO.length, i)); lastHero = Date.now(); paintHero(true); }

// ---------------------------------------------------------------- the timer
function tick() {
  if (document.hidden || !cfg) return;
  const now = Date.now();
  const hero = document.querySelector(".herotour");
  if (hero && !hero.matches(":hover") && now - lastHero > (heroI ? HERO_MS : WHOLE_MS)) { heroI = (heroI + 1) % (HERO.length + 1); lastHero = now; paintHero(true); }
}
// after each drawing of the page: show the current step at once, then the timer moves on
export function showcaseAfterRender() {
  if (!document.querySelector(".herotour")) return;
  paintHero(false);
  if (!lastHero) lastHero = Date.now();
  if (!started) { started = true; setInterval(tick, 200); }
}
