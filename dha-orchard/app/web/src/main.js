// Orchard Sales: app start, data loading, live updates, screen drawing and user input.
import "./styles.css";
import { S, G, hooks, $, esc, num, iso, isAdmin, can, toast, notice, totals, nameOf, dealsFor } from "./core.js";
import { buildGeo } from "./geo.js";
import { createApi, TABLES } from "./api/index.js";
import { go, focusPlot, blinkPlot, fromHash, attachMap, resetLift, setHash, siteFocus } from "./map.js";
import { logo } from "./brand/logo.js";
import { sitePage, SITE_PAGES, siteAfterRender, adSource, updateOutlookDom } from "./site.js";
import { startTour, stopTour, tourOn, resumeTour, updateBudgetDom, bookSummary } from "./site-extras.js";
import { allView, blockView } from "./panels.js";
import { salesPage, approvalsPage, teamPage, PERMS, investorsCsv } from "./pages.js";
import * as A from "./actions.js";
import { calendarPage, dueCount, calStep, calendarAfterRender, slotFromClick } from "./calendar.js";
import { uploadDoc, dstr } from "./deal.js";
import { openViewer, closeViewer, viewerAction, sendDownloadRequest, refreshViewerBar, viewerOpen } from "./viewer.js";

hooks.go = go;
hooks.focusPlot = focusPlot;
hooks.render = render;
hooks.refresh = () => refresh(S.me ? TABLES : ["site_settings", "leads"]);
hooks.siteClick = (id) => { S.sitePlot = id; render(); };

// ---------------------------------------------------------------- data
const norm = {
  plots: (r) => ({ ...r, price: num(r.price), tags: r.tags || [], updated_at: iso(r.updated_at), created_at: iso(r.created_at) }),
  deals: (r) => {
    const o = { ...r, sale_price: num(r.sale_price), token_amount: num(r.token_amount), created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
    for (const k of ["agreement_on", "transfer_deadline", "ndc_submitted_on", "ndc_expected", "ndc_approved_on", "transfer_on", "allotment_expected", "allotment_received"]) o[k] = dstr(r[k]) || null;
    return o;
  },
  documents: (r) => ({ ...r, size_bytes: num(r.size_bytes), created_at: iso(r.created_at) }),
  download_requests: (r) => ({ ...r, created_at: iso(r.created_at), decided_at: iso(r.decided_at), used_at: iso(r.used_at) }),
  events: (r) => ({ ...r, on_date: dstr(r.on_date), at_time: r.at_time ? String(r.at_time).slice(0, 5) : null, created_at: iso(r.created_at) }),
  requests: (r) => ({ ...r, sale_price: num(r.sale_price), token_amount: num(r.token_amount), created_at: iso(r.created_at), decided_at: iso(r.decided_at), transfer_deadline: iso(r.transfer_deadline) }),
  activity: (r) => ({ ...r, id: Number(r.id), at: iso(r.at) }),
  clients: (r) => ({ ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) }),
};

async function loadTable(t) {
  const api = S.api;
  if (t === "members" && !isAdmin()) { S.members = []; return; }
  if (!S.me && !["site_settings", "leads"].includes(t)) return; // the public and clients read only the website data
  if (t === "activity") {
    const rows = (await api.select("activity", { order: { col: "id", asc: false }, limit: 80 })).map(norm.activity);
    announce(rows);
    S.activity = rows;
    return;
  }
  const rows = await api.select(t);
  switch (t) {
    case "plots": {
      const m = {};
      for (const r of rows) if (G.geo.plots[r.id]) m[r.id] = norm.plots(r);
      S.plots = m;
      break;
    }
    case "plot_fixes": {
      const f = {};
      for (const r of rows) f[r.key] = { n: r.n, size: r.size };
      S.fixes = f;
      const curKey = S.plot && G.geo.plots[S.plot] ? G.geo.plots[S.plot].key : null;
      G.geo = buildGeo(G.raw, f);
      const want = S._goAfterFix ? S._goAfterFix.key : curKey;
      S._goAfterFix = null;
      if (want && G.geo.byKey[want] && G.geo.byKey[want].id !== S.plot && S.tab === "map" && S.view === "block") S.plot = G.geo.byKey[want].id;
      break;
    }
    case "people": S.people = Object.fromEntries(rows.map((r) => [r.id, r])); break;
    case "plot_demand": S.demand = Object.fromEntries(rows.map((r) => [r.plot_id, Number(r.interested)])); break;
    case "clients": S.clients = Object.fromEntries(rows.map((r) => [r.id, norm.clients(r)])); break;
    case "deals": S.deals = rows.map(norm.deals); break;
    case "requests": S.requests = rows.map(norm.requests); break;
    case "members": S.members = rows; break;
    case "documents": S.documents = rows.map(norm.documents); break;
    case "events": S.events = rows.map(norm.events); break;
    case "download_requests": S.downloadRequests = rows.map(norm.download_requests); break;
    case "site_settings": S.site = Object.fromEntries(rows.map((r) => [r.key, r.value])); break;
    case "leads": { const l = rows.map((r) => ({ ...r, created_at: iso(r.created_at), assigned_at: iso(r.assigned_at) })); if (S.me) S.leads = l; else S.myLeads = l; break; }
    case "listing_owners": S.owners = Object.fromEntries(rows.map((r) => [r.plot_id, { ...r, owner_demand: num(r.owner_demand) }])); break;
  }
}

// changes by other people show as notices at the top; admins also get a browser alert for new requests
function announce(rows) {
  const last = S._lastAct;
  const top = rows.length ? rows[0].id : 0;
  S._lastAct = Math.max(last || 0, top);
  if (last == null) return; // first load: no notices for old changes
  const fresh = rows.filter((r) => r.id > last && r.actor !== (S.me && S.me.id)).reverse();
  const groups = {};
  fresh.forEach((r) => (groups[r.kind] = groups[r.kind] || []).push(r));
  for (const k in groups) {
    const g = groups[k];
    const cls = (r) => (/sold/.test(r.body) ? "sold" : /pre-booked/.test(r.body) ? "prebooked" : /available/.test(r.body) ? "available" : "");
    if (g.length <= 3) g.forEach((r) => notice(esc(r.body) + ` · <span class="by">${esc(nameOf(r.actor))}</span>`, cls(r), r.plot_id));
    else notice(`<b>${g.length} changes</b>: ${g.slice(0, 5).map((r) => esc(r.plot_id || r.body)).join(", ")}${g.length > 5 ? "…" : ""} · ${esc(nameOf(g[0].actor))}`, cls(g[0]), null);
  }
  if (isAdmin() && "Notification" in window && Notification.permission === "granted" && document.hidden) {
    for (const r of fresh) if (r.kind === "request") try { new Notification("Orchard Sales: approval needed", { body: r.body, tag: "req-" + r.id }); } catch (e) {}
  }
}

// several refresh calls close together become one load; every caller waits for that load
let pending = new Set(), timer = null, running = null, waiters = [];
function refresh(tables) {
  tables.forEach((t) => pending.add(t));
  clearTimeout(timer);
  return new Promise((res) => {
    waiters.push(res);
    timer = setTimeout(async () => {
      if (running) await running;
      const list = [...pending];
      const done = waiters;
      pending = new Set();
      waiters = [];
      running = (async () => {
        try {
          if (list.includes("members")) { const me = await S.api.rpc("me"); if (!me) return startSession(); S.me = me; }
          if (list.includes("plot_fixes")) await loadTable("plot_fixes");
          await Promise.all(list.filter((t) => t !== "plot_fixes").map(loadTable));
          S.loaded = true;
        } catch (e) { console.warn(e); }
      })();
      await running;
      running = null;
      render();
      done.forEach((f) => f());
    }, 60);
  });
}
const DEPS = { deals: ["deals", "plot_demand"], members: ["members", "people"] };

let unsub = null;
async function startSession() {
  if (unsub) { unsub(); unsub = null; }
  S.user = await S.api.getUser();
  S.me = null;
  S.loaded = false;
  S._lastAct = null;
  S.draft = {}; // typed text never carries over to the next person
  S.ui = {};
  S.salesQ = "";
  S.salesAgent = "all";
  S.plots = {}; S.clients = {}; S.deals = []; S.requests = []; S.activity = []; S.members = []; S.owners = {};
  S.documents = []; S.events = []; S.fileUrls = {}; S.calAgent = "all"; S.downloadRequests = [];
  closeViewer();
  S.account = null; S.myLeads = []; S.leads = []; S.siteSent = false; S.sitePlot = null;
  if (S.user) {
    try { S.me = await S.api.rpc("me"); } catch (e) { S.bootErr = e.message; }
    if (S.me) {
      await refresh(TABLES);
      unsub = S.api.subscribe((t) => refresh(t === "*" ? TABLES : DEPS[t] || [t]), (st) => { S.live = st; renderHeader(); });
    } else {
      // a client: the website account and their own enquiries
      try { S.account = await S.api.rpc("my_account"); } catch (e) { S.account = null; }
      await refresh(["site_settings", "leads"]);
    }
  } else await refresh(["site_settings"]);
  S.booting = false;
  route();
  render();
}

// the website for the public and clients; the sales system for the team
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h === "signin" && S.user) {
    // after sign-in: the team goes to the sales system, a client to their account
    if (S.me) { S.area = "app"; setHash(""); fromHash(); return; }
    S.area = "site"; S.sitePage = "account"; setHash("account"); return;
  }
  if (SITE_PAGES.includes(h)) { S.area = "site"; S.sitePage = h; return; }
  if (!S.me) { S.area = "site"; if (!SITE_PAGES.includes(S.sitePage)) S.sitePage = "home"; if (h && !SITE_PAGES.includes(h)) S.sitePage = "home"; return; }
  S.area = "app";
  fromHash();
}

// ---------------------------------------------------------------- drawing
function renderHeader() {
  const bar = $("#bar");
  if (!S.me || S.area === "site") { bar.hidden = true; $("#tabs").hidden = true; return; }
  bar.hidden = false;
  const pend = S.requests.filter((r) => r.status === "pending").length + (isAdmin() ? S.downloadRequests.filter((r) => r.status === "pending").length + S.leads.filter((l) => l.status === "new").length : 0);
  const due = dueCount();
  const tabs = [["map", "Map"], ["sales", isAdmin() ? "Sales" : "My sales"], ["calendar", "Calendar" + (due ? ` <b class="badge">${due}</b>` : "")]];
  if (isAdmin()) tabs.push(["approvals", "Approvals" + (pend ? ` <b class="badge">${pend}</b>` : "")], ["team", "Team"]);
  else if (pend) tabs[1][1] += ` <b class="badge">${pend}</b>`;
  const nav = tabs.map(([k, l]) => `<button class="tab${S.tab === k ? " on" : ""}" data-tab="${k}">${l}</button>`).join("");
  $("#tabs").innerHTML = nav;
  $("#tabs").hidden = false;
  let crumbs = "";
  if (S.tab === "map") {
    crumbs = `<button data-nav="all">All blocks</button>`;
    if (S.block) crumbs += ` › ${S.plot ? `<button data-nav="block" data-b="${S.block}">Block ${S.block}</button>` : `<b>Block ${S.block}</b>`}`;
    if (S.plot) crumbs += ` › <b>Plot ${esc(S.plot)}</b>`;
  }
  $("#crumbs").innerHTML = crumbs;
  const t = totals();
  $("#chips").innerHTML = S.tab === "map"
    ? `<span class="chip"><i style="background:var(--avail)"></i>Available ${t.available}</span><span class="chip"><i style="background:var(--book)"></i>Pre-booked ${t.prebooked}</span><span class="chip"><i style="background:var(--sold)"></i>Sold ${t.sold + t.sold_pending}</span>`
    : "";
  const live = S.mode === "demo" ? "Demo · this browser" : S.mode === "artifact" ? "Test version · live" : S.live === "SUBSCRIBED" ? "Live" : S.live === "connecting" ? "Connecting…" : "Reconnecting…";
  $("#who").innerHTML = `<a class="webbtn" href="#home" title="Open the WH Ventures website">${logo()}<span>Website</span></a><span class="sync">${live}</span><span class="me"><span class="av sm" style="background:${S.me.color}">${esc((S.me.full_name || S.me.email)[0].toUpperCase())}</span><span class="mename">${esc(S.me.full_name || S.me.email)}<small>${S.me.role === "admin" ? "Admin" : "Sales agent"}</small></span></span>${S.mode === "artifact" ? "" : `<button class="out" data-act="${S.mode === "demo" ? "switchUser" : "signOut"}">${S.mode === "demo" ? "Switch person" : "Sign out"}</button>`}`;
}

function render() {
  const app = $("#app");
  if (S.booting || !G.geo) {
    app.innerHTML = `<div class="center"><div class="empty">${S.bootErr ? esc(S.bootErr) : "Loading the official layout plan…"}</div></div>`;
    return;
  }
  renderHeader();
  document.body.dataset.tab = S.area === "site" ? "site" : S.tab;
  const ae = document.activeElement;
  const focusId = ae && ae.id && app.contains(ae) ? ae.id : null;
  const caret = focusId && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const keepScroll = [...app.querySelectorAll(".scroll,.page")].map((e) => e.scrollTop);
  resetLift();
  if (S.area === "site" || !S.me) app.innerHTML = sitePage();
  else if (S.tab === "sales") app.innerHTML = salesPage();
  else if (S.tab === "calendar") app.innerHTML = calendarPage();
  else if (S.tab === "approvals" && isAdmin()) app.innerHTML = approvalsPage();
  else if (S.tab === "team" && isAdmin()) app.innerHTML = teamPage();
  else { S.tab = "map"; app.innerHTML = S.view === "block" && S.block ? blockView() : allView(); }
  const wrap = app.querySelector(".mapwrap");
  if (wrap) attachMap(wrap);
  for (const id in S.draft) { const el = document.getElementById(id); if (el && "value" in el && el.value !== S.draft[id]) el.value = S.draft[id]; }
  syncClientPick();
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (caret && el.setSelectionRange) try { el.setSelectionRange(caret[0], caret[1]); } catch (e) {} } }
  [...app.querySelectorAll(".scroll,.page")].forEach((e, i) => { if (keepScroll[i] != null && !S._resetScroll) e.scrollTop = keepScroll[i]; });
  S._resetScroll = false;
  fillThumbs();
  refreshViewerBar();
  calendarAfterRender();
  if (S.area === "site" || !S.me) {
    siteAfterRender();
    if (S._startTour && document.querySelector(".explore")) { S._startTour = false; document.querySelector(".explore").scrollIntoView({ block: "center" }); setTimeout(startTour, 400); }
    else resumeTour();
  }
  if (S._focusFind) { S._focusFind = false; const q = $("#q"); if (q) q.focus(); }
}
// photos of documents: the address of each file is asked once, then kept
function fillThumbs() {
  for (const b of document.querySelectorAll("[data-opendoc]")) {
    const doc = S.documents.find((x) => x.id === b.dataset.opendoc);
    if (!doc || !doc.mime.startsWith("image/") || S.fileUrls[doc.path]) continue;
    S.fileUrls[doc.path] = "";
    S.api.fileUrl(doc.path).then((u) => {
      S.fileUrls[doc.path] = u;
      document.querySelectorAll(`[data-opendoc="${doc.id}"] .thumbimg`).forEach((el) => { el.style.backgroundImage = `url("${u}")`; el.classList.add("on"); });
    }).catch(() => { delete S.fileUrls[doc.path]; });
  }
}
function syncClientPick() {
  const pick = $("#cpick"), box = $("#newClientFields");
  if (pick && box) box.hidden = !!pick.value;
}

function setTab(t) {
  S.tab = t;
  if (t === "calendar") S._calJump = true;
  S.ui = {};
  S._resetScroll = true;
  if (t === "map") setHash(S.plot ? "plot-" + S.plot : S.block ? "block-" + S.block : "");
  else setHash(t);
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => {
  if (S._hashLock) { S._hashLock = false; return; }
  const h = location.hash.slice(1);
  if (tourOn()) stopTour(false);
  if (SITE_PAGES.includes(h) || !S.me) { S.area = "site"; S.sitePage = SITE_PAGES.includes(h) ? h : "home"; S.ui = {}; window.scrollTo(0, 0); render(); return; }
  S.area = "app"; fromHash();
});

// ---------------------------------------------------------------- input
const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
const clearDraft = (...ids) => ids.forEach((k) => delete S.draft[k]);
const ui = (patch) => { Object.assign(S.ui, patch); render(); };
const focusSoon = (id) => setTimeout(() => { const i = document.getElementById(id); if (i) { i.focus(); if (i.select) i.select(); } });
const selIds = () => [...S.sel].filter((id) => G.geo.plots[id] && G.geo.plots[id].num != null);

document.addEventListener("click", async (e) => {
  if (e.target.closest(".explore [data-sblock]")) {
    // the block map: the first tap shows a block and adds it to the call; a tap on the shown block removes it
    const b = e.target.closest("[data-sblock]").dataset.sblock;
    if (S.siteFocus === b && S.siteBlocks.has(b)) S.siteBlocks.delete(b); else S.siteBlocks.add(b);
    S.siteFocus = b; S.siteSent = false;
    return render();
  }
  const t = e.target.closest("button,[data-agent],[data-calslot],a[data-act],a[data-siteplot]");
  if (!t || t.closest("svg")) return;
  const d = t.dataset;
  if (d.tab) return setTab(d.tab);
  if (d.nav === "all") return go("all");
  if (d.nav === "block") return go("block", d.b);
  if (d.open) return go("block", d.open);
  if (d.plot) { S.ui = {}; return focusPlot(d.plot); }
  if (d.demo) return S.api.signIn(d.demo);
  if (d.size) { S.size = d.size; return render(); }
  if (d.show) { S.show = d.show; return render(); }
  if (d.sf) { S.statusFilter = d.sf; return render(); }
  if (d.status) return A.setStatus([S.plot], d.status);
  if (d.asize) return ui({ addSize: d.asize });
  if (d.akind) return ui({ addKind: d.akind });
  if (d.esize) { S.ui.editSize = false; return A.setSize([S.plot], d.esize); }
  if (d.unsel) { S.sel.delete(d.unsel); return render(); }
  if (d.bstatus) return A.setStatus(selIds().filter((id) => S.plots[id]), d.bstatus);
  if (d.bsize) return A.setSize(selIds(), d.bsize);
  if (d.btag) { const ids = selIds().filter((id) => S.plots[id]); const all = ids.every((id) => S.plots[id].tags.includes(d.btag)); return A.setTag(ids, d.btag, !all); }
  if (d.tag) return A.setTag([S.plot], d.tag, !S.plots[S.plot].tags.includes(d.tag));
  if (d.prebook) return A.requestPrebook(d.prebook);
  if (d.sale) { ui({ saleFor: d.sale, dropFor: null }); return focusSoon("sp"); }
  if (d.drop) { ui({ dropFor: d.drop, saleFor: null }); return focusSoon("dr"); }
  if (d.again) { const x = S.deals.find((y) => y.id === d.again); return x && A.addInterest(x.client_id, x.plot_id, ""); }
  if (d.cancelreq) return A.cancelRequest(d.cancelreq);
  if (d.approve) return A.decide(d.approve, true, null);
  if (d.reject) { ui({ rejectFor: d.reject }); return focusSoon("rr"); }
  if (d.editclient) return ui({ clientEdit: d.editclient });
  if (d.askdel) return ui({ delClient: d.askdel });
  if (d.delclient) { S.ui.delClient = null; return A.deleteClient(d.delclient); }
  if (d.agent) { S.salesAgent = S.salesAgent === d.agent ? "all" : d.agent; return render(); }
  if (d.editmember) return ui({ memberEdit: d.editmember, memberRole: null });
  if (d.mrole) return ui({ memberRole: d.mrole });
  if (d.dealfile) { S.ui.dealOpen = S.ui.dealOpen === d.dealfile ? null : d.dealfile; S.ui.stageOpen = null; return render(); }
  if (d.opendeal) { const x = S.deals.find((y) => y.id === d.opendeal); if (x) { focusPlot(x.plot_id); S.ui.dealOpen = x.id; render(); } return; }
  if (d.stage && t.classList.contains("stephead")) { S.ui.stageOpen = d.stage; return render(); }
  if (d.setstage) { S.ui.stageOpen = d.setstage; return A.updateDeal(d.deal, d.setstage, {}); }
  if (d.opendoc) return openViewer(d.opendoc);
  if (d.askdeldoc) return ui({ delDoc: d.askdeldoc });
  if (d.deldoc) { S.ui.delDoc = null; return A.deleteDocument(d.deldoc); }
  if (d.calview) { S.calView = d.calview; S._calJump = true; S.ui = {}; return render(); }
  if (d.calgo) { calStep(d.calgo); S._calJump = true; return render(); }
  if (d.calday) { S.calDate = d.calday; S.calView = "day"; S._calJump = true; S.ui = {}; return render(); }
  if (d.calnew != null && t.tagName === "BUTTON") {
    const ev = d.calnew.startsWith("e:") ? d.calnew.slice(2) : null;
    S.ui = { eventOpen: ev ? { edit: ev } : { date: S.calDate || undefined } };
    render(); return focusSoon("ev_t");
  }
  if (d.calitem) return ui({ calItem: d.calitem, delEvent: null });
  if (d.calslot && t === e.target) { S.ui = { eventOpen: slotFromClick(t, e) }; render(); return focusSoon("ev_t"); }
  if (d.evdone) { const ev = S.events.find((x) => x.id === d.evdone); return ev && A.saveEvent(ev.id, { ...ev, done: !ev.done }); }
  if (d.askdelevent) return ui({ delEvent: d.askdelevent });
  if (d.delevent) { S.ui = {}; return A.deleteEvent(d.delevent); }
  if (d.dlapprove) return A.decideDownload(d.dlapprove, true);
  if (d.dlreject) return A.decideDownload(d.dlreject, false);
  if (d.siteplot) { siteFocus(d.siteplot); return; }
  if (d.sizepick) { S.sizePick = d.sizepick; return render(); }
  if (d.bookans) { const [k, v] = d.bookans.split(":"); S.bookAns = { ...(S.bookAns || {}), [k]: v }; return render(); }
  if (d.bookstep) { S.bookStep = Number(d.bookstep); render(); const fc = document.querySelector(".formcard"); if (fc && fc.getBoundingClientRect().top < 60) fc.scrollIntoView({ block: "start" }); return; }
  if (d.togglesblock) { const b = d.togglesblock; if (S.siteBlocks.has(b)) S.siteBlocks.delete(b); else S.siteBlocks.add(b); S.siteFocus = b; S.siteSent = false; return render(); }
  if (d.outlookblock) { S.inv = { ...S.inv, block: d.outlookblock, price: null }; location.hash = "outlook"; return; }
  if (d.invblock) { S.inv = { ...S.inv, block: d.invblock, price: null }; return render(); }
  if (d.invn) { S.inv = { ...S.inv, n: Math.min(10, Math.max(1, S.inv.n + Number(d.invn))) }; return render(); }
  if (d.booktime != null && t.closest("#bookForm")) { S.bookTime = d.booktime; return render(); }
  if (d.acblock) { const cur = new Set(S.ui.acInterests || (S.account && S.account.interests) || []); if (cur.has(d.acblock)) cur.delete(d.acblock); else cur.add(d.acblock); S.ui.acInterests = [...cur]; return render(); }
  if (d.saveplot) {
    const on = !((S.account && S.account.saved) || []).includes(d.saveplot);
    try { await S.api.rpc("save_plot_for_later", { p_plot_id: d.saveplot, p_on: on }); S.account = await S.api.rpc("my_account"); toast(on ? "Plot saved" : "Plot removed"); render(); } catch (err) { toast(err.message, "err"); }
    return;
  }
  if (d.assignlead) { const sel = document.getElementById("la_" + d.assignlead); return sel && sel.value ? A.assignLead(d.assignlead, sel.value) : toast("Choose an agent", "err"); }
  if (d.leadstatus) return A.updateLead(d.lead, d.leadstatus, null);
  if (d.convertlead) return A.convertLead(d.convertlead);
  if (d.toggleactive) {
    const m = S.members.find((x) => x.id === d.toggleactive);
    if (m) return A.saveMember(m.id, { email: m.email, name: m.full_name, phone: m.phone, role: m.role, active: !m.active });
  }
  switch (d.act) {
    case "signIn": try { await S.api.signIn(); } catch (err) { toast(err.message, "err"); } break;
    case "signOut": await S.api.signOut(); break;
    case "switchUser": await S.api.signOut(); break;
    case "resetDemo": await S.api.reset(); location.reload(); break;
    case "alerts": if ("Notification" in window) { await Notification.requestPermission(); render(); } break;
    case "editPrice": ui({ editPrice: true }); focusSoon("pp"); break;
    case "openAdd": ui({ addOpen: true }); focusSoon(document.getElementById("cpick") ? "cpick" : "cn"); break;
    case "cancelAdd": clearDraft("cn", "cp", "cc", "cnote", "cpick"); ui({ addOpen: false }); break;
    case "openFix": ui({ fixOpen: true }); focusSoon("fx"); break;
    case "cancelFix": clearDraft("fx"); ui({ fixOpen: false }); break;
    case "toggleMulti": S.multi = !S.multi; if (S.multi && S.plot && G.geo.plots[S.plot]) S.sel.add(S.plot); if (!S.multi) S.sel = new Set(); S.ui.bulkConfirm = false; render(); break;
    case "clearSel": S.sel = new Set(); ui({ bulkConfirm: false }); break;
    case "bulkAsk": ui({ bulkConfirm: true }); break;
    case "bulkKeep": ui({ bulkConfirm: false }); break;
    case "bulkRemove": S.ui.bulkConfirm = false; await A.removePlots(selIds().filter((id) => S.plots[id])); break;
    case "editSize": ui({ editSize: true }); break;
    case "cancelSize": ui({ editSize: false }); break;
    case "editNote": ui({ editNote: true }); focusSoon("pnote"); break;
    case "cancelNote": clearDraft("pnote"); ui({ editNote: false }); break;
    case "askRemove": ui({ confirmRemove: true }); break;
    case "cancelRemove": ui({ confirmRemove: false }); break;
    case "doRemove": S.ui.confirmRemove = false; await A.removePlots([S.plot]); break;
    case "editOwner": ui({ ownerEdit: true }); focusSoon("on"); break;
    case "cancelOwner": ui({ ownerEdit: false }); break;
    case "openRelist": ui({ relistOpen: true }); focusSoon("rp"); break;
    case "cancelRelist": ui({ relistOpen: false }); break;
    case "cancelSale": clearDraft("sp", "st", "sm", "sd", "sn"); ui({ saleFor: null }); break;
    case "cancelDrop": clearDraft("dr"); ui({ dropFor: null }); break;
    case "newClient": ui({ clientEdit: "new" }); focusSoon("ecn"); break;
    case "cancelClient": clearDraft("ecn", "ecp", "ecc", "ecnote"); ui({ clientEdit: null }); break;
    case "keepClient": ui({ delClient: null }); break;
    case "cancelReject": clearDraft("rr"); ui({ rejectFor: null }); break;
    case "newMember": ui({ memberEdit: "new", memberRole: null }); focusSoon("me_e"); break;
    case "cancelMember": ui({ memberEdit: null, memberRole: null }); break;
    case "keepDoc": ui({ delDoc: null }); break;
    case "loadInvestors": try { S.investors = (await S.api.rpc("investor_list")) || []; render(); } catch (err) { toast(err.message, "err"); } break;
    case "exportInvestors": try { await S.api.saveBlob("investor-list-" + new Date().toISOString().slice(0, 10) + ".csv", new Blob(["\ufeff" + investorsCsv(S.investors || [])], { type: "text/csv" })); } catch (err) { toast(err.message || "The file was not saved.", "err"); } break;
    case "tour": {
      if (tourOn()) { stopTour(); break; }
      const ex = document.querySelector(".explore");
      if (!ex) { S._startTour = true; location.hash = "blocks"; break; }
      ex.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      setTimeout(startTour, 500);
      break;
    }
    case "toApp": S.area = "app"; setHash(S.plot ? "plot-" + S.plot : S.block ? "block-" + S.block : ""); S._resetScroll = true; render(); break;
    case "siteAgain": S.siteSent = false; render(); break;
    case "closePlot": S.sitePlot = null; render(); break;
    case "askPlot": S.siteSent = false; if (d.block) S.siteBlocks.add(d.block); break;
    case "cancelEvent": clearDraft("ev_t", "ev_d", "ev_h", "ev_e", "ev_p", "ev_n"); ui({ eventOpen: null }); break;
    case "calClose": ui({ calItem: null, delEvent: null }); break;
    case "closeViewer": closeViewer(); break;
    case "dlAsk": case "dlNow": case "dlUse": viewerAction(d.act, d); break;
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.id || el.type === "file") return;
  S.draft[el.id] = el.value;
  if (el.id === "salesQ") { S.salesQ = el.value; render(); }
  if (el.id === "budgetRange") { S.budget = Number(el.value); updateBudgetDom(); }
  if (el.id === "invPrice") { S.inv = { ...S.inv, price: Number(el.value) }; updateOutlookDom(); }
  if (el.id === "bk_phone" && document.getElementById("bk_same") && document.getElementById("bk_same").checked) { const w = document.getElementById("bk_wa"); w.value = el.value; S.draft.bk_wa = el.value; }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id && el.type !== "file") S.draft[el.id] = el.value;
  if (el.id === "cpick") syncClientPick();
  if (el.id === "bk_same" && el.checked) { const w = document.getElementById("bk_wa"); w.value = val("bk_phone"); S.draft.bk_wa = w.value; }
  if (el.id === "salesAgent") { S.salesAgent = el.value; render(); }
  if (el.id === "calAgent") { S.calAgent = el.value; render(); }
  if (el.type === "file" && el.dataset.upkind) uploadDoc(el).then(() => refresh(["documents"]));
  if (el.dataset && el.dataset.perm) {
    const m = S.members.find((x) => x.id === el.dataset.mid);
    if (m) A.saveMember(m.id, { email: m.email, name: m.full_name, phone: m.phone, role: m.role, active: m.active, perms: { [el.dataset.perm]: el.checked } });
  }
});

document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  switch (f.id) {
    case "searchForm": {
      const b = val("qb"), n = val("q").replace(/[^0-9]/g, "");
      S.findBlock = b;
      if (!n) return toast("Type a plot number");
      const v = b + "-" + parseInt(n, 10);
      if (!G.geo.plots[v]) return toast("No plot " + v + " on the map. Check the number.", "err");
      clearDraft("q");
      if (matchMedia("(pointer:fine)").matches) S._focusFind = true;
      else if (document.activeElement) document.activeElement.blur(); // phone: close the keyboard so the map shows
      blinkPlot(v);
      if (S.area === "site") return siteFocus(v);
      return focusPlot(v);
    }
    case "enquiryForm": {
      try {
        await S.api.rpc("submit_enquiry", { p_name: val("q_name"), p_phone: val("q_phone"), p_email: val("q_email"), p_message: val("q_msg"),
          p_plot_id: val("q_plot").toUpperCase().replace(/\s+/g, "") || null, p_website: val("q_web") });
        clearDraft("q_name", "q_phone", "q_email", "q_msg", "q_plot");
        S.siteSent = true;
        if (S.user && !S.me) await refresh(["leads"]); else render();
      } catch (e) { toast(e.message || "The enquiry did not send. Try again.", "err"); }
      return;
    }
    case "emailForm": {
      try { await S.api.signInEmail(val("si_email")); S.ui.linkSent = true; render(); } catch (e) { toast(e.message, "err"); }
      return;
    }
    case "accountForm": {
      try {
        await S.api.rpc("save_my_account", { p_full_name: val("ac_name"), p_phone: val("ac_phone"), p_whatsapp: val("ac_wa"),
          p_interests: S.ui.acInterests || (S.account && S.account.interests) || [], p_opt_in: !!(document.getElementById("ac_optin") || {}).checked });
        S.account = await S.api.rpc("my_account"); S.ui.acInterests = null; toast("Saved"); render();
      } catch (e) { toast(e.message, "err"); }
      return;
    }
    case "bookForm": {
      const blocks = [...S.siteBlocks].sort();
      try {
        await S.api.rpc("book_call", { p_name: val("bk_name"), p_phone: val("bk_phone"), p_whatsapp: val("bk_wa"), p_email: val("bk_email"), p_blocks: blocks,
          p_best_time: S.bookTime || "", p_message: [bookSummary(), val("bk_msg")].filter(Boolean).join(" · "), p_opt_in: !!(document.getElementById("bk_optin") || {}).checked,
          p_source: adSource(), p_plot_id: S.sitePlot || null, p_website: val("bk_web") });
        S.siteSent = { name: val("bk_name"), phone: val("bk_phone"), time: S.bookTime, blocks };
        S.bookStep = 1; S.bookAns = {};
        clearDraft("bk_name", "bk_phone", "bk_wa", "bk_email", "bk_msg");
        if (S.user && !S.me) await refresh(["leads"]); else render();
        const f2 = document.querySelector(".formcard"); if (f2) f2.scrollIntoView({ block: "center" });
      } catch (e) { toast(e.message || "The request did not send. Try again.", "err"); }
      return;
    }
    case "leadNoteForm": { const r = await A.updateLead(f.dataset.id, "contacted", val("ln_" + f.dataset.id)); if (r && r.ok) clearDraft("ln_" + f.dataset.id); return; }
    case "siteSettingsForm": {
      const v = {};
      for (const k of ["company", "phone", "whatsapp", "email", "address", "hours", "about", "nearby"]) v[k] = val("ss_" + k);
      return A.saveSiteSettings(v);
    }
    case "priceForm": S.ui.editPrice = false; clearDraft("pp"); return A.setPrice([S.plot], val("pp"));
    case "addPlotForm": {
      const p = G.geo.plots[S.plot];
      const kind = f.querySelector("[data-akind].on") ? f.querySelector("[data-akind].on").dataset.akind : can("add_plots") ? "own" : "listing";
      const size = S.ui.addSize || p.size;
      const r = await A.addPlots([S.plot], val("np"), size, kind, size === "X" ? ["Corner"] : []);
      if (r && r.ok) { clearDraft("np"); S.ui = {}; render(); }
      return;
    }
    case "addClientForm": {
      const pick = val("cpick");
      let r;
      if (pick) r = await A.addInterest(pick, S.plot, val("cnote"));
      else {
        if (!val("cn").trim()) return toast("Add the client's name", "err");
        r = await A.newClientOnPlot(S.plot, { name: val("cn"), phone: val("cp"), cnic: val("cc"), note: val("cnote") });
      }
      if (r && r.ok) { clearDraft("cn", "cp", "cc", "cnote", "cpick"); S.ui.addOpen = false; render(); }
      return;
    }
    case "fixForm": { const r = await A.saveFix(S.plot, val("fx")); if (r && r.ok) { clearDraft("fx"); S.ui.fixOpen = false; render(); } return; }
    case "bulkPriceForm": clearDraft("bp"); return A.bulkPrice(selIds(), val("bp"));
    case "noteForm": { const r = await A.setNote(S.plot, val("pnote")); if (r && r.ok) { clearDraft("pnote"); S.ui.editNote = false; render(); } return; }
    case "ownerForm": {
      const r = await A.saveOwner(S.plot, { name: val("on"), phone: val("op"), demand: val("od"), commission: val("oc"), note: val("onote") });
      if (r && r.ok) { clearDraft("on", "op", "od", "oc", "onote"); S.ui.ownerEdit = false; render(); }
      return;
    }
    case "relistForm": { const r = await A.relist(S.plot, val("rp")); if (r && r.ok) { clearDraft("rp"); S.ui.relistOpen = false; render(); } return; }
    case "saleForm": {
      const r = await A.requestSale(f.dataset.deal, { price: val("sp"), token: val("st"), mode: val("sm"), deadline: val("sd"), note: val("sn") });
      if (r && r.ok) { clearDraft("sp", "st", "sm", "sd", "sn"); S.ui.saleFor = null; render(); }
      return;
    }
    case "dropForm": { const r = await A.dropDeal(f.dataset.deal, val("dr")); if (r && r.ok) { clearDraft("dr"); S.ui.dropFor = null; render(); } return; }
    case "clientForm": {
      const r = await A.saveClient(f.dataset.id || null, { name: val("ecn"), phone: val("ecp"), cnic: val("ecc"), note: val("ecnote") });
      if (r && r.ok) { clearDraft("ecn", "ecp", "ecc", "ecnote"); S.ui.clientEdit = null; render(); }
      return;
    }
    case "rejectForm": { const r = await A.decide(f.dataset.id, false, val("rr")); if (r && r.ok) { clearDraft("rr"); S.ui.rejectFor = null; render(); } return; }
    case "dlForm": return sendDownloadRequest(val("dl_reason"));
    case "stageForm": {
      const fields = {};
      f.querySelectorAll("[data-f]").forEach((i) => { fields[i.dataset.f] = i.dataset.f === "token_amount" ? i.value.replace(/[^0-9]/g, "") : i.value; });
      const r = await A.updateDeal(f.dataset.deal, null, fields, "Details saved");
      if (r && r.ok) { f.querySelectorAll("[data-f]").forEach((i) => clearDraft(i.id)); render(); }
      return;
    }
    case "eventForm": {
      const old = f.dataset.edit ? S.events.find((x) => x.id === f.dataset.edit) : null;
      const r = await A.saveEvent(old ? old.id : null, { title: val("ev_t"), on_date: val("ev_d"), at_time: val("ev_h"), end_time: val("ev_e"), plot_id: val("ev_p"),
        note: val("ev_n"), deal_id: old ? old.deal_id : null, done: old ? old.done : false });
      if (r && r.ok) { clearDraft("ev_t", "ev_d", "ev_h", "ev_e", "ev_p", "ev_n"); S.ui = {}; S.calDate = val("ev_d") || S.calDate; render(); }
      return;
    }
    case "memberForm": {
      const role = S.ui.memberRole || (f.dataset.id ? (S.members.find((m) => m.id === f.dataset.id) || {}).role : "agent") || "agent";
      const perms = {};
      if (role === "agent") for (const [k] of PERMS) { const c = document.getElementById("mp_" + k); if (c) perms[k] = c.checked; }
      const old = S.members.find((m) => m.id === f.dataset.id);
      const r = await A.saveMember(f.dataset.id || null, { email: val("me_e"), name: val("me_n"), phone: val("me_p"), role, active: old ? old.active : true, perms });
      if (r && r.ok) { S.ui.memberEdit = null; S.ui.memberRole = null; render(); }
      return;
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && viewerOpen()) { closeViewer(); return; }
  if (e.key !== "Escape" || S.tab !== "map") return;
  if (S.plot) go("block", S.block);
  else if (S.view === "block") go("all");
});
window.addEventListener("focus", () => { if (S.me) refresh(TABLES); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && S.me) refresh(TABLES); });

// ---------------------------------------------------------------- start
(async function boot() {
  render();
  try {
    const r = await fetch("plotdata.json");
    G.raw = await r.json();
    G.world = [0, 0, G.raw.w, G.raw.h];
    G.geo = buildGeo(G.raw, {});
  } catch (e) {
    S.bootErr = "The layout plan did not load. Reload the page to try again.";
    return render();
  }
  try {
    S.api = await createApi();
    S.mode = S.api.mode;
    document.body.classList.toggle("demo", S.mode === "demo");
    S.api.onAuthChange(() => startSession());
    await startSession();
  } catch (e) {
    console.error(e);
    S.bootErr = "The app could not start: " + e.message;
    render();
  }
  adSource(); // keep the ad that brought the visitor
  if (import.meta.env.PROD && S.mode === "live" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

// for tests in the browser console
window.__orchard = { S, G, refresh: () => refresh(TABLES), dealsFor };
