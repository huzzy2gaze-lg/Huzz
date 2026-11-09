// Renders every brand-kit asset in kit.html to ../<name>.png at its exact size.
// Run from this folder:  node render.js            (all assets)
//                        node render.js profile    (one asset)
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const url = (n) => "file://" + path.join(__dirname, "kit.html") + "?asset=" + n;
  const probe = await browser.newPage();
  await probe.goto(url("profile"));
  await probe.waitForFunction(() => window.READY);
  const names = process.argv.length > 2 ? process.argv.slice(2) : await probe.evaluate(() => window.ASSET_NAMES);
  await probe.close();
  for (const n of names) {
    const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
    await page.goto(url(n));
    await page.waitForFunction(() => window.READY);
    const [w, h] = await page.evaluate(() => window.ASSET_SIZE);
    await page.setViewportSize({ width: w, height: h });
    const dir = n.startsWith("highlight-") ? "instagram-highlights" : ".";
    const out = path.join(__dirname, "..", dir, n + ".png");
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(`${n}: ${w}x${h} -> ${path.relative(path.join(__dirname, ".."), out)}`);
    await page.close();
  }
  await browser.close();
})();
