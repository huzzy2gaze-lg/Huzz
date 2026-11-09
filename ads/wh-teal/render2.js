// Renderer for ad set 2 (ads2.html).
//   node render2.js static <layout> <outdir> <basename>         -> story/feed/square PNGs
//   node render2.js video  <layout> <out.mp4> <cues> <lens> <dur> -> silent 30fps H.264
//   node render2.js preview <layout> <out.png> <cues> <lens> <dur>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const { execFileSync } = require('child_process');
const [mode, layout, out, a4, a5, a6] = process.argv.slice(2);
const SIZES = { story: [1080, 1920, 'Story-9x16_WhatsApp-Instagram-Facebook'], feed: [1080, 1350, 'Post-4x5_Instagram-Facebook'], square: [1080, 1080, 'Square-1x1_Facebook-Instagram-WhatsApp'] };

async function open(browser, format, extra = {}) {
  const [w, h] = SIZES[format];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const qs = new URLSearchParams({ layout, format, ...extra });
  await page.goto('file://' + path.join(__dirname, 'ads2.html') + '?' + qs);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  return page;
}

(async () => {
  const browser = await chromium.launch();
  if (mode === 'static') {
    fs.mkdirSync(out, { recursive: true });
    for (const f of Object.keys(SIZES)) {
      const page = await open(browser, f);
      const file = path.join(out, `${a4}_${SIZES[f][2]}.png`);
      await page.locator('#ad').screenshot({ path: file }); console.log('wrote', file); await page.close();
    }
  } else {
    const page = await open(browser, 'story', { anim: '1', cues: a4, lens: a5, dur: a6 });
    const dur = Number(a6);
    if (mode === 'preview') {
      const ts = Array.from({ length: 12 }, (_, i) => +(dur * (i + 0.5) / 12).toFixed(2));
      const shots = [];
      for (const t of ts) { await page.evaluate(t => window.renderAt(t), t); shots.push([t, (await page.screenshot({ type: 'jpeg', quality: 70 })).toString('base64')]); }
      const s = await browser.newPage({ viewport: { width: 1560, height: 800 } });
      await s.setContent(`<body style="margin:0;background:#1b1b1b;color:#ddd;font:600 18px sans-serif"><div style="display:grid;grid-template-columns:repeat(6,250px);gap:10px;padding:10px">${shots.map(([t, b]) => `<div><img style="width:250px;display:block" src="data:image/jpeg;base64,${b}">t=${t}s</div>`).join('')}</div></body>`);
      await s.screenshot({ path: out, fullPage: true }); console.log('wrote', out);
    } else {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'f2-'));
      const total = Math.round(dur * 30);
      for (let f = 0; f < total; f++) {
        await page.evaluate(t => window.renderAt(t), f / 30);
        await page.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.png`) });
      }
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(tmp, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
      fs.rmSync(tmp, { recursive: true, force: true }); console.log('wrote', out);
    }
  }
  await browser.close();
})();
