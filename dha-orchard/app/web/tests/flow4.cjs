// The WH Ventures website as a sales funnel: a visitor from an ad chooses blocks, looks at the outlook and books
// a call; a client joins the investor list; the admin assigns the call; the agent makes a client; the investor list.
const { chromium, devices } = require('playwright');
const OUT = __dirname;
const URL = 'http://localhost:4173/?demo&fresh&utm_source=facebook&utm_campaign=nov-launch';
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
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto(URL);
  await page.waitForSelector('.site .hero', { timeout: 60000 }); await page.waitForTimeout(2600);
  log('hero:', (await page.locator('.hero h1').innerText()).replace(/\n/g, ' '));
  await page.screenshot({ path: OUT + '/w-hero.png' });
  // choose blocks on the block map
  await page.locator('.explore [data-sblock="A"]').scrollIntoViewIfNeeded();
  await page.click('.explore [data-sblock="A"] .bmlabel'); await page.waitForTimeout(300);
  await page.click('.explore [data-sblock="C"] .bmlabel'); await page.waitForTimeout(300);
  log('chosen:', await page.locator('.chosen span').innerText(), '| card:', await page.locator('.bcardx h3').innerText());
  await page.screenshot({ path: OUT + '/w-explore.png' });
  // the outlook for Block C, 2 plots
  await page.click('[data-invblock="C"]'); await page.click('[data-invn="1"]'); await page.waitForTimeout(300);
  await page.locator('.ochart').scrollIntoViewIfNeeded(); await page.waitForTimeout(1900);
  log('outlook:', (await page.locator('.bignums').innerText()).replace(/\n/g, ' | '));
  await page.locator('#invPrice').fill('4.4'); await page.waitForTimeout(300);
  log('after price 4.40:', (await page.locator('.bignums').innerText()).replace(/\n/g, ' | '));
  await page.screenshot({ path: OUT + '/w-outlook.png' });
  // book a call
  await page.locator('.formcard').scrollIntoViewIfNeeded();
  await page.click('[data-bookans="goal:invest"]'); await page.click('[data-bookstep="2"]');
  await page.click('[data-bookans="budget:3-4"]'); await page.click('[data-bookans="size:1 Kanal"]'); await page.click('[data-bookstep="3"]');
  log('step 3 blocks on:', await page.locator('.formcard .chip2.on').allInnerTexts());
  await page.click('[data-bookstep="4"]'); await page.waitForSelector('#bookForm');
  log('step 4 summary:', await page.locator('#bookForm .fine').first().innerText());
  await page.fill('#bk_name', 'Hamza Ali'); await page.fill('#bk_phone', '0301 2223344'); await page.check('#bk_same');
  log('WhatsApp copied:', await page.inputValue('#bk_wa'));
  await page.click('[data-booktime="evening"]'); await page.check('#bk_optin');
  await page.click('#bookForm button[type=submit]'); await page.waitForSelector('.sent h3');
  log('booked:', (await page.locator('.sent').innerText()).split('\n').slice(0, 2).join(' | '));
  // a client: account with interests and news
  await signIn(page, 'buyer@demo.pk');
  await page.fill('#ac_name', 'Bilal Khan'); await page.fill('#ac_phone', '0333 4445556');
  await page.click('[data-acblock="G"]'); await page.check('#ac_optin'); await page.click('#accountForm button[type=submit]'); await page.waitForTimeout(600);
  log('client interests:', await page.locator('[data-acblock].on').allInnerTexts(), '| opt-in', await page.isChecked('#ac_optin'));
  // the admin: the booking with its details, assign to Ali; the investor list
  await signIn(page, 'owner@demo.pk');
  await page.click('[data-tab="approvals"]'); await page.waitForSelector('.req.lead');
  log('lead tags:', await page.locator('.req.lead .leadtags').first().innerText(), '| message:', await page.locator('.req.lead .s').first().innerText());
  const card = page.locator('.req.lead', { hasText: 'Hamza Ali' });
  await card.locator('select').selectOption({ label: 'Ali' }); await card.locator('[data-assignlead]').click(); await page.waitForTimeout(800);
  await page.click('[data-tab="sales"]'); await page.click('[data-act="loadInvestors"]'); await page.waitForSelector('.invtbl');
  log('investor list:', await page.locator('.invtbl tbody tr').count(), 'rows |', (await page.locator('.invtbl tbody').innerText()).replace(/\t/g, ' ').split('\n').join(' || '));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="exportInvestors"]')]);
  log('export:', dl.suggestedFilename());
  // the agent works the call
  await signIn(page, 'ali@demo.pk');
  await page.click('[data-tab="sales"]'); await page.waitForSelector('.req.lead');
  await page.click('[data-convertlead]'); await page.waitForTimeout(900);
  log('agent clients:', await page.locator('.list .cl .n').allInnerTexts(), '| investor list for agent?', await page.locator('[data-act="loadInvestors"]').count());
  // phone
  const ph = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  ph.on('pageerror', (e) => errors.push('phone ' + e.message));
  await ph.goto('http://localhost:4173/?demo#home'); await ph.waitForSelector('.site .hero', { timeout: 60000 }); await ph.waitForTimeout(2600);
  await ph.screenshot({ path: OUT + '/w-phone-1.png' });
  await ph.evaluate(() => { location.hash = 'outlook'; }); await ph.waitForTimeout(2500);
  await ph.screenshot({ path: OUT + '/w-phone-2.png' });
  log('sticky button on phone:', await ph.locator('.stickycta').isVisible(), '| width', await ph.evaluate(() => document.documentElement.scrollWidth));
  await page.screenshot({ path: OUT + '/w-full.png' });
  const full = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await full.goto('http://localhost:4173/?demo#home'); await full.waitForSelector('.site .hero', { timeout: 60000 }); await full.waitForTimeout(3000);
  await full.screenshot({ path: OUT + '/w-home-full.png', fullPage: true });
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
