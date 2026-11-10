// Usage (from web/, with "npx vite --port 5173" running): node tools/export-build.cjs <out_dir>
// Exports one GLB per video frame: the 1 Kanal home being built, by day.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.argv[2], N = 96, END = 8.2;
const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (let f = 0; f <= N; f++) {
    const file = `${OUT}/b_${String(f).padStart(3, '0')}.glb`; if (fs.existsSync(file)) continue;
    const k = Math.min(1, Math.max(0, (f - 6) / 76)); // empty plot for half a second, built by frame 82, then held
    const prog = (END * ease(k)).toFixed(3), t = (f / 12).toFixed(3);
    await p.goto(`http://localhost:5173/tools/export.html?size=1K&floors=2&style=white&mood=day&p=${prog}&t=${t}`);
    await p.waitForSelector('body[data-ready]', { state: 'attached', timeout: 120000 });
    const g = await p.evaluate(() => window.glb || ('ERR ' + window.err));
    if (g.startsWith('ERR')) throw new Error(g);
    fs.writeFileSync(file, Buffer.from(g, 'base64')); console.log(f, prog);
  }
  await b.close();
})();
