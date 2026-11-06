// The calendar: deal dates (token agreement, NDC, transfer, allotment letter) and own entries,
// as a list by day (today, tomorrow, this week, next week) and as a month.
import { S, esc, nameOf, colorOf, isAdmin } from "./core.js";
import { dstr } from "./deal.js";

const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtDay = (s) => parse(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const STAGE_AFTER = (d, ...ks) => ks.includes(d.stage);

// every dated item this person may see
export function calendarItems() {
  const out = [];
  const clientName = (d) => (S.clients[d.client_id] || {}).name || "Client";
  for (const d of S.deals) {
    if (d.stage === "dropped") continue;
    const base = { plot_id: d.plot_id, deal_id: d.id, agent_id: d.agent_id, client: clientName(d) };
    const add = (date, title, kind, done) => { const s = dstr(date); if (s) out.push({ ...base, date: s, title, kind, done: !!done }); };
    add(d.agreement_on, "Token agreement", "agreement", STAGE_AFTER(d, "token", "ndc_submitted", "ndc_approved", "transfer_date", "transfer_done", "closed") && d.agreement_on && dstr(d.agreement_on) < ymd(new Date()));
    add(d.transfer_deadline, "Time limit for the transfer", "deadline", STAGE_AFTER(d, "transfer_done", "closed"));
    add(d.ndc_submitted_on, "NDC submitted", "ndc", true);
    add(d.ndc_expected, "NDC approval expected", "ndc", !!d.ndc_approved_on);
    add(d.ndc_approved_on, "NDC approved", "ndc", true);
    add(d.transfer_on, "Transfer at the authority", "transfer", STAGE_AFTER(d, "transfer_done", "closed"));
    add(d.allotment_expected, "Allotment letter expected", "allotment", !!d.allotment_received);
    add(d.allotment_received, "Allotment letter received", "allotment", true);
  }
  for (const e of S.events) {
    const d = e.deal_id ? S.deals.find((x) => x.id === e.deal_id) : null;
    out.push({ date: dstr(e.on_date), time: e.at_time ? String(e.at_time).slice(0, 5) : "", title: e.title, kind: "event", done: !!e.done,
      plot_id: e.plot_id, deal_id: e.deal_id, agent_id: e.agent_id, client: d ? (S.clients[d.client_id] || {}).name : "", event: e });
  }
  const f = isAdmin() ? S.calAgent : S.me.id;
  return out.filter((x) => f === "all" || x.agent_id === f).sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
}

export function dueCount() {
  const t = ymd(new Date());
  return calendarItems().filter((x) => !x.done && x.date <= t).length;
}

function itemHTML(x, today) {
  const late = !x.done && x.date < today;
  return `<div class="cal-item ${x.kind}${x.done ? " done" : ""}${late ? " late" : ""}">
    <span class="cal-time">${x.time || ""}</span>
    <div class="cal-body"><b>${esc(x.title)}</b><small>${x.plot_id ? `<button class="plotlink" data-plot="${esc(x.plot_id)}">${esc(x.plot_id)}</button>` : ""}${x.client ? " · " + esc(x.client) : ""}${isAdmin() ? ` · <span class="dot" style="background:${colorOf(x.agent_id)}"></span> ${esc(nameOf(x.agent_id))}` : ""}${late ? ` · <span class="lt">late</span>` : ""}${x.event && x.event.note ? " · " + esc(x.event.note) : ""}</small></div>
    ${x.event && (x.agent_id === S.me.id || isAdmin()) ? `<span class="row"><button class="sbtn" data-evdone="${x.event.id}">${x.done ? "Not done" : "Done"}</button>${S.ui.delEvent === x.event.id ? `<button class="sbtn danger" data-delevent="${x.event.id}">Delete</button>` : `<button class="sbtn" data-askdelevent="${x.event.id}" aria-label="Delete">×</button>`}</span>` : x.done ? `<span class="okmark">✓</span>` : ""}
  </div>`;
}

function eventForm() {
  const plots = [...new Set(S.deals.filter((d) => d.stage !== "dropped" && (d.agent_id === S.me.id || isAdmin())).map((d) => d.plot_id))].sort();
  return `<form class="add" id="eventForm"><div class="k">New calendar entry</div>
    <div class="grid2"><label class="fl"><span>What</span><input id="ev_t" placeholder="e.g. Site visit with client" required autocomplete="off"></label>
    <label class="fl"><span>Date</span><input id="ev_d" type="date" required value="${S.calDay || ymd(new Date())}"></label>
    <label class="fl"><span>Time (optional)</span><input id="ev_h" type="time"></label>
    <label class="fl"><span>Plot (optional)</span><select id="ev_p"><option value="">No plot</option>${plots.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select></label></div>
    <label class="fl"><span>Note</span><input id="ev_n" autocomplete="off"></label>
    <div class="btns"><button type="button" class="btn" data-act="cancelEvent">Cancel</button><button class="btn primary" type="submit">Save entry</button></div></form>`;
}

export function calendarPage() {
  const today = ymd(new Date());
  const items = calendarItems();
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const endWeek = ymd(addDays(now, 6 - dow)), endNext = ymd(addDays(now, 13 - dow)), tomorrow = ymd(addDays(now, 1));
  let h = `<div class="page"><div class="pagehead"><div><div class="k">${isAdmin() ? "All agents" : "Your deals and entries"}</div><h2>Calendar</h2></div>
    <div class="row"><div class="seg two calseg" role="group" aria-label="View"><button class="${S.calView === "agenda" ? "on" : ""}" data-calview="agenda">List</button><button class="${S.calView === "month" ? "on" : ""}" data-calview="month">Month</button></div>
    <button class="btn primary" data-act="newEvent">+ New entry</button></div></div>`;
  if (isAdmin()) h += `<div class="toolbar"><select id="calAgent" aria-label="Agent"><option value="all">All agents</option>${Object.values(S.people).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}"${S.calAgent === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div>`;
  if (S.ui.eventOpen) h += eventForm();
  if (S.calView === "month") return h + monthView(items, today) + `</div>`;
  const groups = [
    ["Late", (x) => !x.done && x.date < today, "late"],
    ["Today · " + fmtDay(today), (x) => x.date === today],
    ["Tomorrow · " + fmtDay(tomorrow), (x) => x.date === tomorrow],
    ["Later this week", (x) => x.date > tomorrow && x.date <= endWeek],
    ["Next week", (x) => x.date > endWeek && x.date <= endNext],
    ["Later", (x) => x.date > endNext],
  ];
  let any = false;
  for (const [label, fn, cls] of groups) {
    const g = items.filter(fn);
    if (!g.length && !/^Today|^Tomorrow/.test(label)) continue;
    any = any || g.length > 0;
    h += `<section class="calgroup${cls ? " " + cls : ""}"><div class="k">${esc(label)} (${g.length})</div>${g.length ? `<div class="callist">${groupByDay(g, label.startsWith("Today") || label.startsWith("Tomorrow"), today)}</div>` : `<div class="meta">Nothing on this day.</div>`}</section>`;
  }
  if (!any) h += `<div class="empty">No dates yet. Dates show here when you save them in a deal file (token agreement, NDC, transfer, allotment letter), or when you add an entry.</div>`;
  return h + `</div>`;
}

function groupByDay(list, oneDay, today) {
  if (oneDay) return list.map((x) => itemHTML(x, today)).join("");
  const days = {};
  list.forEach((x) => (days[x.date] = days[x.date] || []).push(x));
  return Object.keys(days).sort().map((dt) => `<div class="calday"><div class="caldate">${fmtDay(dt)}</div><div>${days[dt].map((x) => itemHTML(x, today)).join("")}</div></div>`).join("");
}

function monthView(items, today) {
  const [y, m] = (S.calMonth || today.slice(0, 7)).split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const byDay = {};
  items.forEach((x) => (byDay[x.date] = byDay[x.date] || []).push(x));
  const title = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const prev = ymd(new Date(y, m - 2, 1)).slice(0, 7), next = ymd(new Date(y, m, 1)).slice(0, 7);
  let h = `<div class="month"><div class="monthhead"><button class="sbtn" data-calmonth="${prev}" aria-label="Previous month">‹</button><b>${title}</b><button class="sbtn" data-calmonth="${next}" aria-label="Next month">›</button><button class="sbtn" data-calmonth="${today.slice(0, 7)}">Today</button></div>
    <div class="grid7">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="wd">${d}</div>`).join("")}`;
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), s = ymd(d);
    const list = byDay[s] || [];
    const late = list.some((x) => !x.done && x.date < today);
    h += `<button class="dcell${d.getMonth() !== m - 1 ? " out" : ""}${s === today ? " today" : ""}${S.calDay === s ? " sel" : ""}" data-calday="${s}"><span class="dn">${d.getDate()}</span>${list.length ? `<span class="dots">${list.slice(0, 4).map((x) => `<i class="${x.kind}${x.done ? " done" : ""}"></i>`).join("")}${list.length > 4 ? "+" : ""}</span><span class="dcount${late ? " late" : ""}">${list.length}</span>` : ""}</button>`;
  }
  h += `</div></div>`;
  const sel = S.calDay || today;
  const list = byDay[sel] || [];
  h += `<div class="k">${fmtDay(sel)} (${list.length})</div>${list.length ? `<div class="callist">${list.map((x) => itemHTML(x, today)).join("")}</div>` : `<div class="meta">Nothing on this day.</div>`}`;
  return h;
}
