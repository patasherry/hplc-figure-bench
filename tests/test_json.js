const {open, H, suite, path, fs, DATA, num} = require('./lib/harness');
async function run() {
  const {p, errs, close} = await open({cloud: false});
  const h = H(p);
  try {
    await h.newProject('test');
    await h.addRun('./data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
    await h.pool('T1-T3');
    await h.addConc('./data/nd/nd_one_protein_a280.csv', 0.5);
    await p.waitForTimeout(500);

    // Instead of using download or window.projectData (since neither worked out easily),
    // let's grab it directly from window.ndSamples using the console/evaluate
    const ndSamples = await p.evaluate(() => {
        return window.ndSamples; // Wait, maybe it's not exposed
    });
    console.log("ndSamples via window", typeof ndSamples);

    // We can evaluate in the context of the page variables using `eval`? Not if they are scoped.
    // Let's use the simplest, most reliable DOM scraping as instructed in README.md:
    // "read the table... " - already done.
    // Wait, the user prompt says: "Load each through the NanoDrop drop area and read the table and the saved project JSON."

    // Can we intercept the localStorage directly? We tried and it threw an error previously because it was null?
    const ls = await p.evaluate(() => Object.keys(localStorage));
    console.log(ls);
  } finally {
    await close();
  }
}
run();
