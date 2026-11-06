// Local stand-in for window.claude (db, user, downloads) to test the artifact page.
// The store is kept in localStorage so that a reload as another person sees the same data.
// It also applies the page's access rules: agents/<id>/ is readable only by that person and admins,
// perms/ and other people's people/<id> are writable only by admins.
(function () {
  const USERS = {
    "owner@demo.pk": { id: "u_owner", name: "Owner", canEdit: true, isOwner: true, color: "#0E3A2C" },
    "nadeem@demo.pk": { id: "u_nadeem", name: "Mr. Nadeem", canEdit: true, isOwner: false, color: "#8F4A2F" },
    "ali@demo.pk": { id: "u_ali", name: "Ali", canEdit: false, isOwner: false, color: "#2F6F8F" },
    "sara@demo.pk": { id: "u_sara", name: "Sara", canEdit: false, isOwner: false, color: "#7A3F8F" },
    "viewer@demo.pk": { id: "u_viewer", name: "A viewer", canEdit: false, isOwner: false, color: "#777", viewOnly: true },
  };
  const who = localStorage.getItem("mockUser") || "owner@demo.pk";
  const me = USERS[who];
  const KEY = "mockStore";
  let store = JSON.parse(localStorage.getItem(KEY) || "{}");
  const save = () => localStorage.setItem(KEY, JSON.stringify(store));
  const err = (code, message) => Object.assign(new Error(message), { code });
  const canRead = (p) => { const s = p.split("/"); if (me.viewOnly) return s[0] === "settings"; if ((s[0] === "agents" || s[0] === "leads") && s[1]) return me.canEdit || s[1] === me.id; return true; };
  const canWrite = (p) => { const s = p.split("/"); if (me.viewOnly) return false; if (s[0] === "settings") return me.canEdit; if ((s[0] === "agents" || s[0] === "leads") && s[1]) return me.canEdit || s[1] === me.id; if (s[0] === "perms") return me.canEdit; if (s[0] === "people" && s[1]) return me.canEdit || s[1] === me.id; return true; };
  const listeners = [];
  const parent = (p) => p.split("/").slice(0, -1).join("/");
  const snapDoc = (p) => { const exists = canRead(p) && p in store; return { id: p.split("/").pop(), exists, data: () => (exists ? JSON.parse(JSON.stringify(store[p])) : undefined), metadata: { fromCache: false, hasPendingWrites: false } }; };
  function notify(p) { const c = parent(p); listeners.forEach((l) => { if (l.col === c) setTimeout(() => l.fire(), 5); }); }
  function query(col, filters = [], order = null, lim = null) {
    const make = (f, o, l) => ({
      where: (a, op, v) => make([...f, [a, op, v]], o, l),
      orderBy: (a, dir = "asc") => make(f, [a, dir], l),
      limit: (n) => make(f, o, n),
      get: async () => run(f, o, l),
      onSnapshot(next) { const ent = { col, fire: () => next(run(f, o, l)) }; listeners.push(ent); setTimeout(ent.fire, 10); return () => listeners.splice(listeners.indexOf(ent), 1); },
    });
    function run(f, o, l) {
      let ids = Object.keys(store).filter((p) => parent(p) === col && canRead(p));
      let docs = ids.map(snapDoc);
      for (const [a, op, v] of f) docs = docs.filter((d) => { const x = d.data()[a]; return op === "==" ? x === v : op === "!=" ? x !== v : true; });
      if (o) docs.sort((a, b) => { const x = a.data()[o[0]], y = b.data()[o[0]]; return (x < y ? -1 : x > y ? 1 : 0) * (o[1] === "desc" ? -1 : 1); });
      else docs.sort((a, b) => (a.id < b.id ? -1 : 1));
      if (l) docs = docs.slice(0, l);
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
    }
    return make(filters, order, lim);
  }
  let n = 0;
  function docRef(p) {
    if (p.split("/").length % 2) throw new TypeError("doc path needs an even number of segments: " + p);
    return {
      id: p.split("/").pop(), path: p,
      get: async () => snapDoc(p),
      async set(d) { if (!canWrite(p)) throw err("invalid_argument", "write refused"); store[p] = JSON.parse(JSON.stringify(d)); save(); notify(p); },
      async update(d) { if (!canWrite(p) || !(p in store)) throw err("invalid_argument", "update refused"); Object.assign(store[p], JSON.parse(JSON.stringify(d))); save(); notify(p); },
      async delete() { if (!canWrite(p)) throw err("invalid_argument", "delete refused"); delete store[p]; save(); notify(p); },
      onSnapshot(next) { const ent = { col: parent(p), fire: () => next(snapDoc(p)) }; listeners.push(ent); setTimeout(ent.fire, 10); return () => {}; },
      collection: (c) => colRef(p + "/" + c),
    };
  }
  function colRef(c) {
    if (c.split("/").length % 2 === 0) throw new TypeError("collection path needs an odd number of segments: " + c);
    return Object.assign(query(c), { path: c, doc: (id) => docRef(c + "/" + (id || "m" + Date.now() + (n++))), add: async (d) => { const r = docRef(c + "/m" + Date.now() + (n++)); await r.set(d); return r; } });
  }
  const db = { doc: docRef, collection: colRef };
  const user = {
    me: async () => ({ id: me.id, name: me.name, email: who, color: me.color, avatarUrl: "", isOwner: me.isOwner, canEdit: me.canEdit }),
    id: async () => me.id, isOwner: async () => me.isOwner, canEdit: async () => me.canEdit, can: async (n) => (n === "data.write" ? !me.viewOnly : true),
    profiles: async (ids) => Object.fromEntries([].concat(ids).map((i) => { const u = Object.entries(USERS).find(([, x]) => x.id === i); return [i, { id: i, name: u ? u[1].name : "", email: u ? u[0] : null, color: u ? u[1].color : "#777" }]; })),
  };
  const saved = [];
  const downloads = { save: async (o) => { saved.push(o.filename); window.__saved = saved; return "saved"; } };
  window.claude = { use: async (name) => (name === "db" ? db : name === "user" ? user : name === "downloads" ? downloads : null) };
  window.__mockAs = (email) => { localStorage.setItem("mockUser", email); location.reload(); };
})();
