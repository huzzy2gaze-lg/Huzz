// More website parts, from the review of other developers' websites:
// a guided tour of the blocks on the map, a plot-size comparison, a budget finder, the development timeline,
// nearby places (the admins enter them), questions and answers, sharing on WhatsApp, and the steps of "Book a call".
import { S, G, esc } from "./core.js";
import { SIZES, ACTIVE } from "./geo.js";
import { BLOCKS, blockCard } from "./site.js";
import { MILESTONES, FAQ } from "./content.js";
export { MILESTONES, FAQ };

const ymd = (d) => d.toISOString().slice(0, 10);

// ---------------------------------------------------------------- guided tour of the blocks
const TOUR = ["A", "B", "C", "D", "E", "F", "G", "H"];
const TOUR_MS = 4200;
let tourTimer = null, anim = 0;

function exploreSvg() { return document.querySelector(".explore .bmap"); }
function fullBox() { const W = G.world[2], H = G.world[3]; return [-W * 0.04, -H * 0.04, W * 1.08, H * 1.08]; }
function blockBox(b) {
  const bb = G.geo.blocks[b].bbox, pad = 60;
  const w = bb[2] - bb[0] + pad * 2, h = bb[3] - bb[1] + pad * 2, W = G.world[2], H = G.world[3];
  // keep the shape of the map box, so the block sits in the middle
  const ar = W / H;
  let vw = w, vh = h;
  if (vw / vh < ar) vw = vh * ar; else vh = vw / ar;
  return [(bb[0] + bb[2]) / 2 - vw / 2, (bb[1] + bb[3]) / 2 - vh / 2, vw, vh];
}
function zoomTo(box, ms = 1000) {
  const svg = exploreSvg();
  if (!svg) return;
  cancelAnimationFrame(anim);
  const from = svg.getAttribute("viewBox").split(/\s+/).map(Number), t0 = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const step = (now) => {
    const k = reduce ? 1 : Math.min(1, (now - t0) / ms), e = ease(k);
    svg.setAttribute("viewBox", from.map((v, i) => (v + (box[i] - v) * e).toFixed(1)).join(" "));
    if (k < 1) anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}
function showBlock(b) {
  S.siteFocus = b;
  document.querySelectorAll(".explore .bmblock").forEach((g) => g.classList.toggle("focus", g.dataset.sblock === b));
  const card = document.querySelector(".bside .bcardx");
  if (card) card.outerHTML = blockCard();
  const cap = document.querySelector(".tourcap");
  if (cap) {
    const i = TOUR.indexOf(b);
    cap.innerHTML = `<b>Block ${b}</b><span>${esc(BLOCKS[b].line)}</span><i class="tourbar"><i style="width:${((i + 1) / TOUR.length) * 100}%"></i></i>`;
    cap.hidden = false;
  }
}
export function tourOn() { return !!(S.tour && S.tour.on); }
// after the page is drawn again during the tour: show the same block, without a new zoom
export function resumeTour() {
  if (!tourOn()) return;
  const box = document.querySelector(".explore"), svg = exploreSvg();
  if (!box || !svg) { stopTour(false); return; }
  box.classList.add("touring");
  const b = TOUR[S.tour.i];
  svg.setAttribute("viewBox", blockBox(b).map((v) => v.toFixed(1)).join(" "));
  showBlock(b);
  const btn = document.querySelector("[data-act='tour']");
  if (btn) btn.textContent = "Stop the tour";
}
export function startTour() {
  const box = document.querySelector(".explore");
  if (!box) return;
  stopTour(false);
  S.tour = { on: true, i: 0 };
  box.classList.add("touring");
  const btn = document.querySelector("[data-act='tour']");
  if (btn) btn.textContent = "Stop the tour";
  const go = () => {
    if (!tourOn()) return;
    const b = TOUR[S.tour.i];
    zoomTo(blockBox(b));
    showBlock(b);
    tourTimer = setTimeout(() => {
      if (!tourOn()) return;
      S.tour.i++;
      if (S.tour.i >= TOUR.length) stopTour(true);
      else go();
    }, TOUR_MS);
  };
  go();
}
export function stopTour(zoomOut = true) {
  clearTimeout(tourTimer);
  S.tour = null;
  const box = document.querySelector(".explore");
  if (box) box.classList.remove("touring");
  const cap = document.querySelector(".tourcap");
  if (cap) cap.hidden = true;
  const btn = document.querySelector("[data-act='tour']");
  if (btn) btn.textContent = "▶ Take the 30-second tour";
  if (zoomOut) zoomTo(fullBox(), 900);
}

// ---------------------------------------------------------------- plot sizes to scale
const SIZE_KEYS = ["1K", "14M", "10M"];
const FEET = { "1K": [50, 90], "14M": [40, 80], "10M": [32, 70] };
export function sizesSection() {
  const cur = S.sizePick || "1K";
  const [w, h] = FEET[cur];
  const sc = 3.2, W = 50 * sc + 120, H = 90 * sc + 40, x0 = 60, y0 = H - 20;
  let svg = `<svg class="sizesvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Plot sizes drawn to the same scale: ${SIZE_KEYS.map((k) => SIZES[k].label + " " + SIZES[k].dims).join(", ")}">`;
  for (const k of SIZE_KEYS) {
    const [fw, fh] = FEET[k];
    svg += `<rect class="sz ${k === cur ? "on" : ""}" x="${x0}" y="${y0 - fh * sc}" width="${fw * sc}" height="${fh * sc}"/>`;
  }
  svg += `<text class="szl" x="${x0 + (w * sc) / 2}" y="${y0 + 16}" text-anchor="middle">${w} ft</text><text class="szl" x="${x0 - 10}" y="${y0 - (h * sc) / 2}" text-anchor="end">${h} ft</text>`;
  svg += `<text class="szbig" x="${x0 + (w * sc) / 2}" y="${y0 - (h * sc) / 2}" text-anchor="middle">${SIZES[cur].label}</text></svg>`;
  const sqft = w * h, sqyd = SIZES[cur].sqyd;
  return `<section class="sitesec" id="sizes"><div class="sitewrap two">
    <div><div class="eyebrow">Plot sizes</div><h2>See the size of each plot</h2>
      <p>The three sizes in DHA Margalla Orchard, drawn to the same scale. Choose a size.</p>
      <div class="chiprow">${SIZE_KEYS.map((k) => `<button class="chip2${k === cur ? " on" : ""}" data-sizepick="${k}">${SIZES[k].label}</button>`).join("")}</div>
      <dl class="bfacts big"><div><dt>Size</dt><dd>${w} × ${h} ft</dd></div><div><dt>Area</dt><dd>${sqft.toLocaleString("en-IN")} sq ft</dd></div><div><dt>Square yards</dt><dd>${sqyd}</dd></div></dl>
      <p class="fine">${cur === "1K" ? "The 1 Kanal plot is the largest size, in Blocks A, B, C, D, G and H." : cur === "14M" ? `A 14 Marla plot is about ${Math.round((sqft / 4500) * 100)}% of a 1 Kanal plot. 14 Marla plots are in Blocks A, B, D and H.` : `A 10 Marla plot is about ${Math.round((sqft / 4500) * 100)}% of a 1 Kanal plot. 10 Marla plots are in Block E.`}</p></div>
    <div class="sizebox">${svg}</div></div></section>`;
}

// ---------------------------------------------------------------- budget finder
export function budgetMatches(budget) {
  return Object.entries(BLOCKS).filter(([, b]) => b.price && b.price[0] <= budget).map(([k, b]) => ({ k, ...b }));
}
function budgetList(budget) {
  const m = budgetMatches(budget);
  if (!m.length) return `<div class="empty">No market asks at this budget in October 2026. Book a call: we can look for plots for you.</div>`;
  return m.map((b) => `<div class="bmatch"><b>Block ${b.k}</b><span>${esc(b.size)} · market asks ${b.price[1] > b.price[0] ? `${b.price[0].toFixed(2)}–${b.price[1].toFixed(2)}` : `from ${b.price[0].toFixed(2)}`} Cr</span><button class="sitebtn${S.siteBlocks.has(b.k) ? "" : " solid"}" data-togglesblock="${b.k}">${S.siteBlocks.has(b.k) ? "✓ In my call" : "Add to my call"}</button></div>`).join("");
}
export function budgetSection() {
  const v = S.budget || 4.0;
  return `<section class="sitesec alt" id="budget"><div class="sitewrap two">
    <div><div class="eyebrow">Budget finder</div><h2>What can I buy for my budget?</h2>
      <p>Move the slider to your budget for one plot. You see the blocks where the market asked that price or less in October 2026.</p>
      <input type="range" id="budgetRange" min="2.5" max="5" step="0.05" value="${v}" aria-label="Budget in crore">
      <div class="budgetv"><b id="budgetV">${v.toFixed(2)}</b> crore</div></div>
    <div class="bmatches" id="budgetList">${budgetList(v)}</div></div></section>`;
}
export function updateBudgetDom() {
  const v = S.budget || 4.0, l = document.getElementById("budgetList"), t = document.getElementById("budgetV");
  if (l) l.innerHTML = budgetList(v);
  if (t) t.textContent = v.toFixed(2);
}

// ---------------------------------------------------------------- development timeline
export function timelineSection() {
  const now = new Date(), t0 = Date.parse(MILESTONES[0][0]), t1 = Date.parse(MILESTONES[MILESTONES.length - 1][0]);
  const pos = (d) => Math.max(0, Math.min(100, ((Date.parse(d) - t0) / (t1 - t0)) * 100));
  const today = pos(ymd(now));
  const days = Math.max(0, Math.ceil((new Date(2027, 6, 1) - now) / 86400000));
  return `<section class="sitesec" id="progress"><div class="sitewrap">
    <div class="sechead"><div class="eyebrow">Progress</div><h2>From development to possession</h2></div>
    <div class="tline"><div class="trail"><i class="tfill grow" style="--w:${today}%"></i><span class="tnow" style="left:${today}%">Today</span></div>
      ${MILESTONES.map(([d, t, s], i) => `<div class="tm ${Date.parse(d) <= now ? "done" : ""}" style="left:${pos(d)}%"><i></i><b>${new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}</b><span>${t}</span><small>${s}</small></div>`).join("")}</div>
    <div class="cdown"><b class="countup" data-to="${days}">${days}</b><span>days to the Block A possession target</span></div>
    <p class="fine">Source: FGEHA and DHA Islamabad announcements. Dates are targets set by the authority.</p></div></section>`;
}

// ---------------------------------------------------------------- nearby places (the admins enter them)
export function nearbySection() {
  const lines = (S.site.nearby || "").split(/\r?\n/).map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0]);
  if (!lines.length) return "";
  return `<section class="sitesec" id="nearby"><div class="sitewrap two">
    <div><div class="eyebrow">Location</div><h2>Close to what matters</h2><p>Main Park Road, Chak Shahzad, Islamabad, opposite COMSATS University.</p></div>
    <ul class="nearby">${lines.map(([p, t], i) => `<li class="reveal" style="--i:${i}"><span>${esc(p)}</span>${t ? `<b>${esc(t)}</b>` : ""}</li>`).join("")}</ul></div></section>`;
}

// ---------------------------------------------------------------- questions and answers
export function faqSection() {
  return `<section class="sitesec alt" id="faq"><div class="sitewrap narrow2">
    <div class="sechead"><div class="eyebrow">Questions</div><h2>What buyers ask us</h2></div>
    <div class="faq">${FAQ.map(([q, a], i) => `<details${i === 0 ? " open" : ""}><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></div></section>`;
}

// ---------------------------------------------------------------- sharing on WhatsApp
export function shareLink(text) {
  const url = location.href.split("#")[0];
  return `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
}

// ---------------------------------------------------------------- the steps of "Book a call"
export const GOALS = [["live", "To build and live"], ["invest", "To invest"], ["both", "Both"]];
export const BUDGETS = [["u3", "Up to 3 crore"], ["3-4", "3 to 4 crore"], ["4-5", "4 to 5 crore"], ["5+", "Above 5 crore"]];
export const WANT_SIZES = [["1 Kanal", "1 Kanal"], ["14 Marla", "14 Marla"], ["10 Marla", "10 Marla"], ["", "Not sure"]];
export function bookSummary() {
  const b = S.bookAns || {};
  const parts = [];
  if (b.goal) parts.push("Goal: " + GOALS.find((g) => g[0] === b.goal)[1]);
  if (b.budget) parts.push("Budget: " + BUDGETS.find((g) => g[0] === b.budget)[1]);
  if (b.size) parts.push("Size: " + b.size);
  return parts.join(" · ");
}
export const ALL_BLOCKS = ACTIVE;
