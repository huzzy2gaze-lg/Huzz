// Renders a set-3 ad page frame by frame (or a preview sheet / a still) through a small local web server,
// because three.js is loaded as an ES module, which browsers do not allow from file:// pages.
//   node render3.js video   <page> <out.mp4> <cues> <lens> <dur> [query]
//   node render3.js preview <page> <out.png> <cues> <lens> <dur> [query]
//   node render3.js still   <page> <out.png> <cues> <lens> <dur> <t> [query]
// <page> is relative to this folder, e.g. home3d.html or ads3.html; [query] adds e.g. "layout=size&format=feed".
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const [mode, page, out, cues, lens, dur, a7, a8] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const extra = mode === 'still' ? a8 : a7;
  const qs = new URLSearchParams({ cues, lens, dur, ...Object.fromEntries(new URLSearchParams(extra || '')) });
  const H = qs.get('format') === 'feed' ? 1350 : qs.get('format') === 'square' ? 1080 : 1920;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await browser.newPage({ viewport: { width: 1080, height: H }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => console.error('page error:', e.message));
  await pg.goto(`http://127.0.0.1:${port}/set3/${page}?${qs}`);
  await pg.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  const D = Number(dur);
  const shot = async (t, file) => { await pg.evaluate(t => window.renderAt(t), t); return pg.screenshot(file ? { path: file } : { type: 'jpeg', quality: 72 }); };
  if (mode === 'still') { await shot(Number(a7), out); console.log('wrote', out); }
  else if (mode === 'preview') {
    const ts = Array.from({ length: 12 }, (_, i) => +(D * (i + 0.5) / 12).toFixed(2));
    const shots = []; for (const t of ts) shots.push([t, (await shot(t)).toString('base64')]);
    const s = await browser.newPage({ viewport: { width: 1560, height: 800 } });
    await s.setContent(`<body style="margin:0;background:#1b1b1b;color:#ddd;font:600 18px sans-serif"><div style="display:grid;grid-template-columns:repeat(6,250px);gap:10px;padding:10px">${shots.map(([t, b]) => `<div><img style="width:250px;display:block" src="data:image/jpeg;base64,${b}">t=${t}s</div>`).join('')}</div></body>`);
    await s.screenshot({ path: out, fullPage: true }); console.log('wrote', out);
  } else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'f3-')); const total = Math.round(D * 30); const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      await shot(f / 30, path.join(tmp, `f${String(f).padStart(4, '0')}.png`));
      if (f % 150 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
    fs.rmSync(tmp, { recursive: true, force: true }); console.log('wrote', out);
  }
  await browser.close(); server.close();
})();
