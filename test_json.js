const { chromium } = require('playwright');
const path = require('path');
const APP = path.resolve('./hplc-figure-bench(WF1.13).html');
async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({acceptDownloads: true});
  const page = await context.newPage();
  await page.goto('file://' + APP);

  const h = require('./tests/lib/harness.js').H(page);
  await h.newProject('test');
  await h.addRun('./tests/data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
  await h.pool('T1-T3');
  await h.addConc('./tests/data/nd/nd_one_protein_a280.csv', 0.5);
  await page.waitForTimeout(500);

  // Trigger download and get the parsed JSON
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-act="export"]')
  ]);
  const stream = await download.createReadStream();
  let chunks = [];
  for await (let chunk of stream) chunks.push(chunk);
  const jsonStr = Buffer.concat(chunks).toString('utf-8');
  const pd = JSON.parse(jsonStr);

  console.log("has nanodrop data:", pd && pd.nanodrop ? true : false);
  if(pd && pd.nanodrop) {
     console.log("r280 values:", pd.nanodrop[0].r280);
     console.log("all nanodrop array:", JSON.stringify(pd.nanodrop[0]).substring(0, 300));
  }

  await browser.close();
}
run();
