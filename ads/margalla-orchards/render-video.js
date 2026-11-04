// Renders the animated Margalla Sunrise ad frame by frame and encodes an MP4.
// Usage: node render-video.js [en|ur] [--preview]
//   --preview  writes a contact sheet of key moments instead of the full video
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const lang = process.argv[2] === 'ur' ? 'ur' : 'en';
const preview = process.argv.includes('--preview');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
// --map "real:anim,real:anim,..."  piecewise-linear time map so the animation follows a voice-over
// --dur <seconds> total length, --out <file name>
const MAP = (arg('--map') || '').split(',').filter(Boolean).map(p => p.split(':').map(Number));
const toAnim = r => {
  if (!MAP.length) return r;
  if (r <= MAP[0][0]) return MAP[0][1] * (MAP[0][0] ? r / MAP[0][0] : 1);
  for (let i = 1; i < MAP.length; i++) if (r <= MAP[i][0]) {
    const [r0, a0] = MAP[i - 1], [r1, a1] = MAP[i];
    return a0 + (a1 - a0) * (r - r0) / (r1 - r0);
  }
  return MAP[MAP.length - 1][1];
};
const FPS = 30, W = 1080, H = 1920;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const qs = new URLSearchParams({ layout: 'C', theme: 'sunrise', lang, phone: '0331-5223726', scene: 'mtn', format: 'story', anim: '1' });
  await page.goto('file://' + path.join(__dirname, 'variants.html') + '?' + qs);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const dur = Number(arg('--dur')) || await page.evaluate(() => window.ANIM_DURATION);
  const outDir = path.join(__dirname, 'video');
  fs.mkdirSync(outDir, { recursive: true });

  if (preview) {
    const times = [0.6, 1.8, 3.0, 4.4, 5.8, 7.6, 9.2, 11.0, 14.9];
    const shots = [];
    for (const t of times) {
      await page.evaluate(t => window.renderAt(t), t);
      shots.push({ t, b64: (await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64') });
    }
    const sheet = await browser.newPage({ viewport: { width: 1640, height: 900 } });
    await sheet.setContent(`<body style="margin:0;background:#1b1b1b;font:600 22px sans-serif;color:#ddd"><div style="display:grid;grid-template-columns:repeat(3,520px);gap:20px;padding:20px">${
      shots.map(s => `<figure style="margin:0"><img style="width:520px;display:block;border-radius:8px" src="data:image/jpeg;base64,${s.b64}"><figcaption style="padding:6px 0">t = ${s.t}s</figcaption></figure>`).join('')}</div></body>`);
    await sheet.screenshot({ path: path.join(outDir, `_preview-${lang}.png`), fullPage: true });
    console.log('wrote preview');
    await browser.close();
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  const total = Math.round(dur * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderAt(t), toAnim(f / FPS));
    await page.screenshot({ path: path.join(tmp, `f${String(f).padStart(4, '0')}.png`) });
    if (f % 90 === 0) console.log(`frame ${f}/${total}`);
  }
  await browser.close();
  const out = path.join(outDir, arg('--out') || `Sigma-Margalla-Sunrise_${lang.toUpperCase()}_Video-9x16_Reels-Status_no-audio.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('wrote', out);
})();
