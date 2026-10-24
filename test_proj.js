const { chromium } = require('playwright');
const path = require('path');
const APP = path.resolve(require('./tests/lib/app.js'));
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('file://' + APP);

  const h = require('./tests/lib/harness.js').H(page);
  await h.newProject('test');
  await h.addRun('./tests/data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
  await h.pool('T1-T3');
  await h.addConc('./tests/data/nd/nd_one_protein_a280.csv', 0.5);

  await page.waitForTimeout(500);

  // Read project state from DOM elements.
  const tbl = await page.locator('#panel').innerText();
  console.log("Panel text includes 0.57:", tbl.includes("0.57"));
  console.log("Panel text includes 0.58:", tbl.includes("0.58"));

  // Or check __listDocs directly by mocking it first
  await browser.close();
}
run();
