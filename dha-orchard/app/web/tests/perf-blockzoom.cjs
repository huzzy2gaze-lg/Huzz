// Speed of the block zoom on a phone-class CPU (4x slower): frame times while the map opens and zooms,
// time from the tap until the zoom ends, and frame times during a pinch-like zoom and a drag inside the map.
// Usage: node tests/perf-blockzoom.cjs [url]   (default: the local preview on port 4173)
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://localhost:4173/?demo#home';
const stats = (f) => { const s = f.slice().sort((a, b) => a - b), n = s.length; return { frames: n, median: +s[n >> 1].toFixed(1), p90: +s[Math.floor(n * 0.9)].toFixed(1), worst: +s[n - 1].toFixed(1), over50ms: s.filter((x) => x > 50).length }; };
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto(URL); await p.waitForSelector('#x-A', { timeout: 90000 }); await p.waitForTimeout(9000);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.waitForTimeout(1500);
  // frame recorder
  await p.evaluate(() => { window.__fr = []; let last = performance.now(); const tick = (n) => { window.__fr.push(n - last); last = n; if (window.__rec) requestAnimationFrame(tick); }; window.__rec = true; requestAnimationFrame(tick); });
  const t0 = Date.now();
  await p.evaluate(() => document.querySelector('[data-mapopen="B"]').click());
  // the zoom has ended when the numbered map is fully shown (the 3D then waits)
  await p.waitForFunction(() => document.body.classList.contains('mapopen'), null, { timeout: 30000 });
  const openMs = Date.now() - t0;
  const open = await p.evaluate(() => { window.__rec = false; return window.__fr.slice(1); });
  // drag and pinch-like zoom inside the map (wheel)
  const r = await p.$eval('.xmaplayer .mapwrap', (e) => { const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; });
  await p.evaluate(() => { window.__fr = []; let last = performance.now(); const tick = (n) => { window.__fr.push(n - last); last = n; if (window.__rec) requestAnimationFrame(tick); }; window.__rec = true; requestAnimationFrame(tick); });
  await p.mouse.move(r[0], r[1]); await p.mouse.down();
  for (let i = 0; i < 20; i++) { await p.mouse.move(r[0] + i * 6, r[1] + i * 4); }
  await p.mouse.up();
  for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, -60); }
  await p.waitForTimeout(800);
  const move = await p.evaluate(() => { window.__rec = false; return window.__fr.slice(1); });
  // back out
  await p.evaluate(() => { window.__fr = []; let last = performance.now(); const tick = (n) => { window.__fr.push(n - last); last = n; if (window.__rec) requestAnimationFrame(tick); }; window.__rec = true; requestAnimationFrame(tick); });
  const t1 = Date.now(); await p.evaluate(() => document.querySelector('.xmapback').click());
  await p.waitForFunction(() => !document.body.classList.contains('mapmode'), null, { timeout: 20000 }); const closeMs = Date.now() - t1;
  await p.waitForTimeout(300);
  const close = await p.evaluate(() => { window.__rec = false; return window.__fr.slice(1); });
  console.log(JSON.stringify({ tapToZoomEndMs: openMs, open: stats(open), dragAndZoom: stats(move), closeMs, close: stats(close) }));
  await b.close(); })();
