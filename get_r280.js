const { chromium } = require('playwright');
const path = require('path');
const APP = path.resolve('../hplc-figure-bench(WF1.13).html');
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('file://' + APP);
  const ok = await page.evaluate(() => typeof projectData === 'function');
  console.log("has projectData:", ok);
  await browser.close();
}
run();
