// The home page of the public website: "Daylight Survey". The official FGEHA layout plan is shown as a survey sheet on
// the first screen, then the blocks with prices and the team's outlook, next door, the home on a plot, the timeline,
// how buying works, questions and the real booking form. Light page; the 3D plan has its own page (#3d).
// Every fact comes from content.js and outlookFor() (showcase.js). Nothing here moves or invents a block or a plot.
import { S, esc } from "./core.js";
import { BLOCKS, MILESTONES, FAQ, STEPS, SCHEME, NEXT_DOOR } from "./content.js";
import { SIZES, ACTIVE } from "./geo.js";
import { outlookFor } from "./showcase.js";

// the place of each block letter on the plan picture (percent), from the block labels in plotdata.json
const POS = { A: [22.4, 31.5], B: [43.4, 70.9], C: [36.6, 45.6], D: [68.3, 60.4], E: [53.9, 47.9], F: [87.2, 65.1], G: [35.9, 90.5], H: [79.8, 75.6] };
const TOP3 = ["A", "B", "C"];
const TAGS = { A: "First block for possession", B: "Core of the scheme", C: "All 1 Kanal" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NAV = [["dsv-plan", "The plan"], ["dsv-blocks", "Blocks and prices"], ["dsv-home", "Plot to home"], ["dsv-buy", "How to buy"], ["dsv-faq", "Questions"]];
const RSIZES = [["1K", "1 Kanal"], ["14M", "14 Marla"], ["10M", "10 Marla"]];
const RSTYLES = [["white", "White"], ["brick", "Brick"], ["dark", "Dark"]];
const RMOODS = [["day", "Day"], ["dusk", "Dusk"], ["night", "Night"]];

// what the visitor chose on this page (kept when the page is drawn again)
let sel = null; // the block in focus
const pick = { size: "1K", style: "brick", mood: "day" };
let played = false; // the survey sweep plays once per visit

const r2 = (v) => (Math.round(v * 100 + 1e-6) / 100).toFixed(2);
const monthUTC = (iso) => { const d = new Date(iso + "T00:00:00Z"); return MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); };
const range = (p) => (p[0] === p[1] ? `about ${r2(p[0])}` : `${r2(p[0])}–${r2(p[1])}`);
const reduce = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- icons (one stroke, one weight)
const I = {
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 4h3.5l1.8 4.4-2.3 1.5a11 11 0 0 0 6.1 6.1l1.5-2.3L20 15.5V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.8L4 20Z"/><path d="M9 9.5c.3 1.9 1.6 3.8 4.4 5 .6.2 1.3-.3 1.6-1l-1.6-.9-.7.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.7-.9-1.6c-.7.3-1.3 1-1.3 1.7Z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  rise: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/></svg>`,
  compass: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="16" cy="16" r="13"/><path d="M16 1v30M1 16h30" stroke-width=".8"/><path d="M16 5l3 11h-6z" fill="currentColor" stroke="none"/></svg>`,
  cube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/></svg>`,
};

// ---------------------------------------------------------------- parts
function header(c) {
  return `<header class="dsv-top" id="dsv-top"><div class="dsv-wrap">
    <a class="dsv-brand" href="#home" data-dscroll="top" aria-label="${esc(c.company())}, to the top of the page">${c.logo()}<b>${esc(c.company())}</b></a>
    <nav class="dsv-nav" aria-label="On this page">${NAV.map(([id, l]) => `<a href="#${id}" data-dscroll="${id}">${l}</a>`).join("")}</nav>
    <div class="dsv-topright">
      ${c.phone ? `<a class="dsv-toptel" href="${c.tel}">${I.phone}<span>${esc(c.phone)}</span></a>` : ""}
      ${S.me ? `<button class="dsv-btn line sm" data-act="toApp">Sales system</button>` : ""}
      <a class="dsv-btn rose sm" href="#book">Book a call</a>
    </div></div></header>`;
}

function blockNote(k) {
  const b = BLOCKS[k];
  const price = b.price ? `<p class="dsv-np">${esc(b.size)} asking price, October 2026<b>${range(b.price)} crore</b></p>` : `<p class="dsv-np">Asking price<b>Price on request</b></p>`;
  return `<button type="button" class="dsv-note-x" data-dnoteclose aria-label="Close the facts of Block ${k}">${I.close}</button>
    <h3>Block ${k}</h3><p class="dsv-nmeta">About ${b.plots.toLocaleString("en-US")} plots · ${esc(b.sizes)}</p>
    <p class="dsv-nline">${esc(b.line)}</p>${price}
    <a class="dsv-btn ink" href="#plan" data-planblock="${k}">See the plot numbers of Block ${k}</a>`;
}

function hero(c) {
  const asks = TOP3.map(outlookFor).filter(Boolean).flatMap((o) => o.today);
  const lo = Math.min(...asks), hi = Math.max(...asks);
  const sizes = ["1K", "14M", "10M"].map((k) => `<b>${SIZES[k].label}</b> <span>(${SIZES[k].dims})</span>`);
  const pins = ACTIVE.map((k, i) => `<button type="button" class="dsv-pin" style="left:${POS[k][0]}%;top:${POS[k][1]}%;--i:${i}" data-dblock="${k}" aria-pressed="false" aria-label="Block ${k}, about ${BLOCKS[k].plots.toLocaleString("en-US")} plots">${k}</button>`).join("");
  const btns = ACTIVE.map((k) => `<button type="button" class="dsv-bbtn" data-dblock="${k}" aria-pressed="false"><b><span class="dsv-sr">Block </span>${k}</b><i aria-hidden="true"> · </i><span>${BLOCKS[k].plots.toLocaleString("en-US")} plots</span></button>`).join("");
  return `<section class="dsv-hero" id="dsv-plan" aria-labelledby="dsv-h1" tabindex="-1"><div class="dsv-wrap dsv-hero-grid">
    <div class="dsv-hero-copy">
      <h1 id="dsv-h1">Plots in <em>DHA Margalla Orchard</em>, Islamabad.</h1>
      <p class="dsv-lede">We help you choose, buy and transfer your plot. See every block on the official plan.</p>
      <div class="dsv-price">
        <span class="dsv-price-k">1 Kanal asking price, Blocks A to C</span>
        <span class="dsv-price-v">${r2(lo)}–${r2(hi)}<small>crore</small></span>
        <span class="dsv-price-s">Asking prices in the market, October 2026.</span>
      </div>
      <p class="dsv-sizes">Plot sizes: ${sizes.join(", ")}.</p>
      <p class="dsv-hours">We answer ${esc(c.set("hours"))}.</p>
      <div class="dsv-cta">
        <a class="dsv-btn rose" href="#book">Book a call</a>
        ${c.wa ? `<a class="dsv-btn wa" href="${c.wa}" target="_blank" rel="noopener">${I.wa}WhatsApp</a>` : ""}
        ${c.phone ? `<a class="dsv-btn quiet" href="${c.tel}">${I.phone}Call</a>` : ""}
      </div>
      <a class="dsv-3dlink" href="#3d">${I.cube}<span>See the plan in 3D</span>${I.arrow}</a>
    </div>
    <figure class="dsv-sheet" id="dsv-sheet">
      <span class="dsv-sheet-frame" aria-hidden="true"></span>
      <figcaption class="dsv-sheet-head"><b>Official FGEHA layout plan</b><span>DHA Margalla Orchard · Blocks A to H</span></figcaption>
      <div class="dsv-plan-area">
        <div class="dsv-plan">
          <img src="plan-hero.webp" srcset="plan-hero-760.webp 760w, plan-hero.webp 1200w" sizes="(max-width: 980px) calc(100vw - 40px), 54vw" width="1200" height="982" fetchpriority="high" decoding="async" alt="The official FGEHA layout plan of DHA Margalla Orchard, with Blocks A to H, roads, parks and commercial areas.">
          <span class="dsv-veil" aria-hidden="true"></span><span class="dsv-sweep" aria-hidden="true"></span>
          ${pins}
        </div>
        <div class="dsv-note" id="dsv-note" aria-live="polite" hidden></div>
      </div>
      <div class="dsv-blockbar" role="group" aria-label="Choose a block">${btns}</div>
      <div class="dsv-sheet-foot">${I.compass}<span>Shown as FGEHA issued the sheet. Tap a block to see its facts.</span><a class="dsv-link" href="#plan">Find a plot number</a></div>
    </figure>
  </div></section>`;
}

function scheme() {
  return `<section class="dsv-band dsv-scheme" aria-labelledby="dsv-h-scheme"><div class="dsv-wrap dsv-split">
    <div><h2 id="dsv-h-scheme">An FGEHA scheme. DHA Islamabad builds it.</h2>
      <p class="dsv-lead">FGEHA owns DHA Margalla Orchard. DHA Islamabad does the development under the agreement of September 2025. The scheme is on ${esc(SCHEME.where)}.</p></div>
    <div class="dsv-titleblock">
      <div class="tb c2 h"><span class="dsv-k">Plots</span><span class="v">${SCHEME.plots.toLocaleString("en-US")}</span></div>
      <div class="tb c2 h e2"><span class="dsv-k">Area</span><span class="v">${SCHEME.kanals.toLocaleString("en-US")} <small>kanals</small></span></div>
      <div class="tb c2 e"><span class="dsv-k">Blocks</span><span class="v">${SCHEME.blocks} <small>A to H</small></span></div>
      <div class="tb c3 h"><span class="dsv-k">Owner</span><span class="v sm">FGEHA</span></div>
      <div class="tb c3 h e e2"><span class="dsv-k">Developer</span><span class="v sm">DHA Islamabad</span></div>
      <div class="tb c6 e last"><span class="dsv-k">Development done</span><span class="v">${SCHEME.devDone}%</span>
        <span class="dsv-progress" role="img" aria-label="${SCHEME.devDone} percent of the development is done"><i style="width:${SCHEME.devDone}%"></i></span>
        <span class="src">Source: ${esc(SCHEME.devSource)}.</span></div>
    </div></div></section>`;
}

function entry(k) {
  const b = BLOCKS[k], o = outlookFor(k);
  const vals = [["Today", o.mid, "now"], ["Jul 2027", o.y27, ""], ["Dec 2028", o.y28, ""]];
  const max = o.y28 * 1.04, gain = Math.round(((o.y28 - o.mid) / o.mid) * 100);
  return `<article class="dsv-entry" aria-labelledby="dsv-e-${k}">
    <div class="dsv-letter"><b aria-hidden="true">${k}</b><span><strong id="dsv-e-${k}">Block ${k}</strong>${TAGS[k]}</span></div>
    <p class="dsv-eline">${esc(b.line)}</p>
    <dl class="dsv-facts"><div><dt>Plots</dt><dd>about ${b.plots.toLocaleString("en-US")}</dd></div><div><dt>Sizes</dt><dd>${esc(b.sizes)}</dd></div></dl>
    <div class="dsv-ask"><span class="dsv-k">${esc(b.size)} asking price, October 2026</span><span class="v">${range(o.today)} <small>crore</small></span></div>
    <div class="dsv-outlook">
      <span class="dsv-k">Outlook for one ${esc(b.size)} plot, crore</span>
      <div class="dsv-bars">${vals.map(([l, v, cls]) => `<div class="dsv-bar ${cls}"><span class="t">${l}</span><span class="track"><i style="width:${((v / max) * 100).toFixed(1)}%"></i></span><span class="val">${r2(v)}</span></div>`).join("")}</div>
      <div class="dsv-outnote"><span class="dsv-badge">${I.rise}Up to +${gain}% by Dec 2028</span><span>Outlook: our team's view, not a promise.</span></div>
    </div>
    <a class="dsv-btn line" href="#plan" data-planblock="${k}">See the plot numbers of Block ${k}</a>
  </article>`;
}

function others() {
  const rest = ACTIVE.filter((k) => !TOP3.includes(k));
  const ask = (b) => (b.price ? `${range(b.price)} crore <small>(${esc(b.size)})</small>` : `<a class="dsv-link" href="#book">Price on request</a>`);
  return `<div class="dsv-others"><h3>Blocks D to H</h3>
    <table class="dsv-table"><thead><tr><th scope="col">Block</th><th scope="col">Plots</th><th scope="col">Sizes</th><th scope="col">Asking price, Oct 2026</th><th scope="col">About the block</th></tr></thead>
    <tbody>${rest.map((k) => { const b = BLOCKS[k]; return `<tr><th scope="row"><a class="dsv-tblock" href="#plan" data-planblock="${k}" aria-label="Block ${k}: see the plot numbers">${k}</a></th><td data-k="Plots">about ${b.plots.toLocaleString("en-US")}</td><td data-k="Sizes">${esc(b.sizes)}</td><td data-k="Asking price">${ask(b)}</td><td class="line">${esc(b.line)}</td></tr>`; }).join("")}</tbody></table></div>`;
}

function blocks() {
  return `<section class="dsv-band" id="dsv-blocks" aria-labelledby="dsv-h-blocks" tabindex="-1"><div class="dsv-wrap">
    <h2 id="dsv-h-blocks">Blocks A, B and C: prices and outlook</h2>
    <p class="dsv-lead">Asking prices for 1 Kanal, October 2026. The outlook shows what our team expects for each block. "Today" is the middle of the asking range.</p>
    <div class="dsv-ledger">${TOP3.filter((k) => outlookFor(k)).map(entry).join("")}</div>
    ${others()}
  </div></section>`;
}

function nextDoor() {
  const en = NEXT_DOOR.enclave, first = en[0], last = en[en.length - 1];
  const rise = Math.round((last[1] / first[1] - 1) * 100);
  const d0 = new Date(first[0] + "T00:00:00Z"), d1 = new Date(last[0] + "T00:00:00Z");
  const months = (d1.getUTCFullYear() - d0.getUTCFullYear()) * 12 + d1.getUTCMonth() - d0.getUTCMonth();
  const max = last[1];
  const row = (who, when, v, us) => `<div class="dsv-crow${us ? " us" : ""}"><div class="dsv-who"><b>${who}</b>${when}</div><div class="cbar"><i style="width:${((v / max) * 78).toFixed(1)}%"></i><span>${r2(v)}</span></div></div>`;
  return `<section class="dsv-band" aria-labelledby="dsv-h-next"><div class="dsv-wrap dsv-split mid">
    <div><h2 id="dsv-h-next">DHA's price for 1&nbsp;Kanal next door rose ${rise}% in ${months} months</h2>
      <p class="dsv-lead">DHA Margalla Enclave is next door. DHA publishes its prices. A 1 Kanal plot in DHA Margalla Orchard costs much less today.</p></div>
    <div class="dsv-chart">
      <div class="dsv-chart-t"><span>1 Kanal price, crore</span><span>Bar length to scale</span></div>
      ${en.map(([d, v]) => row("Margalla Enclave", monthUTC(d), v, false)).join("")}
      ${row("Margalla Orchard", "Today, average asking", NEXT_DOOR.orchard, true)}
      <p class="dsv-gap">The gap is the opportunity.</p>
      <p class="src">Margalla Enclave: DHA's published prices. Margalla Orchard: average asking price, October 2026.</p>
    </div></div></section>`;
}

function duskBand() {
  return `<section class="dsv-dusk" aria-labelledby="dsv-h-dusk">
    <div class="dsv-dusk-media"><img src="renders/dusk-cam_hero.webp" width="1600" height="900" loading="lazy" decoding="async" alt="">
      <video id="dsv-vdusk" muted playsinline loop preload="none" aria-hidden="true" data-dsrc="renders/home-dusk.mp4"></video></div>
    <div class="dsv-wrap dsv-dusk-copy">
      <h2 id="dsv-h-dusk">First the plot.<br>Then the home.</h2>
      <p>Choose your plot on the official plan. Then see the home that you can build on it.</p>
      <div class="dsv-dusk-row"><button type="button" class="dsv-btn onphoto" data-dplay="dsv-vdusk">${I.play}<span>Play the film</span></button>
      <span class="dsv-cap">Rendered illustration, not a DHA or FGEHA design.</span></div>
    </div></section>`;
}

function plotToHome() {
  const chip = (k, v, l) => `<button type="button" class="dsv-chip" data-dk="${k}" data-dv="${v}" aria-pressed="${pick[k] === v}">${l}</button>`;
  return `<section class="dsv-band" id="dsv-home" aria-labelledby="dsv-h-home" tabindex="-1"><div class="dsv-wrap">
    <h2 id="dsv-h-home">From plot to home</h2>
    <p class="dsv-lead">See how a house can stand on a 1 Kanal, 14 Marla or 10 Marla plot. Watch the build, then choose the size, the style and the time of day.</p>
    <div class="dsv-homegrid">
      <div><div class="dsv-frame">
          <video id="dsv-vbuild" muted playsinline preload="none" poster="renders/build-poster.webp" src="renders/home-build.mp4" aria-label="Rendered film: a house is built on a 1 Kanal plot, step by step."></video>
          <button type="button" class="dsv-btn onphoto" data-dplay="dsv-vbuild">${I.play}<span>Play the build</span></button></div>
        <p class="dsv-cap">Rendered film. Not a DHA or FGEHA design; a real design must follow the building bylaws.</p></div>
      <div><div class="dsv-frame"><img id="dsv-render" src="${renderSrc()}" width="1280" height="720" loading="lazy" decoding="async" alt="${renderAlt()}"></div>
        <div class="dsv-picker">
          <div class="row" role="group" aria-label="Plot size"><span class="dsv-k">Size</span>${RSIZES.map(([v, l]) => chip("size", v, l)).join("")}</div>
          <div class="row" role="group" aria-label="House style"><span class="dsv-k">Style</span>${RSTYLES.map(([v, l]) => chip("style", v, l)).join("")}</div>
          <div class="row" role="group" aria-label="Time of day"><span class="dsv-k">Light</span>${RMOODS.map(([v, l]) => chip("mood", v, l)).join("")}</div>
        </div>
        <p class="dsv-cap">Rendered illustration, not a DHA or FGEHA design.</p></div>
    </div></div></section>`;
}
function renderSrc() { return pick.size === "1K" && pick.style === "white" ? `renders/${pick.mood}-cam_hero.webp` : `renders/${pick.size}-${pick.style}-${pick.mood}.webp`; }
function renderAlt() { const s = RSIZES.find((x) => x[0] === pick.size)[1]; return `Rendered house on a ${s} plot, ${pick.style} style, ${pick.mood === "day" ? "in daylight" : "at " + pick.mood}.`; }

function timeline() {
  const now = Date.now();
  const past = MILESTONES.filter(([d]) => Date.parse(d + "T00:00:00Z") <= now), next = MILESTONES.filter(([d]) => Date.parse(d + "T00:00:00Z") > now);
  const item = ([d, t, s], ahead) => `<li class="dsv-ms${ahead ? " ahead" : ""}"><time datetime="${d}">${monthUTC(d)}</time><h3>${esc(t)}</h3><p>${esc(s)}</p><span class="state">${ahead ? "Target date" : "Done"}</span></li>`;
  const today = new Date(now);
  const marker = `<li class="dsv-today" aria-label="Today, ${MONTHS[today.getUTCMonth()]} ${today.getUTCFullYear()}"><span>Today</span></li>`;
  const cols = [...past.map(() => "minmax(0,1fr)"), "auto", ...next.map(() => "minmax(0,1fr)")].join(" ");
  return `<section class="dsv-band" aria-labelledby="dsv-h-time"><div class="dsv-wrap">
    <h2 id="dsv-h-time">Progress, step by step</h2>
    <ol class="dsv-tl" style="--cols:${cols}">${past.map((m) => item(m, false)).join("")}${marker}${next.map((m) => item(m, true)).join("")}</ol>
    <p class="dsv-cap">Dates in the future are targets set by the authority.</p>
  </div></section>`;
}

function steps() {
  return `<section class="dsv-band" id="dsv-buy" aria-labelledby="dsv-h-steps" tabindex="-1"><div class="dsv-wrap dsv-split wide">
    <div><h2 id="dsv-h-steps">How you buy a plot with us</h2>
      <p class="dsv-lead">Five steps, from the first call to your allotment letter. We stay with you to the transfer.</p>
      <a class="dsv-btn rose" href="#book">Book a call</a></div>
    <ol class="dsv-route">${STEPS.map(([t, d], i) => `<li><span class="n">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join("")}</ol>
  </div></section>`;
}

function faq() {
  return `<section class="dsv-band" id="dsv-faq" aria-labelledby="dsv-h-faq" tabindex="-1"><div class="dsv-wrap dsv-split wide">
    <div><h2 id="dsv-h-faq">Questions</h2><p class="dsv-lead">Ask us anything else on WhatsApp or by phone.</p></div>
    <div class="dsv-faq">${FAQ.map(([q, a]) => `<details><summary>${esc(q)}${I.plus}</summary><p>${esc(a)}</p></details>`).join("")}</div>
  </div></section>`;
}

function footer(c) {
  const right = S.me ? `<button class="dsv-flink" data-act="toApp">Sales system</button>` : S.user ? `<a href="#account">My account</a>` : c.signin ? `<a href="#signin">Sign in</a>` : "";
  return `<footer class="dsv-foot"><div class="dsv-wrap">
    <div><a class="dsv-brand" href="#home" data-dscroll="top">${c.logo()}<b>${esc(c.company())}</b></a>
      <p class="dsv-legal">WH Ventures (Private) Limited<br>${esc(c.set("address"))}</p>
      <ul class="dsv-flinks">
        ${c.phone ? `<li><a href="${c.tel}">${esc(c.phone)}</a></li>` : ""}
        ${c.wa ? `<li><a href="${c.wa}" target="_blank" rel="noopener">WhatsApp</a></li>` : ""}
        ${c.set("email") ? `<li><a href="mailto:${esc(c.set("email"))}">${esc(c.set("email"))}</a></li>` : ""}
        <li><a href="/privacy">Privacy policy</a></li>
        <li><a href="#3d">The plan in 3D</a></li>
        ${right ? `<li>${right}</li>` : ""}
      </ul></div>
    <p class="dsv-srcnote">Scheme facts: FGEHA, October 2026. Prices: asking prices in October 2026 and DHA's published Margalla Enclave prices. The outlook is our team's view, not a promise: prices can go up or down. The map is the official FGEHA layout plan.</p>
  </div></footer>`;
}

// c: { set, waLink, telHref, company, logo, bookSection, signin }
export function homePage(c) {
  const phone = c.set("phone");
  const x = { ...c, phone, tel: phone ? c.telHref(phone) : "", wa: c.waLink() };
  return `<div class="dsv" id="dsv">
    <a class="dsv-skip" href="#dsv-main" data-dscroll="dsv-main">Skip to the content</a>
    ${header(x)}
    <main id="dsv-main" tabindex="-1">
      ${hero(x)}${scheme()}${blocks()}${nextDoor()}${duskBand()}${plotToHome()}${timeline()}${steps()}${faq()}
      <div class="dsv-bookband" id="book">${c.bookSection()}</div>
    </main>
    ${footer(x)}
  </div>`;
}

// ---------------------------------------------------------------- after drawing: the choices, the films, the clicks
function showBlock(k, from) {
  const note = document.getElementById("dsv-note");
  if (!note) return;
  sel = k;
  document.querySelectorAll(".dsv [data-dblock]").forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.dblock === k)));
  if (!k) { note.hidden = true; note.innerHTML = ""; return; }
  note.innerHTML = blockNote(k);
  note.classList.toggle("at-right", POS[k][0] < 50);
  note.hidden = false;
  if (from && matchMedia("(max-width: 980px)").matches) note.scrollIntoView({ block: "nearest", behavior: reduce() ? "auto" : "smooth" });
}
function applyPick() {
  document.querySelectorAll(".dsv [data-dk]").forEach((el) => el.setAttribute("aria-pressed", String(pick[el.dataset.dk] === el.dataset.dv)));
  const img = document.getElementById("dsv-render");
  if (!img) return;
  const src = renderSrc();
  if (img.getAttribute("src") === src) return;
  img.alt = renderAlt();
  const pre = new Image();
  img.classList.add("swap");
  pre.onload = pre.onerror = () => { img.src = src; img.classList.remove("swap"); };
  pre.src = src;
}
function playToggle(btn) {
  const v = document.getElementById(btn.dataset.dplay);
  if (!v) return;
  if (v.dataset.dsrc && !v.getAttribute("src")) { v.src = v.dataset.dsrc; }
  if (v.paused) { v.play().catch(() => {}); } else v.pause();
}
function syncPlay(v) {
  const btn = document.querySelector(`.dsv [data-dplay="${v.id}"]`);
  if (!btn) return;
  const on = !v.paused;
  btn.innerHTML = (on ? I.pause : I.play) + `<span>${on ? "Pause" : v.id === "dsv-vbuild" ? "Play the build" : "Play the film"}</span>`;
  v.closest(".dsv-dusk")?.classList.toggle("playing", on);
}
function scrollToId(id) {
  if (id === "top") { scrollTo({ top: 0, behavior: reduce() ? "auto" : "smooth" }); return; }
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reduce() ? "auto" : "smooth", block: "start" });
  if (el.hasAttribute("tabindex")) el.focus({ preventScroll: true });
}

let bound = false, vio = null;
export function homeAfterRender() {
  const root = document.querySelector(".dsv");
  if (!root) { if (vio) { vio.disconnect(); vio = null; } return; }
  // the one authored moment: the sheet is surveyed in, once per visit (the plan is painted under the veil from the start)
  if (!played) { played = true; if (!reduce()) document.getElementById("dsv-sheet")?.classList.add("dsv-anim"); }
  if (sel) showBlock(sel);
  applyPick();
  // the films: the dusk film starts only when it is in view (never on a phone that saves data or with reduced motion)
  if (vio) vio.disconnect();
  const dusk = document.getElementById("dsv-vdusk");
  const saveData = navigator.connection && navigator.connection.saveData;
  if (dusk && "IntersectionObserver" in window && !reduce() && !saveData) {
    vio = new IntersectionObserver((es) => es.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting) { if (!v.getAttribute("src")) v.src = v.dataset.dsrc; v.play().catch(() => {}); } else if (!v.paused) v.pause();
    }), { threshold: 0.35 });
    vio.observe(dusk);
  }
  root.querySelectorAll("video").forEach((v) => { if (!v.dataset.bound) { v.dataset.bound = 1; ["play", "pause", "ended"].forEach((t) => v.addEventListener(t, () => syncPlay(v))); } });
  const top = document.getElementById("dsv-top");
  if (top) top.classList.toggle("scrolled", scrollY > 8);
  if (bound) return;
  bound = true;
  addEventListener("scroll", () => document.getElementById("dsv-top")?.classList.toggle("scrolled", scrollY > 8), { passive: true });
  document.addEventListener("click", (e) => {
    if (!e.target.closest || !e.target.closest(".dsv")) return;
    const sc = e.target.closest("[data-dscroll]");
    if (sc) { e.preventDefault(); scrollToId(sc.dataset.dscroll); return; }
    const b = e.target.closest("[data-dblock]");
    if (b) { const k = b.dataset.dblock; showBlock(sel === k && b.getAttribute("aria-pressed") === "true" ? null : k, true); return; }
    if (e.target.closest("[data-dnoteclose]")) { const k = sel; showBlock(null); document.querySelector(`.dsv .dsv-bbtn[data-dblock="${k}"]`)?.focus(); return; }
    const ch = e.target.closest("[data-dk]");
    if (ch) { pick[ch.dataset.dk] = ch.dataset.dv; applyPick(); return; }
    const pl = e.target.closest("[data-dplay]");
    if (pl) playToggle(pl);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sel && document.querySelector(".dsv")) { const k = sel; showBlock(null); document.querySelector(`.dsv .dsv-bbtn[data-dblock="${k}"]`)?.focus(); } });
}
