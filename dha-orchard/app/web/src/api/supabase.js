import { createClient } from "@supabase/supabase-js";
import { TABLES } from "./index.js";

const PAGE = 1000; // Supabase returns at most 1000 rows for one request

export function create({ url, key }) {
  const sb = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  return {
    mode: "live",
    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session && data.session.user;
      return u ? { email: u.email } : null;
    },
    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } },
      });
      if (error) throw new Error(error.message);
    },
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
}
