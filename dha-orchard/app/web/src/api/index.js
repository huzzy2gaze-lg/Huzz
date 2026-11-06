// Chooses the data service: the real Supabase server, or the demo database in the browser.
// The demo runs the same SQL (tables, access rules, functions) with PGlite, so it behaves like the server.
export const TABLES = ["plots", "plot_fixes", "people", "plot_demand", "clients", "deals", "requests", "activity", "members", "listing_owners", "documents", "events", "download_requests", "site_settings", "leads"];

export async function createApi() {
  // the claude.ai test build: the artifact's shared database stands in for the server
  if (import.meta.env.VITE_BACKEND === "artifact") return (await import("./artifact.js")).create();
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const q = new URLSearchParams(location.search);
  const demo = q.has("demo") || !url || !key;
  const mod = demo ? await import("./demo.js") : await import("./supabase.js");
  return mod.create({ url, key, fresh: q.has("fresh") });
}
