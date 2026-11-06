// Test version on claude.ai. The artifact's shared database stands in for the real server:
// it gives the same tables and the same functions to the app, so the team can test together.
//
// Who is who: an Editor or the Owner of the page is an admin; a Contributor is a sales agent.
// Privacy: each agent's clients, deals, requests, documents and calendar entries are kept under
// agents/<their id>/, and the page's access rules let only that agent and the admins read them.
// Other checks (permission switches, sale rules) run in the page in this test version. On the real
// server the database checks all of them.
import { TABLES } from "./index.js";

const PRIV = ["clients", "deals", "requests", "owners", "docs", "events", "log", "dlreq", "leads"];
const CHUNK = 180000; // characters of a file in one database document
const PALETTE = ["#2F6F8F", "#8F4A2F", "#5B7F2F", "#7A3F8F", "#2F8F7A", "#8F7A2F", "#3F4F8F", "#8F2F5B"];
const STAGES = ["token", "ndc_submitted", "ndc_approved", "transfer_date", "transfer_done", "closed"];
const STAGE_LABEL = { token: "Token (Bayana)", ndc_submitted: "NDC submitted", ndc_approved: "NDC approved", transfer_date: "Transfer date set", transfer_done: "Transfer done", closed: "Allotment letter received, deal closed" };
const STAGE_KINDS = { plot: ["lp_letter"], interested: ["cnic"], prebooked: ["cnic"], token: ["agreement", "token_receipt"], ndc_submitted: ["ndc_application"],
  ndc_approved: ["ndc"], transfer_date: ["transfer_letter"], transfer_done: ["pay_order", "transfer_receipt"], closed: ["allotment_letter"] };
const ORDER = ["interested", "prebooked", "token", "ndc_submitted", "ndc_approved", "transfer_date", "transfer_done", "closed"];
const PERM_KEYS = ["can_edit_price", "can_add_plots", "can_add_listings", "can_mark_sold", "can_upload_docs", "can_export"];
const DEFAULT_PERMS = { can_edit_price: false, can_add_plots: false, can_add_listings: false, can_mark_sold: true, can_upload_docs: true, can_export: false };

const now = () => new Date().toISOString();
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const fail = (msg) => { throw new Error(msg); };
const cr = (v) => (v == null ? "—" : Number(v).toFixed(2) + " Cr");
const sizeLabel = (z) => ({ "1K": "1 Kanal", "14M": "14 Marla", "10M": "10 Marla", X: "corner or irregular" })[z] || z;
const statusLabel = (s) => ({ available: "available", prebooked: "pre-booked", sold_pending: "sold, waiting for approval", sold: "sold" })[s] || s;
const okPrice = (p) => p != null && isFinite(p) && p > 0 && p < 1000;
const PLOT_RE = /^[A-H]-[0-9]{1,4}$/;
const strip = (row) => { const { id, _agent, ...rest } = row; return rest; };
function dataUrlToBlob(u) {
  const [head, b64] = u.split(",");
  const mime = (head.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function create() {
  const C = window.claude;
  if (!C || !C.use) throw new Error("Open this page on claude.ai to use the test version.");
  const [db, user] = await Promise.all([C.use("db"), C.use("user")]);
  const downloads = await C.use("downloads").catch(() => null);
  if (!db || !user) throw new Error("The shared data is not available in this view. Open the page on claude.ai while signed in.");
  const meV = await user.me();
  const uid = meV.id;
  const admin = !!(meV.canEdit || meV.isOwner);
  const writeOk = (await user.can("data.write")) !== false;

  // ---------------------------------------------------------------- cache of shared data
  const shared = { plots: {}, fixes: {}, people: {}, perms: {}, pubdeals: {}, activity: [], pings: {}, settings: {} };
  const ready = {};
  let listener = null;
  const subs = [];
  const watch = (key, q, fn) => new Promise((res) => {
    subs.push(q.onSnapshot((snap) => { fn(snap); ready[key] = true; res(); if (listener) listener(key); }, () => { ready[key] = true; res(); }));
  });
  const asMap = (snap) => Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
  const firstLoad = Promise.all([
    watch("plots", db.collection("plots"), (s) => (shared.plots = asMap(s))),
    watch("fixes", db.collection("fixes"), (s) => (shared.fixes = asMap(s))),
    watch("people", db.collection("people"), (s) => (shared.people = asMap(s))),
    watch("perms", db.collection("perms"), (s) => (shared.perms = asMap(s))),
    watch("pubdeals", db.collection("pubdeals"), (s) => (shared.pubdeals = asMap(s))),
    watch("activity", db.collection("activity").orderBy("at", "desc").limit(80), (s) => (shared.activity = s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    watch("pings", db.collection("pings"), (s) => (shared.pings = asMap(s))),
    watch("settings", db.collection("settings"), (s) => (shared.settings = (asMap(s).site) || {})),
  ]);
  await Promise.race([firstLoad, new Promise((r) => setTimeout(r, 8000))]);

  // register this person, so that the admins see them on the Team page
  if (uid && writeOk) {
    const p = shared.people[uid];
    const role = admin ? "admin" : "agent";
    if (!p || p.role !== role) await db.doc("people/" + uid).set({ ...(p || {}), role, joined_at: (p && p.joined_at) || now() }).catch(() => {});
  }

  // ---------------------------------------------------------------- private data (per agent)
  const priv = {}; // agentId -> { ver, data: {col: {id: row}} }
  const agentIds = () => [...new Set([...Object.keys(shared.people), ...Object.values(shared.pubdeals).map((x) => x.agent_id)].filter(Boolean))];
  const visibleAgents = () => (admin ? agentIds() : uid ? [uid] : []);
  async function loadAgent(a, force) {
    const ver = (shared.pings[a] && shared.pings[a].at) || 0;
    if (!force && priv[a] && priv[a].ver === ver) return priv[a].data;
    const data = {};
    await Promise.all(PRIV.map(async (c) => {
      const snap = await db.collection(`agents/${a}/${c}`).get().catch(() => ({ docs: [] }));
      data[c] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    }));
    priv[a] = { ver, data };
    return data;
  }
  async function all(col) {
    const out = [];
    for (const a of visibleAgents()) { const d = await loadAgent(a); for (const id in d[col]) out.push({ id, ...d[col][id], _agent: a }); }
    return out;
  }
  const pdoc = (a, col, id) => db.doc(`agents/${a}/${col}/${id}`);
  async function pset(a, col, id, data) {
    await pdoc(a, col, id).set(data);
    if (priv[a]) priv[a].data[col][id] = data;
  }
  async function pdel(a, col, id) {
    await pdoc(a, col, id).delete();
    if (priv[a]) delete priv[a].data[col][id];
  }
  async function ping(...agents) {
    for (const a of new Set(agents.filter(Boolean))) {
      const at = Date.now();
      await db.doc("pings/" + a).set({ at }).catch(() => {});
      if (priv[a]) priv[a].ver = at;
    }
  }
  async function findPriv(col, id) {
    for (const a of visibleAgents()) { const d = await loadAgent(a); if (d[col][id]) return { a, row: { id, ...d[col][id] } }; }
    return null;
  }

  // ---------------------------------------------------------------- who am I
  function member() {
    if (!uid || !writeOk) return null;
    const pr = shared.perms[uid] || {};
    if (pr.active === false) return null;
    const pp = shared.people[uid] || {};
    const m = { id: uid, email: meV.email || "", full_name: pr.full_name || pp.full_name || meV.name || "", phone: pr.phone || "", role: admin ? "admin" : "agent", active: true, color: meV.color || "#6E8B7B" };
    for (const k of PERM_KEYS) m[k] = admin ? true : pr[k] != null ? !!pr[k] : DEFAULT_PERMS[k];
    return m;
  }
  const requireMember = () => member() || fail("Your account is not active. Ask an admin.");
  function can(perm, what) {
    const m = requireMember();
    if (m.role !== "admin" && !m["can_" + perm]) fail(`You do not have permission to ${what}. Ask an admin.`);
    return m;
  }
  const requireAdmin = () => { const m = requireMember(); if (m.role !== "admin") fail("Only an admin can do this."); return m; };
  const ownOrAdmin = (agent) => { if (!agent || (agent !== uid && !admin)) fail("This record belongs to another agent."); };

  async function logPublic(plot, kind, body) {
    await db.collection("activity").doc(rid()).set({ at: now(), actor: uid, plot_id: plot || null, kind, body });
  }
  async function logPrivate(agent, plot, kind, body) {
    await pset(agent, "log", rid(), { at: now(), actor: uid, plot_id: plot || null, kind, body, private_to: agent });
  }
  const nameOf = (id) => { const pr = shared.perms[id] || {}, pp = shared.people[id] || {}; return pr.full_name || pp.full_name || (id === uid ? meV.name : "") || "Someone"; };

  // ---------------------------------------------------------------- shapes for the app
  function plotRow(id, d) {
    return { id, block: d.block || id.split("-")[0], num: d.num || Number(id.split("-")[1]), size: d.size || "10M", kind: d.kind || "own",
      status: d.status || "available", price: d.price ?? null, tags: d.tags || [], note: d.note || "", holder_deal: d.holder_deal || null,
      added_by: d.added_by || null, updated_by: d.updated_by || d.updatedBy || null, updated_at: d.updated_at || d.updatedAt || null, created_at: d.created_at || null };
  }
  async function plotGet(id) {
    const s = await db.doc("plots/" + id).get();
    return s.exists ? plotRow(id, s.data()) : null;
  }
  async function plotUpdate(id, patch) {
    const s = await db.doc("plots/" + id).get();
    if (!s.exists) fail("This plot is not in our stock.");
    await db.doc("plots/" + id).set({ ...s.data(), ...patch, updated_by: uid, updated_at: now() });
  }
  let profiles = {};
  async function names(ids) {
    const miss = ids.filter((i) => !profiles[i]);
    if (miss.length) { try { Object.assign(profiles, await user.profiles(miss)); } catch (e) { /* names stay empty */ } }
    return profiles;
  }

  async function select(table) {
    if (!TABLES.includes(table)) fail("Unknown table " + table);
    if (table === "site_settings") return Object.entries({ company: "WH Ventures", ...shared.settings }).map(([key, value]) => ({ key, value }));
    const m = member();
    if (!m) return [];
    switch (table) {
      case "leads": return leadsList();
      case "plots": return Object.entries(shared.plots).filter(([id]) => PLOT_RE.test(id)).map(([id, d]) => plotRow(id, d));
      case "plot_fixes": return Object.entries(shared.fixes).map(([key, d]) => ({ key, n: d.n || null, size: d.size || null }));
      case "people": {
        const ids = agentIds();
        const ps = await names(ids);
        return ids.map((id, i) => {
          const pr = shared.perms[id] || {}, pp = shared.people[id] || {};
          return { id, name: pr.full_name || (ps[id] && ps[id].name) || pp.full_name || "Team member", role: pp.role || "agent",
            color: (ps[id] && ps[id].color) || PALETTE[i % PALETTE.length], active: pr.active !== false };
        });
      }
      case "plot_demand": {
        const c = {};
        for (const d of Object.values(shared.pubdeals)) if (d.active) c[d.plot_id] = (c[d.plot_id] || 0) + 1;
        return Object.entries(c).map(([plot_id, interested]) => ({ plot_id, interested }));
      }
      case "members": {
        if (!admin) return [];
        const ids = agentIds();
        const ps = await names(ids);
        return ids.map((id, i) => {
          const pr = shared.perms[id] || {}, pp = shared.people[id] || {};
          const row = { id, email: (ps[id] && ps[id].email) || "", full_name: pr.full_name || (ps[id] && ps[id].name) || "", phone: pr.phone || "",
            role: pp.role || "agent", active: pr.active !== false, color: (ps[id] && ps[id].color) || PALETTE[i % PALETTE.length] };
          for (const k of PERM_KEYS) row[k] = pr[k] != null ? !!pr[k] : DEFAULT_PERMS[k];
          return row;
        });
      }
      case "activity": {
        const mine = (await all("log")).map(({ _agent, ...r }) => r);
        return [...shared.activity, ...mine].map((r) => ({ ...r, id: Date.parse(r.at) || 0, private_to: r.private_to || null }))
          .sort((a, b) => b.id - a.id).slice(0, 80);
      }
      case "clients": return (await all("clients")).map(({ _agent, ...r }) => ({ ...r, agent_id: _agent }));
      case "deals": return (await all("deals")).map(({ _agent, ...r }) => ({ ...r, agent_id: _agent }));
      case "requests": return (await all("requests")).map(({ _agent, ...r }) => ({ ...r, agent_id: _agent }));
      case "listing_owners": return (await all("owners")).map(({ _agent, id, ...r }) => ({ ...r, plot_id: id, agent_id: _agent }));
      case "documents": return (await all("docs")).map(({ _agent, ...r }) => ({ ...r, owner_agent: _agent }));
      case "events": return (await all("events")).map(({ _agent, ...r }) => ({ ...r, agent_id: _agent }));
      case "download_requests": return (await all("dlreq")).map(({ _agent, ...r }) => ({ ...r, requested_by: _agent }));
    }
    return [];
  }

  // ---------------------------------------------------------------- website enquiries
  // leads/<sender>/items/<id> holds each enquiry; admins read them all. When an admin assigns one,
  // a copy goes to agents/<agent>/leads/<id>, which the agent reads and updates.
  async function leadsAll() {
    const out = [];
    const senders = (await db.collection("leads").get().catch(() => ({ docs: [] }))).docs.map((d) => d.id);
    for (const s of senders) {
      const snap = await db.collection(`leads/${s}/items`).get().catch(() => ({ docs: [] }));
      for (const d of snap.docs) out.push({ id: d.id, ...d.data(), _sender: s });
    }
    return out;
  }
  async function leadsList() {
    if (admin) {
      const copies = {};
      for (const c of await all("leads")) copies[c.id] = c;
      return (await leadsAll()).map((l) => { const c = copies[l.id]; const { _sender, ...rest } = l; return c ? { ...rest, status: c.status, note: c.note, client_id: c.client_id || null } : rest; });
    }
    return (await all("leads")).map(({ _agent, ...r }) => r);
  }
  async function leadFind(id) {
    if (admin) { const l = (await leadsAll()).find((x) => x.id === id); if (l) return l; }
    const f = await findPriv("leads", id);
    return f ? { ...f.row, _copy: f.a } : null;
  }

  // ---------------------------------------------------------------- server functions
  const DOC_LABEL = { lp_letter: "LP letter", agreement: "Agreement", token_receipt: "Token payment proof", cnic: "CNIC copy", ndc_application: "NDC application", ndc: "NDC",
    transfer_letter: "Transfer date letter", pay_order: "Pay order", transfer_receipt: "Authority receipt", allotment_letter: "Allotment letter" };
  const docLabel = (row) => (DOC_LABEL[row.kind] || "Document") + " of " + row.plot_id;
  async function seeDoc(id) {
    const f = await findPriv("docs", id);
    if (!f || !(admin || f.a === uid || f.row.uploaded_by === uid)) fail("This document does not exist.");
    return f;
  }
  async function dealFind(id) {
    const f = await findPriv("deals", id);
    if (!f) fail("This record belongs to another agent.");
    return { a: f.a, d: f.row };
  }
  async function clientName(a, cid) { const d = await loadAgent(a); return (d.clients[cid] && d.clients[cid].name) || "Client"; }
  async function saveDeal(a, d) { const { id, ...rest } = d; await pset(a, "deals", id, { ...rest, updated_at: now() }); }

  async function decide(reqId, approve, reason) {
    requireAdmin();
    const f = await findPriv("requests", reqId);
    if (!f || f.row.status !== "pending") fail("This request is already closed.");
    const r = f.row, a = f.a;
    const { d } = await dealFind(r.deal_id);
    const p = await plotGet(r.plot_id);
    const nm = await clientName(a, d.client_id);
    const by = nameOf(uid);
    const why = String(reason || "").trim() || null;
    const close = async (pred, why2) => {
      for (const ag of agentIds()) {
        const data = await loadAgent(ag, true);
        for (const [id, q] of Object.entries(data.requests)) if (q.status === "pending" && id !== r.id && pred(q)) {
          await pset(ag, "requests", id, { ...q, status: "closed", reason: why2, decided_by: uid, decided_at: now() }); await ping(ag);
        }
      }
    };
    if (r.kind === "prebook") {
      if (approve) {
        if (!p || p.status !== "available") fail(`${r.plot_id} is not available any more.`);
        await plotUpdate(r.plot_id, { status: "prebooked", holder_deal: r.deal_id });
        await saveDeal(a, { ...d, stage: "prebooked" });
        await pset(a, "requests", r.id, { ...strip(r), status: "approved", decided_by: uid, decided_at: now(), reason: why });
        await close((q) => q.plot_id === r.plot_id && q.kind === "prebook", "Another client was pre-booked.");
        await logPublic(r.plot_id, "status", r.plot_id + " pre-booked");
        await logPrivate(a, r.plot_id, "approved", `Pre-booking approved: ${r.plot_id} for ${nm} · by ${by}`);
      } else {
        await pset(a, "requests", r.id, { ...strip(r), status: "rejected", decided_by: uid, decided_at: now(), reason: why });
        await logPrivate(a, r.plot_id, "rejected", `Pre-booking not approved: ${r.plot_id} for ${nm}${why ? " · " + why : ""} · by ${by}`);
      }
    } else if (approve) {
      await plotUpdate(r.plot_id, { status: "sold", holder_deal: r.deal_id });
      await saveDeal(a, { ...d, sold: true, sale_price: r.sale_price, token_amount: r.token_amount, payment_mode: r.payment_mode,
        transfer_deadline: r.transfer_deadline, stage: ["interested", "prebooked"].includes(d.stage) ? "token" : d.stage });
      await pset(a, "requests", r.id, { ...strip(r), status: "approved", decided_by: uid, decided_at: now(), reason: why });
      await close((q) => q.plot_id === r.plot_id, "The plot was sold.");
      for (const ag of agentIds()) {
        const data = await loadAgent(ag);
        for (const [id, x] of Object.entries(data.deals)) if (x.plot_id === r.plot_id && id !== r.deal_id && x.stage === "prebooked") { await saveDeal(ag, { id, ...x, stage: "interested" }); await ping(ag); }
      }
      await logPublic(r.plot_id, "status", r.plot_id + " sold");
      await logPrivate(a, r.plot_id, "approved", `Sale approved: ${r.plot_id} to ${nm} for ${cr(r.sale_price)} · by ${by}`);
    } else {
      await plotUpdate(r.plot_id, { status: r.prev_status || "available", holder_deal: r.prev_holder || null });
      await pset(a, "requests", r.id, { ...strip(r), status: "rejected", decided_by: uid, decided_at: now(), reason: why });
      await logPublic(r.plot_id, "status", `${r.plot_id} is ${statusLabel(r.prev_status || "available")} again`);
      await logPrivate(a, r.plot_id, "rejected", `Sale not approved: ${r.plot_id} to ${nm}${why ? " · " + why : ""} · by ${by}`);
    }
    await ping(a, uid);
  }

  async function releasePlot(id, reason) {
    const p = await plotGet(id);
    for (const ag of agentIds()) {
      const data = await loadAgent(ag, true);
      let changed = false;
      for (const [qid, q] of Object.entries(data.requests)) if (q.plot_id === id && q.status === "pending") { await pset(ag, "requests", qid, { ...q, status: "closed", reason, decided_by: uid, decided_at: now() }); changed = true; }
      if (p && p.holder_deal && data.deals[p.holder_deal] && data.deals[p.holder_deal].stage === "prebooked" && !data.deals[p.holder_deal].sold) {
        await saveDeal(ag, { id: p.holder_deal, ...data.deals[p.holder_deal], stage: "interested" }); changed = true;
      }
      if (changed) await ping(ag);
    }
  }

  const F = {
    me: async () => member(),
    my_account: async () => null,
    save_my_account: async () => fail("Client accounts work on the real website."),
    save_plot_for_later: async () => fail("Client accounts work on the real website."),
    submit_enquiry: async ({ p_name, p_phone, p_email, p_message, p_plot_id, p_website }) => {
      if (p_website) return null;
      if (!uid || !writeOk) fail("On the test page, you need Contributor access to send an enquiry.");
      if (String(p_name || "").trim().length < 2) fail("Write your name.");
      const phone = String(p_phone || "").trim(), email = String(p_email || "").trim().toLowerCase();
      if (!/^[0-9]{7,15}$/.test(phone.replace(/[^0-9]/g, "")) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Write a phone number or an e-mail address, so that we can answer you.");
      if (p_plot_id && !PLOT_RE.test(p_plot_id)) fail("Not a plot number.");
      const id = rid();
      await db.doc("leads/" + uid).set({ at: now() });
      await db.doc(`leads/${uid}/items/${id}`).set({ name: String(p_name).trim().slice(0, 80), phone: phone.slice(0, 40), email: email.slice(0, 120),
        message: String(p_message || "").trim().slice(0, 1000), plot_id: p_plot_id || null, status: "new", assigned_to: null, note: "", created_at: now() });
      await logPrivate(uid, p_plot_id, "lead", `New website enquiry: ${String(p_name).trim().slice(0, 80)}${p_plot_id ? " · " + p_plot_id : ""}`);
      await ping(uid);
      return id;
    },
    book_call: async ({ p_name, p_phone, p_whatsapp, p_email, p_blocks, p_best_time, p_message, p_opt_in, p_source, p_plot_id, p_website }) => {
      if (p_website) return null;
      if (!uid || !writeOk) fail("On the test page, you need Contributor access to book a call.");
      if (String(p_name || "").trim().length < 2) fail("Write your name.");
      const phone = String(p_phone || "").trim(), email = String(p_email || "").trim().toLowerCase();
      if (!/^[0-9]{7,15}$/.test(phone.replace(/[^0-9]/g, ""))) fail("Write your phone number, so that we can call you.");
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("The e-mail address is not valid.");
      const blocks = [...new Set((p_blocks || []).map((b) => String(b).toUpperCase()).filter((b) => /^[A-H]$/.test(b)))].sort();
      const id = rid();
      await db.doc("leads/" + uid).set({ at: now() });
      await db.doc(`leads/${uid}/items/${id}`).set({ name: String(p_name).trim().slice(0, 80), phone: phone.slice(0, 40), whatsapp: String(p_whatsapp || "").trim().slice(0, 40),
        email: email.slice(0, 120), message: String(p_message || "").trim().slice(0, 1000), plot_id: p_plot_id || null, blocks, best_time: p_best_time || "",
        marketing_opt_in: !!p_opt_in, source: String(p_source || "").slice(0, 200), status: "new", assigned_to: null, note: "", created_at: now() });
      await logPrivate(uid, p_plot_id, "lead", `Call booked on the website: ${String(p_name).trim().slice(0, 80)}${blocks.length ? " · Block " + blocks.join(", ") : ""}`);
      await ping(uid);
      return id;
    },
    investor_list: async () => {
      const m = requireMember();
      if (!admin && !m.can_export) fail("You do not have permission to see the investor list. Ask an admin.");
      const seen = new Set(), out = [];
      for (const l of (await leadsAll()).filter((x) => x.marketing_opt_in).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))) {
        const key = (l.phone || "").replace(/[^0-9]/g, "") || l.email;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ name: l.name, phone: l.phone, whatsapp: l.whatsapp || "", email: l.email, blocks: l.blocks || [], source: l.source || "", joined: l.created_at, origin: "booked call" });
      }
      return out;
    },
    assign_lead: async ({ p_id, p_agent }) => {
      requireAdmin();
      const l = await leadFind(p_id);
      if (!l || !l._sender) fail("This enquiry does not exist.");
      if (!agentIds().includes(p_agent)) fail("Choose an active team member.");
      const { _sender, ...body } = l;
      if (l.assigned_to && l.assigned_to !== p_agent) { await pdel(l.assigned_to, "leads", p_id).catch(() => {}); await ping(l.assigned_to); }
      const upd = { ...strip(body), assigned_to: p_agent, assigned_by: uid, assigned_at: now(), status: l.status === "new" ? "assigned" : l.status };
      await db.doc(`leads/${_sender}/items/${p_id}`).set(upd);
      await pset(p_agent, "leads", p_id, upd);
      await logPrivate(p_agent, l.plot_id, "lead_assigned", `Website enquiry for you: ${l.name}${l.plot_id ? " · " + l.plot_id : ""} · from ${nameOf(uid)}`);
      await ping(p_agent);
    },
    update_lead: async ({ p_id, p_status, p_note }) => {
      requireMember();
      if (!["assigned", "contacted", "closed"].includes(p_status)) fail("Unknown status.");
      const f = await findPriv("leads", p_id);
      if (!f || !(admin || f.a === uid)) fail("This enquiry is not assigned to you.");
      await pset(f.a, "leads", p_id, { ...strip(f.row), status: p_status, note: p_note != null ? String(p_note).trim().slice(0, 400) : f.row.note || "" });
      await ping(f.a);
    },
    convert_lead: async ({ p_id }) => {
      requireMember();
      const f = await findPriv("leads", p_id);
      if (!f || !(admin || f.a === uid)) fail("This enquiry is not assigned to you.");
      if (f.row.client_id) return f.row.client_id;
      const a = f.a, l = f.row, cid = rid();
      await pset(a, "clients", cid, { name: l.name, phone: l.phone || l.email || "", cnic: "", note: ("Website enquiry. " + (l.message || "")).slice(0, 400), created_at: now(), updated_at: now() });
      if (l.plot_id && (await plotGet(l.plot_id))) {
        const did = rid();
        await pset(a, "deals", did, { plot_id: l.plot_id, client_id: cid, sold: false, stage: "interested", note: "From a website enquiry", created_at: now(), updated_at: now() });
        await db.doc("pubdeals/" + did).set({ plot_id: l.plot_id, agent_id: a, active: true });
      }
      await pset(a, "leads", p_id, { ...strip(l), status: "converted", client_id: cid });
      await ping(a);
      return cid;
    },
    save_site_settings: async ({ p_values }) => {
      requireAdmin();
      const keys = ["company", "phone", "whatsapp", "email", "address", "hours", "about"];
      const v = {};
      for (const k of keys) if (p_values && k in p_values) v[k] = String(p_values[k] || "").slice(0, 600);
      await db.doc("settings/site").set({ ...shared.settings, ...v });
    },

    save_member: async ({ p_id, p_full_name, p_phone, p_role, p_active, p_perms }) => {
      requireAdmin();
      if (!p_id) fail("In this test version, share the page with the person (Contributor for an agent, Editor for an admin). They show here after they open it.");
      const cur = (shared.people[p_id] || {}).role || "agent";
      if (p_role && p_role !== cur) fail("In this test version, change the role in the Share menu: Editor is an admin, Contributor is an agent.");
      if (p_id === uid && p_active === false) fail("You cannot turn off your own account.");
      const pr = { ...(shared.perms[p_id] || {}), full_name: String(p_full_name || "").trim().slice(0, 80), phone: String(p_phone || "").trim().slice(0, 40), active: p_active !== false };
      for (const k of PERM_KEYS) if (p_perms && p_perms[k] != null) pr[k] = !!p_perms[k];
      await db.doc("perms/" + p_id).set(pr);
      return p_id;
    },

    add_plots: async ({ p_items, p_price, p_kind = "own", p_tags = [], p_note = "" }) => {
      if (p_kind === "listing") can("add_listings", "add dealer listings"); else if (p_kind === "own") can("add_plots", "add plots"); else fail("Unknown plot type.");
      if (!okPrice(p_price)) fail("Enter a price in crore, for example 4.10.");
      let n = 0;
      for (const it of p_items || []) {
        if (!PLOT_RE.test(it.id || "")) fail("Not a plot number: " + (it.id || ""));
        if ((await db.doc("plots/" + it.id).get()).exists) continue;
        const [b, num] = it.id.split("-");
        await db.doc("plots/" + it.id).set({ block: b, num: Number(num), size: it.size || "10M", kind: p_kind, status: "available", price: Math.round(p_price * 100) / 100,
          tags: p_tags || [], note: String(p_note || "").slice(0, 400), holder_deal: null, added_by: uid, updated_by: uid, updated_at: now(), created_at: now() });
        await logPublic(it.id, "added", `${it.id} ${p_kind === "listing" ? "added as a dealer listing" : "added to our plots"} · ${cr(p_price)}`);
        n++;
      }
      return n;
    },
    set_price: async ({ p_ids, p_price }) => {
      can("edit_price", "change prices");
      if (!okPrice(p_price)) fail("Enter a price in crore, for example 4.10.");
      const pr = Math.round(p_price * 100) / 100;
      let n = 0;
      for (const id of p_ids) { const p = await plotGet(id); if (!p || p.price === pr) continue; await plotUpdate(id, { price: pr }); await logPublic(id, "price", `${id} price ${cr(p.price)} → ${cr(pr)}`); n++; }
      return n;
    },
    set_size: async ({ p_ids, p_size }) => {
      can("add_plots", "change plot sizes");
      let n = 0;
      for (const id of p_ids) { const p = await plotGet(id); if (!p || p.size === p_size) continue; await plotUpdate(id, { size: p_size }); await logPublic(id, "size", `${id} size set to ${sizeLabel(p_size)}`); n++; }
      return n;
    },
    save_fix: async ({ p_key, p_n, p_size }) => {
      can("add_plots", "correct the plan");
      if (p_n != null && !(p_n > 0 && p_n < 10000)) fail("Enter a plot number, for example 142.");
      const cur = shared.fixes[p_key] || {};
      await db.doc("fixes/" + p_key).set({ ...cur, ...(p_n != null ? { n: p_n } : {}), ...(p_size ? { size: p_size } : {}), updated_by: uid, updated_at: now() });
      if (p_n != null) { const id = p_key.split("-")[0] + "-" + p_n; await logPublic(id, "fix", "Plot number set: " + id); }
    },
    set_tag: async ({ p_ids, p_tag, p_on }) => {
      requireMember();
      let n = 0;
      for (const id of p_ids) {
        const p = await plotGet(id); if (!p) continue;
        const has = p.tags.includes(p_tag);
        if (p_on === has) continue;
        await plotUpdate(id, { tags: p_on ? [...p.tags, p_tag] : p.tags.filter((t) => t !== p_tag) });
        await logPublic(id, "notes", id + " notes updated"); n++;
      }
      return n;
    },
    set_note: async ({ p_id, p_note }) => { requireMember(); await plotUpdate(p_id, { note: String(p_note || "").trim().slice(0, 400) }); await logPublic(p_id, "notes", p_id + " notes updated"); },
    set_status: async ({ p_ids, p_status }) => {
      requireAdmin();
      let n = 0;
      for (const id of p_ids) {
        const p = await plotGet(id); if (!p || p.status === p_status) continue;
        if (p_status === "available" || p.status === "sold_pending") { await releasePlot(id, "The admin changed the plot status."); await plotUpdate(id, { holder_deal: null }); }
        await plotUpdate(id, { status: p_status });
        await logPublic(id, "status", `${id} marked ${statusLabel(p_status)}`); n++;
      }
      return n;
    },
    remove_plots: async ({ p_ids }) => {
      requireAdmin();
      for (const id of p_ids) { const p = await plotGet(id); if (p && ["sold", "sold_pending"].includes(p.status)) fail("A sold plot keeps its records. You cannot remove it."); }
      let n = 0;
      for (const id of p_ids) {
        if (!(await plotGet(id))) continue;
        await releasePlot(id, "The plot was removed.");
        for (const [did, x] of Object.entries(shared.pubdeals)) if (x.plot_id === id) await db.doc("pubdeals/" + did).set({ ...x, active: false });
        await db.doc("plots/" + id).delete();
        await logPublic(id, "removed", id + " removed from our plots"); n++;
      }
      return n;
    },
    relist_plot: async ({ p_id, p_price }) => {
      can("add_listings", "add dealer listings");
      if (!okPrice(p_price)) fail("Enter a price in crore, for example 4.10.");
      const p = await plotGet(p_id);
      if (!p || p.status !== "sold") fail("Only a sold plot can become a dealer listing.");
      await plotUpdate(p_id, { kind: "listing", status: "available", holder_deal: null, price: Math.round(p_price * 100) / 100 });
      await logPublic(p_id, "relisted", `${p_id} listed again for its owner · ${cr(p_price)}`);
    },
    save_listing_owner: async ({ p_plot_id, p_owner_name, p_owner_phone, p_owner_demand, p_commission, p_note }) => {
      can("add_listings", "add dealer listings");
      const p = await plotGet(p_plot_id);
      if (!p || p.kind !== "listing") fail("This plot is not a dealer listing.");
      const f = await findPriv("owners", p_plot_id);
      const a = f ? f.a : uid;
      if (f && f.a !== uid && !admin) fail("Another agent manages this listing.");
      await pset(a, "owners", p_plot_id, { owner_name: String(p_owner_name || "").trim().slice(0, 80), owner_phone: String(p_owner_phone || "").trim().slice(0, 40),
        owner_demand: p_owner_demand ?? null, commission: String(p_commission || "").trim().slice(0, 80), note: String(p_note || "").trim().slice(0, 400), updated_at: now() });
      await ping(a);
    },

    save_client: async ({ p_id, p_name, p_phone, p_cnic, p_note }) => {
      requireMember();
      if (!String(p_name || "").trim()) fail("Add the client's name.");
      const body = { name: String(p_name).trim().slice(0, 80), phone: String(p_phone || "").trim().slice(0, 40), cnic: String(p_cnic || "").trim().slice(0, 20), note: String(p_note || "").trim().slice(0, 400), updated_at: now() };
      if (!p_id) { const id = rid(); await pset(uid, "clients", id, { ...body, created_at: now() }); await ping(uid); return id; }
      const f = await findPriv("clients", p_id);
      if (!f) fail("This record belongs to another agent.");
      await pset(f.a, "clients", p_id, { ...strip(f.row), ...body });
      await ping(f.a);
      return p_id;
    },
    delete_client: async ({ p_id }) => {
      requireMember();
      const f = await findPriv("clients", p_id);
      if (!f) fail("This record belongs to another agent.");
      const data = await loadAgent(f.a, true);
      const deals = Object.entries(data.deals).filter(([, d]) => d.client_id === p_id);
      if (deals.some(([did, d]) => d.sold || !["interested", "dropped"].includes(d.stage) || Object.values(data.requests).some((q) => q.deal_id === did && q.status === "pending")))
        fail("This client has a pre-booking, a sale or a request. Stop the deal first.");
      for (const [did] of deals) { await pdel(f.a, "deals", did); await db.doc("pubdeals/" + did).delete(); }
      await pdel(f.a, "clients", p_id);
      await ping(f.a);
    },
    add_interest: async ({ p_client_id, p_plot_id, p_note }) => {
      requireMember();
      const f = await findPriv("clients", p_client_id);
      if (!f) fail("This record belongs to another agent.");
      if (!(await plotGet(p_plot_id))) fail("This plot is not in our stock.");
      const data = await loadAgent(f.a, true);
      const ex = Object.entries(data.deals).find(([, d]) => d.client_id === p_client_id && d.plot_id === p_plot_id);
      if (ex && ex[1].stage !== "dropped") fail("This client is already on this plot.");
      const id = ex ? ex[0] : rid();
      const base = ex ? ex[1] : { plot_id: p_plot_id, client_id: p_client_id, sold: false, created_at: now() };
      await pset(f.a, "deals", id, { ...base, stage: "interested", drop_reason: null, note: String(p_note || "").slice(0, 400), updated_at: now() });
      await db.doc("pubdeals/" + id).set({ plot_id: p_plot_id, agent_id: f.a, active: true });
      await logPublic(p_plot_id, "interest", "New client interest on " + p_plot_id);
      await logPrivate(f.a, p_plot_id, "interest_private", `${f.row.name} is interested in ${p_plot_id}`);
      await ping(f.a);
      return id;
    },
    drop_deal: async ({ p_deal_id, p_reason }) => {
      requireMember();
      const { a, d } = await dealFind(p_deal_id);
      if (d.stage === "dropped") return;
      if (d.sold && !admin) fail("Only an admin can stop a sold deal.");
      const data = await loadAgent(a, true);
      for (const [qid, q] of Object.entries(data.requests)) if (q.deal_id === d.id && q.status === "pending") await pset(a, "requests", qid, { ...q, status: "cancelled", reason: "The deal stopped.", decided_by: uid, decided_at: now() });
      const p = await plotGet(d.plot_id);
      if (p && p.holder_deal === d.id) { await plotUpdate(d.plot_id, { status: "available", holder_deal: null }); await logPublic(d.plot_id, "status", d.plot_id + " is available again"); }
      await saveDeal(a, { ...d, stage: "dropped", sold: false, drop_reason: String(p_reason || "").trim().slice(0, 200) });
      await db.doc("pubdeals/" + d.id).set({ plot_id: d.plot_id, agent_id: a, active: false });
      await logPrivate(a, d.plot_id, "dropped", `${await clientName(a, d.client_id)} is no longer on ${d.plot_id}`);
      await ping(a);
    },
    request_prebook: async ({ p_deal_id, p_note }) => {
      requireMember();
      const { a, d } = await dealFind(p_deal_id);
      ownOrAdmin(a);
      if (d.stage !== "interested") fail("Only an interested client can get a pre-booking.");
      const p = await plotGet(d.plot_id);
      if (!p || p.status !== "available") fail(`${d.plot_id} is not available.`);
      const data = await loadAgent(a, true);
      if (Object.values(data.requests).some((q) => q.deal_id === d.id && q.kind === "prebook" && q.status === "pending")) fail("A pre-booking request for this client is already waiting.");
      const id = rid();
      await pset(a, "requests", id, { kind: "prebook", deal_id: d.id, plot_id: d.plot_id, note: String(p_note || ""), status: "pending", created_at: now() });
      await logPrivate(a, d.plot_id, "request", `Pre-booking request: ${d.plot_id} for ${await clientName(a, d.client_id)} · by ${nameOf(uid)}`);
      await ping(a);
      if (admin) await decide(id, true, null);
      return id;
    },
    request_sale: async ({ p_deal_id, p_sale_price, p_token_amount, p_payment_mode, p_transfer_deadline, p_note }) => {
      can("mark_sold", "mark plots sold");
      const { a, d } = await dealFind(p_deal_id);
      ownOrAdmin(a);
      if (d.stage === "dropped") fail("This deal stopped. Add the client to the plot again first.");
      if (d.sold) fail("This sale is already approved.");
      if (!okPrice(p_sale_price)) fail("Enter the sale price in crore, for example 4.40.");
      const p = await plotGet(d.plot_id);
      if (!p || !(p.status === "available" || (p.status === "prebooked" && p.holder_deal === d.id))) fail(`${d.plot_id} is ${statusLabel(p ? p.status : "sold")} for another client.`);
      const id = rid();
      await pset(a, "requests", id, { kind: "sale", deal_id: d.id, plot_id: d.plot_id, sale_price: Math.round(p_sale_price * 100) / 100, token_amount: p_token_amount ?? null,
        payment_mode: p_payment_mode || null, transfer_deadline: p_transfer_deadline || null, note: String(p_note || ""), prev_status: p.status, prev_holder: p.holder_deal, status: "pending", created_at: now() });
      await plotUpdate(d.plot_id, { status: "sold_pending", holder_deal: d.id });
      await logPublic(d.plot_id, "status", d.plot_id + " marked sold, waiting for approval");
      await logPrivate(a, d.plot_id, "request", `Sale request: ${d.plot_id} to ${await clientName(a, d.client_id)} for ${cr(p_sale_price)} · by ${nameOf(uid)}`);
      await ping(a);
      if (admin) await decide(id, true, null);
      return id;
    },
    decide_request: async ({ p_id, p_approve, p_reason }) => decide(p_id, p_approve, p_reason),
    cancel_request: async ({ p_id }) => {
      requireMember();
      const f = await findPriv("requests", p_id);
      if (!f) fail("This record belongs to another agent.");
      const r = f.row;
      if (r.status !== "pending") fail("This request is already closed.");
      await pset(f.a, "requests", r.id, { ...strip(r), status: "cancelled", decided_by: uid, decided_at: now() });
      if (r.kind === "sale") {
        const p = await plotGet(r.plot_id);
        if (p && p.status === "sold_pending" && p.holder_deal === r.deal_id) {
          await plotUpdate(r.plot_id, { status: r.prev_status || "available", holder_deal: r.prev_holder || null });
          await logPublic(r.plot_id, "status", `${r.plot_id} is ${statusLabel(r.prev_status || "available")} again`);
        }
      }
      await ping(f.a);
    },

    update_deal: async ({ p_deal_id, p_stage, p_fields }) => {
      requireMember();
      const { a, d } = await dealFind(p_deal_id);
      if (d.stage === "dropped") fail("This deal stopped.");
      if (p_stage && p_stage !== d.stage) {
        if (!STAGES.includes(p_stage)) fail("Unknown stage.");
        if (!d.sold) fail("An admin must approve the sale before the deal moves to the next stages.");
      }
      const f = p_fields || {};
      const keys = ["agreement_on", "transfer_deadline", "token_amount", "payment_mode", "authority", "ndc_submitted_on", "ndc_expected", "ndc_approved_on", "transfer_on", "transfer_mode", "receipt_no", "allotment_expected", "allotment_received", "note"];
      const nd = { ...d };
      for (const k of keys) if (k in f) {
        let v = f[k] === "" ? null : f[k];
        if (v != null && /_on$|_expected$|_received$|deadline$/.test(k) && !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail("A date is not valid.");
        if (k === "token_amount" && v != null) v = Number(v);
        nd[k] = v;
      }
      if (p_stage) nd.stage = p_stage;
      await saveDeal(a, nd);
      if (p_stage && p_stage !== d.stage) {
        await logPrivate(a, d.plot_id, "stage", `${d.plot_id} · ${await clientName(a, d.client_id)}: ${STAGE_LABEL[p_stage]}`);
        if (p_stage === "closed") await logPublic(d.plot_id, "closed", d.plot_id + " deal closed");
      }
      await ping(a);
    },
    add_document: async ({ p_deal_id, p_plot_id, p_stage, p_kind, p_file_name, p_mime, p_size, p_path, p_note }) => {
      can("upload_docs", "upload documents");
      let owner = uid, plot = p_plot_id, stage = "plot";
      if (p_deal_id) {
        const { a, d } = await dealFind(p_deal_id); owner = a; plot = d.plot_id; stage = p_stage;
        if (d.stage === "dropped") fail("This deal stopped.");
        if (ORDER.indexOf(stage) < 0) fail("Unknown stage.");
        if (ORDER.indexOf(stage) > ORDER.indexOf(d.stage)) fail("Add documents to this stage when the deal reaches it.");
      } else if (!(await plotGet(p_plot_id))) fail("This plot is not in our stock.");
      if (!(STAGE_KINDS[stage] || []).includes(p_kind)) fail("This type of document is not for this stage.");
      if (!p_path || p_path.split("/")[0] !== owner) fail("The file is in the wrong folder.");
      const id = rid();
      await pset(owner, "docs", id, { deal_id: p_deal_id || null, plot_id: plot, stage, kind: p_kind, file_name: String(p_file_name).slice(0, 160),
        mime: p_mime, size_bytes: p_size, path: p_path, note: String(p_note || ""), uploaded_by: uid, created_at: now() });
      await ping(owner);
      return id;
    },
    delete_document: async ({ p_id }) => {
      requireMember();
      const f = await findPriv("docs", p_id);
      if (!f) fail("This document does not exist.");
      if (!(admin || f.a === uid || f.row.uploaded_by === uid)) fail("This record belongs to another agent.");
      await pdel(f.a, "docs", p_id);
      await ping(f.a);
      return f.row.path;
    },
    request_download: async ({ p_document_id, p_reason }) => {
      requireMember();
      const f = await seeDoc(p_document_id);
      if (admin) fail("Admins can download without a request.");
      const mine = Object.values((await loadAgent(uid, true)).dlreq).filter((r) => r.document_id === p_document_id);
      if (mine.some((r) => r.status === "pending")) fail("Your request for this document is already waiting.");
      if (mine.some((r) => r.status === "approved")) fail("Your request is already approved. Download the file.");
      const id = rid();
      await pset(uid, "dlreq", id, { document_id: p_document_id, reason: String(p_reason || "").trim().slice(0, 200), status: "pending", created_at: now() });
      await logPrivate(uid, f.row.plot_id, "download_request", `Download request: ${docLabel(f.row)} · by ${nameOf(uid)}`);
      await ping(uid);
      return id;
    },
    decide_download: async ({ p_id, p_approve, p_reason }) => {
      requireAdmin();
      const f = await findPriv("dlreq", p_id);
      if (!f || f.row.status !== "pending") fail("This request is already closed.");
      await pset(f.a, "dlreq", p_id, { ...strip(f.row), status: p_approve ? "approved" : "rejected", decided_by: uid, decided_at: now(), reason: String(p_reason || "").trim() || f.row.reason || "" });
      const d = await findPriv("docs", f.row.document_id);
      await logPrivate(f.a, d ? d.row.plot_id : null, "download_decision", `${p_approve ? "Download approved" : "Download not approved"}: ${d ? docLabel(d.row) : "document"} · by ${nameOf(uid)}`);
      await ping(f.a);
    },
    use_download: async ({ p_id }) => {
      requireMember();
      const data = await loadAgent(uid, true);
      const r = data.dlreq[p_id];
      if (!r) fail("This request does not exist.");
      if (r.status !== "approved") fail("An admin must approve the download first.");
      const d = await findPriv("docs", r.document_id);
      if (!d) fail("This document does not exist.");
      await pset(uid, "dlreq", p_id, { ...r, status: "used", used_at: now() });
      await logPrivate(uid, d.row.plot_id, "download", `Downloaded: ${docLabel(d.row)} · by ${nameOf(uid)}`);
      await ping(uid);
      return d.row.path;
    },
    report_document_event: async ({ p_document_id, p_event }) => {
      requireMember();
      const f = await findPriv("docs", p_document_id);
      if (!f) return;
      const what = { screenshot_key: "Screenshot key pressed on ", print: "Print tried on ", download: "Downloaded: " }[p_event];
      if (!what) fail("Unknown event.");
      await logPrivate(uid, f.row.plot_id, "doc_" + p_event, what + docLabel(f.row) + " · by " + nameOf(uid));
      await ping(uid);
    },
    save_event: async ({ p_id, p_deal_id, p_plot_id, p_title, p_on_date, p_at_time, p_note, p_done, p_end_time }) => {
      requireMember();
      if (!String(p_title || "").trim()) fail("Add a title.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p_on_date || "")) fail("Choose a date.");
      if (p_end_time && (!p_at_time || p_end_time <= p_at_time)) fail("The end time must be after the start time.");
      let a = uid, plot = p_plot_id || null;
      if (p_deal_id) { const f = await dealFind(p_deal_id); a = f.a; plot = f.d.plot_id; }
      let base = { created_by: uid, created_at: now() };
      if (p_id) { const f = await findPriv("events", p_id); if (!f) fail("This record belongs to another agent."); a = f.a; base = strip(f.row); }
      const id = p_id || rid();
      await pset(a, "events", id, { ...base, deal_id: p_deal_id || null, plot_id: plot, title: String(p_title).trim().slice(0, 120), on_date: p_on_date,
        at_time: p_at_time || null, end_time: p_end_time || null, note: String(p_note || "").trim().slice(0, 400), done: !!p_done });
      await ping(a);
      return id;
    },
    delete_event: async ({ p_id }) => {
      requireMember();
      const f = await findPriv("events", p_id);
      if (!f) fail("This record belongs to another agent.");
      await pdel(f.a, "events", p_id);
      await ping(f.a);
    },
  };

  // ---------------------------------------------------------------- files: kept as pieces in the agent's folder
  const fileCache = {};
  const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

  const api = {
    mode: "artifact",
    maxUpload: 2.5 * 1048576,
    canSubmit: !!(uid && writeOk),
    async signInEmail() { throw new Error("On the test page, claude.ai knows who you are."); },
    noAccess: !uid ? "Sign in to claude.ai to use this page." : !writeOk ? "You can only view this page. Ask the owner to give you Contributor access in the Share menu." : "An admin turned off your account. Ask an admin.",
    async getUser() { return uid ? { email: meV.email || meV.name || "you" } : null; },
    async signIn() {}, async signOut() {},
    onAuthChange() {},
    select: (t) => select(t),
    async rpc(name, args = {}) {
      const fn = F[name];
      if (!fn) fail("Unknown function " + name);
      try { return await fn(args); }
      catch (e) {
        if (e && e.code === "invalid_argument") throw new Error("The page could not save this. You may not have access to change it.");
        if (e && e.code === "quota_exceeded") throw new Error("The test database is full. Ask the owner to remove old data.");
        throw e instanceof Error ? e : new Error((e && e.message) || "That did not save. Try again.");
      } finally { if (listener && name !== "me") setTimeout(() => listener("*"), 0); }
    },
    subscribe(cb, onStatus) {
      listener = (key) => cb(key === "plots" ? "plots" : key === "fixes" ? "plot_fixes" : key === "activity" ? "activity" : key === "pubdeals" ? "deals" : key === "people" || key === "perms" ? "members" : key === "settings" ? "site_settings" : "*");
      if (onStatus) onStatus("SUBSCRIBED");
      return () => { listener = null; };
    },
    async upload(blob, { owner }) {
      requireMember();
      const data = await toDataUrl(blob);
      const fid = rid();
      const parts = Math.ceil(data.length / CHUNK);
      for (let i = 0; i < parts; i++) await db.doc(`agents/${owner}/blobs/${fid}/parts/${i}`).set({ d: data.slice(i * CHUNK, (i + 1) * CHUNK) });
      await db.doc(`agents/${owner}/blobs/${fid}`).set({ parts, at: now() });
      fileCache[`${owner}/${fid}`] = data;
      return `${owner}/${fid}`;
    },
    async fileUrl(path) {
      if (fileCache[path]) return fileCache[path];
      const [owner, fid] = path.split("/");
      const meta = await db.doc(`agents/${owner}/blobs/${fid}`).get();
      if (!meta.exists) fail("The file is not available.");
      const n = meta.data().parts;
      const parts = await Promise.all(Array.from({ length: n }, (_, i) => db.doc(`agents/${owner}/blobs/${fid}/parts/${i}`).get()));
      fileCache[path] = parts.map((p) => (p.exists ? p.data().d : "")).join("");
      return fileCache[path];
    },
    async removeFile(path) {
      const [owner, fid] = path.split("/");
      const meta = await db.doc(`agents/${owner}/blobs/${fid}`).get();
      const n = meta.exists ? meta.data().parts : 0;
      for (let i = 0; i < n; i++) await db.doc(`agents/${owner}/blobs/${fid}/parts/${i}`).delete();
      await db.doc(`agents/${owner}/blobs/${fid}`).delete();
      delete fileCache[path];
    },
    async saveBlob(name, blob) {
      if (!downloads) fail("Saving files is not available here.");
      await downloads.save({ filename: name, data: blob });
    },
    async saveFile(doc, path) {
      if (!downloads) fail("Saving files is not available here.");
      const blob = dataUrlToBlob(await api.fileUrl(path));
      await downloads.save({ filename: doc.file_name, data: blob });
    },
  };
  return api;
}
