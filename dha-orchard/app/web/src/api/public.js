// The live website before the database (Supabase) is connected: everything on the website works, and
// "Book a call" sends the request to the company WhatsApp with every detail filled in. Nothing is stored in
// the visitor's browser. Sign-in and the sales system open when the database is connected.
const COMPANY_WA = "923315223726"; // +92 331 5223726

function waText(a) {
  const lines = ["Hello WH Ventures, I would like to book a call about DHA Margalla Orchard.", ""];
  const add = (k, v) => { if (v && String(v).trim()) lines.push(`${k}: ${String(v).trim()}`); };
  add("Name", a.p_name);
  add("Phone", a.p_phone);
  add("WhatsApp", a.p_whatsapp);
  add("E-mail", a.p_email);
  if (a.p_blocks && a.p_blocks.length) add("Blocks", a.p_blocks.join(", "));
  add("Plot", a.p_plot_id);
  add("Best time to call", a.p_best_time);
  add("Details", a.p_message);
  if (a.p_opt_in) lines.push("I agree to receive news about new plots.");
  if (a.p_source) lines.push("", `(from the website, ${a.p_source})`);
  return lines.join("\n");
}

export function create() {
  const api = {
    mode: "public",
    canSubmit: true,
    lastLink: "",
    async getUser() { return null; },
    onAuthChange() {},
    async signIn() { throw new Error("Accounts open soon. Message us on WhatsApp."); },
    async signInEmail() { throw new Error("Accounts open soon. Message us on WhatsApp."); },
    async signOut() {},
    async select() { return []; },
    subscribe() { return () => {}; },
    async fileUrl() { return ""; },
    async saveBlob() {},
    // runs straight from the form's submit, so the browser allows it to open WhatsApp
    async rpc(name, args) {
      if (name !== "book_call" && name !== "submit_enquiry") return null;
      if (args.p_website) return { ok: true }; // the hidden field that only robots fill in
      if (!String(args.p_name || "").trim() || String(args.p_phone || "").replace(/\D/g, "").length < 10) throw new Error("Please write your name and a phone number.");
      const link = `https://wa.me/${COMPANY_WA}?text=${encodeURIComponent(waText(args))}`;
      api.lastLink = link;
      const w = window.open(link, "_blank"); // ("noopener" would make this always null)
      if (w) w.opener = null; else location.href = link; // if the browser blocks a new tab, open WhatsApp in this one
      return { ok: true };
    },
  };
  return api;
}
