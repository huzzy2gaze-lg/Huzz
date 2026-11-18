// "Today" for the sales team: what to do now. Calls to make, overdue and due dates, and clients that wait for a follow-up.
// It also gives one-tap Call and WhatsApp links. Nothing here changes data.
import { S, esc, nameOf, isAdmin, STAGES } from "./core.js";
import { calendarItems } from "./calendar.js";

const LATE_ASSIGNED_MIN = 60;  // an agent should call a new website booking within 1 hour
const LATE_NEW_MIN = 15;       // an admin should assign a new booking within 15 minutes
const FOLLOW_UP_DAYS = 7;      // an open deal with no change for 7 days needs a follow-up

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const minsSince = (t) => (t ? Math.max(0, Math.round((Date.now() - new Date(t).getTime()) / 60000)) : 0);
export function waited(min) {
  if (min < 60) return `${min} min`;
  if (min < 48 * 60) return `${Math.floor(min / 60)} h ${min % 60 ? (min % 60) + " min" : ""}`.trim();
  return `${Math.floor(min / 1440)} days`;
}

// Pakistani numbers: 0300 1234567 -> 923001234567
export function intl(phone) {
  const n = String(phone || "").replace(/[^0-9]/g, "");
  if (n.length < 10) return "";
  return n.startsWith("00") ? n.slice(2) : n.startsWith("0") ? "92" + n.slice(1) : n;
}
function company() { return (S.site && S.site.company) || "WH Ventures"; }
export function contactButtons(name, phone, whatsapp, context) {
  const tel = String(phone || "").replace(/[^0-9+]/g, "");
  const wa = intl(whatsapp || phone);
  if (!tel && !wa) return "";
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  const me = S.me ? (S.me.full_name || "").split(/\s+/)[0] : "";
  const msg = `Assalam o Alaikum ${first}, this is ${me || "the team"} from ${company()}.${context ? " " + context : ""} When is a good time to talk?`;
  return `<span class="contactbtns">${tel ? `<a class="sbtn call" href="tel:${esc(tel)}">Call</a>` : ""}${wa ? `<a class="sbtn wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}</span>`;
}
export function leadContext(l) {
  const b = (l.blocks || []).length ? `Block ${l.blocks.join(", ")}` : l.plot_id ? `plot ${l.plot_id}` : "plots";
  return `Thank you for your enquiry about ${b} in DHA Margalla Orchard.`;
}

// how late a website booking is: null when it is not late
export function leadLate(l) {
  if (l.status === "new") { const m = minsSince(l.created_at); return { m, late: m >= LATE_NEW_MIN, what: "not assigned" }; }
  if (l.status === "assigned") { const m = minsSince(l.assigned_at || l.created_at); return { m, late: m >= LATE_ASSIGNED_MIN, what: "not called" }; }
  return null;
}
export function lateBadge(l) {
  const x = leadLate(l);
  if (!x) return "";
  return `<span class="waitbadge${x.late ? " late" : ""}" title="Time since the booking ${x.what === "not assigned" ? "came in" : "was assigned"}">${x.late ? "Late · " : ""}${x.what} for ${waited(x.m)}</span>`;
}

export function todayPanel(agentF) {
  const t = ymd(new Date());
  const soon = ymd(new Date(Date.now() + 3 * 86400000));
  const mine = (id) => agentF === "all" || id === agentF;
  // calls to make
  const calls = S.leads.filter((l) => l.status === "assigned" && mine(l.assigned_to)).sort((a, b) => ((a.assigned_at || a.created_at) < (b.assigned_at || b.created_at) ? -1 : 1));
  const unassigned = isAdmin() ? S.leads.filter((l) => l.status === "new") : [];
  // dated items: overdue, today, next 3 days
  const keep = S.calAgent; S.calAgent = "all";
  const items = calendarItems().filter((x) => !x.done && mine(x.agent_id) && x.date <= soon);
  S.calAgent = keep;
  const overdue = items.filter((x) => x.date < t), todays = items.filter((x) => x.date === t), next = items.filter((x) => x.date > t);
  // open deals with no change for a week
  const cut = Date.now() - FOLLOW_UP_DAYS * 86400000;
  const quiet = S.deals.filter((d) => mine(d.agent_id) && ["interested", "prebooked"].includes(d.stage) && !d.sold && d.updated_at && new Date(d.updated_at).getTime() < cut)
    .sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1)).slice(0, 6);

  const total = calls.length + unassigned.length + overdue.length + todays.length + quiet.length;
  const who = agentF === "all" ? "the team" : agentF === S.me.id ? "you" : esc(nameOf(agentF));
  if (!total && !next.length) return `<div class="today calm"><b>Today</b><span>Nothing is waiting for ${who}. Good work.</span></div>`;

  const line = (x) => {
    const c = x.client ? ` · ${esc(x.client)}` : "";
    const plot = x.plot_id ? ` <button class="plotlink" data-plot="${esc(x.plot_id)}">${esc(x.plot_id)}</button>` : "";
    const open = x.deal_id ? ` data-opendeal="${esc(x.deal_id)}"` : ` data-tab="calendar"`;
    return `<li><button class="tdlink"${open}>${x.time ? `<b>${esc(x.time)}</b> ` : ""}${esc(x.title)}${c}</button>${plot}${agentF === "all" ? ` <span class="meta">${esc(nameOf(x.agent_id))}</span>` : ""}${x.date !== t ? ` <span class="meta">${esc(x.date.slice(8))}/${esc(x.date.slice(5, 7))}</span>` : ""}</li>`;
  };
  const col = (title, cls, n, body) => (n ? `<div class="tdcol ${cls}"><div class="tdh">${title} <span class="cnt">${n}</span></div><ul>${body}</ul></div>` : "");
  const leadLine = (l) => `<li><span class="tdname">${esc(l.name)}</span> ${lateBadge(l)}${agentF === "all" && l.assigned_to ? ` <span class="meta">${esc(nameOf(l.assigned_to))}</span>` : ""}${contactButtons(l.name, l.phone, l.whatsapp, leadContext(l))}</li>`;
  let h = `<div class="today"><div class="tdtop"><b>Today</b><span>${total} thing${total === 1 ? "" : "s"} for ${who}</span></div><div class="tdgrid">`;
  h += col("Assign these website bookings", "urgent", unassigned.length, unassigned.map((l) => `<li><span class="tdname">${esc(l.name)}</span> ${lateBadge(l)} <button class="sbtn" data-tab="approvals">Assign</button></li>`).join(""));
  h += col("Calls to make", "urgent", calls.length, calls.map(leadLine).join(""));
  h += col("Overdue", "late", overdue.length, overdue.map(line).join(""));
  h += col("Today", "now", todays.length, todays.map(line).join(""));
  h += col(`No follow-up for ${FOLLOW_UP_DAYS} days`, "quiet", quiet.length, quiet.map((d) => {
    const c = S.clients[d.client_id] || {};
    return `<li><button class="tdlink" data-opendeal="${esc(d.id)}">${esc(c.name || "Client")} · ${esc(d.plot_id)}</button> <span class="meta">${esc(STAGES[d.stage] || d.stage)}, ${waited(minsSince(d.updated_at))}</span>${contactButtons(c.name, c.phone, "", `About plot ${d.plot_id} in DHA Margalla Orchard.`)}</li>`;
  }).join(""));
  h += col("Next 3 days", "next", next.length, next.map(line).join(""));
  return h + `</div></div>`;
}
