// The deal file: the stages from interest to the allotment letter, the details of each stage,
// and the documents (photos and PDFs) for each stage. Also the documents of a plot.
import { S, esc, cr, pkr, day, ago, nameOf, isAdmin, can, PAYMODES, toast } from "./core.js";

export const AUTHORITIES = ["FGEHA", "CDA", "Housing Foundation", "DHA", "Other"];
export const TRANSFER_MODES = { pay_order: "Pay order", bank_transfer: "Bank transfer", cash: "Cash", other: "Other" };
export const DOC_KINDS = {
  lp_letter: "LP letter (land provider)", ndc_application: "NDC application",
  ownership: "Ownership papers", agreement: "Agreement", token_receipt: "Token payment proof", cnic: "CNIC copy",
  ndc: "NDC (approved)", transfer_letter: "Transfer date letter", pay_order: "Pay order or bank slip",
  transfer_receipt: "Authority receipt", allotment_letter: "Allotment letter", other: "Other",
};

// The 8 stages of a deal. Each has the details it records and the documents it usually needs.
export const FLOW = [
  { k: "interested", n: 1, label: "Interested", docs: ["cnic"],
    fields: [["agreement_on", "Planned token agreement date", "date"]] },
  { k: "prebooked", n: 2, label: "Pre-booked", docs: ["cnic"],
    fields: [["agreement_on", "Planned token agreement date", "date"]] },
  { k: "token", n: 3, label: "Token (Bayana)", docs: ["agreement", "token_receipt"],
    hint: "Agreed: the price, the time for the transfer, the token amount and the mode of payment.",
    fields: [["agreement_on", "Agreement date", "date"], ["token_amount", "Token amount (PKR)", "amount"], ["payment_mode", "Mode of payment", "paymode"], ["transfer_deadline", "Time limit for the transfer", "date"]] },
  { k: "ndc_submitted", n: 4, label: "NDC submitted", docs: ["ndc_application"],
    hint: "No Demand Certificate submitted to the authority. Housing Foundation takes about 2 to 3 days.",
    fields: [["authority", "Authority", "authority"], ["ndc_submitted_on", "Submitted on", "date"], ["ndc_expected", "Approval expected on", "date"]] },
  { k: "ndc_approved", n: 5, label: "NDC approved", docs: ["ndc"],
    fields: [["ndc_approved_on", "Approved on", "date"]] },
  { k: "transfer_date", n: 6, label: "Transfer date set", docs: ["transfer_letter"],
    hint: "Both parties must come on this date with their CNIC for biometrics.",
    fields: [["transfer_on", "Transfer date", "date"]] },
  { k: "transfer_done", n: 7, label: "Transfer done", docs: ["pay_order", "transfer_receipt"],
    hint: "The authority gives a receipt to the buyer and a date for the allotment letter.",
    fields: [["transfer_mode", "Mode of transfer", "transfermode"], ["receipt_no", "Receipt number", "text"], ["allotment_expected", "Allotment letter expected on", "date"]] },
  { k: "closed", n: 8, label: "Allotment letter received", docs: ["allotment_letter"],
    hint: "The buyer has the allotment letter. The deal is closed.",
    fields: [["allotment_received", "Received on", "date"]] },
];
export const stageIndex = (k) => FLOW.findIndex((s) => s.k === k);
// a plot with no client yet takes the LP letter
export const PLOT_DOCS = ["lp_letter"];

// a date value from either backend as YYYY-MM-DD
export function dstr(v) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

const docsOf = (dealId, stage) => S.documents.filter((x) => x.deal_id === dealId && (!stage || x.stage === stage));

function fieldInput(d, [key, label, type], w) {
  const id = `f_${key}`;
  const v = d[key];
  const dis = w ? "" : " disabled";
  let input;
  if (type === "date") input = `<input id="${id}" data-f="${key}" type="date" value="${esc(dstr(v))}"${dis}>`;
  else if (type === "amount") input = `<input id="${id}" data-f="${key}" inputmode="numeric" value="${v != null ? Math.round(v) : ""}" placeholder="e.g. 1000000"${dis}>`;
  else if (type === "paymode") input = `<select id="${id}" data-f="${key}"${dis}><option value="">Choose…</option>${Object.entries(PAYMODES).map(([k, l]) => `<option value="${k}"${v === k ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  else if (type === "transfermode") input = `<select id="${id}" data-f="${key}"${dis}><option value="">Choose…</option>${Object.entries(TRANSFER_MODES).map(([k, l]) => `<option value="${k}"${v === k ? " selected" : ""}>${l}</option>`).join("")}</select>`;
  else if (type === "authority") input = `<select id="${id}" data-f="${key}"${dis}><option value="">Choose…</option>${AUTHORITIES.map((k) => `<option value="${k}"${v === k ? " selected" : ""}>${k}</option>`).join("")}</select>`;
  else input = `<input id="${id}" data-f="${key}" value="${esc(v || "")}"${dis}>`;
  return `<label class="fl"><span>${label}</span>${input}</label>`;
}

export function docGrid(docs, canDelete) {
  if (!docs.length) return "";
  return `<div class="docs">${docs.map((x) => {
    const img = x.mime.startsWith("image/");
    const url = S.fileUrls[x.path];
    return `<div class="doc"><button class="docthumb" data-opendoc="${x.id}" aria-label="Open ${esc(x.file_name)}">${img ? `<span class="thumbimg${url ? " on" : ""}"${url ? ` style="background-image:url(&quot;${esc(url)}&quot;)"` : ""}></span>` : `<span class="pdf">PDF</span>`}</button>
      <div class="docmeta"><b>${esc(DOC_KINDS[x.kind] || x.kind)}</b><small>${esc(x.file_name)} · ${esc(nameOf(x.uploaded_by))} · ${ago(x.created_at)}</small></div>
      ${canDelete(x) ? (S.ui.delDoc === x.id ? `<span class="row"><button class="sbtn" data-act="keepDoc">Keep</button><button class="sbtn danger" data-deldoc="${x.id}">Delete</button></span>` : `<button class="linkbtn danger" data-askdeldoc="${x.id}">Delete</button>`) : ""}</div>`;
  }).join("")}</div>`;
}

function uploader(target, kinds) {
  if (!can("upload_docs")) return `<div class="meta">You do not have permission to upload documents.</div>`;
  const sel = `up_kind_${target.stage || "plot"}`;
  const choose = kinds.length > 1
    ? `<select id="${sel}" aria-label="Type of document">${kinds.map((k) => `<option value="${k}">${DOC_KINDS[k]}</option>`).join("")}</select>`
    : `<input type="hidden" id="${sel}" value="${kinds[0]}"><span class="upkind">${DOC_KINDS[kinds[0]]}</span>`;
  return `<div class="upload">${choose}
    <label class="btn upbtn">Add photo or PDF<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-updeal="${target.deal || ""}" data-upplot="${esc(target.plot || "")}" data-upstage="${target.stage || ""}" data-upkind="${sel}"></label></div>`;
}

const canDelDoc = (x) => isAdmin() || x.uploaded_by === S.me.id || x.owner_agent === S.me.id;

// the deal file inside a client card on the plot panel
export function dealFile(d) {
  const w = d.agent_id === S.me.id || isAdmin();
  const cur = stageIndex(d.stage);
  const open = S.ui.stageOpen && stageIndex(S.ui.stageOpen) >= 0 ? S.ui.stageOpen : d.stage === "dropped" ? "interested" : d.stage;
  let h = `<div class="dealfile"><div class="k">Deal file · ${esc(d.plot_id)}</div><ol class="steps">`;
  for (const st of FLOW) {
    const i = stageIndex(st.k);
    const state = d.stage === "dropped" ? "" : i < cur ? "done" : i === cur ? "now" : "";
    const nd = docsOf(d.id, st.k).length;
    h += `<li class="step ${state}${open === st.k ? " open" : ""}"><button class="stephead" data-stage="${st.k}" aria-expanded="${open === st.k}"><span class="num">${state === "done" ? "✓" : st.n}</span><span class="sl">${st.label}</span>${nd ? `<span class="dc">${nd} doc${nd === 1 ? "" : "s"}</span>` : ""}</button>`;
    if (open === st.k) {
      h += `<div class="stagebody">${st.hint ? `<div class="meta">${st.hint}</div>` : ""}`;
      if (i > cur) h += `<div class="empty">The details and documents of this stage open when the deal reaches it.</div>`;
      else {
        h += `<form class="stageform" id="stageForm" data-deal="${d.id}" data-stage="${st.k}"><div class="grid2">${st.fields.map((f) => fieldInput(d, f, w)).join("")}</div>
          ${w ? `<button class="btn forest" type="submit">Save details</button>` : ""}</form>`;
        h += docGrid(docsOf(d.id, st.k), canDelDoc);
        if (w) h += uploader({ deal: d.id, stage: st.k }, st.docs);
      }
      if (w && d.sold && i >= stageIndex("token") && i !== cur) h += `<button class="sbtn" data-setstage="${st.k}" data-deal="${d.id}">Make this the current stage</button>`;
      h += `</div>`;
    }
    h += `</li>`;
  }
  h += `</ol>`;
  if (w && d.sold && cur >= stageIndex("token") && cur < FLOW.length - 1) {
    const nx = FLOW[cur + 1];
    h += `<button class="btn primary" data-setstage="${nx.k}" data-deal="${d.id}">Move to stage ${nx.n}: ${nx.label}</button>`;
  } else if (!d.sold && d.stage !== "dropped") h += `<div class="meta">Stages 3 to 8 open after an admin approves the sale.</div>`;
  if (d.stage === "closed") h += `<div class="meta">This deal is closed.</div>`;
  return h + `</div>`;
}

// documents of a plot (for example the ownership papers), private to the admins and the uploader
export function plotDocs(plotId) {
  const docs = S.documents.filter((x) => !x.deal_id && x.plot_id === plotId);
  if (!docs.length && !can("upload_docs")) return "";
  return `<div class="card"><div class="k">Plot documents (private)</div><div class="meta">The LP letter (land provider letter) of this plot. Documents of a deal go in the client's deal file, in its stage. Only the uploader and the admins see these files.</div>${docGrid(docs, canDelDoc)}${uploader({ plot: plotId, stage: "plot" }, PLOT_DOCS)}</div>`;
}

// a photo is made smaller before upload: longest side 1600 px, JPEG
export async function prepareFile(file, maxBytes) {
  const okTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!okTypes.includes(file.type)) throw new Error("Use a photo (JPG, PNG, WebP) or a PDF.");
  if (file.type === "application/pdf") {
    if (file.size > maxBytes) throw new Error(`This PDF is too large. The limit is ${Math.round(maxBytes / 1048576)} MB.`);
    return { blob: file, name: file.name, mime: file.type };
  }
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("This photo could not be read.");
  let q = 0.82, side = 1600, blob;
  for (let k = 0; k < 5; k++) {
    const sc = Math.min(1, side / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    blob = await new Promise((res) => c.toBlob(res, "image/jpeg", q));
    if (blob.size <= maxBytes) break;
    q -= 0.12; side = Math.round(side * 0.8);
  }
  if (blob.size > maxBytes) throw new Error("This photo is too large.");
  return { blob, name: file.name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", mime: "image/jpeg" };
}

export async function uploadDoc(input) {
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;
  const dealId = input.dataset.updeal || null;
  const plotId = input.dataset.upplot || null;
  const stage = input.dataset.upstage || null;
  const kindSel = document.getElementById(input.dataset.upkind);
  const kind = kindSel ? kindSel.value : "other";
  const deal = dealId ? S.deals.find((x) => x.id === dealId) : null;
  const owner = deal ? deal.agent_id : S.me.id;
  toast("Uploading…");
  try {
    const f = await prepareFile(file, S.api.maxUpload || 10485760);
    const path = await S.api.upload(f.blob, { owner, name: f.name, mime: f.mime });
    try {
      await S.api.rpc("add_document", { p_deal_id: dealId, p_plot_id: deal ? deal.plot_id : plotId, p_stage: stage, p_kind: kind,
        p_file_name: f.name, p_mime: f.mime, p_size: f.blob.size, p_path: path, p_note: "" });
    } catch (e) { await S.api.removeFile(path).catch(() => {}); throw e; }
    toast(DOC_KINDS[kind] + " added");
  } catch (e) { toast(e.message || "The upload did not work. Try again.", "err"); }
}

export function docSummary(d) {
  const n = S.documents.filter((x) => x.deal_id === d.id).length;
  const parts = [];
  if (d.agreement_on) parts.push("agreement " + day(d.agreement_on));
  if (d.transfer_on) parts.push("transfer " + day(d.transfer_on));
  if (n) parts.push(n + " document" + (n === 1 ? "" : "s"));
  return parts.join(" · ");
}
export { cr, pkr };
