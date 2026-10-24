const { chromium } = require('playwright');
const path = require('path');
const APP = path.resolve(require('./lib/app.js'));
async function run() {
  const { open, H } = require('./lib/harness.js');
  const { p, close } = await open({cloud: true}); // use cloud true to have __listDocs injected
  try {
     const h = H(p);
     await h.newProject('nd_test');
     await h.addRun('./data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
     await h.pool('T1-T3');
     await h.addConc('./data/nd/nd_one_protein_a280.csv', 0.5);

     // The app automatically saves on idle to the injected docs.
     await p.waitForTimeout(500);

     const jsons = await p.evaluate(async () => {
         const list = JSON.parse(await window.__listDocs('users/u_test/p'));
         return list;
     });
     console.log("docs list:", JSON.stringify(jsons, null, 2));
  } finally {
     await close();
  }
}
run();
