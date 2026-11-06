// The public website of WH Ventures: home, master plan, contact, sign in, and the client's account.
// The public sees only the official layout plan, never our stock, prices or clients.
import { S, G, esc, isAdmin } from "./core.js";
import { SIZES, ACTIVE } from "./geo.js";
import { mapSVG } from "./map.js";

export const SITE_PAGES = ["home", "plan", "contact", "account", "signin"];
const set = (k) => (S.site[k] || "").trim();
const company = () => set("company") || "WH Ventures";

function header() {
  const p = S.sitePage;
  const link = (k, l) => `<a href="#${k}" class="${p === k ? "on" : ""}">${l}</a>`;
  const right = S.me
    ? `<button class="sitebtn solid" data-act="toApp">Sales system</button>`
    : S.user
      ? `<a href="#account" class="sitebtn${p === "account" ? " on" : ""}">My account</a>`
      : `<a href="#signin" class="sitebtn">Sign in</a>`;
  return `<header class="sitehead"><div class="sitewrap"><a href="#home" class="wordmark">${esc(company())}</a>
    <nav class="sitenav" aria-label="Website">${link("home", "Home")}${link("plan", "Master plan")}${link("contact", "Contact")}</nav>
    <div class="siteright">${right}</div></div></header>`;
}

function footer() {
  const bits = [set("phone") && `Phone ${esc(set("phone"))}`, set("whatsapp") && `WhatsApp ${esc(set("whatsapp"))}`, set("email") && esc(set("email")), set("address") && esc(set("address"))].filter(Boolean);
  return `<footer class="sitefoot"><div class="sitewrap"><div><b class="wordmark sm">${esc(company())}</b><p>${bits.length ? bits.join(" · ") : "Plots in DHA Margalla Orchard, Islamabad."}</p></div>
    <p class="fine">Scheme facts: FGEHA, October 2026. The map is the official FGEHA layout plan. Plot numbers and sizes are as on the plan; check them on the allotment papers.</p></div></footer>`;
}

function contactBlock() {
  const rows = [["Phone", set("phone")], ["WhatsApp", set("whatsapp")], ["E-mail", set("email")], ["Office", set("address")], ["Hours", set("hours")]].filter((r) => r[1]);
  return rows.length ? `<dl class="cdl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : "";
}

export function enquiryForm(plot) {
  if (S.siteSent) {
    return `<div class="sent"><h3>Thank you. We have your enquiry.</h3><p>Our team will contact you soon.${S.user && !S.me ? " You can see your enquiries on <a href=\"#account\">My account</a>." : ""}</p><button class="sitebtn" data-act="siteAgain">Send another enquiry</button></div>`;
  }
  const acc = S.account || {};
  if (S.api && S.api.canSubmit === false) return `<div class="sent"><h3>Send an enquiry</h3><p>On the test page, you need Contributor access to send an enquiry. On the real website, everyone can send one.</p></div>`;
  return `<form class="enq" id="enquiryForm">
    <div class="enqgrid"><label><span>Your name</span><input id="q_name" autocomplete="name" required value="${esc(acc.full_name || "")}"></label>
    <label><span>Phone or WhatsApp</span><input id="q_phone" type="tel" autocomplete="tel" inputmode="tel" value="${esc(acc.phone || "")}"></label>
    <label><span>E-mail (optional)</span><input id="q_email" type="email" autocomplete="email" value="${esc(acc.email || "")}"></label>
    <label><span>Plot (optional)</span><input id="q_plot" placeholder="e.g. A-538" value="${esc(plot || S.sitePlot || "")}" autocomplete="off"></label></div>
    <label><span>Message</span><textarea id="q_msg" placeholder="Which block or size are you looking for? Do you want to buy or sell?"></textarea></label>
    <input id="q_web" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="sitebtn solid big" type="submit">Send enquiry</button>
    <p class="fine">We use your details only to answer your enquiry.</p></form>`;
}

function home() {
  return `<section class="hero"><div class="sitewrap herogrid">
      <div class="herotext"><div class="eyebrow">DHA Margalla Orchard · Islamabad</div>
        <h1>Find your plot on the official master plan.</h1>
        <p>${esc(set("about") || `${company()} helps buyers and sellers of plots in DHA Margalla Orchard, from the first enquiry to the allotment letter.`)}</p>
        <div class="herobtns"><a href="#plan" class="sitebtn solid big">Open the master plan</a><a href="#contact" class="sitebtn big">Send an enquiry</a></div></div>
      <a href="#plan" class="heromap" aria-label="Open the master plan"><img src="plan.webp" alt="The official FGEHA layout plan of DHA Margalla Orchard" loading="lazy"><span>Master plan · tap to open</span></a>
    </div></section>
    <section class="sitesec"><div class="sitewrap">
      <div class="facts4">
        <div><b>4,781</b><span>residential plots on the FGEHA layout</span></div>
        <div><b>8,432</b><span>kanals of land, about</span></div>
        <div><b>8</b><span>blocks, A to H</span></div>
        <div><b>3</b><span>plot sizes: 1 Kanal, 14 Marla, 10 Marla</span></div>
      </div>
      <p class="fine">Source: FGEHA, October 2026.</p>
    </div></section>
    <section class="sitesec alt"><div class="sitewrap two">
      <div><h2>Where it is</h2><p>Main Park Road, Chak Shahzad, Islamabad, opposite COMSATS University. The scheme is also known as the Park Road Housing Scheme and FGEHA Phase X.</p></div>
      <div><h2>Plot sizes</h2><table class="sizes"><thead><tr><th>Size</th><th>Feet</th><th>Sq yd</th></tr></thead><tbody>
        ${["1K", "14M", "10M"].map((k) => `<tr><td>${SIZES[k].label}</td><td>${SIZES[k].dims}</td><td>${SIZES[k].sqyd}</td></tr>`).join("")}</tbody></table></div>
    </div></section>
    <section class="sitesec"><div class="sitewrap">
      <h2>From enquiry to allotment letter</h2>
      <ol class="steps5">
        <li><b>Choose the plot</b><span>On the master plan, by block, number and size.</span></li>
        <li><b>Token (Bayana)</b><span>Price, time for the transfer, token amount and mode of payment are agreed.</span></li>
        <li><b>NDC</b><span>The No Demand Certificate goes to the authority for approval.</span></li>
        <li><b>Transfer</b><span>Buyer and seller go to the authority with their CNIC for biometrics.</span></li>
        <li><b>Allotment letter</b><span>The authority gives the receipt, then the allotment letter.</span></li>
      </ol>
    </div></section>
    <section class="sitesec alt" id="contactsec"><div class="sitewrap two">
      <div><h2>Talk to us</h2><p>Tell us what you are looking for. A member of our team will call you.</p>${contactBlock()}</div>
      <div>${enquiryForm()}</div></div></section>`;
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
        <div class="row"><a href="#contact" class="sitebtn solid" data-act="askPlot">Ask about this plot</a>${S.user && !S.me && S.mode !== "artifact" ? `<button class="sitebtn" data-saveplot="${esc(S.sitePlot)}">${saved.includes(S.sitePlot) ? "Saved ✓" : "Save plot"}</button>` : ""}<button class="sitebtn" data-act="closePlot" aria-label="Close">×</button></div></div>` : ""}
    </div></section>`;
}

function contact() {
  return `<section class="sitesec"><div class="sitewrap two"><div><div class="eyebrow">Contact</div><h1 class="h2">Send an enquiry</h1>
    <p>Buying or selling a plot in DHA Margalla Orchard? Tell us the block, the size or the plot number. Our team will contact you.</p>${contactBlock()}</div>
    <div>${enquiryForm()}</div></div></section>`;
}

function signin() {
  if (S.user) return account();
  const demo = S.mode === "demo";
  return `<section class="sitesec"><div class="sitewrap narrow"><div class="eyebrow">Sign in</div><h1 class="h2">Your account</h1>
    <p>Sign in to save plots and to see your enquiries. Team members sign in here too.</p>
    ${demo ? `<div class="demo-note"><b>Demo.</b> Choose a person.</div><div class="who demo-who">${S.api.demoUsers.map((u) => `<button class="whobtn" data-demo="${esc(u.email)}"><span><b>${esc(u.name)}</b><small>${esc(u.note)}</small></span></button>`).join("")}</div>`
      : S.mode === "artifact" ? `<p class="fine">On the test page, claude.ai knows who you are. Client accounts work on the real website.</p>`
      : `<button class="btn google" data-act="signIn">Sign in with Google</button>
        <form id="emailForm" class="enq"><label><span>Or get a sign-in link by e-mail</span><input id="si_email" type="email" autocomplete="email" required></label><button class="sitebtn" type="submit">Send the link</button></form>
        ${S.ui.linkSent ? `<p class="sentnote">We sent a link to your e-mail. Open it on this device.</p>` : ""}`}
  </div></section>`;
}

function account() {
  if (S.me) return `<section class="sitesec"><div class="sitewrap narrow"><h1 class="h2">You are signed in as a team member</h1><p>Open the sales system to work.</p><button class="sitebtn solid big" data-act="toApp">Sales system</button></div></section>`;
  if (!S.user) return signin();
  if (S.mode === "artifact") return `<section class="sitesec"><div class="sitewrap narrow"><h1 class="h2">My account</h1><p>Client accounts work on the real website.</p></div></section>`;
  const a = S.account || {};
  const statusText = { new: "Received", assigned: "An agent will call you", contacted: "We contacted you", converted: "In progress with our agent", closed: "Closed" };
  return `<section class="sitesec"><div class="sitewrap two"><div><div class="eyebrow">My account</div><h1 class="h2">${esc(a.full_name || "Welcome")}</h1>
      <form class="enq" id="accountForm"><label><span>Name</span><input id="ac_name" value="${esc(a.full_name || "")}" autocomplete="name"></label>
      <label><span>Phone or WhatsApp</span><input id="ac_phone" type="tel" value="${esc(a.phone || "")}" autocomplete="tel"></label>
      <p class="fine">${esc(a.email || "")}</p><button class="sitebtn" type="submit">Save</button></form>
      <button class="linkbtn" data-act="signOut">Sign out</button></div>
    <div><h2>Saved plots</h2>${(a.saved || []).length ? `<div class="savedlist">${a.saved.map((p) => `<a href="#plan" class="savedplot" data-siteplot="${esc(p)}">${esc(p)}</a>`).join("")}</div>` : `<p class="fine">No saved plots. Open the master plan, tap a plot and choose "Save plot".</p>`}
      <h2>My enquiries</h2>${S.myLeads.length ? `<ul class="myleads">${S.myLeads.map((l) => `<li><b>${l.plot_id ? esc(l.plot_id) + " · " : ""}${esc(new Date(l.created_at).toLocaleDateString("en-GB"))}</b><span>${statusText[l.status] || l.status}</span>${l.message ? `<small>${esc(l.message)}</small>` : ""}</li>`).join("")}</ul>` : `<p class="fine">No enquiries yet.</p>`}</div></div></section>`;
}

export function sitePage() {
  const pages = { home, plan, contact, account, signin };
  const body = (pages[S.sitePage] || home)();
  return `<div class="site${S.sitePage === "plan" ? " siteplan" : ""}">${header()}<main>${body}</main>${S.sitePage === "plan" ? "" : footer()}</div>`;
}
export const siteIsAdmin = isAdmin;
