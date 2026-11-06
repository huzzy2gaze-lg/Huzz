// The map page: the whole scheme, one block, one plot (its file), and several selected plots.
import { S, G, esc, cr, pkr, day, ago, initials, nameOf, colorOf, isAdmin, can, STATUS, STAGES, PAYMODES, TAGS, blockStats, stackHTML, dealsFor, pendingFor } from "./core.js";
import { SIZES, SIZE_ORDER, ACTIVE } from "./geo.js";
import { mapSVG } from "./map.js";
import { dealFile, plotDocs, docSummary } from "./deal.js";

const statusChip = (st) => `<span class="schip ${st}">${STATUS[st] ? STATUS[st].label : esc(st)}</span>`;

export function findForm() {
  const cur = S.findBlock || S.block || "A";
  return `<form class="mapsearch" id="searchForm" role="search"><select id="qb" aria-label="Block">${ACTIVE.map((b) => `<option value="${b}"${b === cur ? " selected" : ""}>Block ${b}</option>`).join("")}</select><input id="q" type="search" inputmode="numeric" enterkeyhint="search" placeholder="Plot number" autocomplete="off" aria-label="Plot number"><button aria-label="Find plot">Find</button></form>`;
}
const zoomBtns = (fit) => `<div class="zoom"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="fit" aria-label="${fit}" style="font-size:12px">Fit</button></div>`;

export function allView() {
  const blocksHTML = ACTIVE.map((b) => {
    const s = blockStats(b);
    return `<button class="bstat" data-open="${b}"><span class="L">${b}</span><span><span class="nums"><span><b style="color:var(--avail)">${s.available}</b> avail.</span><span><b style="color:var(--book)">${s.prebooked}</b> pre-bk</span><span><b style="color:var(--sold)">${s.sold + s.sold_pending}</b> sold</span><span><b>${s.clients}</b> interested</span></span><span class="stack">${stackHTML(s)}</span></span><span class="go">Open ›</span></button>`;
  }).join("");
  return `<div class="layout all">
  <aside class="rail scroll">
    <div><div class="k">Open a block</div><div class="pills">${ACTIVE.map((b) => `<button class="pill" data-open="${b}">${b}</button>`).join("")}</div></div>
    <div><div class="k">Size</div><div class="pills">${[["all", "All"], ["1K", "1 Kanal"], ["14M", "14 M"], ["10M", "10 M"], ["X", "Corner"]].map(([v, l]) => `<button class="pill${S.size === v ? " on" : ""}" data-size="${v}">${l}</button>`).join("")}</div></div>
    <div><div class="k">Show</div><div class="pills"><button class="pill${S.show === "all" ? " on" : ""}" data-show="all">All plots</button><button class="pill${S.show === "ours" ? " on" : ""}" data-show="ours">Our plots</button></div></div>
    <div><div class="k">Legend</div><div class="legend">
      <span><i class="sw" style="background:var(--avail);border:0"></i>Our plot, available</span>
      <span><i class="sw" style="background:var(--listing);border:0"></i>Dealer listing, available</span>
      <span><i class="sw" style="background:var(--book);border:0"></i>Pre-booked</span>
      <span><i class="sw pendsw"></i>Sold, waiting for approval</span>
      <span><i class="sw" style="background:var(--sold);border:0"></i>Sold</span>
      <span><i class="sw" style="background:var(--plot)"></i>Not in our stock</span></div></div>
  </aside>
  <section class="mapwrap" aria-label="Map of all blocks">
    <svg role="img" aria-label="Margalla Orchard blocks and plots">${mapSVG("all")}</svg>
    ${findForm()}${zoomBtns("Fit to screen")}
    <div class="tip" hidden></div>
    <div class="maphint">Official FGEHA layout plan · tap a block or plot · drag · pinch or scroll to zoom</div>
  </section>
  <aside class="panel scroll">
    <div class="k">Our stock by block</div>
    <div class="act" style="gap:8px">${blocksHTML}</div>
    <div class="k" style="margin-top:6px">Latest changes</div>
    ${activityHTML()}
  </aside></div>`;
}

export function activityHTML(limit = 8) {
  const items = S.activity.slice(0, limit);
  if (!items.length) return `<div class="empty">${S.loaded ? "No changes yet." : "Loading…"}</div>`;
  return `<div class="act">${items.map((a) => `<button class="actrow" ${a.plot_id && G.geo.plots[a.plot_id] ? `data-plot="${esc(a.plot_id)}"` : ""}><i style="background:${a.private_to ? "var(--brass)" : "var(--soft)"}"></i><span>${esc(a.body)}<small>${esc(nameOf(a.actor))} · ${ago(a.at)}${a.private_to ? " · private" : ""}</small></span></button>`).join("")}</div>`;
}

export function blockView() {
  const b = S.block;
  const list = ACTIVE.map((x) => {
    const s = blockStats(x);
    return `<button class="brow${x === b ? " on" : ""}" data-open="${x}"><span class="L">${x}</span><span>${s.available} available<small>${s.prebooked} pre-booked · ${s.sold + s.sold_pending} sold</small></span><span class="mb">${stackHTML(s)}</span></button>`;
  }).join("");
  return `<div class="layout block">
  <aside class="side scroll">
    <button class="back" data-nav="all">‹ All blocks</button>
    <div class="k">Blocks</div>
    <div class="blist">${list}</div>
  </aside>
  <section class="mapwrap" aria-label="Block ${b} close-up">
    <svg role="img" aria-label="Block ${b} plots">${mapSVG("block")}</svg>
    ${findForm()}${zoomBtns("Fit block")}
    <button class="selbtn${S.multi ? " on" : ""}" data-act="toggleMulti">${S.multi ? "Done selecting" : "Select several plots"}</button>
    <div class="maphint">${S.multi ? "Tap plots to select them · tap again to unselect" : "Tap a plot to open its file · tap outside the block to close it"}</div>
  </section>
  <aside class="panel scroll">${S.multi ? bulkFile() : S.plot ? plotFile(S.plot) : blockFile(b)}</aside></div>`;
}

function blockFile(b) {
  const s = blockStats(b);
  const geo = G.geo.blocks[b];
  const ours = Object.values(S.plots).filter((d) => d.block === b).sort((x, y) => x.num - y.num);
  const filt = ours.filter((d) => S.statusFilter === "all" || d.status === S.statusFilter);
  return `<div><div class="k">Block ${b} · ${geo.sizes.map((z) => SIZES[z].label).join(", ")}</div><h2 style="margin-top:6px">Block ${b}</h2></div>
  <div class="facts"><div><b style="color:var(--avail)">${s.available}</b><span>Available</span></div><div><b style="color:var(--book)">${s.prebooked}</b><span>Pre-booked</span></div><div><b style="color:var(--sold)">${s.sold + s.sold_pending}</b><span>Sold</span></div></div>
  <div class="facts"><div><b>${geo.plots.length}</b><span>Plots on plan</span></div><div><b>${s.ours}</b><span>In our stock</span></div><div><b>${s.clients}</b><span>Interested</span></div></div>
  <div class="k">Our plots in Block ${b}</div>
  <div class="filterrow">${[["all", "All"], ["available", "Available"], ["prebooked", "Pre-booked"], ["sold_pending", "Waiting"], ["sold", "Sold"]].map(([v, l]) => `<button class="pill${S.statusFilter === v ? " on" : ""}" data-sf="${v}">${l}</button>`).join("")}</div>
  ${filt.length
    ? `<div class="ourlist">${filt.map((d) => { const n = S.demand[d.id] || 0; return `<button class="ourrow" data-plot="${d.id}"><span class="dot" style="background:${d.status === "available" && d.kind === "listing" ? "var(--listing)" : STATUS[d.status].color}"></span><span class="num">${d.id} <span class="meta">· ${SIZES[d.size] ? SIZES[d.size].label : ""}${d.kind === "listing" ? " · listing" : ""}</span></span><span class="meta">${n} interested</span><span class="pr">${cr(d.price)}</span></button>`; }).join("")}</div>`
    : `<div class="empty">${ours.length ? "No plots with this status." : `None of our plots are in this block yet.${can("add_plots") ? " Tap a plot on the map and choose \"Add to our plots\"." : ""}`}</div>`}`;
}

export function sizeChoice(cur, attr) {
  return `<div class="seg sizes" role="group" aria-label="Plot size">${SIZE_ORDER.map((k) => `<button type="button" class="${cur === k ? "on" : ""}" data-${attr}="${k}">${k === "X" ? "Corner" : SIZES[k].label}</button>`).join("")}</div>`;
}

function bulkFile() {
  const ids = [...S.sel].filter((id) => G.geo.plots[id] && G.geo.plots[id].num != null);
  const ours = ids.filter((id) => S.plots[id]);
  let h = `<div><div class="k">Block ${S.block} · several plots</div><h2 style="margin-top:6px">${ids.length} plot${ids.length === 1 ? "" : "s"} selected</h2></div>`;
  if (!ids.length) return h + `<div class="empty">Tap plots on the map to select them. Then set their price, size or tags together.</div>`;
  h += `<div class="selchips">${ids.slice(0, 40).map((id) => `<button class="tag on" data-unsel="${id}" title="Unselect">${id} ×</button>`).join("")}${ids.length > 40 ? `<span class="meta">+${ids.length - 40} more</span>` : ""}</div>
  <div class="meta">${ours.length} of ${ids.length} are in our stock.</div><button class="linkbtn" style="justify-self:start" data-act="clearSel">Clear selection</button>`;
  if (can("edit_price") || can("add_plots")) {
    h += `<form class="add" id="bulkPriceForm"><div class="k">Price for all selected</div>${can("add_plots") ? `<span class="meta">Plots that are not in our stock yet are added as available.</span>` : `<span class="meta">Only plots in our stock get the price.</span>`}
    <input id="bp" inputmode="decimal" placeholder="e.g. 3.80" autocomplete="off" aria-label="Price in crore"><button class="btn forest" type="submit">Set price · ${ids.length} plot${ids.length === 1 ? "" : "s"}</button></form>`;
  }
  if (isAdmin()) h += `<div class="k">Status (admin)</div><div class="seg" role="group" aria-label="Status for all selected">${["available", "prebooked", "sold"].map((k) => `<button class="${k}" data-bstatus="${k}" ${ours.length ? "" : "disabled"}>${STATUS[k].label}</button>`).join("")}</div>`;
  if (can("add_plots")) h += `<div class="k">Size for all selected</div>${sizeChoice(null, "bsize")}`;
  const allHave = (t) => ours.length && ours.every((id) => (S.plots[id].tags || []).includes(t));
  h += `<div class="k">Tags${ours.length < ids.length ? ` <span class="meta">(our plots only)</span>` : ""}</div><div class="tags">${TAGS.map((t) => `<button type="button" class="tag${allHave(t) ? " on" : ""}" data-btag="${esc(t)}" ${ours.length ? "" : "disabled"}>${esc(t)}</button>`).join("")}</div>`;
  if (isAdmin() && ours.length) {
    h += S.ui.bulkConfirm
      ? `<div class="confirm"><b>Remove ${ours.length} plot${ours.length === 1 ? "" : "s"} from our plots?</b><span class="meta">Their prices and client interest are deleted for everyone. Sold plots stay.</span><div class="btns"><button class="btn" data-act="bulkKeep">Keep them</button><button class="btn danger" data-act="bulkRemove">Remove</button></div></div>`
      : `<button class="sbtn danger" style="justify-self:start" data-act="bulkAsk">Remove selected from our plots</button>`;
  }
  return h;
}

function notesBar(id, d) {
  const tags = d.tags || [];
  let h = `<div class="notebar"><div class="k">Notes on this plot</div><div class="tags">`;
  h += TAGS.concat(tags.filter((t) => !TAGS.includes(t))).map((t) => `<button type="button" class="tag${tags.includes(t) ? " on" : ""}" data-tag="${esc(t)}" aria-pressed="${tags.includes(t)}">${esc(t)}</button>`).join("");
  h += `</div>`;
  if (S.ui.editNote) h += `<form id="noteForm" class="noteform"><textarea id="pnote" placeholder="e.g. Corner plot with extra land on the park side" aria-label="Note on this plot">${esc(d.note || "")}</textarea><div class="btns"><button type="button" class="btn" data-act="cancelNote">Cancel</button><button type="submit" class="btn forest">Save note</button></div></form>`;
  else h += `<div class="notetext">${d.note ? esc(d.note) : `<span class="meta">No note yet.</span>`} <button class="linkbtn" data-act="editNote">${d.note ? "Edit" : "Add note"}</button></div>`;
  return h + `</div>`;
}

const field = (id, label, attrs = "", val = "") => `<label class="fl"><span>${label}</span><input id="${id}" ${attrs} value="${esc(val)}" autocomplete="off"></label>`;

function ownerCard(id) {
  const o = S.owners[id];
  const w = can("add_listings") && (!o || o.agent_id === S.me.id || isAdmin());
  if (!o && !w) return "";
  if (S.ui.ownerEdit && w) {
    return `<form class="add" id="ownerForm"><div class="k">Plot owner (private)</div>
      ${field("on", "Owner name", "", o ? o.owner_name : "")}${field("op", "Owner phone", 'inputmode="tel"', o ? o.owner_phone : "")}
      ${field("od", "Owner's demand (crore)", 'inputmode="decimal"', o && o.owner_demand != null ? Number(o.owner_demand) : "")}
      ${field("oc", "Our commission", 'placeholder="e.g. 1% or PKR 2,00,000"', o ? o.commission : "")}
      <label class="fl"><span>Note (e.g. permission letter received)</span><textarea id="onote">${esc(o ? o.note : "")}</textarea></label>
      <div class="btns"><button type="button" class="btn" data-act="cancelOwner">Cancel</button><button class="btn forest" type="submit">Save owner</button></div></form>`;
  }
  return `<div class="card"><div class="k">Plot owner (private)</div>${o
    ? `<div class="n">${esc(o.owner_name || "No name")}</div><div class="s">${esc(o.owner_phone || "No number")} · demand ${cr(o.owner_demand)} Cr · commission ${esc(o.commission || "—")}</div>${o.note ? `<div class="s">${esc(o.note)}</div>` : ""}<div class="s">Managed by ${esc(nameOf(o.agent_id))}</div>`
    : `<div class="meta">No owner details yet.</div>`}${w ? `<button class="linkbtn" style="justify-self:start;margin:0;padding-left:0" data-act="editOwner">${o ? "Edit owner" : "Add owner details"}</button>` : ""}</div>`;
}

function saleForm(dealId, admin) {
  return `<form class="add" id="saleForm" data-deal="${dealId}"><div class="k">${admin ? "Record the sale" : "Mark sold · the admins approve"}</div>
    ${field("sp", "Sale price (crore PKR)", 'inputmode="decimal" placeholder="e.g. 4.40" required')}
    ${field("st", "Token (Bayana) amount (PKR)", 'inputmode="numeric" placeholder="e.g. 1000000"')}
    <label class="fl"><span>Mode of payment</span><select id="sm"><option value="">Choose…</option>${Object.entries(PAYMODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
    ${field("sd", "Time limit for the transfer", 'type="date"')}
    <label class="fl"><span>Note</span><textarea id="sn" placeholder="e.g. token by cheque, balance at transfer"></textarea></label>
    <div class="btns"><button type="button" class="btn" data-act="cancelSale">Cancel</button><button class="btn primary" type="submit">${admin ? "Save sale" : "Send for approval"}</button></div></form>`;
}

function dealCard(d, plot) {
  const c = S.clients[d.client_id] || { name: "Client" };
  const preq = pendingFor(d.id, "prebook"), sreq = pendingFor(d.id, "sale");
  const holds = plot.holder_deal === d.id;
  const mine = d.agent_id === S.me.id;
  let h = `<div class="cl"><div class="top"><span class="av" style="background:${colorOf(d.agent_id)}">${esc(initials(c.name))}</span><div style="min-width:0;flex:1"><div class="n">${esc(c.name)}</div><div class="s">${esc(c.phone || "No number")}${isAdmin() ? ` · agent ${esc(nameOf(d.agent_id))}` : ""} · ${ago(d.created_at)}</div></div><span class="stage ${d.sold ? "sold" : d.stage}">${d.sold && d.stage === "token" ? "Sold · token" : STAGES[d.stage] || esc(d.stage)}</span></div>`;
  if (d.sold) h += `<div class="s">Sold for <b>${cr(d.sale_price)} Cr</b> · token ${pkr(d.token_amount)} · ${PAYMODES[d.payment_mode] || "mode not set"}${d.transfer_deadline ? ` · transfer by ${day(d.transfer_deadline)}` : ""}</div>`;
  if (preq) h += `<div class="wait">Pre-booking request waiting for an admin · ${ago(preq.created_at)}</div>`;
  if (sreq) h += `<div class="wait">Sale waiting for an admin: ${cr(sreq.sale_price)} Cr · token ${pkr(sreq.token_amount)} · ${PAYMODES[sreq.payment_mode] || "mode not set"}</div>`;
  if (d.stage === "dropped" && d.drop_reason) h += `<div class="s">Stopped: ${esc(d.drop_reason)}</div>`;
  const sum = docSummary(d);
  if (sum) h += `<div class="s">${esc(sum)}</div>`;
  if (S.ui.saleFor === d.id) return h + saleForm(d.id, isAdmin()) + `</div>`;
  if (S.ui.dropFor === d.id) {
    return h + `<form class="add" id="dropForm" data-deal="${d.id}"><div class="k">Stop this deal</div><input id="dr" placeholder="Reason, e.g. bought another plot" aria-label="Reason"><div class="btns"><button type="button" class="btn" data-act="cancelDrop">Cancel</button><button class="btn danger" type="submit">Stop deal</button></div></form></div>`;
  }
  const btns = [];
  if (mine || isAdmin()) {
    if (d.stage === "dropped") btns.push(`<button class="sbtn" data-again="${d.id}">Interested again</button>`);
    else if (preq || sreq) btns.push(`<button class="sbtn" data-cancelreq="${(preq || sreq).id}">Cancel request</button>`);
    else if (!d.sold) {
      if (d.stage === "interested" && plot.status === "available") btns.push(`<button class="sbtn primary" data-prebook="${d.id}">${isAdmin() ? "Pre-book" : "Ask to pre-book"}</button>`);
      if (can("mark_sold") && (plot.status === "available" || (plot.status === "prebooked" && holds))) btns.push(`<button class="sbtn sold" data-sale="${d.id}">Mark sold</button>`);
    }
    if (d.stage !== "dropped" && (!d.sold || isAdmin())) btns.push(`<button class="sbtn" data-drop="${d.id}">Stop</button>`);
  }
  if (d.stage !== "dropped") btns.push(`<button class="sbtn${S.ui.dealOpen === d.id ? " on" : ""}" data-dealfile="${d.id}" aria-expanded="${S.ui.dealOpen === d.id}">${S.ui.dealOpen === d.id ? "Close deal file" : "Deal file and documents"}</button>`);
  if (btns.length) h += `<div class="row">${btns.join("")}</div>`;
  if (S.ui.dealOpen === d.id && d.stage !== "dropped") h += dealFile(d);
  return h + `</div>`;
}

function addClientForm(id) {
  const onPlot = new Set(dealsFor(id).filter((d) => d.stage !== "dropped").map((d) => d.client_id));
  const mineList = Object.values(S.clients).filter((c) => c.agent_id === S.me.id && !onPlot.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  return `<form class="add" id="addClientForm"><div class="k">Add a client to ${id}</div>
    ${mineList.length ? `<label class="fl"><span>Your client</span><select id="cpick"><option value="">New client…</option>${mineList.map((c) => `<option value="${c.id}">${esc(c.name)}${c.phone ? " · " + esc(c.phone) : ""}</option>`).join("")}</select></label>` : ""}
    <div id="newClientFields" class="grid2">${field("cn", "Client name", 'placeholder="Full name"')}${field("cp", "Phone / WhatsApp", 'inputmode="tel" placeholder="03xx xxxxxxx"')}${field("cc", "CNIC (optional)", 'inputmode="numeric" placeholder="xxxxx-xxxxxxx-x"')}</div>
    <label class="fl"><span>Note</span><textarea id="cnote" placeholder="e.g. site visit Saturday, budget 4.0"></textarea></label>
    <div class="btns"><button type="button" class="btn" data-act="cancelAdd">Cancel</button><button type="submit" class="btn primary">Save client</button></div></form>`;
}

export function plotFile(id) {
  const p = G.geo.plots[id];
  const d = S.plots[id];
  const sz = SIZES[p.size];
  let h = `<div><div class="k">Block ${p.block} · ${sz.label} · ${sz.dims}</div><h2 style="margin-top:6px">${p.num != null ? "Plot " + id : "Plot number not read"}</h2>${d ? `<div class="kind ${d.kind}">${d.kind === "listing" ? "Dealer listing · a client's plot" : "Our plot"}</div>` : ""}</div>`;
  if (!d && can("add_plots")) {
    if (S.ui.fixOpen) h += `<form class="add" id="fixForm"><div class="k">${p.num != null ? "Correct the plot number" : "Enter the plot number"}</div><span class="meta">Check the number on the official plan. Everyone sees the change.</span><input id="fx" inputmode="numeric" placeholder="e.g. 142" autocomplete="off" aria-label="Plot number"><div class="btns"><button type="button" class="btn" data-act="cancelFix">Cancel</button><button type="submit" class="btn forest">Save number</button></div></form>`;
    else h += `<button class="sbtn" style="justify-self:start" data-act="openFix">${p.num != null ? "Wrong number? Correct it" : "Enter the plot number"}</button>`;
  }
  if (!d) {
    if (p.num == null) return h + `<div class="empty">The plan text for this plot could not be read.${can("add_plots") ? " Enter its number first, then you can add it to our plots." : " An admin can enter its number."}</div>`;
    const kinds = [can("add_plots") && ["own", "Our plot"], can("add_listings") && ["listing", "Dealer listing"]].filter(Boolean);
    h += `<div class="empty">This plot is not in our stock.${kinds.length ? "" : " Only an admin or an agent with permission can add it."}</div>`;
    if (kinds.length) {
      const kind = S.ui.addKind && kinds.some((k) => k[0] === S.ui.addKind) ? S.ui.addKind : kinds[0][0];
      h += `<form class="add" id="addPlotForm"><div class="k">Add to our stock</div>
        ${kinds.length > 1 ? `<div class="seg two" role="group" aria-label="Type">${kinds.map(([k, l]) => `<button type="button" class="${kind === k ? "on" : ""}" data-akind="${k}">${l}</button>`).join("")}</div>` : ""}
        <label class="meta" for="np">${kind === "listing" ? "Asking price for the buyer" : "Asking price"} (crore PKR)</label><input id="np" inputmode="decimal" placeholder="e.g. 4.10" autocomplete="off">
        <span class="meta">Plot size</span>${sizeChoice(S.ui.addSize || p.size, "asize")}
        <button class="btn forest" type="submit">${kind === "listing" ? "Add dealer listing" : "Add to our plots"}</button></form>`;
    }
    return h;
  }
  const deals = dealsFor(id).sort((a, b) => (a.stage === "dropped") - (b.stage === "dropped") || (a.created_at < b.created_at ? 1 : -1));
  const demand = S.demand[id] || 0;
  h += `<div class="facts"><div><b>${sz.sqyd || "—"}</b><span>sq yd</span></div><div><b>${demand}</b><span>Interested</span></div><div><b style="font-size:15px;color:${STATUS[d.status].color}">${STATUS[d.status].short || STATUS[d.status].label}</b><span>Status</span></div></div>`;
  if (d.status === "sold_pending") h += `<div class="wait">An agent marked this plot sold. An admin must approve the sale.${isAdmin() ? ` <button class="linkbtn" data-tab="approvals">Open approvals</button>` : ""}</div>`;
  h += `<div class="k">Asking price</div>`;
  if (S.ui.editPrice && can("edit_price")) h += `<form class="price" id="priceForm"><input id="pp" inputmode="decimal" value="${d.price != null ? Number(d.price) : ""}" aria-label="Asking price in crore" autocomplete="off"><small>crore PKR</small><button class="linkbtn" type="submit">Save</button></form>`;
  else h += `<div class="price"><span class="v">${cr(d.price)}</span><small>crore PKR</small>${can("edit_price") ? `<button class="linkbtn" data-act="editPrice">Edit</button>` : ""}</div>`;
  h += `<div class="k">Plot size</div>`;
  if (S.ui.editSize && can("add_plots")) h += `${sizeChoice(p.size, "esize")}<button class="linkbtn" style="justify-self:start" data-act="cancelSize">Cancel</button>`;
  else h += `<div class="price"><span class="v" style="font-size:18px">${esc(sz.label)}</span><small>${esc(sz.dims)}</small>${can("add_plots") ? `<button class="linkbtn" data-act="editSize">Edit</button>` : ""}</div>`;
  h += notesBar(id, d);
  if (d.kind === "listing") h += ownerCard(id);
  h += plotDocs(id);
  if (isAdmin()) h += `<div class="k">Set status directly (admin)</div><div class="seg" role="group" aria-label="Plot status">${["available", "prebooked", "sold"].map((k) => `<button class="${k}${d.status === k ? " on" : ""}" data-status="${k}">${STATUS[k].label}</button>`).join("")}</div>`;
  h += `<div class="meta">Updated by ${esc(nameOf(d.updated_by))} · ${ago(d.updated_at)}</div>`;
  if (d.status === "sold" && can("add_listings")) {
    h += S.ui.relistOpen
      ? `<form class="add" id="relistForm"><div class="k">Sell again for the new owner</div><span class="meta">The plot becomes a dealer listing and available. The old sale stays in the records.</span><input id="rp" inputmode="decimal" placeholder="Asking price, e.g. 4.90" aria-label="Asking price in crore"><div class="btns"><button type="button" class="btn" data-act="cancelRelist">Cancel</button><button class="btn forest" type="submit">List again</button></div></form>`
      : `<button class="sbtn" style="justify-self:start" data-act="openRelist">Help the new owner sell (dealer listing)</button>`;
  }
  const visible = deals.length;
  h += `<div class="k" style="margin-top:4px">${isAdmin() ? "Clients on this plot" : "Your clients on this plot"} (${visible})</div>`;
  if (!isAdmin() && demand > deals.filter((x) => x.stage !== "dropped").length) h += `<div class="meta">Other agents have ${demand - deals.filter((x) => x.stage !== "dropped").length} client(s) on this plot. Their details are private.</div>`;
  h += deals.length ? deals.map((x) => dealCard(x, d)).join("") : `<div class="empty">No clients of yours on this plot yet.</div>`;
  if (S.ui.addOpen) h += addClientForm(id);
  else h += `<button class="btn" data-act="openAdd">+ Add client to this plot</button>`;
  if (isAdmin() && d.status !== "sold" && d.status !== "sold_pending") {
    h += S.ui.confirmRemove
      ? `<div class="confirm"><b>Remove ${id} from our plots?</b><span class="meta">Its price and ${deals.length} client interest record(s) are deleted for everyone.</span><div class="btns"><button class="btn" data-act="cancelRemove">Keep it</button><button class="btn danger" data-act="doRemove">Remove</button></div></div>`
      : `<button class="sbtn danger" style="justify-self:start" data-act="askRemove">Remove from our plots</button>`;
  }
  return h;
}
