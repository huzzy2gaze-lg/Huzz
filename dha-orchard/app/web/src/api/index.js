// Chooses the data service: the real Supabase server, or the demo database in the browser.
// The demo runs the same SQL (tables, access rules, functions) with PGlite, so it behaves like the server.
export const TABLES = ["plots", "plot_fixes", "people", "plot_demand", "clients", "deals", "requests", "activity", "members", "listing_owners", "documents", "events", "download_requests", "site_settings", "leads"];

const DEMO_OK = import.meta.env.DEV || import.meta.env.VITE_DEMO === "1";

export async function createApi() {
  // the claude.ai test build: the artifact's shared database stands in for the server
  if (import.meta.env.VITE_BACKEND === "artifact") return (await import("./artifact.js")).create();
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const q = new URLSearchParams(location.search);
  // The demo (the sales system with test data, in the browser) is only in development and test builds
  // ("npm run build:test"). The live website does not contain it: not the code, not the test data.
  if (DEMO_OK && (q.has("demo") || !url || !key)) return (await import("./demo.js")).create({ fresh: q.has("fresh") });
  if (url && key) return (await import("./supabase.js")).create({ url, key });
  // a live website with no database keys: no accounts, bookings go to WhatsApp (a backup only)
  return (await import("./public.js")).create();
}
