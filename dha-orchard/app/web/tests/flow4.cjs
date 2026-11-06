// The WH Ventures website: the public, a client account, an enquiry, the admin assigns it, the agent makes it a client.
const { chromium, devices } = require('playwright');
const OUT = __dirname;
const URL = 'http://localhost:4173/?demo&fresh';
const errors = [];
const log = (...a) => console.log(...a);
async function signIn(page, email) {
  if (await page.locator('[data-act="switchUser"]').count()) await page.click('[data-act="switchUser"]');
  if (await page.locator('[data-act="signOut"]').count()) await page.click('[data-act="signOut"]');
  await page.evaluate(() => { location.hash = 'signin'; });
  await page.waitForSelector(`[data-demo="${email}"]`);
  await page.click(`[data-demo="${email}"]`);
  await page.waitForTimeout(900);
}
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto(URL);
  await page.waitForSelector('.site .hero', { timeout: 60000 });
  log('public home:', await page.locator('.hero h1').innerText(), '| sales tabs visible?', await page.locator('#tabs:not([hidden])').count());
  await page.screenshot({ path: OUT + '/w-home.png', fullPage: true });
  // the master plan: no stock colours, search, plot card
  await page.click('.sitenav a[href="#plan"]'); await page.waitForSelector('.planmap svg'); await page.waitForTimeout(500);
  log('coloured plots on the public plan', await page.locator('svg .p.available, svg .p.sold, svg .p.prebooked').count());
  await page.selectOption('#qb', 'A'); await page.fill('#q', '538'); await page.click('#searchForm button');
  await page.waitForSelector('.plotcard'); await page.waitForTimeout(800);
  log('plot card:', (await page.locator('.plotcard').innerText()).replace(/\n/g, ' | '));
  await page.screenshot({ path: OUT + '/w-plan.png' });
  // the public sends an enquiry about the plot
  await page.click('[data-act="askPlot"]'); await page.waitForSelector('#enquiryForm');
  log('plot prefilled', await page.inputValue('#q_plot'));
  await page.fill('#q_name', 'Asad Raza'); await page.fill('#q_phone', '0300 1112233'); await page.fill('#q_msg', 'I want a corner plot in Block A');
  await page.click('#enquiryForm button[type=submit]'); await page.waitForSelector('.sent');
  log('public enquiry:', await page.locator('.sent h3').innerText());
  // a client account: save a plot, send an enquiry, see it
  await signIn(page, 'buyer@demo.pk');
  log('client lands on', await page.evaluate(() => location.hash), '| sales tabs?', await page.locator('#tabs:not([hidden])').count());
  await page.fill('#ac_name', 'Bilal Khan'); await page.fill('#ac_phone', '0333 4445556'); await page.click('#accountForm button[type=submit]'); await page.waitForTimeout(500);
  await page.evaluate(() => { location.hash = 'plan'; }); await page.waitForSelector('.planmap svg');
  await page.selectOption('#qb', 'C'); await page.fill('#q', '58'); await page.click('#searchForm button'); await page.waitForSelector('.plotcard');
  await page.click('[data-saveplot]'); await page.waitForTimeout(500);
  await page.click('[data-act="askPlot"]'); await page.waitForSelector('#enquiryForm');
  log('client form prefilled:', await page.inputValue('#q_name'), '|', await page.inputValue('#q_phone'), '|', await page.inputValue('#q_plot'));
  await page.click('#enquiryForm button[type=submit]'); await page.waitForSelector('.sent');
  await page.evaluate(() => { location.hash = 'account'; }); await page.waitForTimeout(500);
  log('client account: saved', await page.locator('.savedplot').allInnerTexts(), '| enquiries', await page.locator('.myleads li').count());
  log('client reads sales data?', await page.evaluate(async () => (await window.__orchard.S.api.select('clients')).length + (await window.__orchard.S.api.select('plots')).length));
  await page.screenshot({ path: OUT + '/w-account.png', fullPage: true });
  // admin: assign the enquiries; website details
  await signIn(page, 'owner@demo.pk');
  log('admin lands in the sales system', await page.locator('#tabs:not([hidden])').count(), '| badge', await page.locator('#tabs .badge').allInnerTexts());
  await page.click('[data-tab="approvals"]'); await page.waitForSelector('.req.lead');
  log('enquiries for admin', await page.locator('.req.lead').count());
  const card = page.locator('.req.lead', { hasText: 'Asad Raza' });
  const opt = await card.locator('select option', { hasText: 'Ali' }).getAttribute('value');
  await card.locator('select').selectOption(opt); await card.locator('[data-assignlead]').click(); await page.waitForTimeout(800);
  await page.click('[data-tab="team"]'); await page.fill('#ss_phone', '051 1234567'); await page.fill('#ss_address', 'Office address here'); await page.click('#siteSettingsForm button[type=submit]'); await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/w-admin.png', fullPage: true });
  // agent: the enquiry, a note, make it a client
  await signIn(page, 'ali@demo.pk');
  await page.click('[data-tab="sales"]'); await page.waitForSelector('.req.lead');
  log('agent sees enquiries', await page.locator('.req.lead').count());
  await page.fill('.req.lead input[id^="ln_"]', 'Called, visit on Sunday'); await page.click('.req.lead form button'); await page.waitForTimeout(700);
  await page.click('[data-convertlead]'); await page.waitForTimeout(900);
  log('agent clients', await page.locator('.list .cl .n').allInnerTexts());
  await signIn(page, 'sara@demo.pk'); await page.click('[data-tab="sales"]'); await page.waitForTimeout(400);
  log('other agent sees enquiries', await page.locator('.req.lead').count());
  // the public sees the new phone number
  await page.click('[data-act="switchUser"]'); await page.evaluate(() => { location.hash = 'contact'; }); await page.waitForTimeout(500);
  log('contact page phone:', await page.locator('.cdl').innerText().catch(() => 'none'));
  const ph = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  ph.on('pageerror', (e) => errors.push('phone ' + e.message));
  await ph.goto('http://localhost:4173/?demo#home'); await ph.waitForSelector('.site .hero', { timeout: 60000 });
  await ph.screenshot({ path: OUT + '/w-phone-home.png', fullPage: true });
  await ph.evaluate(() => { location.hash = 'plan'; }); await ph.waitForTimeout(700);
  await ph.screenshot({ path: OUT + '/w-phone-plan.png' });
  log('phone width', await ph.evaluate(() => document.documentElement.scrollWidth));
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
