// The public website of WH Ventures. Its job: turn a visitor from an ad into a booked call.
// It shows the whole master plan and the blocks, never our stock or our clients.
// Market figures: asking prices of late October 2026 and DHA's own Margalla Enclave prices, as in the
// client offer. The outlook is the team's view, shown with a clear note that it is not a promise.
import { S, G, esc } from "./core.js";
import { SIZES, ACTIVE } from "./geo.js";
import { mapSVG } from "./map.js";
import { sizesSection, budgetSection, timelineSection, nearbySection, faqSection, shareLink, GOALS, BUDGETS, WANT_SIZES, bookSummary } from "./site-extras.js";

export const SITE_PAGES = ["home", "plan", "contact", "account", "signin", "book", "blocks", "outlook"];
const set = (k) => (S.site[k] || "").trim();
const company = () => set("company") || "WH Ventures";
const ptsStr = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

// what we say about each block: only facts from FGEHA, the plan and the market, written to help a buyer choose
export const BLOCKS = {
  A: { plots: 906, sizes: "1 Kanal · 14 Marla", line: "The first block for possession, target July 2027. Next to the Margalla Orchards Walk commercial area, near the main entrance.", price: [3.65, 4.0], size: "1 Kanal" },
  B: { plots: 737, sizes: "1 Kanal · 14 Marla", line: "Numbered 1 Kanal and 14 Marla plots in the core of the scheme.", price: [3.75, 4.55], size: "1 Kanal" },
  C: { plots: 467, sizes: "1 Kanal", line: "The premium 1 Kanal block, with wide roads and firm natural ground.", price: [3.85, 4.5], size: "1 Kanal" },
  D: { plots: 373, sizes: "14 Marla · 1 Kanal", line: "At the centre of the scheme, with 14 Marla and 1 Kanal plots.", price: null },
  E: { plots: 1128, sizes: "10 Marla", line: "The largest block. 10 Marla plots (32 × 70 ft): the most affordable way into DHA Margalla Orchard.", price: [2.6, 2.8], size: "10 Marla" },
  F: { plots: 228, sizes: "As on the plan", line: "A smaller block on the official master plan. Ask us about plots here.", price: null },
  G: { plots: 538, sizes: "1 Kanal", line: "A 1 Kanal block on higher ground with Margalla views. The best-value 1 Kanal in the scheme today.", price: [3.3, 3.3], size: "1 Kanal" },
  H: { plots: 167, sizes: "14 Marla · 1 Kanal", line: "A compact block with 14 Marla and 1 Kanal plots. Ask us about plots here.", price: null },
};
// the team's outlook (client offer, Nov 2026): 1 Kanal asks about 3.8 Cr today; DHA sells the same size in
// Margalla Enclave for 7.29 Cr. Outlook: about 85% of that by July 2027 (6.2), level by the end of 2028 (7.3).
// Careful case: about 9% a year, as in the last 12 months.
const TODAY_1K = 3.8, ENCLAVE_1K = 7.29;
const OUT_2027 = 6.2 / TODAY_1K, OUT_2028 = 7.3 / TODAY_1K, CAREFUL = 0.09;

function header() {
  const p = S.sitePage;
  const link = (k, l) => `<a href="#${k}" class="${p === k ? "on" : ""}">${l}</a>`;
  const right = S.me ? `<button class="sitebtn" data-act="toApp">Sales system</button>`
    : S.user ? `<a href="#account" class="sitebtn">My account</a>` : `<a href="#signin" class="sitebtn ghost">Sign in</a>`;
  return `<header class="sitehead"><div class="sitewrap"><a href="#home" class="wordmark">${esc(company())}</a>
    <nav class="sitenav" aria-label="Website">${link("home", "Home")}${link("blocks", "Blocks")}${link("outlook", "Outlook")}${link("plan", "Master plan")}</nav>
    <div class="siteright">${right}<a href="#book" class="sitebtn solid">Book a call</a></div></div></header>`;
}

function footer() {
  const bits = [set("phone") && `Phone ${esc(set("phone"))}`, set("whatsapp") && `WhatsApp ${esc(set("whatsapp"))}`, set("email") && esc(set("email")), set("address") && esc(set("address"))].filter(Boolean);
  return `<footer class="sitefoot"><div class="sitewrap"><div><b class="wordmark sm">${esc(company())}</b><p>${bits.length ? bits.join(" · ") : "Plots in DHA Margalla Orchard, Islamabad."}</p>
    <p><a href="#book">Book a call</a> · <a href="#signin">Join our investor list</a> · <a href="#plan">Master plan</a></p></div>
    <p class="fine">Scheme facts: FGEHA, October 2026. Prices: asking prices in October 2026 and DHA's published Margalla Enclave prices. The outlook is our team's view, not a promise: prices can go up or down. The map is the official FGEHA layout plan.</p></div></footer>`;
}

function waLink(msg) {
  const n = set("whatsapp").replace(/[^0-9]/g, "");
  if (!n) return "";
  const intl = n.startsWith("0") ? "92" + n.slice(1) : n;
  return `https://wa.me/${intl}?text=${encodeURIComponent("Hello " + company() + ", " + (msg || "I want to know about plots in DHA Margalla Orchard."))}`;
}

// ---------------------------------------------------------------- the block map (8 blocks on the plan)
function blockMap(animated) {
  const geo = G.geo, W = G.world[2], H = G.world[3];
  const hulls = ACTIVE.map((b) => ({ b, polys: geo.blocks[b].hull, label: geo.blocks[b].label }));
  const all = hulls.flatMap((h) => h.polys).map((p) => `<polygon points="${ptsStr(p)}"/>`).join("");
  let s = `<svg class="bmap${animated ? " drawin" : ""}" viewBox="${(-W * 0.04).toFixed(0)} ${(-H * 0.04).toFixed(0)} ${(W * 1.08).toFixed(0)} ${(H * 1.08).toFixed(0)}" role="img" aria-label="The eight blocks of DHA Margalla Orchard on the official plan">
    <defs><clipPath id="bm-clip">${all}</clipPath></defs>
    <image href="plan.webp" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none" clip-path="url(#bm-clip)" class="bmplan"/>`;
  for (const h of hulls) {
    const on = S.siteBlocks.has(h.b), focus = S.siteFocus === h.b;
    s += `<g class="bmblock${on ? " on" : ""}${focus ? " focus" : ""}" data-sblock="${h.b}" tabindex="0" role="button" aria-label="Block ${h.b}${on ? ", chosen" : ""}">`;
    s += h.polys.map((p) => `<polygon points="${ptsStr(p)}"/>`).join("");
    s += `<g transform="translate(${h.label[0].toFixed(0)} ${(h.label[1] + 10).toFixed(0)})">${h.b === "A" ? `<circle class="beaconA" r="46"/><circle class="beaconA b2" r="46"/><g class="atag"><rect x="56" y="-24" width="250" height="48" rx="24"/><text x="181" y="2" text-anchor="middle" dominant-baseline="central">First possession</text></g>` : ""}<g class="bmlabel"><circle r="46"/><text text-anchor="middle" dominant-baseline="central">${h.b}</text></g></g></g>`;
  }
  return s + `</svg>`;
}

export function blockCard() {
  const b = S.siteFocus || "A", info = BLOCKS[b], on = S.siteBlocks.has(b);
  return `<div class="bcardx" aria-live="polite"><div class="eyebrow">Block ${b}</div><h3>Block ${b}</h3>
    <p>${esc(info.line)}</p>
    <dl class="bfacts"><div><dt>Plots</dt><dd>about ${info.plots.toLocaleString("en-IN")}</dd></div><div><dt>Sizes</dt><dd>${esc(info.sizes)}</dd></div>
    ${info.price ? `<div><dt>Market asks</dt><dd>${info.price[0].toFixed(2)}–${info.price[1].toFixed(2)} Cr <small>${esc(info.size)}, Oct 2026</small></dd></div>` : ""}</dl>
    <div class="row"><button class="sitebtn ${on ? "" : "solid"}" data-togglesblock="${b}">${on ? "✓ Added to my call" : "Add Block " + b + " to my call"}</button>${info.price ? `<button class="sitebtn" data-outlookblock="${b}">See the outlook</button>` : ""}${waLink() ? `<a class="sitebtn wa" target="_blank" rel="noopener" href="${waLink("I want to know about plots in Block " + b + " of DHA Margalla Orchard.")}">WhatsApp</a>` : ""}</div></div>`;
}

function chosenBar() {
  const list = [...S.siteBlocks].sort();
  return `<div class="chosen">${list.length ? `<span>Your call is about <b>Block ${list.join(", ")}</b></span><a href="#book" class="sitebtn solid">Book a call</a>` : `<span>Tap one or more blocks on the map to choose them.</span>`}</div>`;
}

// ---------------------------------------------------------------- the investment outlook
function outlookData() {
  const b = BLOCKS[S.inv.block] || BLOCKS.C;
  const entry = S.inv.price || +((b.price[0] + b.price[1]) / 2).toFixed(2);
  const n = S.inv.n;
  const t = [0, 8 / 12, 25 / 12]; // Nov 2026, Jul 2027, Dec 2028
  const outlook = [entry, entry * OUT_2027, entry * OUT_2028].map((v) => v * n);
  const careful = t.map((y) => entry * Math.pow(1 + CAREFUL, y) * n);
  return { b, entry, n, t, outlook, careful, total: entry * n };
}
function outlookChart(d) {
  const W = 760, H = 320, L = 56, R = 120, T = 24, B = 40;
  const max = Math.max(...d.outlook, ENCLAVE_1K * d.n) * 1.08, min = 0;
  const x = (y) => L + (y / (25 / 12)) * (W - L - R);
  const yv = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(d.t[i]).toFixed(1)},${yv(v).toFixed(1)}`).join(" ");
  const ticks = [];
  const step = max > 30 ? 10 : max > 12 ? 4 : 2;
  for (let v = 0; v <= max; v += step) ticks.push(v);
  const labelsX = [["Today", 0], ["Jul 2027", 8 / 12], ["Dec 2028", 25 / 12]];
  const oneK = d.b.size === "1 Kanal";
  let s = `<svg class="ochart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Value of ${d.n} plot(s) in Block ${S.inv.block}: ${d.total.toFixed(2)} crore today; our outlook ${d.outlook[1].toFixed(1)} crore by July 2027 and ${d.outlook[2].toFixed(1)} crore by December 2028; careful case ${d.careful[2].toFixed(1)} crore.">`;
  s += ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${yv(v)}" y2="${yv(v)}"/><text class="ax" x="${L - 8}" y="${yv(v) + 4}" text-anchor="end">${v}</text>`).join("");
  s += labelsX.map(([l, y]) => `<text class="ax" x="${x(y)}" y="${H - 14}" text-anchor="middle">${l}</text>`).join("");
  if (oneK) s += `<line class="enc" x1="${L}" x2="${W - R}" y1="${yv(ENCLAVE_1K * d.n)}" y2="${yv(ENCLAVE_1K * d.n)}"/><text class="enct" x="${W - R + 8}" y="${yv(ENCLAVE_1K * d.n) + 4}">Enclave today</text>`;
  s += `<path class="line careful draw" d="${path(d.careful)}"/><path class="area" d="${path(d.outlook)} L${x(d.t[2])},${yv(0)} L${x(0)},${yv(0)} Z"/><path class="line outlook draw" d="${path(d.outlook)}"/>`;
  d.outlook.forEach((v, i) => { s += `<circle class="pt" cx="${x(d.t[i])}" cy="${yv(v)}" r="5"/>`; });
  s += `<text class="endl outlook" x="${x(d.t[2]) + 10}" y="${yv(d.outlook[2]) + 4}">${d.outlook[2].toFixed(1)} Cr</text>`;
  s += `<text class="endl careful" x="${x(d.t[2]) + 10}" y="${yv(d.careful[2]) + 4}">${d.careful[2].toFixed(1)} Cr</text>`;
  return s + `</svg>`;
}
function bigNums(d) {
  const gain = d.outlook[2] - d.total;
  return `<div><span>You put in today</span><b>${d.total.toFixed(2)} Cr</b></div>
      <div><span>Our outlook, July 2027</span><b>${d.outlook[1].toFixed(1)} Cr</b></div>
      <div><span>Our outlook, December 2028</span><b class="gold">${d.outlook[2].toFixed(1)} Cr</b></div>
      <div><span>Possible gain</span><b class="gold">+${gain.toFixed(1)} Cr</b><small>+${Math.round((gain / d.total) * 100)}%</small></div>`;
}
// while the price slider moves, only the chart and the numbers change (the slider itself stays)
export function updateOutlookDom() {
  const d = outlookData();
  const c = document.querySelector(".chartbox .ochart"), n = document.querySelector(".bignums"), v = document.getElementById("invPriceV");
  if (c) c.outerHTML = outlookChart(d).replace('class="line careful draw"', 'class="line careful draw in"').replace('class="line outlook draw"', 'class="line outlook draw in"');
  if (n) n.innerHTML = bigNums(d);
  if (v) v.textContent = d.entry.toFixed(2);
}
function outlookSection(full) {
  const d = outlookData();
  const gain = d.outlook[2] - d.total;
  const withPrice = Object.keys(BLOCKS).filter((k) => BLOCKS[k].price);
  return `<section class="sitesec dark" id="outlook"><div class="sitewrap">
    <div class="sechead"><div class="eyebrow">Investment outlook</div><h2>Where one plot could go</h2>
      <p>Choose a block and the number of plots. The chart shows our team's outlook and a careful case.</p></div>
    <div class="outgrid"><div class="ctrls">
      <div class="lbl">Block</div><div class="chiprow">${withPrice.map((k) => `<button class="chip2${S.inv.block === k ? " on" : ""}" data-invblock="${k}">${k}</button>`).join("")}</div>
      <div class="lbl">Plots</div><div class="stepper"><button data-invn="-1" aria-label="One plot less">−</button><b>${d.n}</b><button data-invn="1" aria-label="One plot more">+</button></div>
      <div class="lbl">Price of one ${esc(d.b.size)} plot today</div>
      ${d.b.price[1] > d.b.price[0] ? `<input type="range" id="invPrice" min="${d.b.price[0]}" max="${d.b.price[1]}" step="0.05" value="${d.entry}" aria-label="Price in crore">` : ""}<div class="pricev"><b id="invPriceV">${d.entry.toFixed(2)}</b> Cr <small>market asks ${d.b.price[1] > d.b.price[0] ? `${d.b.price[0].toFixed(2)}–${d.b.price[1].toFixed(2)}` : `from ${d.b.price[0].toFixed(2)}`} Cr, Oct 2026</small></div>
    </div>
    <div class="chartbox">${outlookChart(d)}
      <div class="legend2"><span><i class="lo"></i>Our outlook</span><span><i class="lc"></i>Careful case (about 9% a year)</span>${d.b.size === "1 Kanal" ? `<span><i class="le"></i>DHA's price for 1 Kanal in Margalla Enclave today</span>` : ""}</div></div></div>
    <div class="bignums">${bigNums(d)}</div>
    <p class="fine light">How we get these numbers: a 1 Kanal plot in Margalla Orchard asks about ${TODAY_1K} crore today. DHA sells the same size in DHA Margalla Enclave, about 4 km away, for ${ENCLAVE_1K} crore (September 2026). Our team expects Orchard to reach about 85% of that price by Block A possession (July 2027), and to close the gap by the end of 2028. This is an outlook, not a promise. Prices can go up or down.</p>
    ${full ? "" : `<div class="row"><a href="#book" class="sitebtn solid big">Talk to us about Block ${S.inv.block}</a></div>`}
  </div></section>`;
}

function nextDoor() {
  const rows = [["Margalla Enclave, Mar 2025", 4.41, "enc"], ["Margalla Enclave, Dec 2025", 5.6, "enc"], ["Margalla Enclave, Sep 2026", 7.29, "enc"], ["Margalla Orchard, today", TODAY_1K, "orc"]];
  return `<section class="sitesec"><div class="sitewrap two">
    <div><div class="eyebrow">Next door</div><h2>DHA's price for 1 Kanal next door rose 65% in 18 months</h2>
      <p>DHA Margalla Enclave is about 4 km away. DHA's own price for a 1 Kanal plot there went from 4.41 crore to 7.29 crore. A 1 Kanal plot in Margalla Orchard asks about ${TODAY_1K} crore today.</p>
      <p><b>The gap is the opportunity.</b></p></div>
    <div class="bars">${rows.map(([l, v, c]) => `<div class="barrow ${c}"><span>${l}</span><div class="bartrack"><i class="grow" style="--w:${(v / 7.29) * 100}%"></i></div><b>${v.toFixed(2)} Cr</b></div>`).join("")}
      <p class="fine">DHA Margalla Enclave: DHA's published prices. Margalla Orchard: average asking price, October 2026.</p></div>
  </div></section>`;
}

function why() {
  const items = [
    ["Developed by DHA Islamabad", "DHA Islamabad carries out the development under the agreement of September 2025."],
    ["On Main Park Road", "Opposite COMSATS University, Chak Shahzad, Islamabad."],
    ["Official master plan", "Every plot has a number on FGEHA's approved layout plan."],
    ["Possession from July 2027", "Block A is the first block for possession, on FGEHA's target date."],
    ["A size for every budget", "1 Kanal (50 × 90 ft), 14 Marla (40 × 80 ft) and 10 Marla (32 × 70 ft)."],
    ["With you to the allotment letter", "We handle the token, the NDC and the transfer at the authority with you."],
  ];
  const icons = ["M4 20V9l8-5 8 5v11H4zM9 20v-6h6v6", "M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18", "M4 4h16v16H4zM4 10h16M10 4v16", "M12 3v18M3 12h18M6 6l12 12", "M4 18h16M6 18V8M12 18V4M18 18v-6", "M5 12l4 4 10-10"];
  return `<section class="sitesec alt"><div class="sitewrap"><div class="sechead"><div class="eyebrow">Why DHA Margalla Orchard</div><h2>Six reasons buyers choose it</h2></div>
    <div class="why">${items.map(([t, d], i) => `<div class="whyc reveal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[i]}"/></svg><b>${t}</b><span>${d}</span></div>`).join("")}</div></div></section>`;
}

function countdown() {
  const target = new Date(2027, 6, 1);
  const days = Math.max(0, Math.ceil((target - new Date()) / 86400000));
  return `<div class="countdown"><span class="eyebrow">Block A possession, FGEHA target</span><b class="countup" data-to="${days}">${days}</b><span>days to July 2027</span></div>`;
}

// ---------------------------------------------------------------- book a call
function bookForm() {
  if (S.siteSent) {
    const s = S.siteSent;
    return `<div class="sent"><h3>Thank you${s.name ? ", " + esc(s.name.split(" ")[0]) : ""}. We will call you.</h3>
      <p>A member of our team will call you on <b>${esc(s.phone)}</b>${s.time ? ` in the ${esc(s.time)}` : ""}${s.blocks && s.blocks.length ? ` about Block ${esc(s.blocks.join(", "))}` : ""}.</p>
      ${!S.user ? `<p>Create a free account to follow your request and to get news about new plots.</p><a href="#signin" class="sitebtn">Create an account</a>` : ""}
      <button class="sitebtn ghost" data-act="siteAgain">Book another call</button></div>`;
  }
  if (S.api && S.api.canSubmit === false) return `<div class="sent"><h3>Book a call</h3><p>On the test page, you need Contributor access to book a call. On the real website, everyone can book one.</p></div>`;
  const acc = S.account || {};
  const chosen = S.siteBlocks;
  const step = S.bookStep || 1, ans = S.bookAns || {};
  const bar = `<div class="stepbar"><span>Step ${step} of 4</span><i><i style="width:${step * 25}%"></i></i></div>`;
  const chips = (key, list) => `<div class="chiprow">${list.map(([k, l]) => `<button type="button" class="chip2${(ans[key] || "") === k && (k || ans[key] === "") ? " on" : ""}" data-bookans="${key}:${k}">${l}</button>`).join("")}</div>`;
  const nav = (back, next, label) => `<div class="stepnav">${back ? `<button type="button" class="sitebtn ghost" data-bookstep="${back}">Back</button>` : "<span></span>"}<button type="button" class="sitebtn solid" data-bookstep="${next}">${label || "Next"}</button></div>`;
  if (step === 1) return `<div class="enq">${bar}<h3 class="steph">What is the plot for?</h3>${chips("goal", GOALS)}${nav(0, 2)}</div>`;
  if (step === 2) return `<div class="enq">${bar}<h3 class="steph">Your budget for one plot</h3>${chips("budget", BUDGETS)}<div class="lbl">Plot size</div>${chips("size", WANT_SIZES)}${nav(1, 3)}</div>`;
  if (step === 3) return `<div class="enq">${bar}<h3 class="steph">Which blocks do you like?</h3><p class="fine">Choose one or more, or go on: our agent can advise you.</p>
    <div class="chiprow">${ACTIVE.map((b) => `<button type="button" class="chip2${chosen.has(b) ? " on" : ""}" data-togglesblock="${b}" aria-pressed="${chosen.has(b)}">Block ${b}</button>`).join("")}</div>${nav(2, 4)}</div>`;
  return `<form class="enq" id="bookForm" novalidate>${bar}<h3 class="steph">Where can we call you?</h3>
    ${bookSummary() || chosen.size ? `<p class="fine">${esc([bookSummary(), chosen.size ? "Blocks: " + [...chosen].sort().join(", ") : ""].filter(Boolean).join(" · "))} <button type="button" class="linkbtn" data-bookstep="1">Change</button></p>` : ""}
    <label><span>Your name *</span><input id="bk_name" autocomplete="name" required value="${esc(acc.full_name || "")}"></label>
    <label><span>Phone number * <small>We call this number</small></span><input id="bk_phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="03xx xxxxxxx" value="${esc(acc.phone || "")}"></label>
    <div class="enqgrid"><label><span>WhatsApp (optional)</span><input id="bk_wa" type="tel" inputmode="tel" value="${esc(acc.whatsapp || "")}"></label>
    <label><span>E-mail (optional)</span><input id="bk_email" type="email" autocomplete="email" value="${esc(acc.email || "")}"></label></div>
    <label class="check"><input type="checkbox" id="bk_same"> My WhatsApp number is the same as my phone number</label>
    <div class="lbl">Best time to call</div>
    <div class="chiprow">${[["", "Any time"], ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"]].map(([k, l]) => `<button type="button" class="chip2${(S.bookTime || "") === k ? " on" : ""}" data-booktime="${k}">${l}</button>`).join("")}</div>
    <label><span>Message (optional)</span><textarea id="bk_msg" placeholder="For example: I want a 1 Kanal plot for investment.">${S.sitePlot ? "About plot " + esc(S.sitePlot) + ". " : ""}</textarea></label>
    <label class="check"><input type="checkbox" id="bk_optin"> Send me news about new plots and investment opportunities by WhatsApp, SMS or e-mail. I can stop this at any time.</label>
    <input id="bk_web" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="stepnav"><button type="button" class="sitebtn ghost" data-bookstep="3">Back</button><button class="sitebtn solid big" type="submit">Book my call</button></div>
    <p class="fine">We use your details to call you, and for news only if you agree above.</p></form>`;
}
function bookSection() {
  const wa = waLink();
  return `<section class="sitesec book" id="booksec"><div class="sitewrap two">
    <div><div class="eyebrow">Book a call</div><h2>Talk to our team. It takes one minute.</h2>
      <p>Choose the blocks you like and leave your number. An agent calls you, answers your questions and helps you choose a plot.</p>
      <ul class="ticks"><li>No cost and no commitment</li><li>Advice on blocks, sizes and prices</li><li>Help with the token, NDC and transfer</li></ul>
      ${wa ? `<a class="sitebtn wa" href="${wa}" target="_blank" rel="noopener">Message us on WhatsApp</a>` : ""}
      ${contactBlock()}</div>
    <div class="formcard">${bookForm()}</div></div></section>`;
}
function contactBlock() {
  const rows = [["Phone", set("phone")], ["WhatsApp", set("whatsapp")], ["E-mail", set("email")], ["Office", set("address")], ["Hours", set("hours")]].filter((r) => r[1]);
  return rows.length ? `<dl class="cdl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : "";
}

// ---------------------------------------------------------------- pages
function home() {
  return `<section class="hero"><div class="sitewrap herogrid">
      <div class="herotext">
        <div class="eyebrow">DHA Margalla Orchard · Islamabad</div>
        <h1><span class="rise">Your plot in</span> <span class="rise d1">DHA Margalla Orchard.</span></h1>
        <p class="rise d2">${esc(set("about") || "Developed by DHA Islamabad on Main Park Road. 1 Kanal, 14 Marla and 10 Marla plots on the official FGEHA master plan.")}</p>
        <div class="herobtns rise d3"><a href="#book" class="sitebtn solid big">Book a call</a><button class="sitebtn big light" data-act="tour">▶ Tour the blocks</button></div>
        <div class="trust rise d3"><span>Block A possession: July 2027 target</span><span>50% of development done</span><span>Source: FGEHA, Oct 2026</span></div>
      </div>
      <a href="#blocks" class="heromap2" aria-label="Explore the blocks on the master plan">${blockMap(true)}</a>
    </div></section>
    <section class="numbers"><div class="sitewrap nums4">
      <div><b class="countup" data-to="4781">4,781</b><span>residential plots</span></div>
      <div><b class="countup" data-to="8432">8,432</b><span>kanals of land</span></div>
      <div><b class="countup" data-to="8">8</b><span>blocks, A to H</span></div>
      <div><b><span class="countup" data-to="50">50</span>%</b><span>of development done</span></div>
    </div></section>
    ${explorer()}
    ${sizesSection()}
    ${budgetSection()}
    ${outlookSection(false)}
    ${nextDoor()}
    ${timelineSection()}
    ${nearbySection()}
    ${why()}
    <section class="sitesec"><div class="sitewrap"><div class="sechead"><div class="eyebrow">How it works</div><h2>From a call to your allotment letter</h2></div>
      <ol class="steps5">
        <li class="reveal"><b>A call with us</b><span>We answer your questions and help you choose a block and a plot.</span></li>
        <li class="reveal"><b>Token (Bayana)</b><span>Price, time for the transfer, token amount and mode of payment are agreed.</span></li>
        <li class="reveal"><b>NDC</b><span>The No Demand Certificate goes to the authority for approval.</span></li>
        <li class="reveal"><b>Transfer</b><span>You and the seller go to the authority with your CNIC for biometrics.</span></li>
        <li class="reveal"><b>Allotment letter</b><span>The authority gives the receipt, then your allotment letter.</span></li>
      </ol></div></section>
    ${bookSection()}
    ${faqSection()}
    <section class="sitesec join"><div class="sitewrap joinbox"><div><div class="eyebrow">Investor list</div><h2>Hear about new plots first</h2>
      <p>Create a free account. We send you news about new plots and investment opportunities in DHA Margalla Orchard, by WhatsApp, SMS or e-mail.</p></div>
      <a href="#${S.user ? "account" : "signin"}" class="sitebtn solid big">${S.user ? "My account" : "Join the investor list"}</a></div></section>`;
}

function explorer() {
  return `<section class="sitesec" id="blocks"><div class="sitewrap">
    <div class="sechead row2"><div><div class="eyebrow">The master plan</div><h2>Choose your block</h2><p>Tap a block to see what it offers. Add the blocks you like to your call.</p></div>
      <button class="sitebtn solid" data-act="tour">▶ Take the 30-second tour</button></div>
    <div class="explore"><div class="bmapbox">${blockMap(false)}<div class="tourcap" hidden></div></div><div class="bside">${blockCard()}${chosenBar()}
      <a href="#plan" class="sitebtn ghost">Open the full master plan with every plot</a></div></div></div></section>`;
}

function plan() {
  const p = S.sitePlot && G.geo.plots[S.sitePlot];
  const sz = p ? SIZES[p.size] : null;
  const saved = (S.account && S.account.saved) || [];
  return `<section class="planpage"><div class="planhead sitewrap"><div><div class="eyebrow">Official FGEHA layout plan</div><h1 class="h2">Master plan</h1></div>
      <p>Search a plot, or tap a plot on the map.</p></div>
    <div class="planmap mapwrap" aria-label="Master plan of DHA Margalla Orchard">
      <svg role="img" aria-label="DHA Margalla Orchard layout plan">${mapSVG("site")}</svg>
      <form class="mapsearch" id="searchForm" role="search"><select id="qb" aria-label="Block">${ACTIVE.map((b) => `<option value="${b}"${b === (S.findBlock || "A") ? " selected" : ""}>Block ${b}</option>`).join("")}</select><input id="q" type="search" inputmode="numeric" enterkeyhint="search" placeholder="Plot number" autocomplete="off" aria-label="Plot number"><button aria-label="Find plot">Find</button></form>
      <div class="zoom"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="fit" aria-label="Fit to screen" style="font-size:12px">Fit</button></div>
      <div class="tip" hidden></div>
      ${p ? `<div class="plotcard"><div><div class="eyebrow">Block ${p.block}</div><h3>Plot ${esc(S.sitePlot)}</h3><p>${sz.label} · ${sz.dims}${sz.sqyd ? ` · ${sz.sqyd} sq yd` : ""}</p></div>
        <div class="row"><a href="#book" class="sitebtn solid" data-act="askPlot" data-block="${p.block}">Book a call about this plot</a>${S.user && !S.me && S.mode !== "artifact" ? `<button class="sitebtn" data-saveplot="${esc(S.sitePlot)}">${saved.includes(S.sitePlot) ? "Saved ✓" : "Save plot"}</button>` : ""}<a class="sitebtn" target="_blank" rel="noopener" href="${shareLink("Plot " + S.sitePlot + " (" + sz.label + ") in DHA Margalla Orchard, on the official master plan:")}">Share</a><button class="sitebtn" data-act="closePlot" aria-label="Close">×</button></div></div>` : ""}
    </div></section>`;
}

function signin() {
  if (S.user) return account();
  const demo = S.mode === "demo";
  return `<section class="sitesec"><div class="sitewrap narrow"><div class="eyebrow">Investor list</div><h1 class="h2">Create your free account</h1>
    <p>Save plots, follow your calls, and get news about new plots and investment opportunities. Team members sign in here too.</p>
    ${demo ? `<div class="demo-note"><b>Demo.</b> Choose a person.</div><div class="who demo-who">${S.api.demoUsers.map((u) => `<button class="whobtn" data-demo="${esc(u.email)}"><span><b>${esc(u.name)}</b><small>${esc(u.note)}</small></span></button>`).join("")}</div>`
      : S.mode === "artifact" ? `<p class="fine">On the test page, claude.ai knows who you are. Client accounts work on the real website.</p>`
      : `<button class="btn google" data-act="signIn">Continue with Google</button>
        <form id="emailForm" class="enq"><label><span>Or get a sign-in link by e-mail</span><input id="si_email" type="email" autocomplete="email" required></label><button class="sitebtn" type="submit">Send the link</button></form>
        ${S.ui.linkSent ? `<p class="sentnote">We sent a link to your e-mail. Open it on this device.</p>` : ""}`}
  </div></section>`;
}

function account() {
  if (S.me) return `<section class="sitesec"><div class="sitewrap narrow"><h1 class="h2">You are signed in as a team member</h1><p>Open the sales system to work.</p><button class="sitebtn solid big" data-act="toApp">Sales system</button></div></section>`;
  if (!S.user) return signin();
  if (S.mode === "artifact") return `<section class="sitesec"><div class="sitewrap narrow"><h1 class="h2">My account</h1><p>Client accounts work on the real website.</p></div></section>`;
  const a = S.account || {};
  const interests = new Set(S.ui.acInterests || a.interests || []);
  const statusText = { new: "Received, an agent will call you", assigned: "An agent will call you", contacted: "We called you", converted: "In progress with our agent", closed: "Closed" };
  return `<section class="sitesec"><div class="sitewrap two"><div><div class="eyebrow">My account</div><h1 class="h2">${esc(a.full_name || "Welcome")}</h1>
      <form class="enq" id="accountForm"><label><span>Name</span><input id="ac_name" value="${esc(a.full_name || "")}" autocomplete="name"></label>
      <label><span>Phone number</span><input id="ac_phone" type="tel" value="${esc(a.phone || "")}" autocomplete="tel"></label>
      <label><span>WhatsApp (optional)</span><input id="ac_wa" type="tel" value="${esc(a.whatsapp || "")}"></label>
      <div class="lbl">Blocks I am interested in</div><div class="chiprow">${ACTIVE.map((b) => `<button type="button" class="chip2${interests.has(b) ? " on" : ""}" data-acblock="${b}">${b}</button>`).join("")}</div>
      <label class="check"><input type="checkbox" id="ac_optin"${a.marketing_opt_in ? " checked" : ""}> Send me news about new plots and investment opportunities by WhatsApp, SMS or e-mail.</label>
      <p class="fine">${esc(a.email || "")}</p><button class="sitebtn solid" type="submit">Save</button></form>
      <button class="linkbtn" data-act="signOut">Sign out</button></div>
    <div><h2>Saved plots</h2>${(a.saved || []).length ? `<div class="savedlist">${a.saved.map((p) => `<a href="#plan" class="savedplot" data-siteplot="${esc(p)}">${esc(p)}</a>`).join("")}</div>` : `<p class="fine">No saved plots. Open the master plan, tap a plot and choose "Save plot".</p>`}
      <h2>My calls and enquiries</h2>${S.myLeads.length ? `<ul class="myleads">${S.myLeads.map((l) => `<li><b>${l.blocks && l.blocks.length ? "Block " + esc(l.blocks.join(", ")) + " · " : ""}${l.plot_id ? esc(l.plot_id) + " · " : ""}${esc(new Date(l.created_at).toLocaleDateString("en-GB"))}</b><span>${statusText[l.status] || l.status}</span>${l.message ? `<small>${esc(l.message)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="fine">No calls booked yet. <a href="#book">Book a call</a>.</p>`}</div></div></section>`;
}

export function sitePage() {
  let body;
  if (S.sitePage === "plan") body = plan();
  else if (S.sitePage === "account") body = account();
  else if (S.sitePage === "signin") body = signin();
  else if (S.sitePage === "outlook") body = outlookSection(true) + bookSection();
  else if (S.sitePage === "blocks") body = explorer() + bookSection();
  else if (S.sitePage === "contact" || S.sitePage === "book") body = bookSection();
  else body = home();
  const wa = waLink();
  const sticky = S.sitePage !== "book" && S.sitePage !== "contact" ? `<div class="stickycta"><a href="#book" class="sitebtn solid">Book a call</a>${wa ? `<a href="${wa}" class="sitebtn wa" target="_blank" rel="noopener">WhatsApp</a>` : ""}</div>` : "";
  return `<div class="site page-${S.sitePage}">${header()}<main>${body}</main>${S.sitePage === "plan" ? "" : footer()}${sticky}</div>`;
}

// ---------------------------------------------------------------- motion after drawing
let io = null;
export function siteAfterRender() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // numbers count up when they come into view (the final number is already in the page)
  const els = document.querySelectorAll(".site .countup:not([data-done]), .site .reveal:not(.in), .site .draw:not(.in), .site .grow:not(.in)");
  if (!els.length) return;
  if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => { e.classList.add("in"); e.dataset.done = 1; }); return; }
  if (io) io.disconnect();
  io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const el = en.target;
      io.unobserve(el);
      el.classList.add("in");
      if (el.classList.contains("countup") && !el.dataset.done) {
        el.dataset.done = 1;
        const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.dec || "0", 10), t0 = performance.now();
        const fmt = (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US"));
        const step = (now) => { const k = Math.min(1, (now - t0) / 1200), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
    }
  }, { threshold: 0.2 });
  // only what is below the screen waits for the scroll; what is already in view shows at once
  els.forEach((e) => {
    if (e.getBoundingClientRect().top < innerHeight) { if (!e.classList.contains("countup")) { e.classList.add("in"); return; } }
    else e.classList.add("pre");
    io.observe(e);
  });
  // nothing stays hidden: everything shows after a short time even without scrolling
  setTimeout(() => document.querySelectorAll(".site .pre:not(.in)").forEach((e) => e.classList.add("in")), 1500);
}

// the ad that brought the visitor (utm_source, utm_campaign ...), kept for the booking
export function adSource() {
  try {
    const q = new URLSearchParams(location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "fbclid", "gclid"];
    const found = keys.filter((k) => q.get(k)).map((k) => `${k}=${q.get(k)}`.slice(0, 60)).join("&");
    if (found) sessionStorage.setItem("wh_src", found);
    return sessionStorage.getItem("wh_src") || (document.referrer ? "referrer=" + new URL(document.referrer).hostname : "direct");
  } catch (e) { return ""; }
}
