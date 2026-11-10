// The plot map on the website: from a block on the 3D home, zoom into the block, see plot numbers, open a plot.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
 for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['desk', { width: 1440, height: 900 }]]) {
  const p = await b.newPage({ viewport: vp }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4173/?demo#home'); await p.waitForSelector('#x-B', { timeout: 60000 }); await p.waitForTimeout(3000);
  await p.$eval('#x-B', e => e.scrollIntoView()); await p.waitForTimeout(1200);
  await p.click('#x-B [data-planblock="B"]'); await p.waitForSelector('.planmap svg'); await p.waitForTimeout(1500);
  const far1 = await p.$eval('.planmap svg', s => s.classList.contains('far'));
  await p.screenshot({ path: `/tmp/claude-0/pm-${name}-1.png` });
  // zoom in more, the numbers show
  for (let i = 0; i < 3 && await p.$eval('.planmap svg', s => s.classList.contains('far')); i++) { await p.click('[data-z="in"]'); await p.waitForTimeout(700); }
  const far2 = await p.$eval('.planmap svg', s => s.classList.contains('far'));
  await p.screenshot({ path: `/tmp/claude-0/pm-${name}-2.png` });
  // tap a plot in the middle of the map
  const box = await p.$$eval('.planmap svg polygon.p[data-p^="B-"]:not(.unread)', (ps) => { const sv = ps[0].ownerSVGElement.getBoundingClientRect(); for (const q of ps) { const r = q.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2; if (x > sv.x + 80 && x < sv.right - 30 && y > sv.y + 120 && y < sv.bottom - 30 && document.elementFromPoint(x, y) === q) return [x, y]; } return null; });
  await p.mouse.click(box[0], box[1]); await p.waitForTimeout(1200);
  const card = await p.$('.plotcard h3'); console.log(name, 'block view far:', far1, '| after zoom far:', far2, '| plot card:', card ? await card.textContent() : 'none');
  await p.screenshot({ path: `/tmp/claude-0/pm-${name}-3.png` });
  // the A chip and "All"
  await p.click('[data-planzoom="all"]'); await p.waitForTimeout(800); await p.click('[data-planzoom="A"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `/tmp/claude-0/pm-${name}-4.png` });
  console.log(name, 'errors', errs); await p.close(); }
 await b.close(); })();
