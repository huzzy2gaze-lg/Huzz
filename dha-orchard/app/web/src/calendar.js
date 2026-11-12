// The calendar: Day, Week and Month views with an hour grid, and a List view.
// It shows the deal dates (token agreement, NDC, transfer, allotment letter) and own entries with times.
import { S, esc, nameOf, colorOf, isAdmin } from "./core.js";
import { dstr } from "./deal.js";

const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const monday = (d) => addDays(d, -((d.getDay() + 6) % 7));
const fmtDay = (s) => parse(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const HOUR = 48; // pixels for one hour in the grid
const mins = (t) => { if (!t) return null; const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
const hourLabel = (h) => (h === 0 ? "12 AM" : h < 12 ? h + " AM" : h === 12 ? "12 PM" : h - 12 + " PM");
const timeLabel = (t) => { const v = mins(t); if (v == null) return ""; const h = Math.floor(v / 60), m = v % 60; return (h % 12 || 12) + (m ? ":" + pad(m) : "") + (h < 12 ? " am" : " pm"); };
const STAGE_AFTER = (d, ...ks) => ks.includes(d.stage);

let ITEMS = {}; // key -> item, for the details box

// every dated item this person may see
export function calendarItems() {
  const out = [];
  const clientName = (d) => (S.clients[d.client_id] || {}).name || "Client";
  const today = ymd(new Date());
  for (const d of S.deals) {
    if (d.stage === "dropped") continue;
    const base = { plot_id: d.plot_id, deal_id: d.id, agent_id: d.agent_id, client: clientName(d) };
    const add = (date, title, kind, done) => { const s = dstr(date); if (s) out.push({ ...base, key: `d:${d.id}:${kind}:${title}`, date: s, title, kind, done: !!done }); };
    add(d.agreement_on, "Token agreement", "agreement", STAGE_AFTER(d, "token", "ndc_submitted", "ndc_approved", "transfer_date", "transfer_done", "closed") && dstr(d.agreement_on) < today);
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
    out.push({ key: "e:" + e.id, date: dstr(e.on_date), time: e.at_time || "", end: e.end_time || "", title: e.title, kind: "event", done: !!e.done,
      plot_id: e.plot_id, deal_id: e.deal_id, agent_id: e.agent_id, client: d ? (S.clients[d.client_id] || {}).name : "", event: e });
  }
  const f = isAdmin() ? S.calAgent : S.me.id;
  return out.filter((x) => f === "all" || x.agent_id === f).sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
}
export function dueCount() {
  const t = ymd(new Date());
  return calendarItems().filter((x) => !x.done && x.date <= t).length;
}

// ---------------------------------------------------------------- toolbar
function anchor() { return S.calDate || ymd(new Date()); }
function title(view, a) {
  const d = parse(a);
  if (view === "day") return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "week") {
    const s = monday(d), e = addDays(s, 6);
    const same = s.getMonth() === e.getMonth();
    return `${s.getDate()}${same ? "" : " " + s.toLocaleDateString("en-GB", { month: "short" })} – ${e.getDate()} ${e.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
  }
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
function toolbar(view) {
  const views = [["day", "Day"], ["week", "Week"], ["month", "Month"], ["list", "List"]];
  return `<div class="caltool">
    <button class="btn primary create" data-calnew="">+ Create</button>
    <button class="sbtn" data-calgo="today">Today</button>
    ${view !== "list" ? `<span class="calnav"><button class="sbtn" data-calgo="-1" aria-label="Previous">‹</button><button class="sbtn" data-calgo="1" aria-label="Next">›</button></span><b class="caltitle">${esc(title(view, anchor()))}</b>` : `<b class="caltitle">Coming up</b>`}
    <span class="calright">${isAdmin() ? `<select id="calAgent" aria-label="Agent"><option value="all">All agents</option>${Object.values(S.people).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}"${S.calAgent === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>` : ""}
    <span class="seg views" role="group" aria-label="View">${views.map(([k, l]) => `<button class="${view === k ? "on" : ""}" data-calview="${k}">${l}</button>`).join("")}</span></span>
  </div>`;
}

// ---------------------------------------------------------------- chips and details
function chip(x, opts = {}) {
  ITEMS[x.key] = x;
  const late = !x.done && x.date < ymd(new Date());
  return `<button class="chipev ${x.kind}${x.done ? " done" : ""}${late ? " late" : ""}" data-calitem="${esc(x.key)}" ${opts.style ? `style="${opts.style}"` : ""}>${opts.time && x.time ? `<span class="t">${timeLabel(x.time)}</span> ` : ""}<span class="ti">${esc(x.title)}</span>${opts.sub && x.plot_id ? `<small>${esc(x.plot_id)}${x.client ? " · " + esc(x.client) : ""}</small>` : ""}</button>`;
}
function detailBox() {
  const x = ITEMS[S.ui.calItem];
  if (!x) return "";
  const mine = x.event && (x.agent_id === S.me.id || isAdmin());
  return `<div class="calmodal" role="dialog" aria-label="Calendar entry"><div class="calcard">
    <div class="row2"><span class="kdot ${x.kind}"></span><h3 style="flex:1">${esc(x.title)}</h3><button class="sbtn" data-act="calClose" aria-label="Close">×</button></div>
    <div class="s">${esc(fmtDay(x.date))}${x.time ? " · " + timeLabel(x.time) + (x.end ? " – " + timeLabel(x.end) : "") : " · all day"}${x.done ? " · done" : ""}</div>
    ${x.plot_id ? `<div class="s">Plot <button class="plotlink" data-plot="${esc(x.plot_id)}">${esc(x.plot_id)}</button>${x.client ? " · " + esc(x.client) : ""}</div>` : ""}
    ${isAdmin() ? `<div class="s"><span class="dot" style="background:${colorOf(x.agent_id)}"></span> ${esc(nameOf(x.agent_id))}</div>` : ""}
    ${x.event && x.event.note ? `<div class="notetext">${esc(x.event.note)}</div>` : ""}
    <div class="row">${x.deal_id ? `<button class="sbtn" data-opendeal="${x.deal_id}">Open the deal file</button>` : ""}
      ${mine ? `<button class="sbtn" data-calnew="${esc(x.key)}">Edit</button><button class="sbtn" data-evdone="${x.event.id}">${x.done ? "Mark not done" : "Mark done"}</button>${S.ui.delEvent === x.event.id ? `<button class="sbtn danger" data-delevent="${x.event.id}">Delete</button>` : `<button class="sbtn danger" data-askdelevent="${x.event.id}">Delete</button>`}` : ""}</div>
  </div></div>`;
}
function eventForm() {
  const f = S.ui.eventOpen || {};
  const e = f.edit ? S.events.find((x) => x.id === f.edit) : null;
  const plots = [...new Set(S.deals.filter((d) => d.stage !== "dropped" && (d.agent_id === S.me.id || isAdmin())).map((d) => d.plot_id))].sort();
  const v = (k, d) => esc(e ? (e[k] || "") : d || "");
  const start = e ? e.at_time || "" : f.time || "";
  let end = e ? e.end_time || "" : "";
  if (!e && start) { const m = mins(start) + 60; end = m < 1440 ? pad(Math.floor(m / 60)) + ":" + pad(m % 60) : ""; }
  return `<div class="calmodal" role="dialog" aria-label="Calendar entry"><form class="calcard" id="eventForm" data-edit="${e ? e.id : ""}">
    <div class="row2"><h3 style="flex:1">${e ? "Edit entry" : "New entry"}</h3><button type="button" class="sbtn" data-act="cancelEvent" aria-label="Close">×</button></div>
    <label class="fl"><span>Title</span><input id="ev_t" placeholder="e.g. Site visit with client" required autocomplete="off" value="${v("title")}"></label>
    <div class="grid3e"><label class="fl"><span>Date</span><input id="ev_d" type="date" required value="${e ? dstr(e.on_date) : esc(f.date || anchor())}"></label>
    <label class="fl"><span>Start</span><input id="ev_h" type="time" value="${esc(start)}"></label>
    <label class="fl"><span>End</span><input id="ev_e" type="time" value="${esc(end)}"></label></div>
    <label class="fl"><span>Plot (optional)</span><select id="ev_p"><option value="">No plot</option>${plots.map((p) => `<option value="${esc(p)}"${e && e.plot_id === p ? " selected" : ""}>${esc(p)}</option>`).join("")}</select></label>
    <label class="fl"><span>Note</span><input id="ev_n" autocomplete="off" value="${v("note")}"></label>
    <div class="meta">Without a start time, the entry shows as all day.</div>
    <div class="btns"><button type="button" class="btn" data-act="cancelEvent">Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div>`;
}

// ---------------------------------------------------------------- views
function timeGrid(days, items, today) {
  const cols = days.map(ymd);
  let h = `<div class="tgrid" style="--n:${cols.length}">`;
  h += `<div class="tg-head"><div class="tg-gut"></div>${cols.map((c) => { const d = parse(c); return `<button class="tg-day${c === today ? " today" : ""}" data-calday="${c}"><span class="wd">${d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}</span><span class="dnum">${d.getDate()}</span></button>`; }).join("")}</div>`;
  const allDay = (c) => items.filter((x) => x.date === c && !x.time);
  h += `<div class="tg-all"><div class="tg-gut"><small>all day</small></div>${cols.map((c) => `<div class="tg-allcell">${allDay(c).map((x) => chip(x)).join("")}</div>`).join("")}</div>`;
  h += `<div class="tg-body"><div class="tg-gut">${Array.from({ length: 24 }, (_, i) => `<div class="hl" style="height:${HOUR}px"><span>${i ? hourLabel(i) : ""}</span></div>`).join("")}</div>`;
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  for (const c of cols) {
    const timed = items.filter((x) => x.date === c && x.time).map((x) => ({ x, s: mins(x.time), e: Math.max(mins(x.end) || mins(x.time) + 60, mins(x.time) + 30) }));
    // events at the same time sit side by side
    timed.sort((a, b) => a.s - b.s || b.e - a.e);
    const groups = [];
    for (const t of timed) {
      let g = groups.find((gr) => gr.end > t.s);
      if (!g) { g = { end: t.e, cols: [] }; groups.push(g); }
      g.end = Math.max(g.end, t.e);
      let ci = g.cols.findIndex((colEnd) => colEnd <= t.s);
      if (ci < 0) { ci = g.cols.length; g.cols.push(0); }
      g.cols[ci] = t.e; t.ci = ci; t.g = g;
    }
    h += `<div class="tg-col${c === today ? " today" : ""}" data-calslot="${c}" style="height:${HOUR * 24}px">`;
    for (const t of timed) {
      const n = t.g.cols.length;
      h += chip(t.x, { time: true, sub: true, style: `top:${(t.s / 60) * HOUR}px;height:${Math.max(((t.e - t.s) / 60) * HOUR - 2, 20)}px;left:calc(${(t.ci / n) * 100}% + 2px);width:calc(${100 / n}% - 4px)` });
    }
    if (c === today) h += `<div class="nowline" style="top:${(nowM / 60) * HOUR}px"></div>`;
    h += `</div>`;
  }
  return h + `</div></div>`;
}

function monthGrid(items, today) {
  const a = parse(anchor());
  const first = new Date(a.getFullYear(), a.getMonth(), 1);
  const start = monday(first);
  const byDay = {};
  items.forEach((x) => (byDay[x.date] = byDay[x.date] || []).push(x));
  let h = `<div class="mgrid">${["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => `<div class="mwd">${d}</div>`).join("")}`;
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i), s = ymd(d);
    const list = (byDay[s] || []).sort((p, q) => (p.time ? 1 : 0) - (q.time ? 1 : 0) || (p.time || "").localeCompare(q.time || ""));
    h += `<div class="mcell${d.getMonth() !== a.getMonth() ? " out" : ""}${s === today ? " today" : ""}" data-calslot="${s}"><button class="mnum" data-calday="${s}">${d.getDate()}</button>${list.slice(0, 3).map((x) => chip(x, { time: true })).join("")}${list.length > 3 ? `<button class="more" data-calday="${s}">${list.length - 3} more</button>` : ""}</div>`;
  }
  return h + `</div>`;
}

function listView(items, today) {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const endWeek = ymd(addDays(now, 6 - dow)), endNext = ymd(addDays(now, 13 - dow)), tomorrow = ymd(addDays(now, 1));
  const groups = [
    ["Late", (x) => !x.done && x.date < today, "late"],
    ["Today · " + fmtDay(today), (x) => x.date === today],
    ["Tomorrow · " + fmtDay(tomorrow), (x) => x.date === tomorrow],
    ["Later this week", (x) => x.date > tomorrow && x.date <= endWeek],
    ["Next week", (x) => x.date > endWeek && x.date <= endNext],
    ["Later", (x) => x.date > endNext],
  ];
  let h = "", any = false;
  for (const [label, fn, cls] of groups) {
    const g = items.filter(fn);
    if (!g.length && !/^Today|^Tomorrow/.test(label)) continue;
    any = any || g.length > 0;
    h += `<section class="calgroup${cls ? " " + cls : ""}"><div class="k">${esc(label)} (${g.length})</div>${g.length ? `<div class="callist">${g.map((x) => `<div class="lrow"><span class="ld">${esc(fmtDay(x.date))}</span><span class="lt">${x.time ? timeLabel(x.time) : "all day"}</span>${chip(x, { sub: true })}</div>`).join("")}</div>` : `<div class="meta">Nothing on this day.</div>`}</section>`;
  }
  if (!any) h += `<div class="empty">No dates yet. Dates show here when you save them in a deal file (token agreement, NDC, transfer, allotment letter), or when you add an entry.</div>`;
  return h;
}

export function calendarPage() {
  ITEMS = {};
  if (!S.calView || S.calView === "agenda") S.calView = innerWidth < 760 ? "day" : "week";
  const view = S.calView;
  const today = ymd(new Date());
  const items = calendarItems();
  let h = `<div class="page calpage">${toolbar(view)}`;
  if (view === "day") h += timeGrid([parse(anchor())], items, today);
  else if (view === "week") h += timeGrid(Array.from({ length: 7 }, (_, i) => addDays(monday(parse(anchor())), i)), items, today);
  else if (view === "month") h += monthGrid(items, today);
  else h += listView(items, today);
  if (S.ui.eventOpen) h += eventForm();
  else if (S.ui.calItem) h += detailBox();
  return h + `</div>`;
}

// move the anchor date by one day, week or month
export function calStep(dir) {
  if (dir === "today") { S.calDate = ymd(new Date()); S._calJump = true; return; }
  const d = parse(anchor()), n = Number(dir);
  if (S.calView === "day") S.calDate = ymd(addDays(d, n));
  else if (S.calView === "week") S.calDate = ymd(addDays(d, 7 * n));
  else S.calDate = ymd(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

// after drawing: scroll the hour grid to the working day (or to now) the first time
export function calendarAfterRender() {
  if (!S._calJump) return;
  S._calJump = false;
  const body = document.querySelector(".tg-body");
  if (!body) return;
  const h = new Date().getHours();
  const hour = h >= 7 && h <= 20 ? Math.max(h - 1, 0) : 8;
  const page = document.querySelector(".calpage");
  const y = body.offsetTop + hour * HOUR - 8;
  if (page && page.scrollHeight > page.clientHeight + 4 && getComputedStyle(page).overflowY !== "visible") page.scrollTop = y;
  else window.scrollTo(0, body.getBoundingClientRect().top + scrollY + hour * HOUR - 120);
}

// a tap on an empty place of the grid: a new entry at that date and half hour
export function slotFromClick(el, ev) {
  const date = el.dataset.calslot;
  if (!el.classList.contains("tg-col")) return { date };
  const r = el.getBoundingClientRect();
  const m = Math.max(0, Math.min(1410, Math.floor(((ev.clientY - r.top) / HOUR) * 2) * 30));
  return { date, time: pad(Math.floor(m / 60)) + ":" + pad(m % 60) };
}
