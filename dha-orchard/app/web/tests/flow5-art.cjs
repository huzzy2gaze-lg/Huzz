// The website on the claude.ai test page (local stand-in): a viewer sees only the website; an agent sends an
// enquiry; the owner assigns it to Sara; Sara makes it a client; the website details show to the viewer.
const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'http://127.0.0.1:8766/_test.html';
const errors = [];
const log = (...a) => console.log(...a);
async function as(page, email, hash) {
  await page.evaluate((e) => localStorage.setItem('mockUser', e), email);
  await page.goto('about:blank'); await page.goto(URL + (hash || ''));
  await page.waitForTimeout(1500);
}
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto(URL);
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('mockStore', s); }, fs.readFileSync(__dirname + '/seed-store.json', 'utf8'));
  for (const u of ['sara@demo.pk', 'ali@demo.pk', 'owner@demo.pk']) await as(page, u);
  await as(page, 'viewer@demo.pk');
  log('viewer sees website', await page.locator('.site .xhero').count(), '| sales tabs', await page.locator('#tabs:not([hidden])').count());
  await page.evaluate(() => { location.hash = 'book'; }); await page.waitForTimeout(400);
  log('viewer book:', (await page.locator('.formcard .sent p').innerText()).slice(0, 60));
  await as(page, 'ali@demo.pk', '#book');
  await page.click('[data-bookstep="2"]'); await page.click('[data-bookstep="3"]');
  await page.click('.formcard [data-togglesblock="A"]'); await page.click('.formcard [data-togglesblock="C"]'); await page.click('[data-bookstep="4"]');
  await page.fill('#bk_name', 'Asad Raza'); await page.fill('#bk_phone', '0300 1112233'); await page.check('#bk_optin');
  await page.click('#bookForm button[type=submit]'); await page.waitForSelector('.sent h3');
  log('enquiry sent:', await page.locator('.sent h3').innerText());
  await as(page, 'owner@demo.pk');
  log('owner badge', await page.locator('#tabs .badge').allInnerTexts());
  await page.click('[data-tab="approvals"]'); await page.waitForSelector('.req.lead');
  const card = page.locator('.req.lead', { hasText: 'Asad Raza' });
  const opt = await card.locator('select option', { hasText: 'Sara' }).getAttribute('value');
  await card.locator('select').selectOption(opt); await card.locator('[data-assignlead]').click(); await page.waitForTimeout(1200);
  log('lead tags:', (await page.locator('.req.lead .leadtags').first().innerText()).replace(/\n/g, ' | '));
  await page.click('[data-tab="sales"]'); await page.click('[data-act="loadInvestors"]'); await page.waitForSelector('.invtbl');
  log('investor list rows', await page.locator('.invtbl tbody tr').count());
  await page.click('[data-act="exportInvestors"]'); await page.waitForTimeout(500); log('saved through claude.ai downloads:', await page.evaluate(() => window.__saved));
  await page.click('[data-tab="team"]'); await page.fill('#ss_phone', '051 7654321'); await page.click('#siteSettingsForm button[type=submit]'); await page.waitForTimeout(800);
  await as(page, 'ali@demo.pk'); await page.click('[data-tab="sales"]'); await page.waitForTimeout(500);
  log('ali sees the enquiry in sales', await page.locator('.req.lead').count());
  await as(page, 'sara@demo.pk'); await page.click('[data-tab="sales"]'); await page.waitForSelector('.req.lead');
  log('sara sees the enquiry', await page.locator('.req.lead').count());
  await page.click('[data-convertlead]'); await page.waitForTimeout(1200);
  log('sara clients', await page.locator('.list .cl .n').allInnerTexts());
  await as(page, 'owner@demo.pk'); await page.click('[data-tab="approvals"]'); await page.waitForTimeout(800);
  log('owner open enquiries after conversion', await page.locator('.req.lead').count());
  await as(page, 'viewer@demo.pk', '#book');
  log('viewer sees phone', await page.locator('.cdl').innerText().catch(() => 'none'));
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
