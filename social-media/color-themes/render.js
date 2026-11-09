// Screenshots each colour-theme board: node render.js
const { chromium } = require("playwright"); const path = require("path");
(async () => {
  const b = await chromium.launch();
  for (const [i, k] of ["forest", "navy", "stone", "teal"].entries()) {
    const p = await b.newPage({ viewport: { width: 1600, height: 989 }, deviceScaleFactor: 2 });
    await p.goto("file://" + path.join(__dirname, "themes.html") + "?theme=" + k);
    await p.waitForFunction(() => window.READY);
    if (i === 0) console.log(JSON.stringify(await p.evaluate(() => window.HUES)));
    await p.screenshot({ path: path.join(__dirname, `option-${i + 1}-${k}.png`) });
    await p.close();
  }
  await b.close();
})();
