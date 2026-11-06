import { createClient } from "@supabase/supabase-js";
import { TABLES } from "./index.js";

const PAGE = 1000; // Supabase returns at most 1000 rows for one request
const safeName = (n) => String(n || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);

export function create({ url, key }) {
  const sb = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  const api = {
    // a file made in the browser (for example the investor list as CSV)
    async saveBlob(name, blob) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    },
    mode: "live",
    maxUpload: 10 * 1048576,
    // files go to the private "documents" bucket, in the folder of the agent who owns them
    async upload(blob, { owner, name, mime }) {
      const path = `${owner}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName(name)}`;
      const { error } = await sb.storage.from("documents").upload(path, blob, { contentType: mime, upsert: false });
      if (error) throw new Error(error.message);
      return path;
    },
    async fileUrl(path) {
      const { data, error } = await sb.storage.from("documents").createSignedUrl(path, 3600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
    async removeFile(path) { await sb.storage.from("documents").remove([path]); },
    async saveFile(doc, path) {
      const { data, error } = await sb.storage.from("documents").createSignedUrl(path, 60, { download: doc.file_name });
      if (error) throw new Error(error.message);
      const a = document.createElement("a"); a.href = data.signedUrl; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    },
    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session && data.session.user;
      return u ? { email: u.email, id: u.id } : null;
    },
    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } },
      });
      if (error) throw new Error(error.message);
    },
    // clients can also sign in with a link sent by e-mail
    async signInEmail(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname + "#account" } });
      if (error) throw new Error(error.message);
    },
    canSubmit: true,
    async signOut() {
      await sb.auth.signOut();
    },
    onAuthChange(cb) {
      sb.auth.onAuthStateChange((ev) => {
        if (ev === "SIGNED_IN" || ev === "SIGNED_OUT") cb(ev);
      });
    },
    async select(table, { order, limit } = {}) {
      if (!TABLES.includes(table)) throw new Error("Unknown table " + table);
      const rows = [];
      for (let from = 0; ; from += PAGE) {
        let q = sb.from(table).select("*");
        if (order) q = q.order(order.col, { ascending: !!order.asc });
        const to = limit ? Math.min(from + PAGE, limit) - 1 : from + PAGE - 1;
        const { data, error } = await q.range(from, to);
        if (error) throw new Error(error.message);
        rows.push(...data);
        if (data.length < to - from + 1 || (limit && rows.length >= limit)) break;
      }
      return rows;
    },
    async rpc(name, args) {
      const { data, error } = await sb.rpc(name, args || {});
      if (error) throw new Error(error.message);
      return data;
    },
    subscribe(cb, onStatus) {
      const ch = sb.channel("orchard-changes");
      for (const t of TABLES) {
        if (t === "people" || t === "plot_demand") continue; // views: refreshed with members and deals
        ch.on("postgres_changes", { event: "*", schema: "public", table: t }, () => cb(t));
      }
      ch.subscribe((status) => onStatus && onStatus(status));
      return () => sb.removeChannel(ch);
    },
  };
  return api;
}
