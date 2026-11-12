// The 3D home: tap a block -> the camera flies down to it -> the numbered map fades in, aligned -> a tap outside the
// block, Esc or "Master plan" -> the reverse. Records a video of each run. Needs "npx vite --port 5173" (dev build).
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/zrec';
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
 for (const [name, vp, touch] of [['desk', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, recordVideo: { dir: OUT + '/' + name, size: vp } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const tap = async (x, y) => { if (touch) await p.touchscreen.tap(x, y); else { await p.mouse.move(x, y); await p.waitForTimeout(400); await p.mouse.click(x, y); } };
  await p.goto('http://localhost:5173/?demo#home'); await p.waitForSelector('#x-A', { timeout: 60000 }); await p.waitForTimeout(12000);
  for (const blk of ['B', 'H']) {
    const pt = await p.evaluate((blk) => { const X = window.__X; const m = X.blocks[blk].mesh; m.geometry.computeBoundingBox(); const c = m.geometry.boundingBox.getCenter(new X.camera.position.constructor()); m.localToWorld(c); c.project(X.camera); return [(c.x + 1) / 2 * innerWidth, (1 - c.y) / 2 * innerHeight]; }, blk);
    await p.screenshot({ path: `${OUT}/${name}-${blk}-1-overview.png` });
    await tap(pt[0], pt[1]);
    await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${name}-${blk}-2-flying.png` });
    await p.waitForFunction(() => document.body.classList.contains('mapopen'), null, { timeout: 20000 }); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${name}-${blk}-3-numbers.png` });
    console.log(name, blk, await p.evaluate(() => ({ map: document.querySelector('.xmaplayer')?.getAttribute('aria-label'), numbers: !document.querySelector('.xmaplayer svg').classList.contains('far') })));
    // a tap outside the block: a point of the map that is not this block
    const out = await p.evaluate((blk) => { for (let y = innerHeight - 30; y > 140; y -= 23) for (let x = 20; x < innerWidth - 20; x += 23) { const e = document.elementFromPoint(x, y); if (e && e.closest('.xmaplayer svg') && !(e.dataset && ((e.dataset.p || '').startsWith(blk + '-') || e.dataset.b === blk))) return [x, y]; } return null; }, blk);
    if (out) await tap(out[0], out[1]); else await p.click('.xmapback');
    await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${name}-${blk}-4-back.png` });
    await p.waitForFunction(() => !document.body.classList.contains('mapmode'), null, { timeout: 20000 }); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${name}-${blk}-5-overview.png` });
    console.log(name, blk, 'closed by', out ? 'tap outside' : 'button', '| map gone:', !(await p.$('.xmaplayer')));
  }
  // the block card button, then Esc (laptop) or the Master plan button (phone)
  await p.$eval('#x-A', e => e.scrollIntoView()); await p.waitForTimeout(2500);
  await p.click('#x-A [data-mapopen="A"]'); await p.waitForFunction(() => document.body.classList.contains('mapopen'), null, { timeout: 20000 });
  if (!touch) await p.keyboard.press('Escape'); else await p.click('.xmapback');
  await p.waitForFunction(() => !document.body.classList.contains('mapmode'), null, { timeout: 20000 });
  console.log(name, 'button + ' + (touch ? 'Master plan button' : 'Esc') + ': ok | errors', errs);
  await ctx.close(); }
 await b.close(); })();
