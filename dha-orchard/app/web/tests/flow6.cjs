// The website extras: block tour, Block A beacon, plot sizes, budget finder, timeline, nearby places, questions, sharing.
const { chromium, devices } = require('playwright');
const OUT = __dirname;
const errors = [];
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await page.goto('http://localhost:4173/?demo&fresh#home'); await page.waitForSelector('.site .hero', { timeout: 60000 }); await page.waitForTimeout(2500);
  log('Block A beacon on the hero map:', await page.locator('.heromap2 .beaconA').count(), '| tag:', await page.locator('.heromap2 .atag text').innerHTML());
  log('hero tour plays by itself:', await page.locator('.herocard .hc-title').innerText());
  // the tour of the Blocks page, started from its button
  await page.evaluate(() => { location.hash = 'blocks'; }); await page.waitForSelector('.explore');
  await page.click('.sechead [data-act="tour"]'); await page.waitForTimeout(2200);
  log('tour step 1:', (await page.locator('.tourcap').innerText()).split('\n')[0], '| zoomed viewBox:', await page.locator('.explore .bmap').getAttribute('viewBox'));
  await page.screenshot({ path: OUT + '/x-tour-1.png' });
  await page.waitForTimeout(4300);
  log('tour step 2:', (await page.locator('.tourcap').innerText()).split('\n')[0], '| card:', await page.locator('.bcardx h3').innerText());
  await page.screenshot({ path: OUT + '/x-tour-2.png' });
  await page.click('.explore ~ * [data-act="tour"], .sechead [data-act="tour"]'); await page.waitForTimeout(1200);
  log('after stop: caption hidden', await page.locator('.tourcap').isHidden(), '| viewBox', await page.locator('.explore .bmap').getAttribute('viewBox'));
  // plot sizes
  await page.locator('#sizes').scrollIntoViewIfNeeded(); await page.click('[data-sizepick="10M"]'); await page.waitForTimeout(600);
  log('sizes:', (await page.locator('#sizes .bfacts').innerText()).replace(/\n/g, ' '), '|', await page.locator('#sizes p.fine').innerText());
  await page.screenshot({ path: OUT + '/x-sizes.png' });
  // budget finder
  await page.locator('#budget').scrollIntoViewIfNeeded(); await page.locator('#budgetRange').fill('3.7'); await page.waitForTimeout(300);
  log('budget 3.70:', await page.locator('.bmatch b').allInnerTexts());
  await page.click('.bmatch [data-togglesblock="G"]'); await page.waitForTimeout(300);
  log('G in my call:', await page.locator('.chosen span').innerText());
  await page.screenshot({ path: OUT + '/x-budget.png' });
  // timeline and countdown, on the home page
  await page.evaluate(() => { location.hash = 'home'; }); await page.waitForSelector('#progress');
  await page.locator('#progress').scrollIntoViewIfNeeded(); await page.waitForTimeout(1800);
  log('timeline:', await page.locator('.tm b').allInnerTexts(), '| countdown', await page.locator('.cdown b').innerText());
  await page.screenshot({ path: OUT + '/x-timeline.png' });
  // questions
  await page.locator('#faq').scrollIntoViewIfNeeded(); await page.click('#faq details:nth-child(3) summary'); await page.waitForTimeout(300);
  log('questions:', await page.locator('#faq summary').count(), '| opened:', await page.locator('#faq details[open]').count());
  // nearby places: an admin enters them
  await page.evaluate(() => { location.hash = 'signin'; }); await page.click('[data-demo="owner@demo.pk"]'); await page.waitForTimeout(900);
  await page.click('[data-tab="team"]'); await page.fill('#ss_nearby', 'COMSATS University | 1 min\nMurree Road | 10 min'); await page.fill('#ss_whatsapp', '0300 1234567');
  await page.click('#siteSettingsForm button[type=submit]'); await page.waitForTimeout(700);
  await page.click('[data-act="switchUser"]'); await page.evaluate(() => { location.hash = 'home'; }); await page.waitForTimeout(1200);
  log('nearby on the website:', (await page.locator('#nearby .nearby').innerText()).replace(/\n/g, ' | '));
  await page.evaluate(() => { location.hash = 'blocks'; }); await page.waitForSelector('.bcardx');
  log('WhatsApp button for the block:', await page.locator('.bcardx .sitebtn.wa').getAttribute('href'));
  // share a plot
  await page.evaluate(() => { location.hash = 'plan'; }); await page.waitForTimeout(800);
  await page.selectOption('#qb', 'A'); await page.fill('#q', '538'); await page.click('#searchForm button'); await page.waitForSelector('.plotcard');
  log('share link:', decodeURIComponent(await page.locator('.plotcard a:has-text("Share")').getAttribute('href')).slice(0, 110));
  const ph = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  ph.on('pageerror', (e) => errors.push('phone ' + e.message));
  await ph.goto('http://localhost:4173/?demo#home'); await ph.waitForSelector('.site .hero', { timeout: 60000 }); await ph.waitForTimeout(1500);
  await ph.evaluate(() => document.querySelector('#progress').scrollIntoView()); await ph.waitForTimeout(1800);
  await ph.screenshot({ path: OUT + '/x-phone-timeline.png' });
  await ph.evaluate(() => document.querySelector('.formcard').scrollIntoView()); await ph.waitForTimeout(500);
  await ph.screenshot({ path: OUT + '/x-phone-steps.png' });
  log('phone width', await ph.evaluate(() => document.documentElement.scrollWidth));
  log('ERRORS', errors);
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); console.log('ERRORS', errors); process.exit(1); });
