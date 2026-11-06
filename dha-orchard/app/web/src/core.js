// Shared state, constants and small helpers.
import { SIZES } from "./geo.js";

export const G = { geo: null, raw: null, world: [0, 0, 1000, 800] };

export const S = {
  api: null, mode: null, user: null, me: null, booting: true, bootErr: null, live: "connecting",
  plots: {}, fixes: {}, people: {}, demand: {}, clients: {}, deals: [], requests: [], activity: [], members: [], owners: {},
  documents: [], events: [], fileUrls: {},
  calView: "agenda", calMonth: null, calDay: null, calAgent: "all",
  loaded: false,
  tab: "map",
  view: "all", block: null, plot: null, size: "all", show: "all", statusFilter: "all",
  vb: {}, draft: {}, sel: new Set(), multi: false, findBlock: null,
  ui: {},
  salesQ: "", salesAgent: "all",
};

// one hook object so that modules can call each other without import cycles at load time
export const hooks = { render: () => {}, go: () => {}, focusPlot: () => {}, refresh: () => {} };

export const STATUS = {
  available: { label: "Available", cls: "available", color: "var(--avail)" },
  prebooked: { label: "Pre-booked", cls: "prebooked", color: "var(--book)" },
  sold_pending: { label: "Sold · waiting for approval", short: "Waiting", cls: "sold_pending", color: "var(--pend)" },
  sold: { label: "Sold", cls: "sold", color: "var(--sold)" },
};
export const STAGES = {
  interested: "Interested", prebooked: "Pre-booked", token: "Token (Bayana)", ndc_submitted: "NDC submitted",
  ndc_approved: "NDC approved", transfer_date: "Transfer date set", transfer_done: "Transfer done",
  closed: "Closed", dropped: "Stopped",
};
export const PAYMODES = { cash: "Cash", bank_transfer: "Bank transfer", pay_order: "Pay order", cheque: "Cheque", other: "Other" };
export const TAGS = ["Corner", "Extra land", "Park facing", "Main road facing", "Near commercial"];

export const $ = (s) => document.querySelector(s);
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
export const num = (v) => (v == null || v === "" ? null : Number(v));
export const iso = (v) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
export function cr(v) {
  const n = num(v);
  return n != null && isFinite(n) ? n.toFixed(2) : "—";
}
export function pkr(v) {
  const n = num(v);
  return n != null && isFinite(n) ? "PKR " + Math.round(n).toLocaleString("en-IN") : "—";
}
export function day(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function ago(v) {
  if (!v) return "";
  const d = (Date.now() - new Date(v).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return Math.floor(d / 60) + " min ago";
  if (d < 86400) return Math.floor(d / 3600) + " h ago";
  return Math.floor(d / 86400) + " d ago";
}
export function initials(s) {
  return String(s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "?";
}
export const ptsStr = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
export const sizeLabel = (z) => (SIZES[z] ? SIZES[z].label : "");

export const isAdmin = () => !!(S.me && S.me.role === "admin");
export function can(perm) {
  if (!S.me) return false;
  return S.me.role === "admin" || !!S.me["can_" + perm];
}
export function nameOf(id) {
  const p = id && S.people[id];
  return p ? p.name : "Someone";
}
export function colorOf(id) {
  const p = id && S.people[id];
  return (p && p.color) || "#6E8B7B";
}
export const statusOf = (id) => (S.plots[id] ? S.plots[id].status : null);
export const dealsFor = (plotId) => S.deals.filter((d) => d.plot_id === plotId);
export const pendingFor = (dealId, kind) => S.requests.find((r) => r.deal_id === dealId && r.status === "pending" && (!kind || r.kind === kind));

export function blockStats(b) {
  const r = { available: 0, prebooked: 0, sold_pending: 0, sold: 0, ours: 0, clients: 0 };
  for (const id in S.plots) {
    const d = S.plots[id];
    if (d.block !== b) continue;
    r.ours++;
    if (r[d.status] != null) r[d.status]++;
    r.clients += S.demand[id] || 0;
  }
  return r;
}
export function totals() {
  const r = { available: 0, prebooked: 0, sold_pending: 0, sold: 0, ours: 0, clients: 0 };
  for (const id in S.plots) { const d = S.plots[id]; r.ours++; if (r[d.status] != null) r[d.status]++; r.clients += S.demand[id] || 0; }
  return r;
}
export function stackHTML(s) {
  const t = s.ours || 1;
  return ["available", "prebooked", "sold_pending", "sold"].map((k) => `<i style="width:${(s[k] / t) * 100}%;background:${STATUS[k].color}"></i>`).join("");
}

export function toast(msg, kind) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.className = kind || "";
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), kind === "err" ? 5000 : 2600);
}

// change notices at the top of the screen
export function notice(text, kind, plot) {
  const box = $("#notes");
  if (!box) return;
  const el = document.createElement("div");
  el.className = "note" + (kind ? " " + kind : "");
  el.setAttribute("role", "status");
  el.innerHTML = `<span>${text}</span><button class="x" aria-label="Close">×</button>`;
  el.onclick = (e) => {
    if (e.target.closest(".x")) { el.remove(); return; }
    el.remove();
    if (plot && G.geo && G.geo.plots[plot]) { S.tab = "map"; hooks.focusPlot(plot); }
  };
  box.prepend(el);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 7000);
}
