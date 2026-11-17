// Today panel: a booking from the website, the admin assigns it, the agent sees "Calls to make" with Call and WhatsApp.
// Then the clock moves forward: late bookings and deals with no follow-up show. Also the WhatsApp button on the website.
const { chromium, devices } = require('playwright');
const OUT = __dirname + '/../../../../website-preview/';
const errors = [];
const log = (...a) => console.log(...a);
async function signIn(page, email) {
  if (await page.locator('[data-act="switchUser"]').count()) await page.click('[data-act="switchUser"]');
  await page.evaluate(() => { location.hash = 'signin'; });
  await page.waitForSelector(`[data-demo="${email}"]`); await page.click(`[data-demo="${email}"]`); await page.waitForTimeout(900);
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.clock.install({ time: Date.now() }); // time runs normally; later the test moves it forward
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto('http://localhost:4173/?demo&fresh#book'); await page.waitForSelector('.formcard', { timeout: 60000 });
  await page.click('[data-bookans="goal:invest"]'); await page.click('[data-bookstep="2"]'); await page.click('[data-bookstep="3"]');
  await page.click('[data-bookstep="4"]'); await page.waitForSelector('#bookForm');
  await page.fill('#bk_name', 'Usman Tariq'); await page.fill('#bk_phone', '0321 5556677');
  await page.click('#bookForm button[type=submit]'); await page.waitForSelector('.sent h3');
  // the admin: website settings with a WhatsApp number, then the Today panel
  await signIn(page, 'owner@demo.pk');
  await page.click('[data-tab="sales"]'); await page.waitForSelector('.today');
  log('admin today:', (await page.locator('.today .tdtop').innerText()).replace(/\n/g, ' '), '|', await page.locator('.tdh').allInnerTexts());
  await page.click('[data-tab="approvals"]'); await page.waitForSelector('.req.lead');
  const card = page.locator('.req.lead', { hasText: 'Usman Tariq' });
  log('lead badge:', await card.locator('.waitbadge').innerText(), '| call link', await card.locator('a.call').getAttribute('href'));
  await card.locator('select').selectOption({ label: 'Ali' }); await card.locator('[data-assignlead]').click(); await page.waitForTimeout(800);
  await page.click('[data-tab="team"]'); await page.waitForTimeout(500);
  await page.fill('#ss_whatsapp', '0300 1112233'); await page.click('#siteSettingsForm button[type=submit]'); await page.waitForTimeout(700);
  // the agent
  await signIn(page, 'ali@demo.pk');
  // a client with a plot and a planned token date in 2 days
  await page.click('[data-tab="map"]'); await page.waitForTimeout(300);
  await page.selectOption('#qb', 'A'); await page.fill('#q', '538'); await page.click('#searchForm button');
  await page.waitForSelector('.panel h2:has-text("Plot A-538")'); await page.waitForTimeout(400);
  await page.click('[data-act="openAdd"]'); await page.fill('#cn', 'Farhan Malik'); await page.fill('#cp', '0321 5554444');
  await page.click('#addClientForm button[type=submit]'); await page.waitForSelector('.cl .n:has-text("Farhan Malik")'); await page.waitForTimeout(500);
  await page.click('[data-dealfile]'); await page.waitForSelector('.dealfile');
  const d2 = new Date(Date.now() + 2 * 86400e3); const ds = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-' + String(d2.getDate()).padStart(2, '0');
  await page.fill('#f_agreement_on', ds); await page.click('#stageForm button[type=submit]'); await page.waitForTimeout(600);
  await page.click('[data-tab="sales"]'); await page.waitForSelector('.today');
  log('agent today:', await page.locator('.tdh').allInnerTexts());
  const wa = await page.locator('.tdcol.urgent a.wa').first().getAttribute('href');
  log('agent WhatsApp link:', decodeURIComponent(wa));
  await page.screenshot({ path: OUT + '20-today-agent.png' });
  // 2 hours and then 10 days later
  for (const [label, ms] of [['+2 h', 2 * 3600e3], ['+10 days', 10 * 86400e3]]) {
    await ctx.clock.setSystemTime(Date.now() + ms);
    await page.click('[data-tab="map"]'); await page.waitForTimeout(300); await page.click('[data-tab="sales"]'); await page.waitForSelector('.today');
    log(label, 'agent today:', await page.locator('.tdh').allInnerTexts(), '| late badges', await page.locator('.waitbadge.late').count());
    if (label === '+10 days') {
      await page.screenshot({ path: OUT + '21-today-late.png' });
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
      await page.locator('.today').screenshot({ path: OUT + '22-today-phone.png' });
      log('phone width', await page.evaluate(() => document.documentElement.scrollWidth));
      await page.setViewportSize({ width: 1440, height: 900 });
    }
  }
  await signIn(page, 'owner@demo.pk');
  await page.click('[data-tab="sales"]'); await page.waitForSelector('.today');
  log('+10 days admin today:', await page.locator('.tdh').allInnerTexts());
  await page.locator('.today').screenshot({ path: OUT + '24-today-admin.png' });
  // the website: title and WhatsApp button
  const w = page;
  await w.evaluate(() => { location.hash = 'home'; }); await w.waitForSelector('.site .xhero', { timeout: 60000 }); await w.waitForTimeout(3500);
  log('site title:', await w.title(), '| WhatsApp button:', await w.locator('.wafloat').count());
  await w.screenshot({ path: OUT + '23-site-whatsapp.png' });
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
