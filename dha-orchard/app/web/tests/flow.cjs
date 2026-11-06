// End-to-end flow in demo mode: agent asks, admin approves, privacy between agents.
const { chromium, devices } = require('playwright');
const OUT = __dirname;
const URL = 'http://localhost:4173/?demo&fresh';
const errors = [];
function log(...a) { console.log(...a); }
async function as(page, email) {
  if (await page.locator('[data-act="switchUser"]').count()) await page.click('[data-act="switchUser"]');
  await page.click(`[data-demo="${email}"]`);
  await page.waitForSelector('#tabs:not([hidden])');
  await page.waitForTimeout(400);
}
async function find(page, b, n) {
  await page.selectOption('#qb', b);
  await page.fill('#q', String(n));
  await page.click('#searchForm button');
  await page.waitForSelector(`.panel h2:has-text("Plot ${b}-${n}")`);
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto(URL);
  await page.waitForSelector('[data-demo]', { timeout: 60000 });
  await page.screenshot({ path: OUT + '/01-login.png' });
  // agent Ali
  await as(page, 'ali@demo.pk');
  log('plots coloured', await page.locator('svg .p.available').count());
  await find(page, 'A', 540);
  log('ali add plot form?', await page.locator('#addPlotForm').count(), 'price edit?', await page.locator('[data-act="editPrice"]').count());
  await page.click('[data-act="openAdd"]');
  await page.fill('#cn', 'Kamran Shah'); await page.fill('#cp', '0333 1234567');
  await page.click('#addClientForm button[type=submit]');
  await page.waitForSelector('.cl .n:has-text("Kamran Shah")');
  await page.click('[data-prebook]');
  await page.waitForSelector('.wait:has-text("Pre-booking request")');
  await page.screenshot({ path: OUT + '/02-ali-request.png' });
  // agent Sara adds her own client on the same plot
  await as(page, 'sara@demo.pk');
  await find(page, 'A', 540);
  log('sara sees Kamran?', await page.locator('text=Kamran').count(), '| private note:', await page.locator('text=Their details are private').count());
  await page.click('[data-act="openAdd"]');
  await page.fill('#cn', 'Bilal Ahmed');
  await page.click('#addClientForm button[type=submit]');
  await page.waitForSelector('.cl .n:has-text("Bilal Ahmed")');
  await page.click('[data-prebook]');
  await page.waitForSelector('.wait:has-text("Pre-booking request")');
  // admin approves Ali's client
  await as(page, 'nadeem@demo.pk');
  log('approvals badge', await page.locator('#tabs .badge').innerText());
  await page.click('[data-tab="approvals"]');
  await page.waitForSelector('.req');
  log('requests waiting', await page.locator('.req').count());
  await page.screenshot({ path: OUT + '/03-approvals.png' });
  const card = page.locator('.req', { hasText: 'Kamran Shah' });
  await card.locator('[data-approve]').click();
  await page.waitForTimeout(600);
  log('after approve, waiting', await page.locator('.req').count());
  // Ali marks it sold
  await as(page, 'ali@demo.pk');
  log('ali notices', await page.locator('.note').allInnerTexts());
  await find(page, 'A', 540);
  await page.click('[data-sale]');
  await page.fill('#sp', '4.40'); await page.fill('#st', '1000000'); await page.selectOption('#sm', 'bank_transfer'); await page.fill('#sd', '2026-12-15');
  await page.click('#saleForm button[type=submit]');
  await page.waitForSelector('.wait:has-text("Sale waiting")');
  log('map status class', await page.locator('svg .p.sold_pending').count());
  await page.screenshot({ path: OUT + '/04-ali-sale.png' });
  // Sara sees "waiting" but no buyer
  await as(page, 'sara@demo.pk');
  await find(page, 'A', 540);
  log('sara: status', await page.locator('.facts b').nth(2).innerText(), '| sees Kamran?', await page.locator('text=Kamran').count(), '| sees 4.40?', await page.locator('text=4.40').count());
  // Owner approves the sale
  await as(page, 'owner@demo.pk');
  await page.click('[data-tab="approvals"]');
  await page.locator('.req.sale [data-approve]').click();
  await page.waitForTimeout(600);
  await page.click('[data-tab="sales"]');
  await page.waitForSelector('.tiles');
  await page.screenshot({ path: OUT + '/05-sales-admin.png', fullPage: true });
  // Team: add an agent with the price switch
  await page.click('[data-tab="team"]');
  await page.click('[data-act="newMember"]');
  await page.fill('#me_e', 'new.agent@gmail.com'); await page.fill('#me_n', 'New Agent');
  await page.check('#mp_can_edit_price');
  await page.click('#memberForm button[type=submit]');
  await page.waitForSelector('.member .n:has-text("New Agent")');
  log('members', await page.locator('.member').count());
  await page.screenshot({ path: OUT + '/06-team.png', fullPage: true });
  // Sara: My sales shows only her client; A-540 sold on the map
  await as(page, 'sara@demo.pk');
  await page.click('[data-tab="sales"]');
  log('sara clients', await page.locator('.list .cl').count(), await page.locator('.list .cl .n').allInnerTexts());
  await page.click('[data-tab="map"]');
  await find(page, 'A', 540);
  log('sara: final status', await page.locator('.facts b').nth(2).innerText());
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
