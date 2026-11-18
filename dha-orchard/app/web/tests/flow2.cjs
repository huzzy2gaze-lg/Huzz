// Phase 2: deal file, stage details, photo upload, calendar, privacy.
// BASE = demo app URL (default) or the artifact-mode test page.
const { chromium, devices } = require('playwright');
const OUT = __dirname;
const BASE = process.env.BASE || 'http://localhost:4173/?demo&fresh#signin';
const errors = [];
const log = (...a) => console.log(...a);
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function as(page, email) {
  if (await page.locator('[data-act="switchUser"]').count()) await page.click('[data-act="switchUser"]');
  await page.evaluate(() => { location.hash = 'signin'; }); await page.waitForSelector('[data-demo]');
  await page.click(`[data-demo="${email}"]`);
  await page.waitForSelector('#tabs:not([hidden])');
  await page.waitForTimeout(500);
}
async function find(page, b, n) {
  await page.selectOption('#qb', b); await page.fill('#q', String(n)); await page.click('#searchForm button');
  await page.waitForSelector(`.panel h2:has-text("Plot ${b}-${n}")`); await page.waitForTimeout(400);
}
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto(BASE);
  await page.waitForSelector('[data-demo]', { timeout: 60000 });
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 538);
  await page.click('[data-act="openAdd"]'); await page.fill('#cn', 'Farhan Malik'); await page.fill('#cp', '0321 5554444');
  await page.click('#addClientForm button[type=submit]'); await page.waitForSelector('.cl .n:has-text("Farhan Malik")'); await page.waitForTimeout(500);
  await page.click('[data-dealfile]'); await page.waitForSelector('.dealfile');
  log('steps', await page.locator('.step').count(), '| note:', await page.locator('.dealfile > .meta').last().innerText());
  await page.fill('#f_agreement_on', day(0)); await page.click('#stageForm button[type=submit]'); await page.waitForTimeout(600);
  await page.click('[data-sale]'); await page.fill('#sp', '4.55'); await page.fill('#st', '1000000'); await page.selectOption('#sm', 'cash'); await page.fill('#sd', day(9));
  await page.click('#saleForm button[type=submit]'); await page.waitForSelector('.wait:has-text("Sale waiting")');
  await as(page, 'owner@demo.pk');
  await page.click('[data-tab="approvals"]'); await page.locator('.req.sale [data-approve]').click(); await page.waitForTimeout(800);
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 538);
  await page.click('[data-dealfile]'); await page.waitForSelector('.dealfile');
  log('current stage', await page.locator('.step.now .sl').innerText(), '| done', await page.locator('.step.done').count());
  await page.selectOption('#up_kind_token', 'token_receipt');
  await page.setInputFiles('input[data-upstage="token"]', OUT + '/receipt.jpg');
  await page.waitForSelector('.dealfile .thumbimg.on', { timeout: 20000 });
  log('docs in token stage', await page.locator('.dealfile .doc').count(), '| step badge', await page.locator('.step.now .dc').innerText());
  await page.locator('.dealfile .docthumb').first().click(); await page.waitForSelector('#viewer:not([hidden]) canvas.docpage');
  await page.screenshot({ path: OUT + '/p2-viewer.png' });
  await page.click('[data-act="closeViewer"]');
  await page.click('[data-setstage="ndc_submitted"]'); await page.waitForTimeout(800);
  await page.selectOption('#f_authority', 'FGEHA'); await page.fill('#f_ndc_submitted_on', day(0)); await page.fill('#f_ndc_expected', day(1));
  await page.click('#stageForm button[type=submit]'); await page.waitForTimeout(800);
  log('current stage now', await page.locator('.step.now .sl').innerText());
  await page.screenshot({ path: OUT + '/p2-dealfile.png' });
  await page.click('[data-tab="calendar"]'); await page.click('[data-calview="list"]'); await page.waitForSelector('.calgroup');
  log('calendar badge', await page.locator('#tabs .badge').allInnerTexts());
  log('first group:', (await page.locator('.calgroup').nth(0).innerText()).split('\n').slice(0, 5).join(' | '));
  await page.click('[data-calnew=""]'); await page.fill('#ev_t', 'Site visit with Farhan'); await page.fill('#ev_d', day(3)); await page.fill('#ev_h', '16:30'); await page.selectOption('#ev_p', 'A-538');
  await page.click('#eventForm button[type=submit]'); await page.waitForTimeout(800);
  log('items', await page.locator('.calgroup .chipev').count());
  await page.screenshot({ path: OUT + '/p2-calendar.png', fullPage: true });
  
  await as(page, 'sara@demo.pk');
  await page.click('[data-tab="calendar"]'); await page.click('[data-calview="list"]'); await page.waitForTimeout(400);
  log('sara calendar items', await page.locator('.calgroup .chipev').count());
  await page.click('[data-tab="map"]'); await find(page, 'A', 539);
  await page.setInputFiles('input[data-upplot="A-539"]', OUT + '/receipt.jpg');
  await page.waitForSelector('.card .thumbimg.on', { timeout: 20000 });
  log('sara plot docs', await page.locator('.card .doc').count());
  await as(page, 'nadeem@demo.pk');
  await page.click('[data-tab="calendar"]'); await page.click('[data-calview="list"]'); await page.waitForTimeout(400);
  log('admin calendar items', await page.locator('.calgroup .chipev').count());
  await page.click('[data-tab="map"]'); await find(page, 'A', 539);
  log('admin sees sara plot doc', await page.locator('.card .doc').count());
  await as(page, 'ali@demo.pk');
  const ph = page; await ph.setViewportSize({ width: 390, height: 844 }); await ph.waitForTimeout(400);
  await ph.click('[data-tab="calendar"]'); await ph.waitForTimeout(400);
  await ph.screenshot({ path: OUT + '/p2-m-cal.png' });
  await ph.click('[data-tab="sales"]'); await ph.waitForTimeout(400);
  await ph.locator('[data-opendeal]').first().click(); await ph.waitForTimeout(1300);
  await ph.locator('.dealfile').scrollIntoViewIfNeeded();
  await ph.screenshot({ path: OUT + '/p2-m-deal.png' });
  log('phone width', await ph.evaluate(() => document.documentElement.scrollWidth));
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
