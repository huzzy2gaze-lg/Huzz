// Protected documents (viewer, download request and approval, screenshot key) and the calendar views.
// BASE = demo app (default) or the claude.ai test page with the local stand-in (BASE=art).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = __dirname;
const ART = process.env.BASE === 'art';
const URL = ART ? 'http://127.0.0.1:8766/_test.html' : 'http://localhost:4173/?demo&fresh#signin';
const errors = [];
const log = (...a) => console.log(...a);
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
async function as(page, email) {
  if (ART) {
    await page.evaluate((e) => localStorage.setItem('mockUser', e), email);
    await page.goto('about:blank'); await page.goto(URL);
  } else {
    if (await page.locator('[data-act="switchUser"]').count()) await page.click('[data-act="switchUser"]');
  await page.evaluate(() => { location.hash = 'signin'; }); await page.waitForSelector('[data-demo]');
    await page.click(`[data-demo="${email}"]`);
  }
  await page.waitForSelector('#tabs:not([hidden])', { timeout: 30000 });
  await page.waitForTimeout(700);
}
async function find(page, b, n) {
  await page.selectOption('#qb', b); await page.fill('#q', String(n)); await page.click('#searchForm button');
  await page.waitForSelector(`.panel h2:has-text("Plot ${b}-${n}")`); await page.waitForTimeout(500);
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto(URL);
  if (ART) {
    await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('mockStore', s); }, fs.readFileSync(OUT + '/seed-store.json', 'utf8'));
    for (const u of ['ali@demo.pk', 'owner@demo.pk']) await as(page, u);
  } else await page.waitForSelector('[data-demo]', { timeout: 60000 });
  // a sold deal for Ali on A-538
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 538);
  await page.click('[data-act="openAdd"]'); await page.fill('#cn', 'Farhan Malik');
  await page.click('#addClientForm button[type=submit]'); await page.waitForSelector('.cl .n:has-text("Farhan Malik")'); await page.waitForTimeout(600);
  await page.click('[data-sale]'); await page.fill('#sp', '4.55'); await page.click('#saleForm button[type=submit]'); await page.waitForSelector('.wait:has-text("Sale waiting")');
  await as(page, 'owner@demo.pk');
  await page.click('[data-tab="approvals"]'); await page.locator('.req.sale [data-approve]').click(); await page.waitForTimeout(1500);
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 538);
  await page.click('[data-dealfile]'); await page.waitForSelector('.dealfile');
  await page.selectOption('#up_kind_token', 'agreement');
  await page.setInputFiles('input[data-upstage="token"]', OUT + '/agreement.pdf');
  await page.waitForSelector('.dealfile .pdf', { timeout: 20000 });
  await page.selectOption('#up_kind_token', 'token_receipt');
  await page.setInputFiles('input[data-upstage="token"]', OUT + '/receipt.jpg');
  await page.waitForSelector('.dealfile .thumbimg.on', { timeout: 20000 });
  log('docs', await page.locator('.dealfile .doc').count(), '| img tags in deal file', await page.locator('.dealfile img').count());
  // the PDF opens inside the app, on canvases, with no download for the agent
  await page.locator('.dealfile .docthumb:has(.pdf)').click();
  await page.waitForSelector('#viewer canvas.docpage', { timeout: 30000 }); await page.waitForTimeout(800);
  log('pdf pages', await page.locator('#viewer canvas.docpage').count(), '| agent controls:', await page.locator('#viewer .dlctl').innerText());
  await page.screenshot({ path: OUT + '/v-pdf.png' });
  await page.keyboard.press('PrintScreen'); await page.waitForTimeout(300);
  log('veiled after screenshot key', await page.locator('#viewer.veiled').count());
  await page.screenshot({ path: OUT + '/v-veiled.png' });
  await page.waitForTimeout(3200);
  await page.click('[data-act="dlAsk"]'); await page.fill('#dl_reason', 'Client asked for a copy'); await page.click('#dlForm button');
  await page.waitForSelector('#viewer .dlstate'); log('after request:', await page.locator('#viewer .dlctl').innerText());
  await page.click('[data-act="closeViewer"]');
  // admin approves one download, and sees the screenshot report
  await as(page, 'nadeem@demo.pk'.replace('nadeem', ART ? 'owner' : 'nadeem'));
  log('approvals badge', await page.locator('#tabs .badge').allInnerTexts());
  await page.click('[data-tab="approvals"]'); await page.waitForSelector('.req.dl');
  log('download requests', await page.locator('.req.dl').count(), '|', (await page.locator('.req.dl .s').innerText()).slice(0, 80));
  await page.click('[data-dlapprove]'); await page.waitForTimeout(1000);
  await page.click('[data-tab="map"]'); await page.waitForTimeout(400);
  log('screenshot report seen by admin', await page.evaluate(() => window.__orchard.S.activity.filter((a) => /Screenshot key pressed/.test(a.body)).map((a) => a.body)));
  // Ali downloads once
  await as(page, 'ali@demo.pk');
  await find(page, 'A', 538);
  await page.click('[data-dealfile]'); await page.waitForSelector('.dealfile');
  await page.locator('.dealfile .docthumb:has(.pdf)').click(); await page.waitForSelector('#viewer [data-act="dlUse"]', { timeout: 20000 });
  if (ART) { await page.click('[data-act="dlUse"]'); await page.waitForTimeout(800); log('saved through claude.ai downloads:', await page.evaluate(() => window.__saved)); }
  else { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="dlUse"]')]); log('downloaded file', dl.suggestedFilename()); }
  await page.waitForTimeout(800);
  log('after download:', await page.locator('#viewer .dlctl').innerText());
  await page.click('[data-act="closeViewer"]');
  // calendar: week view, a tap on 10:00 tomorrow makes an entry, then day and month views
  await page.click('[data-tab="calendar"]'); await page.waitForSelector('.tgrid');
  log('view', await page.locator('.seg.views .on').innerText(), '| title', await page.locator('.caltitle').innerText());
  const col = page.locator(`.tg-col[data-calslot="${day(1)}"]`);
  const target = (await col.count()) ? col : page.locator('.tg-col').last();
  await page.waitForTimeout(800);
  const b2 = await target.boundingBox();
  await page.mouse.click(b2.x + 10, b2.y + 10 * 48 + 5);
  await page.waitForSelector('#eventForm');
  log('form prefilled', await page.inputValue('#ev_d'), await page.inputValue('#ev_h'), '-', await page.inputValue('#ev_e'));
  await page.fill('#ev_t', 'Site visit with Farhan'); await page.fill('#ev_e', '11:30'); await page.selectOption('#ev_p', 'A-538');
  await page.click('#eventForm button[type=submit]'); await page.waitForTimeout(900);
  const chip = page.locator('.tg-col .chipev', { hasText: 'Site visit' });
  log('entry in grid', await chip.count(), '| top/height', await chip.evaluate((el) => el.style.top + ' / ' + el.style.height));
  await page.screenshot({ path: OUT + '/c-week.png' });
  await chip.click(); await page.waitForSelector('.calmodal .calcard');
  log('details:', (await page.locator('.calcard').innerText()).replace(/\n/g, ' | ').slice(0, 120));
  await page.click('[data-act="calClose"]');
  await page.click('[data-calview="month"]'); await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + '/c-month.png' });
  await page.click(`.mcell[data-calslot="${day(1)}"] .mnum`); await page.waitForTimeout(400);
  log('day view title', await page.locator('.caltitle').innerText(), '| chips', await page.locator('.tg-col .chipev').count());
  await page.screenshot({ path: OUT + '/c-day.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.click('[data-calview="week"]'); await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/c-phone-week.png' });
  log('phone width', await page.evaluate(() => document.documentElement.scrollWidth));
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
