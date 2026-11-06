// Every change goes to a server function. The server checks the permissions; the app only hides
// the buttons that a person cannot use.
import { S, G, hooks, toast, isAdmin, can } from "./core.js";
import { SIZES } from "./geo.js";

async function call(fn, args, okMsg) {
  try {
    const r = await S.api.rpc(fn, args);
    if (okMsg) toast(okMsg);
    await hooks.refresh();
    return { ok: true, r };
  } catch (e) {
    toast(e.message || "That did not save. Check your connection and try again.", "err");
    await hooks.refresh();
    return { ok: false, err: e };
  }
}

export function parsePrice(v) {
  const n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, ""));
  return isFinite(n) && n > 0 && n < 1000 ? Math.round(n * 100) / 100 : null;
}
export function parseAmount(v) {
  const n = parseInt(String(v == null ? "" : v).replace(/[^0-9]/g, ""), 10);
  return isFinite(n) && n >= 0 ? n : null;
}
const needPrice = () => toast("Enter a price in crore, for example 4.10", "err");

export async function addPlots(ids, raw, size, kind = "own", tags) {
  const price = parsePrice(raw);
  if (price == null) return needPrice();
  const items = ids.map((id) => ({ id, size: size || G.geo.plots[id].size }));
  const res = await call("add_plots", { p_items: items, p_price: price, p_kind: kind, p_tags: tags || [], p_note: "" },
    ids.length === 1 ? (kind === "listing" ? ids[0] + " added as a dealer listing" : ids[0] + " added to our plots") : null);
  // a size that differs from the plan is kept as a correction, so the map shows it too
  if (res.ok && size) for (const id of ids) { const p = G.geo.plots[id]; if (p && p.size !== size && can("add_plots")) await S.api.rpc("save_fix", { p_key: p.key, p_n: null, p_size: size }).catch(() => {}); }
  return res;
}
export async function setPrice(ids, raw) {
  const price = parsePrice(raw);
  if (price == null) return needPrice();
  return call("set_price", { p_ids: ids, p_price: price }, null);
}
// price for several plots: plots in stock get the new price, the others are added (when allowed)
export async function bulkPrice(ids, raw) {
  const price = parsePrice(raw);
  if (price == null) return needPrice();
  const have = ids.filter((id) => S.plots[id]), add = ids.filter((id) => !S.plots[id]);
  if (have.length && can("edit_price")) await setPrice(have, price);
  if (add.length && can("add_plots")) await addPlots(add, price);
}
export async function setSize(ids, size) {
  if (!SIZES[size]) return;
  for (const id of ids) {
    const p = G.geo.plots[id];
    if (p) {
      try { await S.api.rpc("save_fix", { p_key: p.key, p_n: null, p_size: size }); }
      catch (e) { toast(e.message, "err"); return hooks.refresh(); }
    }
  }
  const inStock = ids.filter((id) => S.plots[id]);
  if (inStock.length) return call("set_size", { p_ids: inStock, p_size: size }, ids.length + " plot(s) set to " + SIZES[size].label);
  toast(ids.length + " plot(s) set to " + SIZES[size].label);
  return hooks.refresh();
}
export async function setTag(ids, tag, on) { return call("set_tag", { p_ids: ids, p_tag: tag, p_on: on }); }
export async function setNote(id, text) { return call("set_note", { p_id: id, p_note: String(text || "").slice(0, 400) }); }
export async function setStatus(ids, st) { return call("set_status", { p_ids: ids, p_status: st }); }
export async function removePlots(ids) { return call("remove_plots", { p_ids: ids }, ids.length + " plot(s) removed from our plots"); }
export async function saveFix(id, raw) {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  if (!(n > 0 && n < 10000)) return toast("Enter a plot number, for example 142", "err");
  const p = G.geo.plots[id];
  if (!p) return;
  const nid = p.block + "-" + n;
  if (G.geo.plots[nid] && G.geo.plots[nid] !== p) return toast(nid + " is already another plot on the map. Correct that one first.", "err");
  S._goAfterFix = { key: p.key };
  return call("save_fix", { p_key: p.key, p_n: n, p_size: null }, "Plot number saved: " + nid);
}
export async function relist(id, raw) {
  const price = parsePrice(raw);
  if (price == null) return needPrice();
  return call("relist_plot", { p_id: id, p_price: price }, id + " is now a dealer listing");
}
export async function saveOwner(plotId, f) {
  return call("save_listing_owner", {
    p_plot_id: plotId, p_owner_name: f.name, p_owner_phone: f.phone, p_owner_demand: parsePrice(f.demand),
    p_commission: f.commission, p_note: f.note,
  }, "Owner details saved");
}

export async function saveClient(id, f) {
  return call("save_client", { p_id: id || null, p_name: f.name, p_phone: f.phone || "", p_cnic: f.cnic || "", p_note: f.note || "" },
    id ? "Client saved" : "Client added");
}
export async function deleteClient(id) { return call("delete_client", { p_id: id }, "Client deleted"); }
export async function addInterest(clientId, plotId, note) {
  return call("add_interest", { p_client_id: clientId, p_plot_id: plotId, p_note: note || "" }, "Client added to " + plotId);
}
export async function newClientOnPlot(plotId, f) {
  let id;
  try { id = await S.api.rpc("save_client", { p_id: null, p_name: f.name, p_phone: f.phone || "", p_cnic: f.cnic || "", p_note: f.note || "" }); }
  catch (e) { toast(e.message, "err"); return { ok: false }; }
  return addInterest(id, plotId, "");
}
export async function requestPrebook(dealId) {
  return call("request_prebook", { p_deal_id: dealId, p_note: "" }, isAdmin() ? "Pre-booked" : "Pre-booking request sent to the admins");
}
export async function requestSale(dealId, f) {
  const price = parsePrice(f.price);
  if (price == null) return toast("Enter the sale price in crore, for example 4.40", "err");
  return call("request_sale", {
    p_deal_id: dealId, p_sale_price: price, p_token_amount: parseAmount(f.token), p_payment_mode: f.mode || null,
    p_transfer_deadline: f.deadline || null, p_note: f.note || "",
  }, isAdmin() ? "Sale saved" : "Sale sent to the admins for approval");
}
export async function dropDeal(dealId, reason) { return call("drop_deal", { p_deal_id: dealId, p_reason: reason || "" }, "Deal stopped"); }
export async function decide(reqId, approve, reason) {
  return call("decide_request", { p_id: reqId, p_approve: approve, p_reason: reason || null }, approve ? "Approved" : "Not approved");
}
export async function cancelRequest(reqId) { return call("cancel_request", { p_id: reqId }, "Request cancelled"); }
export async function saveMember(id, f) {
  return call("save_member", {
    p_id: id || null, p_email: f.email, p_full_name: f.name, p_phone: f.phone || "", p_role: f.role, p_active: f.active !== false,
    p_perms: f.perms || {},
  }, id ? "Account saved" : "Account added");
}

export async function updateDeal(dealId, stage, fields, okMsg) {
  return call("update_deal", { p_deal_id: dealId, p_stage: stage || null, p_fields: fields || {} }, okMsg || (stage ? "Stage changed" : null));
}
export async function deleteDocument(id) {
  const doc = S.documents.find((x) => x.id === id);
  const res = await call("delete_document", { p_id: id }, "Document deleted");
  if (res.ok && doc) await S.api.removeFile(doc.path).catch(() => {});
  return res;
}
export async function saveEvent(id, f) {
  if (!String(f.title || "").trim()) return toast("Add a title", "err");
  if (!f.on_date) return toast("Choose a date", "err");
  const deal = f.deal_id ? f.deal_id : null;
  return call("save_event", { p_id: id || null, p_deal_id: deal, p_plot_id: f.plot_id || null, p_title: f.title, p_on_date: f.on_date,
    p_at_time: f.at_time || null, p_note: f.note || "", p_done: !!f.done }, id ? null : "Entry added to the calendar");
}
export async function deleteEvent(id) { return call("delete_event", { p_id: id }, "Entry deleted"); }
