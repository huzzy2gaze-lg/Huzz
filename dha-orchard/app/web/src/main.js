// Orchard Sales: app start, data loading, live updates, screen drawing and user input.
import "./styles.css";
import { S, G, hooks, $, esc, num, iso, isAdmin, can, toast, notice, totals, nameOf, dealsFor } from "./core.js";
import { buildGeo } from "./geo.js";
import { createApi, TABLES } from "./api/index.js";
import { go, focusPlot, blinkPlot, fromHash, attachMap, resetLift, setHash } from "./map.js";
import { allView, blockView } from "./panels.js";
import { loginPage, noAccessPage, salesPage, approvalsPage, teamPage, PERMS } from "./pages.js";
import * as A from "./actions.js";
import { calendarPage, dueCount } from "./calendar.js";
import { uploadDoc, dstr, DOC_KINDS } from "./deal.js";

hooks.go = go;
hooks.focusPlot = focusPlot;
hooks.render = render;
hooks.refresh = () => refresh(TABLES);

// ---------------------------------------------------------------- data
const norm = {
  plots: (r) => ({ ...r, price: num(r.price), tags: r.tags || [], updated_at: iso(r.updated_at), created_at: iso(r.created_at) }),
  deals: (r) => {
    const o = { ...r, sale_price: num(r.sale_price), token_amount: num(r.token_amount), created_at: iso(r.created_at), updated_at: iso(r.updated_at) };
    for (const k of ["agreement_on", "transfer_deadline", "ndc_submitted_on", "ndc_expected", "ndc_approved_on", "transfer_on", "allotment_expected", "allotment_received"]) o[k] = dstr(r[k]) || null;
    return o;
  },
  documents: (r) => ({ ...r, size_bytes: num(r.size_bytes), created_at: iso(r.created_at) }),
  events: (r) => ({ ...r, on_date: dstr(r.on_date), at_time: r.at_time ? String(r.at_time).slice(0, 5) : null, created_at: iso(r.created_at) }),
  requests: (r) => ({ ...r, sale_price: num(r.sale_price), token_amount: num(r.token_amount), created_at: iso(r.created_at), decided_at: iso(r.decided_at), transfer_deadline: iso(r.transfer_deadline) }),
  activity: (r) => ({ ...r, id: Number(r.id), at: iso(r.at) }),
  clients: (r) => ({ ...r, created_at: iso(r.created_at), updated_at: iso(r.updated_at) }),
};

async function loadTable(t) {
  const api = S.api;
  if (t === "members" && !isAdmin()) { S.members = []; return; }
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
  S.documents = []; S.events = []; S.fileUrls = {}; S.calAgent = "all";
  if (S.user) {
    try { S.me = await S.api.rpc("me"); } catch (e) { S.bootErr = e.message; }
    if (S.me) {
      await refresh(TABLES);
      unsub = S.api.subscribe((t) => refresh(t === "*" ? TABLES : DEPS[t] || [t]), (st) => { S.live = st; renderHeader(); });
    }
  }
  S.booting = false;
  fromHash();
  render();
}

// ---------------------------------------------------------------- drawing
function renderHeader() {
  const bar = $("#bar");
  if (!S.me) { bar.hidden = true; $("#tabs").hidden = true; return; }
  bar.hidden = false;
  const pend = S.requests.filter((r) => r.status === "pending").length;
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
  $("#who").innerHTML = `<span class="sync">${live}</span><span class="me"><span class="av sm" style="background:${S.me.color}">${esc((S.me.full_name || S.me.email)[0].toUpperCase())}</span><span class="mename">${esc(S.me.full_name || S.me.email)}<small>${S.me.role === "admin" ? "Admin" : "Sales agent"}</small></span></span>${S.mode === "artifact" ? "" : `<button class="out" data-act="${S.mode === "demo" ? "switchUser" : "signOut"}">${S.mode === "demo" ? "Switch person" : "Sign out"}</button>`}`;
}

function render() {
  const app = $("#app");
  if (S.booting || !G.geo) {
    app.innerHTML = `<div class="center"><div class="empty">${S.bootErr ? esc(S.bootErr) : "Loading the official layout plan…"}</div></div>`;
    return;
  }
  renderHeader();
  document.body.dataset.tab = S.me ? S.tab : "login";
  const ae = document.activeElement;
  const focusId = ae && ae.id && app.contains(ae) ? ae.id : null;
  const caret = focusId && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  const keepScroll = [...app.querySelectorAll(".scroll,.page")].map((e) => e.scrollTop);
  resetLift();
  if (!S.user) app.innerHTML = S.mode === "artifact" ? noAccessPage() : loginPage();
  else if (!S.me) app.innerHTML = noAccessPage();
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
      document.querySelectorAll(`[data-opendoc="${doc.id}"]`).forEach((el) => { el.innerHTML = `<img src="${esc(u)}" alt="">`; });
    }).catch(() => { delete S.fileUrls[doc.path]; });
  }
}
async function openDoc(id) {
  const doc = S.documents.find((x) => x.id === id);
  if (!doc) return;
  if (doc.mime === "application/pdf") {
    try { await S.api.openFile(doc); } catch (e) { toast(e.message || "The file did not open.", "err"); }
    return;
  }
  const url = S.fileUrls[doc.path] || (await S.api.fileUrl(doc.path).catch(() => ""));
  if (!url) return toast("The photo did not load. Try again.", "err");
  let v = $("#viewer");
  if (!v) { v = document.createElement("div"); v.id = "viewer"; document.body.appendChild(v); }
  v.innerHTML = `<div class="vbar"><b>${esc(DOC_KINDS[doc.kind] || doc.kind)}</b><span>${esc(doc.file_name)}</span><button class="out" data-act="closeViewer">Close</button></div><img src="${esc(url)}" alt="${esc(doc.file_name)}">`;
  v.hidden = false;
}

function syncClientPick() {
  const pick = $("#cpick"), box = $("#newClientFields");
  if (pick && box) box.hidden = !!pick.value;
}

function setTab(t) {
  S.tab = t;
  S.ui = {};
  S._resetScroll = true;
  if (t === "map") setHash(S.plot ? "plot-" + S.plot : S.block ? "block-" + S.block : "");
  else setHash(t);
  render();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { if (S._hashLock) { S._hashLock = false; return; } if (S.me) fromHash(); });

// ---------------------------------------------------------------- input
const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
const clearDraft = (...ids) => ids.forEach((k) => delete S.draft[k]);
const ui = (patch) => { Object.assign(S.ui, patch); render(); };
const focusSoon = (id) => setTimeout(() => { const i = document.getElementById(id); if (i) { i.focus(); if (i.select) i.select(); } });
const selIds = () => [...S.sel].filter((id) => G.geo.plots[id] && G.geo.plots[id].num != null);

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button,[data-agent]");
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
  if (d.opendoc) return openDoc(d.opendoc);
  if (d.askdeldoc) return ui({ delDoc: d.askdeldoc });
  if (d.deldoc) { S.ui.delDoc = null; return A.deleteDocument(d.deldoc); }
  if (d.calview) { S.calView = d.calview; return render(); }
  if (d.calmonth) { S.calMonth = d.calmonth; return render(); }
  if (d.calday) { S.calDay = d.calday; return render(); }
  if (d.evdone) { const e = S.events.find((x) => x.id === d.evdone); return e && A.saveEvent(e.id, { ...e, done: !e.done }); }
  if (d.askdelevent) return ui({ delEvent: d.askdelevent });
  if (d.delevent) { S.ui.delEvent = null; return A.deleteEvent(d.delevent); }
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
    case "newEvent": ui({ eventOpen: true }); focusSoon("ev_t"); break;
    case "cancelEvent": clearDraft("ev_t", "ev_d", "ev_h", "ev_p", "ev_n"); ui({ eventOpen: false }); break;
    case "closeViewer": { const v = $("#viewer"); if (v) v.hidden = true; break; }
  }
});

document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.id || el.type === "file") return;
  S.draft[el.id] = el.value;
  if (el.id === "salesQ") { S.salesQ = el.value; render(); }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id && el.type !== "file") S.draft[el.id] = el.value;
  if (el.id === "cpick") syncClientPick();
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
      return focusPlot(v);
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
    case "stageForm": {
      const fields = {};
      f.querySelectorAll("[data-f]").forEach((i) => { fields[i.dataset.f] = i.dataset.f === "token_amount" ? i.value.replace(/[^0-9]/g, "") : i.value; });
      const r = await A.updateDeal(f.dataset.deal, null, fields, "Details saved");
      if (r && r.ok) { f.querySelectorAll("[data-f]").forEach((i) => clearDraft(i.id)); render(); }
      return;
    }
    case "eventForm": {
      const r = await A.saveEvent(null, { title: val("ev_t"), on_date: val("ev_d"), at_time: val("ev_h"), plot_id: val("ev_p"), note: val("ev_n") });
      if (r && r.ok) { clearDraft("ev_t", "ev_d", "ev_h", "ev_p", "ev_n"); S.ui.eventOpen = false; S.calDay = val("ev_d") || S.calDay; render(); }
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
  const v = $("#viewer");
  if (e.key === "Escape" && v && !v.hidden) { v.hidden = true; return; }
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
  if (import.meta.env.PROD && S.mode === "live" && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

// for tests in the browser console
window.__orchard = { S, G, refresh: () => refresh(TABLES), dealsFor };
