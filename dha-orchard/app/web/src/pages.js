// Pages other than the map: sign in, My sales, Approvals, Team.
import { S, G, esc, cr, pkr, day, ago, initials, nameOf, colorOf, isAdmin, STAGES, PAYMODES, STATUS } from "./core.js";
import { todayPanel, contactButtons, leadContext, lateBadge } from "./today.js";

export const PERMS = [
  ["can_edit_price", "Change prices"],
  ["can_add_plots", "Add plots and correct the plan"],
  ["can_add_listings", "Add dealer listings"],
  ["can_mark_sold", "Mark plots sold"],
  ["can_upload_docs", "Upload documents"],
  ["can_export", "Export reports (phase 3)"],
];

export function loginPage() {
  const demo = S.mode === "demo";
  return `<div class="center"><div class="login">
    <div class="brand">Orchard Sales</div>
    <p class="meta">DHA Margalla Orchard · sales team</p>
    ${demo
      ? `<div class="demo-note"><b>Demo mode.</b> The data stays in this browser only. Choose a person to see what they can do.</div>
         <div class="who">${S.api.demoUsers.map((u) => `<button class="whobtn" data-demo="${esc(u.email)}"><span class="av" style="background:#0E3A2C">${esc(initials(u.name))}</span><span><b>${esc(u.name)}</b><small>${esc(u.note)}</small></span></button>`).join("")}</div>
         <button class="linkbtn" data-act="resetDemo">Reset the demo data</button>`
      : `<button class="btn google" data-act="signIn"><svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>Sign in with Google</button>
         <p class="meta">Use the Gmail address that the admin added for you.</p>`}
  </div></div>`;
}

export function noAccessPage() {
  if (S.mode === "artifact") return `<div class="center"><div class="login"><div class="brand">Orchard Sales</div><h3>No access yet</h3><p>${esc(S.api.noAccess)}</p></div></div>`;
  return `<div class="center"><div class="login">
    <div class="brand">Orchard Sales</div>
    <h3>This account is not in the team list</h3>
    <p>You signed in as <b>${esc(S.user && S.user.email)}</b>. Ask an admin to add this e-mail, or sign in with another account.</p>
    <button class="btn" data-act="signOut">Sign out</button>
  </div></div>`;
}

// ---------------------------------------------------------------- My sales
function counts(deals) {
  const r = { clients: new Set(), interested: 0, prebooked: 0, waiting: 0, sold: 0, value: 0 };
  for (const d of deals) {
    if (d.stage === "dropped") continue;
    r.clients.add(d.client_id);
    if (d.sold) { r.sold++; r.value += Number(d.sale_price || 0); }
    else if (S.requests.some((q) => q.deal_id === d.id && q.status === "pending")) r.waiting++;
    else if (d.stage === "prebooked") r.prebooked++;
    else r.interested++;
  }
  return r;
}
const tile = (n, l, c) => `<div class="tile"><b${c ? ` style="color:${c}"` : ""}>${n}</b><span>${l}</span></div>`;
const reqLine = (r) => `${r.kind === "sale" ? "Sale" : "Pre-booking"} · <button class="plotlink" data-plot="${esc(r.plot_id)}">${esc(r.plot_id)}</button> · ${esc((S.clients[(S.deals.find((d) => d.id === r.deal_id) || {}).client_id] || {}).name || "Client")}`;

export function salesPage() {
  const admin = isAdmin();
  const agentF = admin ? S.salesAgent : S.me.id;
  const deals = S.deals.filter((d) => agentF === "all" || d.agent_id === agentF);
  const c = counts(deals);
  const q = S.salesQ.trim().toLowerCase();
  let clients = Object.values(S.clients).filter((x) => agentF === "all" || x.agent_id === agentF);
  if (q) clients = clients.filter((x) => (x.name + " " + x.phone + " " + x.cnic + " " + S.deals.filter((d) => d.client_id === x.id).map((d) => d.plot_id).join(" ")).toLowerCase().includes(q));
  clients.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const myReq = S.requests.filter((r) => agentF === "all" || r.agent_id === agentF);
  const pending = myReq.filter((r) => r.status === "pending");
  const decided = myReq.filter((r) => r.status !== "pending").sort((a, b) => (a.decided_at < b.decided_at ? 1 : -1)).slice(0, 8);

  let h = `<div class="page"><div class="pagehead"><div><div class="k">${admin ? "All agents" : "Only you see this page"}</div><h2>${admin ? "Sales overview" : "My sales"}</h2></div>
    <button class="btn primary" data-act="newClient">+ New client</button></div>`;
  h += `<div class="tiles">${tile(c.clients.size, "Clients")}${tile(c.interested, "Interested", "var(--brass)")}${tile(c.prebooked, "Pre-booked", "var(--book)")}${tile(c.waiting, "Waiting for approval", "var(--pend)")}${tile(c.sold, "Sold")}${tile(cr(c.value), "Sold value (Cr)")}</div>`;
  h += todayPanel(agentF);

  if (admin) {
    const agents = Object.values(S.people).filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));
    h += `<div class="k">By agent</div><div class="tablewrap"><table class="tbl"><thead><tr><th>Agent</th><th>Clients</th><th>Interested</th><th>Pre-booked</th><th>Waiting</th><th>Sold</th><th>Sold value (Cr)</th></tr></thead><tbody>${agents.map((p) => {
      const k = counts(S.deals.filter((d) => d.agent_id === p.id));
      return `<tr class="${S.salesAgent === p.id ? "on" : ""}" data-agent="${p.id}"><td><span class="dot" style="background:${p.color}"></span> ${esc(p.name)}${p.role === "admin" ? ' <span class="meta">admin</span>' : ""}</td><td>${k.clients.size}</td><td>${k.interested}</td><td>${k.prebooked}</td><td>${k.waiting}</td><td>${k.sold}</td><td>${cr(k.value)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  if (S.ui.clientEdit === "new") h += clientForm(null);
  h += leadsForAgent();
  h += investorsSection();

  h += `<div class="toolbar"><input id="salesQ" type="search" placeholder="Search name, phone, CNIC or plot" value="${esc(S.salesQ)}" aria-label="Search clients">${admin ? `<select id="salesAgent" aria-label="Agent"><option value="all">All agents</option>${Object.values(S.people).sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${p.id}"${S.salesAgent === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select>` : ""}</div>`;

  if (pending.length) h += `<div class="k">Waiting for an admin (${pending.length})</div><div class="list">${pending.map((r) => `<div class="card row2"><span>${reqLine(r)}${r.kind === "sale" ? ` · ${cr(r.sale_price)} Cr` : ""}<small>${admin ? esc(nameOf(r.agent_id)) + " · " : ""}${ago(r.created_at)}</small></span><button class="sbtn" data-cancelreq="${r.id}">Cancel</button></div>`).join("")}</div>`;
  if (decided.length) h += `<div class="k">Recent decisions</div><div class="list">${decided.map((r) => `<div class="card row2"><span>${reqLine(r)}<small>${r.status === "approved" ? "Approved" : r.status === "rejected" ? "Not approved" : r.status === "cancelled" ? "Cancelled" : "Closed"}${r.decided_by ? " by " + esc(nameOf(r.decided_by)) : ""} · ${ago(r.decided_at)}${r.reason ? " · " + esc(r.reason) : ""}</small></span><span class="rstat ${r.status}">${r.status === "approved" ? "Approved" : r.status === "rejected" ? "Not approved" : r.status === "cancelled" ? "Cancelled" : "Closed"}</span></div>`).join("")}</div>`;

  h += `<div class="k">Clients (${clients.length})</div>`;
  h += clients.length ? `<div class="list">${clients.map(clientCard).join("")}</div>` : `<div class="empty">${q ? "No client matches the search." : "No clients yet. Add a client here, or open a plot on the map and add the client there."}</div>`;
  return h + `</div>`;
}

function clientForm(c) {
  return `<form class="add" id="clientForm" data-id="${c ? c.id : ""}"><div class="k">${c ? "Edit client" : "New client"}</div>
    <div class="grid2"><label class="fl"><span>Name</span><input id="ecn" value="${esc(c ? c.name : "")}" required autocomplete="off"></label>
    <label class="fl"><span>Phone / WhatsApp</span><input id="ecp" inputmode="tel" value="${esc(c ? c.phone : "")}" autocomplete="off"></label>
    <label class="fl"><span>CNIC (optional)</span><input id="ecc" inputmode="numeric" value="${esc(c ? c.cnic : "")}" autocomplete="off"></label></div>
    <label class="fl"><span>Note</span><textarea id="ecnote">${esc(c ? c.note : "")}</textarea></label>
    <div class="btns"><button type="button" class="btn" data-act="cancelClient">Cancel</button><button class="btn primary" type="submit">Save client</button></div></form>`;
}

function clientCard(c) {
  if (S.ui.clientEdit === c.id) return clientForm(c);
  const ds = S.deals.filter((d) => d.client_id === c.id).sort((a, b) => (a.stage === "dropped") - (b.stage === "dropped"));
  return `<div class="cl"><div class="top"><span class="av" style="background:${colorOf(c.agent_id)}">${esc(initials(c.name))}</span><div style="min-width:0;flex:1"><div class="n">${esc(c.name)}</div><div class="s">${esc(c.phone || "No number")}${c.cnic ? " · CNIC " + esc(c.cnic) : ""}${isAdmin() ? " · agent " + esc(nameOf(c.agent_id)) : ""}</div></div>
    ${contactButtons(c.name, c.phone, "", "")}<button class="sbtn" data-editclient="${c.id}">Edit</button></div>
    ${c.note ? `<div class="s">${esc(c.note)}</div>` : ""}
    <div class="deals">${ds.length ? ds.map((d) => { const pend = S.requests.find((r) => r.deal_id === d.id && r.status === "pending"); return `<button class="dealchip ${d.sold ? "sold" : d.stage}" data-opendeal="${d.id}"><b>${esc(d.plot_id)}</b> ${pend ? "Waiting for approval" : d.sold ? (d.stage === "token" ? "Sold · " + cr(d.sale_price) + " Cr" : STAGES[d.stage]) : STAGES[d.stage]}</button>`; }).join("") : `<span class="meta">No plot yet. Open a plot on the map and add this client.</span>`}</div>
    ${S.ui.delClient === c.id ? `<div class="confirm"><b>Delete ${esc(c.name)}?</b><span class="meta">The client and their plot interest are deleted.</span><div class="btns"><button class="btn" data-act="keepClient">Keep</button><button class="btn danger" data-delclient="${c.id}">Delete</button></div></div>` : `<button class="linkbtn danger" style="justify-self:start;padding-left:0" data-askdel="${c.id}">Delete client</button>`}
  </div>`;
}

// ---------------------------------------------------------------- Approvals (admins)
const DOC_LABEL = { lp_letter: "LP letter", agreement: "Agreement", token_receipt: "Token payment proof", cnic: "CNIC copy", ndc_application: "NDC application", ndc: "NDC",
  transfer_letter: "Transfer date letter", pay_order: "Pay order", transfer_receipt: "Authority receipt", allotment_letter: "Allotment letter" };
function downloadsHTML() {
  const pend = S.downloadRequests.filter((r) => r.status === "pending").sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (!pend.length) return "";
  return `<div class="k">Download requests (${pend.length})</div><div class="list">${pend.map((r) => {
    const doc = S.documents.find((x) => x.id === r.document_id) || {};
    return `<div class="req dl"><div class="top"><span class="rkind">Download</span><b>${esc(DOC_LABEL[doc.kind] || "Document")}</b><button class="plotlink" data-plot="${esc(doc.plot_id || "")}">${esc(doc.plot_id || "")}</button><span class="meta">${ago(r.created_at)}</span></div>
      <div class="s">${esc(nameOf(r.requested_by))} asks to download <b>${esc(doc.file_name || "")}</b>${r.reason ? ": " + esc(r.reason) : ""}</div>
      <div class="row">${doc.id ? `<button class="sbtn" data-opendoc="${doc.id}">View the document</button>` : ""}</div>
      <div class="btns"><button class="btn" data-dlreject="${r.id}">Do not approve</button><button class="btn forest" data-dlapprove="${r.id}">Approve one download</button></div></div>`;
  }).join("")}</div>`;
}

export function approvalsPage() {
  const pending = S.requests.filter((r) => r.status === "pending").sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const done = S.requests.filter((r) => r.status !== "pending").sort((a, b) => (a.decided_at < b.decided_at ? 1 : -1)).slice(0, 15);
  let h = `<div class="page"><div class="pagehead"><div><div class="k">Any one admin can approve</div><h2>Approvals</h2></div>${"Notification" in window && Notification.permission !== "granted" ? `<button class="btn" data-act="alerts">Turn on alerts</button>` : ""}</div>`;
  h += pending.length ? `<div class="list">${pending.map(reqCard).join("")}</div>` : `<div class="empty">No pre-booking or sale waits for approval.</div>`;
  h += downloadsHTML();
  h += leadsForAdmin();
  if (done.length) h += `<div class="k">Recent decisions</div><div class="list">${done.map((r) => `<div class="card row2"><span>${reqLine(r)}${r.kind === "sale" ? " · " + cr(r.sale_price) + " Cr" : ""}<small>${esc(nameOf(r.agent_id))} · ${r.decided_by ? "by " + esc(nameOf(r.decided_by)) + " · " : ""}${ago(r.decided_at)}${r.reason ? " · " + esc(r.reason) : ""}</small></span><span class="rstat ${r.status}">${r.status === "approved" ? "Approved" : r.status === "rejected" ? "Not approved" : r.status === "cancelled" ? "Cancelled" : "Closed"}</span></div>`).join("")}</div>`;
  return h + `</div>`;
}

function reqCard(r) {
  const d = S.deals.find((x) => x.id === r.deal_id) || {};
  const c = S.clients[d.client_id] || {};
  const p = S.plots[r.plot_id] || {};
  const others = S.requests.filter((x) => x.plot_id === r.plot_id && x.status === "pending" && x.id !== r.id).length;
  let h = `<div class="req ${r.kind}"><div class="top"><span class="rkind">${r.kind === "sale" ? "Sale" : "Pre-booking"}</span><button class="plotlink big" data-plot="${esc(r.plot_id)}">${esc(r.plot_id)}</button><span class="meta">${ago(r.created_at)}</span></div>
    <div class="grid3"><div><span class="meta">Client</span><b>${esc(c.name || "—")}</b><small>${esc(c.phone || "")}</small></div><div><span class="meta">Agent</span><b>${esc(nameOf(r.agent_id))}</b></div><div><span class="meta">Asking price</span><b>${cr(p.price)} Cr</b><small>${STATUS[p.status] ? STATUS[p.status].label : ""}</small></div></div>`;
  if (r.kind === "sale") h += `<div class="grid3"><div><span class="meta">Sale price</span><b>${cr(r.sale_price)} Cr</b></div><div><span class="meta">Token (Bayana)</span><b>${pkr(r.token_amount)}</b><small>${PAYMODES[r.payment_mode] || "Mode not set"}</small></div><div><span class="meta">Transfer by</span><b>${day(r.transfer_deadline)}</b></div></div>`;
  if (r.note) h += `<div class="s">${esc(r.note)}</div>`;
  if (others) h += `<div class="meta">${others} other request(s) wait for this plot. When you approve this one, the others close.</div>`;
  if (S.ui.rejectFor === r.id) {
    h += `<form class="add" id="rejectForm" data-id="${r.id}"><input id="rr" placeholder="Reason, e.g. token not received" aria-label="Reason"><div class="btns"><button type="button" class="btn" data-act="cancelReject">Back</button><button class="btn danger" type="submit">Do not approve</button></div></form>`;
  } else h += `<div class="btns"><button class="btn" data-reject="${r.id}">Do not approve</button><button class="btn forest" data-approve="${r.id}">Approve</button></div>`;
  return h + `</div>`;
}

// ---------------------------------------------------------------- Team (admins)
export function teamPage() {
  const ms = S.members.slice().sort((a, b) => (a.active === b.active ? (a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === "admin" ? -1 : 1) : a.active ? -1 : 1));
  const art = S.mode === "artifact";
  let h = `<div class="page"><div class="pagehead"><div><div class="k">Only admins see this page</div><h2>Team and permissions</h2></div>${art ? "" : `<button class="btn primary" data-act="newMember">+ Add account</button>`}</div>
    <p class="meta">${art ? "Test version: to add a person, share this page with them from the Share menu. Editor makes an admin. Contributor makes a sales agent. They show here after they open the page. Then set their permissions here." : "Add the person's Gmail address. They sign in with \"Sign in with Google\". To stop access, turn the account off."}</p>`;
  h += siteSettingsCard();
  if (S.ui.memberEdit === "new") h += memberForm(null);
  h += `<div class="list">${ms.map((m) => S.ui.memberEdit === m.id ? memberForm(m) : memberCard(m)).join("")}</div>`;
  return h + `</div>`;
}
function memberCard(m) {
  const self = m.id === S.me.id;
  return `<div class="cl member${m.active ? "" : " off"}"><div class="top"><span class="av" style="background:${m.color}">${esc(initials(m.full_name || m.email))}</span><div style="min-width:0;flex:1"><div class="n">${esc(m.full_name || m.email)}${self ? ' <span class="meta">(you)</span>' : ""}</div><div class="s">${esc(m.email)}${m.phone ? " · " + esc(m.phone) : ""}</div></div>
    <span class="stage ${m.role}">${m.role === "admin" ? "Admin" : "Sales agent"}</span></div>
    ${m.role === "agent" ? `<div class="perms">${PERMS.map(([k, l]) => `<label class="perm"><input type="checkbox" data-perm="${k}" data-mid="${m.id}"${m[k] ? " checked" : ""}> ${l}</label>`).join("")}</div>` : `<div class="s">Admins can do everything, and approve sales and pre-bookings.</div>`}
    <div class="row"><button class="sbtn" data-editmember="${m.id}">Edit</button>${self ? "" : `<button class="sbtn${m.active ? " danger" : ""}" data-toggleactive="${m.id}">${m.active ? "Turn off account" : "Turn on account"}</button>`}</div></div>`;
}
function memberForm(m) {
  const role = S.ui.memberRole || (m ? m.role : "agent");
  return `<form class="add" id="memberForm" data-id="${m ? m.id : ""}"><div class="k">${m ? "Edit account" : "New account"}</div>
    <div class="grid2">${S.mode === "artifact" ? `<input id="me_e" type="hidden" value="${esc(m ? m.email || "x@x.x" : "")}">` : `<label class="fl"><span>Gmail address</span><input id="me_e" type="email" value="${esc(m ? m.email : "")}" required autocomplete="off"></label>`}
    <label class="fl"><span>Full name</span><input id="me_n" value="${esc(m ? m.full_name : "")}" autocomplete="off"></label>
    <label class="fl"><span>Phone</span><input id="me_p" inputmode="tel" value="${esc(m ? m.phone : "")}" autocomplete="off"></label></div>
    ${S.mode === "artifact" ? "" : `<div class="seg two" role="group" aria-label="Role"><button type="button" class="${role === "agent" ? "on" : ""}" data-mrole="agent">Sales agent</button><button type="button" class="${role === "admin" ? "on" : ""}" data-mrole="admin">Admin</button></div>`}
    ${role === "agent" ? `<div class="perms">${PERMS.map(([k, l]) => `<label class="perm"><input type="checkbox" id="mp_${k}"${(m ? m[k] : k === "can_mark_sold" || k === "can_upload_docs") ? " checked" : ""}> ${l}</label>`).join("")}</div>` : `<div class="meta">An admin can approve sales and pre-bookings, and manage accounts.</div>`}
    <div class="btns"><button type="button" class="btn" data-act="cancelMember">Cancel</button><button class="btn primary" type="submit">Save account</button></div></form>`;
}

// ---------------------------------------------------------------- website enquiries
const LEAD_STATUS = { new: "New", assigned: "Assigned", contacted: "Contacted", converted: "Client", closed: "Closed" };
function leadCard(l, admin) {
  const agents = Object.values(S.people).filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name));
  let h = `<div class="req lead"><div class="top"><span class="rkind">Website</span><b>${esc(l.name)}</b>${l.plot_id ? `<button class="plotlink" data-plot="${esc(l.plot_id)}">${esc(l.plot_id)}</button>` : ""}<span class="meta">${ago(l.created_at)}</span>${lateBadge(l)}</div>
    <div class="grid3"><div><span class="meta">Phone</span><b>${esc(l.phone || "—")}</b></div><div><span class="meta">E-mail</span><b style="font-size:13px">${esc(l.email || "—")}</b></div><div><span class="meta">Status</span><b>${LEAD_STATUS[l.status] || l.status}</b><small>${l.assigned_to ? esc(nameOf(l.assigned_to)) : "Not assigned"}</small></div></div>
    <div class="leadtags">${(l.blocks || []).length ? `<span>Block ${esc(l.blocks.join(", "))}</span>` : ""}${l.whatsapp ? `<span>WhatsApp ${esc(l.whatsapp)}</span>` : ""}${l.best_time ? `<span>Call in the ${esc(l.best_time)}</span>` : ""}${l.marketing_opt_in ? `<span class="ok">Wants news</span>` : ""}${l.source ? `<span title="${esc(l.source)}">From ${esc(sourceLabel(l.source))}</span>` : ""}</div>
    ${["converted", "closed"].includes(l.status) ? "" : `<div class="row">${contactButtons(l.name, l.phone, l.whatsapp, leadContext(l))}</div>`}
    ${l.message ? `<div class="s">${esc(l.message)}</div>` : ""}${l.note ? `<div class="s"><b>Note:</b> ${esc(l.note)}</div>` : ""}`;
  if (admin && ["new", "assigned"].includes(l.status)) {
    h += `<div class="row"><select id="la_${l.id}" aria-label="Agent"><option value="">Assign to…</option>${agents.map((p) => `<option value="${p.id}"${l.assigned_to === p.id ? " selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button class="sbtn primary" data-assignlead="${l.id}">${l.assigned_to ? "Change agent" : "Assign"}</button></div>`;
  }
  if (l.assigned_to && (l.assigned_to === S.me.id || admin) && !["converted", "closed"].includes(l.status)) {
    h += `<form class="row" id="leadNoteForm" data-id="${l.id}"><input id="ln_${l.id}" placeholder="Note after the call" aria-label="Note" style="flex:1;min-width:160px"><button class="sbtn">Contacted</button></form>
      <div class="row"><button class="sbtn sold" data-convertlead="${l.id}">Add as a client</button><button class="sbtn" data-leadstatus="closed" data-lead="${l.id}">Close</button></div>`;
  }
  return h + `</div>`;
}
export function leadsForAdmin() {
  const open = S.leads.filter((l) => ["new", "assigned"].includes(l.status)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  if (!open.length) return `<div class="k">Website enquiries</div><div class="empty">No new website enquiries.</div>`;
  return `<div class="k">Website enquiries (${open.length})</div><div class="list">${open.map((l) => leadCard(l, true)).join("")}</div>`;
}
export function leadsForAgent() {
  const mine = S.leads.filter((l) => l.assigned_to === S.me.id && !["converted", "closed"].includes(l.status));
  if (!mine.length) return "";
  return `<div class="k">Website enquiries for you (${mine.length})</div><div class="list">${mine.map((l) => leadCard(l, isAdmin())).join("")}</div>`;
}
const SITE_FIELDS = [["company", "Company name"], ["phone", "Phone"], ["whatsapp", "WhatsApp"], ["email", "E-mail"], ["address", "Office address"], ["hours", "Office hours"], ["about", "About the company (home page)"]];
export function siteSettingsCard() {
  return `<form class="add" id="siteSettingsForm"><div class="k">Website details</div><span class="meta">These show on the public website. Empty fields do not show.</span>
    <div class="grid2">${SITE_FIELDS.filter(([k]) => k !== "about" && k !== "nearby").map(([k, l]) => `<label class="fl"><span>${l}</span><input id="ss_${k}" value="${esc(S.site[k] || "")}" autocomplete="off"></label>`).join("")}</div>
    <label class="fl"><span>About the company (home page)</span><textarea id="ss_about">${esc(S.site.about || "")}</textarea></label>
    <label class="fl"><span>Nearby places, one per line: place | travel time</span><textarea id="ss_nearby" rows="5" placeholder="COMSATS University | 1 min&#10;Murree Road | 10 min&#10;Islamabad Expressway | 10 min">${esc(S.site.nearby || "")}</textarea></label>
    <button class="btn forest" type="submit">Save website details</button></form>`;
}

// where the visitor came from: the ad's utm_source, Facebook or Google click ids, or the referring site
function sourceLabel(src) {
  const q = new URLSearchParams(src);
  if (q.get("utm_source")) return q.get("utm_source") + (q.get("utm_campaign") ? " · " + q.get("utm_campaign") : "");
  if (q.get("fbclid")) return "Facebook ad";
  if (q.get("gclid")) return "Google ad";
  if (q.get("referrer")) return q.get("referrer");
  return src === "direct" ? "direct visit" : src;
}

// ---------------------------------------------------------------- the investor list
export function investorsSection() {
  if (!(isAdmin() || (S.me && S.me.can_export))) return "";
  if (!S.investors) return `<div class="k">Investor list</div><div class="card row2"><span>People who agreed to receive news about new plots and investment opportunities.<small>From client accounts and booked calls.</small></span><button class="btn" data-act="loadInvestors">Show the list</button></div>`;
  const rows = S.investors;
  return `<div class="pagehead"><div class="k">Investor list (${rows.length})</div><div class="row"><button class="btn" data-act="loadInvestors">Refresh</button><button class="btn forest" data-act="exportInvestors"${rows.length ? "" : " disabled"}>Export CSV</button></div></div>
    ${rows.length ? `<div class="tablewrap"><table class="tbl invtbl"><thead><tr><th>Name</th><th>Phone</th><th>WhatsApp</th><th>E-mail</th><th>Blocks</th><th>From</th><th>Joined</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${esc(r.whatsapp)}</td><td>${esc(r.email)}</td><td>${esc((r.blocks || []).join(", "))}</td><td>${esc(r.origin)}${r.source ? " · " + esc(sourceLabel(r.source)) : ""}</td><td>${r.joined ? esc(new Date(r.joined).toLocaleDateString("en-GB")) : ""}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">Nobody on the list yet.</div>`}`;
}
export function investorsCsv(rows) {
  const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const head = ["Name", "Phone", "WhatsApp", "E-mail", "Blocks", "Origin", "Source", "Joined"];
  return [head.map(q).join(","), ...rows.map((r) => [r.name, r.phone, r.whatsapp, r.email, (r.blocks || []).join(" "), r.origin, r.source, r.joined ? new Date(r.joined).toISOString().slice(0, 10) : ""].map(q).join(","))].join("\r\n");
}
