// The light home page (#home): first screen, block buttons into the numbered map, the booking form to the thank-you,
// the link to the 3D page, no page errors, no sideways scroll. Laptop 1440 and phone 390.
// Needs "npm run build:test && npx vite preview --port 4173". Screenshots of every section go to OUT.
const { chromium } = require('playwright');
const OUT = process.env.OUT || '/tmp/claude-0/-home-user-Huzz/0b064747-43dc-5360-aa49-7ab940a53d7c/scratchpad/concepts/final';
const BASE = process.env.BASE || 'http://localhost:4173';
require('fs').mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' | ' + extra : '')); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, vp, mob] of [['desk', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '/?demo#home'); await p.waitForSelector('.dsv h1', { timeout: 60000 }); await p.waitForTimeout(2500);
    check(`${name} h1`, (await p.textContent('.dsv h1')).includes('DHA Margalla Orchard'));
    const price = await p.textContent('.dsv-price-v');
    check(`${name} price range`, /3\.65–4\.55/.test(price), price.trim());
    check(`${name} tap-to-call`, (await p.locator('.dsv a[href^="tel:+923315223726"]').count()) > 0);
    check(`${name} hours`, (await p.textContent('.dsv-hours')).includes('9 am to 9 pm'));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`${name} no sideways scroll`, sw <= 0, 'overflow ' + sw);
    // screenshots of every section
    const secs = await p.$$eval('.dsv-hero, .dsv-band, .dsv-dusk, .dsv-bookband, .dsv-foot', (els) => els.map((e) => e.getBoundingClientRect().top + scrollY));
    for (let i = 0; i < secs.length; i++) { await p.evaluate((y) => scrollTo(0, Math.max(0, y - (document.querySelector('.dsv-top')?.offsetHeight || 0))), secs[i]); await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${name}-${String(i).padStart(2, '0')}.png` }); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    // a block button: its facts, then its plot numbers on the real map
    await p.click('.dsv-bbtn[data-dblock="B"]'); await p.waitForSelector('#dsv-note:not([hidden])');
    check(`${name} block B facts`, (await p.textContent('#dsv-note h3')) === 'Block B');
    await p.screenshot({ path: `${OUT}/${name}-block-B.png` });
    await p.click('#dsv-note [data-planblock="B"]'); await p.waitForSelector('.planmap svg', { timeout: 30000 }); await p.waitForTimeout(1500);
    const far = await p.$eval('.planmap svg', (s) => s.classList.contains('far'));
    check(`${name} block B opens #plan zoomed`, (await p.evaluate(() => location.hash)) === '#plan' && !far, 'far=' + far);
    await p.screenshot({ path: `${OUT}/${name}-plan-B.png` });
    // back to the home, the booking form: Skip, then name and phone
    await p.evaluate(() => { location.hash = 'book'; }); await p.waitForSelector('.dsv .formcard', { timeout: 30000 }); await p.waitForTimeout(1200);
    await p.click('.dsv .skipline [data-bookstep="4"]'); await p.waitForSelector('#bookForm');
    await p.fill('#bk_name', 'Test Buyer'); await p.fill('#bk_phone', '0321 5556677');
    await p.click('#bookForm button[type=submit]'); await p.waitForSelector('.dsv .sent h3', { timeout: 30000 });
    check(`${name} booking reaches thank-you`, /Thank you/.test(await p.textContent('.dsv .sent h3')));
    await p.screenshot({ path: `${OUT}/${name}-thank-you.png` });
    // the 3D page
    await p.evaluate(() => scrollTo(0, 0));
    await p.click('.dsv-3dlink'); await p.waitForSelector('canvas.xcanvas, body.xnogl', { timeout: 60000 }); await p.waitForTimeout(3000);
    check(`${name} #3d shows the 3D canvas`, (await p.locator('canvas.xcanvas').count()) > 0 && (await p.evaluate(() => location.hash)) === '#3d');
    await p.screenshot({ path: `${OUT}/${name}-3d.png` });
    // back home: the 3D loop stops and its canvas goes
    await p.evaluate(() => { location.hash = 'home'; }); await p.waitForSelector('.dsv h1'); await p.waitForTimeout(800);
    check(`${name} leaving #3d removes the canvas`, (await p.locator('canvas.xcanvas').count()) === 0);
    check(`${name} no page errors`, errs.length === 0, errs.join(' / '));
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `FAILED ${fails}` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
