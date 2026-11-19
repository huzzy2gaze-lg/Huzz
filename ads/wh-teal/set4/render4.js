// Renders the set-4 overlay (transparent PNG frames, 1080x1920, 30 fps) through a small local web server.
//   node render4.js frames <out_dir> <ad> <cues> <lens> <dur>
//   node render4.js still  <out.png> <ad> <cues> <lens> <dur> <t>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [mode, out, ad, cues, lens, dur, t1] = process.argv.slice(2);
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const qs = new URLSearchParams({ ad, cues, lens, dur });
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => console.error('page error:', e.message));
  await pg.goto(`http://127.0.0.1:${server.address().port}/set4/overlay.html?${qs}`);
  await pg.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const shot = async (t, file) => { await pg.evaluate(t => window.renderAt(t), t); await pg.screenshot({ path: file, omitBackground: true }); };
  if (mode === 'still') { await shot(Number(t1), out); console.log('wrote', out); }
  else {
    fs.mkdirSync(out, { recursive: true }); const total = Math.round(Number(dur) * 30);
    for (let f = 0; f < total; f++) await shot(f / 30, path.join(out, `o${String(f).padStart(4, '0')}.png`));
    console.log('wrote', total, 'frames to', out);
  }
  await browser.close(); server.close();
})();
