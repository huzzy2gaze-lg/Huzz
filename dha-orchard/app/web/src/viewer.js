// The protected document viewer. Photos and PDFs show inside the app only, drawn on a canvas with the
// viewer's name and the time across them. Agents cannot download a file: they ask, an admin approves,
// and each approval allows one download. Admins download directly.
// Screenshots: a web page cannot block them. The viewer hides the document when the app loses focus,
// when the screenshot key is pressed (reported to the admins) and when someone prints. The name on the
// document shows who took a photo of it. The Android app (phase 3) blocks screenshots completely.
import { S, $, esc, toast, isAdmin, nameOf, hooks } from "./core.js";
import { DOC_KINDS } from "./deal.js";

let pdfjs = null;
async function loadPdf() {
  if (pdfjs) return pdfjs;
  const [lib, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?raw")]);
  const url = URL.createObjectURL(new Blob([worker.default], { type: "text/javascript" }));
  lib.GlobalWorkerOptions.workerPort = new Worker(url, { type: "module" });
  pdfjs = lib;
  return lib;
}

async function bytesOf(url) {
  if (url.startsWith("data:")) {
    const bin = atob(url.slice(url.indexOf(",") + 1));
    const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }
  return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

function stamp() {
  const d = new Date();
  return `${S.me.full_name || nameOf(S.me.id)} · ${d.toLocaleDateString("en-GB")} ${d.toTimeString().slice(0, 5)} · Orchard Sales · do not share`;
}
// the viewer's name and the time, across the whole page, at an angle
function watermark(ctx, w, h) {
  const text = stamp();
  const fs = Math.max(14, Math.round(w / 34));
  ctx.save();
  ctx.font = `600 ${fs}px "Albert Sans", system-ui, sans-serif`;
  ctx.fillStyle = "rgba(180, 40, 40, 0.16)";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const tw = ctx.measureText(text).width + fs * 3;
  const diag = Math.hypot(w, h);
  for (let y = -diag / 2; y < diag / 2; y += fs * 5) for (let x = -diag / 2 - ((y / (fs * 5)) % 2) * tw / 2; x < diag / 2; x += tw) ctx.fillText(text, x, y);
  ctx.restore();
}

function pageCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.className = "docpage";
  return c;
}

let current = null;
export function viewerOpen() { return !!current; }

function requestFor(doc) {
  return S.downloadRequests
    .filter((r) => r.document_id === doc.id && r.requested_by === S.me.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
}
function downloadControl(doc) {
  if (isAdmin()) return `<button class="out" data-act="dlNow">Download</button>`;
  const r = requestFor(doc);
  if (r && r.status === "pending") return `<span class="dlstate">Download requested · waiting for an admin</span>`;
  if (r && r.status === "approved") return `<button class="out gold" data-act="dlUse" data-req="${r.id}">Download now (approved, one time)</button>`;
  if (S.ui.dlAsk) return `<form id="dlForm" class="dlform"><input id="dl_reason" placeholder="Why do you need the file?" aria-label="Reason"><button class="out">Send request</button></form>`;
  return `<button class="out" data-act="dlAsk">Ask to download</button>${r && r.status === "rejected" ? `<span class="dlstate">Last request not approved${r.reason ? ": " + esc(r.reason) : ""}</span>` : ""}`;
}
export function refreshViewerBar(force) {
  if (!current) return;
  const el = $("#viewer .dlctl");
  if (el && (force || !el.querySelector("input"))) el.innerHTML = downloadControl(current);
}

export async function openViewer(id) {
  const doc = S.documents.find((x) => x.id === id);
  if (!doc) return;
  current = doc;
  S.ui.dlAsk = false;
  let v = $("#viewer");
  if (!v) { v = document.createElement("div"); v.id = "viewer"; document.body.appendChild(v); }
  v.className = "secure";
  v.innerHTML = `<div class="vbar"><b>${esc(DOC_KINDS[doc.kind] || doc.kind)} · ${esc(doc.plot_id)}</b><span class="vname">${esc(doc.file_name)}</span><span class="dlctl">${downloadControl(doc)}</span><button class="out" data-act="closeViewer">Close</button></div>
    <div class="vbody" id="vbody"><div class="meta vload">Opening…</div></div>
    <div class="veil-msg">The document is hidden while the app is not in front.</div>`;
  v.hidden = false;
  const body = $("#vbody");
  try {
    const url = S.fileUrls[doc.path] || (await S.api.fileUrl(doc.path));
    const maxW = Math.min(body.clientWidth - 24, 1100) * Math.min(window.devicePixelRatio || 1, 2);
    if (doc.mime === "application/pdf") {
      const lib = await loadPdf();
      const pdf = await lib.getDocument({ data: await bytesOf(url), isEvalSupported: false }).promise;
      body.innerHTML = "";
      for (let n = 1; n <= Math.min(pdf.numPages, 40); n++) {
        if (current !== doc) return;
        const page = await pdf.getPage(n);
        const vp0 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: maxW / vp0.width });
        const c = pageCanvas(Math.round(vp.width), Math.round(vp.height));
        body.appendChild(c);
        const ctx = c.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        watermark(ctx, c.width, c.height);
      }
      if (pdf.numPages > 40) body.insertAdjacentHTML("beforeend", `<div class="meta">This view shows the first 40 pages.</div>`);
    } else {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const sc = Math.min(1, maxW / img.naturalWidth);
      const c = pageCanvas(Math.round(img.naturalWidth * sc), Math.round(img.naturalHeight * sc));
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, c.width, c.height);
      watermark(ctx, c.width, c.height);
      body.innerHTML = "";
      body.appendChild(c);
    }
  } catch (e) {
    console.warn(e);
    body.innerHTML = `<div class="empty">The document did not open. Close it and try again.</div>`;
  }
}

export function closeViewer() {
  current = null;
  const v = $("#viewer");
  if (v) { v.hidden = true; v.innerHTML = ""; }
}

async function report(event) {
  if (!current) return;
  try { await S.api.rpc("report_document_event", { p_document_id: current.id, p_event: event }); } catch (e) { /* the report is best effort */ }
}

export async function viewerAction(act, data) {
  if (!current) return;
  const doc = current;
  if (act === "dlAsk") { S.ui.dlAsk = true; refreshViewerBar(true); const i = $("#dl_reason"); if (i) i.focus(); return; }
  if (act === "dlNow") {
    try { await S.api.saveFile(doc, doc.path); await report("download"); toast("Download started"); } catch (e) { toast(e.message || "The download did not start.", "err"); }
    return;
  }
  if (act === "dlUse") {
    try {
      const path = await S.api.rpc("use_download", { p_id: data.req });
      await S.api.saveFile(doc, path);
      toast("Download started. The approval is now used.");
    } catch (e) { toast(e.message || "The download did not start.", "err"); }
    await hooks.refresh();
    refreshViewerBar(true);
  }
}
export async function sendDownloadRequest(reason) {
  if (!current) return;
  try {
    await S.api.rpc("request_download", { p_document_id: current.id, p_reason: reason || "" });
    S.ui.dlAsk = false;
    toast("Request sent to the admins");
  } catch (e) { toast(e.message, "err"); }
  await hooks.refresh();
  refreshViewerBar(true);
}

// the protections while a document is open
function veil(on) { const v = $("#viewer"); if (v && current) v.classList.toggle("veiled", on); }
window.addEventListener("blur", () => veil(true));
window.addEventListener("focus", () => veil(false));
document.addEventListener("visibilitychange", () => veil(document.hidden));
document.addEventListener("keydown", (e) => {
  if (!current) return;
  if (e.key === "PrintScreen" || ((e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "s", "S"].includes(e.key))) {
    veil(true); report("screenshot_key"); toast("Screenshots of documents are not allowed. The admins are told.", "err");
    setTimeout(() => veil(false), 3000);
  }
  if ((e.metaKey || e.ctrlKey) && ["p", "P", "s", "S"].includes(e.key) && !e.shiftKey) { e.preventDefault(); if (e.key.toLowerCase() === "p") report("print"); }
}, true);
document.addEventListener("keyup", (e) => { if (current && e.key === "PrintScreen") { try { navigator.clipboard.writeText("").catch(() => {}); } catch (x) { /* not allowed */ } } }, true);
window.addEventListener("beforeprint", () => { if (current) report("print"); });
document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest("#viewer, .docthumb")) e.preventDefault(); });
document.addEventListener("dragstart", (e) => { if (e.target.closest && e.target.closest("#viewer, .docthumb")) e.preventDefault(); });
