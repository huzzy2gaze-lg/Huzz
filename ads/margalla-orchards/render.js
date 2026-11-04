// Renders every ad variant from variants.html to PNG (1080x1350 feed format),
// plus one contact sheet per language.
// Usage: node render.js            -> all 18 variants
//        node render.js A teal en  -> a single variant (for checking)
// To use the official DHA logo, save it as dha-logo.png (transparent PNG) in this folder.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const LAYOUTS = { A: 'comparison', B: 'savings', C: 'luxury' };
const THEMES = ['teal', 'navy', 'emerald'];
const LANGS = ['en', 'ur'];
const PHONE = '0331-5223726';

(async () => {
  if (process.argv[2] === 'story') return renderStories();
  if (process.argv[2] === 'mountains') return renderMountains();
  if (process.argv[2] === 'final') return renderFinal();
  const [onlyL, onlyT, onlyLang] = process.argv.slice(2);
  const out = path.join(__dirname, 'variants');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const made = { en: [], ur: [] };
  for (const lang of LANGS) for (const L of Object.keys(LAYOUTS)) for (const theme of THEMES) {
    if (onlyL && (L !== onlyL || theme !== onlyT || lang !== onlyLang)) continue;
    const qs = new URLSearchParams({ layout: L, theme, lang, phone: PHONE });
    await page.goto('file://' + path.join(__dirname, 'variants.html') + '?' + qs);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const idx = Object.keys(LAYOUTS).indexOf(L) * 3 + THEMES.indexOf(theme) + 1;
    const file = `${lang}-${String(idx).padStart(2, '0')}-${LAYOUTS[L]}-${theme}.png`;
    await page.locator('#ad').screenshot({ path: path.join(out, file) });
    made[lang].push(file);
    console.log('wrote', file);
  }
  // contact sheets
  for (const lang of LANGS) {
    if (made[lang].length !== 9) continue;
    const imgs = made[lang].map(f => `<figure><img src="file://${path.join(out, f)}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
    const html = `<html><body style="margin:0;background:#1b1b1b;font:600 20px Inter,sans-serif;color:#ddd">
      <div style="display:grid;grid-template-columns:repeat(3,540px);gap:24px;padding:24px">${imgs}</div>
      <style>figure{margin:0}img{width:540px;display:block;border-radius:10px}figcaption{padding:8px 2px}</style></body></html>`;
    const sheet = path.join(out, `_sheet-${lang}.html`);
    fs.writeFileSync(sheet, html);
    const p2 = await browser.newPage({ viewport: { width: 1716, height: 800 }, deviceScaleFactor: 1 });
    await p2.goto('file://' + sheet);
    await p2.waitForTimeout(300);
    await p2.screenshot({ path: path.join(out, `_overview-${lang}.png`), fullPage: true });
    fs.unlinkSync(sheet);
    await p2.close();
    console.log('wrote', `_overview-${lang}.png`);
  }
  await browser.close();
})();

// Story / WhatsApp Status versions (1080x1920) of the chosen design(s).
// Usage: node render.js story
const STORIES = [['C', 'teal']];
async function renderStories() {
  const out = path.join(__dirname, 'variants', 'story');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (const lang of LANGS) for (const [L, theme] of STORIES) {
    const qs = new URLSearchParams({ layout: L, theme, lang, phone: PHONE, format: 'story' });
    await page.goto('file://' + path.join(__dirname, 'variants.html') + '?' + qs);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const idx = Object.keys(LAYOUTS).indexOf(L) * 3 + THEMES.indexOf(theme) + 1;
    const file = `${lang}-${String(idx).padStart(2, '0')}-${LAYOUTS[L]}-${theme}-story.png`;
    await page.locator('#ad').screenshot({ path: path.join(out, file) });
    console.log('wrote', file);
  }
  await browser.close();
}

// Margalla mountain versions of the luxury layout (feed 1080x1350) + overview.
// Usage: node render.js mountains
const MOUNTAIN_THEMES = [['mteal', 'margalla-teal'], ['pine', 'margalla-pine'], ['sunrise', 'margalla-sunrise']];
async function renderMountains() {
  const out = path.join(__dirname, 'variants', 'margalla');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const files = [];
  for (const lang of LANGS) for (const [theme, name] of MOUNTAIN_THEMES) {
    const qs = new URLSearchParams({ layout: 'C', theme, lang, phone: PHONE, scene: 'mtn' });
    await page.goto('file://' + path.join(__dirname, 'variants.html') + '?' + qs);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const file = `${lang}-luxury-${name}.png`;
    await page.locator('#ad').screenshot({ path: path.join(out, file) });
    files.push(file); console.log('wrote', file);
  }
  const imgs = files.map(f => `<figure><img src="file://${path.join(out, f)}"><figcaption>${f.replace('.png', '')}</figcaption></figure>`).join('');
  const sheet = path.join(out, '_sheet.html');
  fs.writeFileSync(sheet, `<html><body style="margin:0;background:#1b1b1b;font:600 20px Inter,sans-serif;color:#ddd"><div style="display:grid;grid-template-columns:repeat(3,540px);gap:24px;padding:24px">${imgs}</div><style>figure{margin:0}img{width:540px;display:block;border-radius:10px}figcaption{padding:8px 2px}</style></body></html>`);
  const p2 = await browser.newPage({ viewport: { width: 1716, height: 800 } });
  await p2.goto('file://' + sheet); await p2.waitForTimeout(300);
  await p2.screenshot({ path: path.join(out, '_overview.png'), fullPage: true });
  fs.unlinkSync(sheet);
  await browser.close();
  console.log('wrote _overview.png');
}

// FINAL: Margalla Sunrise in every social format, English + Urdu.
// Usage: node render.js final
const FINAL_FORMATS = [
  ['feed', 1080, 1350, 'Post-4x5_Instagram-Facebook'],
  ['square', 1080, 1080, 'Square-1x1_Facebook-Instagram-WhatsApp'],
  ['story', 1080, 1920, 'Story-9x16_WhatsApp-Instagram-Facebook'],
];
async function renderFinal() {
  const out = path.join(__dirname, 'final');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const lang of LANGS) for (const [format, w, h, label] of FINAL_FORMATS) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const qs = new URLSearchParams({ layout: 'C', theme: 'sunrise', lang, phone: PHONE, scene: 'mtn', format });
    await page.goto('file://' + path.join(__dirname, 'variants.html') + '?' + qs);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const file = `WH-Margalla-Sunrise_${lang.toUpperCase()}_${label}.png`;
    await page.locator('#ad').screenshot({ path: path.join(out, file) });
    console.log('wrote', file);
    await page.close();
  }
  await browser.close();
}
