// Demo mode: the full database runs inside this browser (PGlite). The data stays on this device.
import { PGlite } from "@electric-sql/pglite";
import { TABLES } from "./index.js";

const migrations = import.meta.glob("../../../supabase/migrations/*.sql", { query: "?raw", import: "default", eager: true });
const fakeAuth = import.meta.glob("../../../supabase/tests/fake_auth.sql", { query: "?raw", import: "default", eager: true });
const seed = import.meta.glob("../../../supabase/seed/initial_data.sql", { query: "?raw", import: "default", eager: true });

export const DEMO_USERS = [
  { email: "owner@demo.pk", name: "Owner", note: "Admin" },
  { email: "nadeem@demo.pk", name: "Mr. Nadeem", note: "Admin" },
  { email: "murtaza@demo.pk", name: "Ghulam Murtaza", note: "Admin" },
  { email: "ali@demo.pk", name: "Ali", note: "Sales agent · can mark sold" },
  { email: "sara@demo.pk", name: "Sara", note: "Sales agent · can change prices and add plots" },
  { email: "buyer@demo.pk", name: "Bilal (a client)", note: "Website account: no access to the sales system" },
];
// a stable id for the login token, like the id of a real login
const subOf = (e) => { let h = 0; for (let i = 0; i < e.length; i++) h = (h * 31 + e.charCodeAt(i)) >>> 0; return "00000000-0000-4000-8000-" + h.toString(16).padStart(12, "0"); };

const DEMO_TEAM = `
insert into public.members (email, full_name, role, color, can_edit_price, can_add_plots, can_add_listings) values
  ('owner@demo.pk', 'Owner', 'admin', '#0E3A2C', true, true, true),
  ('nadeem@demo.pk', 'Mr. Nadeem', 'admin', '#8F4A2F', true, true, true),
  ('murtaza@demo.pk', 'Ghulam Murtaza', 'admin', '#3F4F8F', true, true, true),
  ('ali@demo.pk', 'Ali', 'agent', '#2F6F8F', false, false, false),
  ('sara@demo.pk', 'Sara', 'agent', '#7A3F8F', true, true, true);
`;

// demo only: files are kept inside the demo database, with the same folder rule as the real storage
const DEMO_FILES = `
create table app.demo_files (path text primary key, data text not null);
create function public.demo_put_file(p_path text, p_data text) returns void language plpgsql security definer set search_path = '' as $f$
begin
  perform app.require('upload_docs', 'upload documents');
  if not (app.is_admin() or split_part(p_path, '/', 1) = app.uid()::text) then raise exception 'The file is in the wrong folder.'; end if;
  insert into app.demo_files values (p_path, p_data) on conflict (path) do update set data = excluded.data;
end $f$;
create function public.demo_get_file(p_path text) returns text language sql stable security definer set search_path = '' as $f$
  select data from app.demo_files where path = p_path and (app.is_admin() or split_part(p_path, '/', 1) = app.uid()::text)
$f$;
create function public.demo_del_file(p_path text) returns void language sql security definer set search_path = '' as $f$
  delete from app.demo_files where path = p_path and (app.is_admin() or split_part(p_path, '/', 1) = app.uid()::text)
$f$;
grant execute on function public.demo_put_file(text, text), public.demo_get_file(text), public.demo_del_file(text) to authenticated;
`;
const READ_ONLY = new Set(["me", "demo_get_file", "my_account", "investor_list"]);
const SET_RETURNING = new Set(["investor_list"]);
const toDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const SQL = [
  ...Object.values(fakeAuth),
  ...Object.keys(migrations).sort().map((k) => migrations[k]),
  ...Object.values(seed),
  DEMO_TEAM,
  DEMO_FILES,
];
const VERSION = hash(SQL.join("\n"));
const LS = "orchard-demo-user";
const store = {
  get() { try { return localStorage.getItem(LS); } catch (e) { return null; } },
  put(v) { try { if (v) localStorage.setItem(LS, v); else localStorage.removeItem(LS); } catch (e) { /* private window */ } },
};

function dropIdb(name) {
  return new Promise((res) => {
    try {
      const r = indexedDB.deleteDatabase("/pglite/" + name);
      r.onsuccess = r.onerror = r.onblocked = () => res();
    } catch (e) { res(); }
  });
}

export async function create({ fresh }) {
  const name = "orchard-demo-" + VERSION;
  if (fresh) { await dropIdb(name); store.put(null); }
  let db;
  try {
    db = new PGlite("idb://" + name);
    await db.waitReady;
  } catch (e) {
    db = new PGlite(); // no IndexedDB (private window): keep the data in memory only
    await db.waitReady;
  }
  const ready = (await db.query("select to_regclass('public.members') is not null as ok")).rows[0].ok;
  if (!ready) for (const s of SQL) await db.exec(s);
  await db.exec("set role authenticated");

  let listener = null;
  let email = store.get();
  const authCbs = [];
  const setClaims = () => db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(email ? { email, sub: subOf(email) } : {})]);
  await setClaims();

  const api = {
    // a file made in the browser (for example the investor list as CSV)
    async saveBlob(name, blob) {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    },
    mode: "demo",
    demoUsers: DEMO_USERS,
    canSubmit: true,
    async signInEmail() { throw new Error("In the demo, choose a person."); },
    maxUpload: 3 * 1048576,
    async upload(blob, { owner, name }) {
      const path = `${owner}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${String(name).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80)}`;
      await api.rpc("demo_put_file", { p_path: path, p_data: await toDataUrl(blob) });
      return path;
    },
    async fileUrl(path) {
      const u = await api.rpc("demo_get_file", { p_path: path });
      if (!u) throw new Error("The file is not available.");
      return u;
    },
    async removeFile(path) { await api.rpc("demo_del_file", { p_path: path }); },
    async saveFile(doc, path) {
      const blob = await (await fetch(await api.fileUrl(path))).blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = doc.file_name; document.body.appendChild(a); a.click(); a.remove();
    },
    async getUser() {
      return email ? { email } : null;
    },
    async signIn(who) {
      email = who;
      store.put(who);
      await setClaims();
      authCbs.forEach((cb) => cb("SIGNED_IN"));
    },
    async signOut() {
      email = null;
      store.put(null);
      await setClaims();
      authCbs.forEach((cb) => cb("SIGNED_OUT"));
    },
    onAuthChange(cb) {
      authCbs.push(cb);
    },
    async select(table, { order, limit } = {}) {
      if (!TABLES.includes(table)) throw new Error("Unknown table " + table);
      let sql = `select * from public.${table}`;
      if (order) sql += ` order by ${order.col.replace(/[^a-z_]/g, "")} ${order.asc ? "asc" : "desc"}`;
      if (limit) sql += ` limit ${parseInt(limit, 10)}`;
      return (await db.query(sql)).rows;
    },
    async rpc(fn, args = {}) {
      if (!/^[a-z_]+$/.test(fn)) throw new Error("Unknown function");
      const keys = Object.keys(args);
      const vals = keys.map((k) => {
        const v = args[k];
        return v != null && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v;
      });
      const call = `public.${fn}(${keys.map((k, i) => `${k.replace(/[^a-z_]/g, "")} => $${i + 1}`).join(", ")})`;
      let r;
      try {
        // functions that return a table give all their rows, like the Supabase client does
        if (SET_RETURNING.has(fn)) r = (await db.query(`select * from ${call}`, vals)).rows;
        else r = (await db.query(`select ${call} as r`, vals)).rows[0].r;
      } catch (e) {
        throw new Error(e.message);
      }
      if (!READ_ONLY.has(fn)) setTimeout(() => listener && listener("*"), 0); // a change: tell the app, like the live server does
      return r;
    },
    subscribe(cb, onStatus) {
      listener = cb;
      if (onStatus) onStatus("SUBSCRIBED");
      return () => { listener = null; };
    },
    async reset() {
      store.put(null);
      await db.close();
      await dropIdb(name);
    },
  };
  return api;
}
