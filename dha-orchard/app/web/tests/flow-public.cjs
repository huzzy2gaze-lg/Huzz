// Run against a build with no Supabase keys (the WhatsApp backup mode).
// The live website before the database: no Sign in, "Book a call" opens WhatsApp with the details.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); const page = await ctx.newPage(); await ctx.route('https://wa.me/**', (r) => r.fulfill({ body: 'wa' }));
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:4173/#home'); await page.waitForSelector('.sitehead', { timeout: 60000 });
  const signin = await page.$('.siteright a[href="#signin"]'); if (signin) throw new Error('Sign in shows');
  const foot = await page.textContent('.sitefoot'); if (!foot.includes('info@whventures.com.pk') || !foot.includes('Islamabad, Pakistan')) throw new Error('footer: ' + foot);
  await page.goto('http://localhost:4173/#book'); await page.waitForSelector('.formcard');
  await page.click('[data-bookans="goal:invest"]'); await page.click('[data-bookstep="2"]'); await page.click('[data-bookstep="3"]');
  await page.click('[data-bookstep="4"]'); await page.waitForSelector('#bookForm');
  await page.fill('#bk_name', 'Usman Tariq'); await page.fill('#bk_phone', '0321 5556677');
  const popup = ctx.waitForEvent('page');
  await page.click('#bookForm button[type=submit]');
  const wa = await popup; const url = wa.url(); console.log('opened', url.slice(0, 160));
  if (!/wa\.me\/923315223726|api\.whatsapp\.com/.test(url)) throw new Error('not whatsapp ' + url);
  await page.waitForSelector('.sent h3'); console.log(await page.textContent('.sent'));
  await page.goto('http://localhost:4173/#signin'); await page.waitForSelector('.sitesec h1'); console.log(await page.textContent('.sitesec h1'));
  const sw = await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => !!r)); console.log('sw', sw);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('http://localhost:4173/#home'); await page.waitForTimeout(1500);
  await page.screenshot({ path: '../website-preview/85-live-home-phone.png' });
  console.log('errors', errs); await b.close(); if (errs.length) process.exit(1);
})();
