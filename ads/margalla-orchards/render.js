// Renders ad.html to PNG for each social format.
// Usage: node render.js [phone-number]
const { chromium } = require('playwright');
const path = require('path');

const formats = [
  { name: 'feed-1080x1350', format: 'feed', w: 1080, h: 1350 },
  { name: 'story-1080x1920', format: 'story', w: 1080, h: 1920 },
];

(async () => {
  const phone = process.argv[2];
  const browser = await chromium.launch();
  for (const f of formats) {
    const page = await browser.newPage({ viewport: { width: f.w, height: f.h }, deviceScaleFactor: 1 });
    const qs = new URLSearchParams({ format: f.format, ...(phone ? { phone } : {}) });
    await page.goto('file://' + path.join(__dirname, 'ad.html') + '?' + qs);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const out = path.join(__dirname, `margalla-orchards-${f.name}.png`);
    await page.locator('#ad').screenshot({ path: out });
    console.log('wrote', out);
    await page.close();
  }
  await browser.close();
})();
