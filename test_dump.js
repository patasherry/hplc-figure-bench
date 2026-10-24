const {open, H} = require('./tests/lib/harness.js');
async function run() {
  const {p, errs, close} = await open({cloud: false}); // cloud false! no __listDocs
  try {
    const h = H(p);
    await h.newProject('test');
    await h.addRun('./data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
    await h.pool('T1-T3');
    await h.addConc('./data/nd/nd_one_protein_a280.csv', 0.5);

    // the saved project JSON: local storage
    const json = await p.evaluate(() => localStorage.getItem('hfb_p_test'));
    console.log("localstorage length", json ? json.length : null);
    if (json) console.log(json.substring(0, 300));
  } finally {
    await close();
  }
}
run();
