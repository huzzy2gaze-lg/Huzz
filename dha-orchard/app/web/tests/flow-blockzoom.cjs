// The 3D home: tap a block -> its numbered map grows in place -> tap outside / Esc / Back -> back to the 3D. Needs "npx vite --port 5173".
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = '/tmp/claude-0/zrec';
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
 for (const [name, vp, touch] of [['desk', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, recordVideo: { dir: OUT + '/' + name, size: vp } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:5173/?demo#home'); await p.waitForSelector('#x-A', { timeout: 60000 }); await p.waitForTimeout(12000);
  // where Block B is on the screen
  const pt = await p.evaluate(() => { const X = window.__X; const m = X.blocks.B.mesh; m.geometry.computeBoundingBox(); const c = m.geometry.boundingBox.getCenter(new X.camera.position.constructor()); m.localToWorld(c); c.project(X.camera); return [(c.x + 1) / 2 * innerWidth, (1 - c.y) / 2 * innerHeight]; });
  console.log(name, 'block B at', pt.map(Math.round));
  await p.screenshot({ path: `${OUT}/${name}-1-overview.png` });
  if (touch) await p.touchscreen.tap(pt[0], pt[1]); else { await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(600); await p.mouse.click(pt[0], pt[1]); }
  await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${name}-2-growing.png` });
  await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/${name}-3-numbers.png` });
  const st = await p.evaluate(() => ({ open: !!document.querySelector('.xmapov'), far: document.querySelector('.xmapov svg')?.classList.contains('far'), title: document.querySelector('.xmaptop b')?.textContent }));
  console.log(name, 'zoom view:', st);
  // tap outside the map (the dark edge)
  if (touch) await p.touchscreen.tap(4, vp.height - 4); else await p.mouse.click(8, vp.height - 8);
  await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${name}-4-closing.png` });
  await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${name}-5-back.png` });
  console.log(name, 'after outside tap open:', await p.evaluate(() => !!document.querySelector('.xmapov')), '| scroll lock:', await p.evaluate(() => document.body.classList.contains('mapopen')));
  // the block card button and Esc
  await p.$eval('#x-A', e => e.scrollIntoView()); await p.waitForTimeout(2500);
  await p.click('#x-A [data-mapopen="A"]'); await p.waitForTimeout(2500);
  console.log(name, 'button opens:', await p.evaluate(() => document.querySelector('.xmaptop b')?.textContent));
  if (!touch) { await p.keyboard.press('Escape'); } else { await p.click('.xmapback'); }
  await p.waitForTimeout(1200); console.log(name, 'closed:', !(await p.$('.xmapov')), '| errors', errs);
  await ctx.close(); }
 await b.close(); })();
