// Service worker: the app opens fast and the plan image is kept on the device.
// Data from the server is never cached here; it always comes live.
const CACHE = "orchard-v1";
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const isPage = e.request.mode === "navigate";
  if (isPage) {
    // the page: network first, so an update shows at once; the cached copy when offline
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // files with a hash in the name, the plan and the plot data: cache first
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); }
    return r;
  })));
});
