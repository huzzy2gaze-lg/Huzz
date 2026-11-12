// The claude.ai test page with a local stand-in for the shared database: the whole sales flow,
// privacy between agents, deal stages, a document, the calendar and the team page.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = __dirname;
const URL = 'http://127.0.0.1:8766/_test.html';
const seed = fs.readFileSync(OUT + '/seed-store.json', 'utf8');
const errors = [];
const log = (...a) => console.log(...a);
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function as(page, email) {
  await page.evaluate((e) => localStorage.setItem('mockUser', e), email);
  await page.goto('about:blank'); await page.goto(URL);
  await page.waitForSelector('#tabs:not([hidden])', { timeout: 20000 });
  await page.waitForSelector('svg .p', { timeout: 30000 }); // wait until the map is drawn, not a fixed time
  await page.waitForTimeout(700);
}
async function find(page, b, n) {
  await page.selectOption('#qb', b); await page.fill('#q', String(n)); await page.click('#searchForm button');
  await page.waitForSelector(`.panel h2:has-text("Plot ${b}-${n}")`); await page.waitForTimeout(500);
}
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  // load the test data on a blank page of the same site: an open app page would save its own (empty) copy over it
  await page.goto(URL.replace('_test.html', 'plotdata.json'));
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('mockStore', s); }, seed);
  // everyone opens the page once, so they are on the team list
  for (const u of ['sara@demo.pk', 'ali@demo.pk', 'nadeem@demo.pk', 'owner@demo.pk']) await as(page, u);
  log('owner: plots coloured', await page.locator('svg .p.available').count(), '| header', await page.locator('.sync').innerText());
  await page.click('[data-tab="team"]'); await page.waitForTimeout(400);
  log('team members', await page.locator('.member').count(), '| add button?', await page.locator('[data-act="newMember"]').count());
  // give Sara the price switch
  await page.locator('.member', { hasText: 'Sara' }).locator('[data-perm="can_edit_price"]').check(); await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/a-team.png', fullPage: true });
  // Ali: client, pre-booking request
  await as(page, 'ali@demo.pk');
  log('ali price edit?', await (async () => { await find(page, 'A', 540); return page.locator('[data-act="editPrice"]').count(); })());
  await page.click('[data-act="openAdd"]'); await page.fill('#cn', 'Kamran Shah'); await page.fill('#cp', '0333 1234567');
  await page.click('#addClientForm button[type=submit]'); await page.waitForSelector('.cl .n:has-text("Kamran Shah")'); await page.waitForTimeout(600);
  await page.click('[data-prebook]'); await page.waitForSelector('.wait:has-text("Pre-booking request")');
  // Sara: her own client on the same plot; cannot see Ali's
  await as(page, 'sara@demo.pk');
  await find(page, 'A', 540);
  log('sara sees Kamran?', await page.locator('text=Kamran').count(), '| private note', await page.locator('text=Their details are private').count(), '| price edit', await page.locator('[data-act="editPrice"]').count());
  await page.click('[data-act="openAdd"]'); await page.fill('#cn', 'Bilal Ahmed');
  await page.click('#addClientForm button[type=submit]'); await page.waitForSelector('.cl .n:has-text("Bilal Ahmed")'); await page.waitForTimeout(600);
  await page.click('[data-prebook]'); await page.waitForSelector('.wait:has-text("Pre-booking request")');
  const sneak = await page.evaluate(async () => { const db = await window.claude.use('db'); const s = await db.collection('agents/u_ali/clients').get(); return s.size; });
  log('sara direct read of Ali clients', sneak);
  // Nadeem approves Ali's client
  await as(page, 'nadeem@demo.pk');
  log('approvals badge', await page.locator('#tabs .badge').allInnerTexts());
  await page.click('[data-tab="approvals"]'); await page.waitForSelector('.req');
  log('requests waiting', await page.locator('.req').count());
  await page.locator('.req', { hasText: 'Kamran Shah' }).locator('[data-approve]').click(); await page.waitForTimeout(1500);
  log('after approve, waiting', await page.locator('.req').count());
  // Ali marks sold
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 540);
  await page.click('[data-sale]'); await page.fill('#sp', '4.40'); await page.fill('#st', '1000000'); await page.selectOption('#sm', 'bank_transfer'); await page.fill('#sd', day(9));
  await page.click('#saleForm button[type=submit]'); await page.waitForSelector('.wait:has-text("Sale waiting")');
  await as(page, 'sara@demo.pk'); await find(page, 'A', 540);
  log('sara: status', await page.locator('.facts b').nth(2).innerText(), '| sees 4.40?', await page.locator('text=4.40').count());
  await as(page, 'owner@demo.pk');
  await page.click('[data-tab="approvals"]'); await page.locator('.req.sale [data-approve]').click(); await page.waitForTimeout(1500);
  // Ali: deal file, stage details, a document, calendar
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 540);
  await page.click('[data-dealfile]'); await page.waitForSelector('.dealfile');
  log('ali stage', await page.locator('.step.now .sl').innerText());
  await page.fill('#f_agreement_on', day(0)); await page.click('#stageForm button[type=submit]'); await page.waitForTimeout(800);
  await page.selectOption('#up_kind_token', 'token_receipt');
  await page.setInputFiles('input[data-upstage="token"]', OUT + '/receipt.jpg');
  await page.waitForSelector('.dealfile .thumbimg.on', { timeout: 20000 });
  log('ali docs', await page.locator('.dealfile .doc').count());
  await page.click('[data-setstage="ndc_submitted"]'); await page.waitForTimeout(1000);
  await page.selectOption('#f_authority', 'Housing Foundation'); await page.fill('#f_ndc_expected', day(2));
  await page.click('#stageForm button[type=submit]'); await page.waitForTimeout(800);
  log('ali stage now', await page.locator('.step.now .sl').innerText());
  await page.screenshot({ path: OUT + '/a-dealfile.png' });
  await page.click('[data-tab="calendar"]'); await page.click('[data-calview="list"]'); await page.waitForTimeout(500);
  log('ali calendar items', await page.locator('.calgroup .chipev').count());
  await as(page, 'sara@demo.pk'); await page.click('[data-tab="calendar"]'); await page.click('[data-calview="list"]'); await page.waitForTimeout(400);
  log('sara calendar items', await page.locator('.calgroup .chipev').count());
  await as(page, 'nadeem@demo.pk'); await page.click('[data-tab="calendar"]'); await page.click('[data-calview="list"]'); await page.waitForTimeout(600);
  log('admin calendar items', await page.locator('.calgroup .chipev').count());
  await page.click('[data-tab="sales"]'); await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + '/a-sales.png', fullPage: true });
  log('activity feed (public) has names?', await page.evaluate(async () => { const db = await window.claude.use('db'); const s = await db.collection('activity').get(); return s.docs.map((d) => d.data().body).filter((b) => /Kamran|Bilal|4\.40/.test(b)).length; }));
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
