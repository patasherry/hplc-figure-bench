const {open, H, suite, fs, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('342_sec_mass_semantics');

  async function fresh(id, fn){
    await T.t(id, async () => {
      const {p, errs, close} = await open();
      const h = H(p);
      try { await fn(p, h); }
      finally { T.check(id + '/no-page-errors', !errs.length, errs.join(' | ')); await close(); }
    });
  }

  // This test explicitly asserts the proposed alternative to remove oligomer estimates
  await fresh('no-oligomer-multiplier', async (p, h) => {
    await h.newProject('no-oligomer-multiplier');
    await h.addRun([path.join(DATA, 'science/sec_inject2.csv')]);

    let runStep;
    for (let t0 = Date.now(); !runStep && Date.now() - t0 < 10000; await h.wait(250)) runStep = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep) await h.step(runStep.k);
    await h.wait(400);

    const openFolds = loc => loc.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });

    await p.click('#moreBtn').catch(() => {});
    const stdsChk = p.locator('#o-secStds');
    await openFolds(stdsChk);
    await stdsChk.check({force: true});
    await h.wait(300);

    await p.locator('#sec-v0').fill('8'); await p.locator('#sec-v0').dispatchEvent('change');
    await p.locator('#sec-vt').fill('24'); await p.locator('#sec-vt').dispatchEvent('change');

    while (await p.locator('#secStdList .krow').count() < 2) {
      await p.click('#sec-addStd');
      await h.wait(150);
    }
    await p.locator('#ss-n0').fill('Std1'); await p.locator('#ss-k0').fill('100'); await p.locator('#ss-v0').fill('12');
    await p.locator('#ss-n0').dispatchEvent('change'); await p.locator('#ss-k0').dispatchEvent('change'); await p.locator('#ss-v0').dispatchEvent('change');
    await p.locator('#ss-n1').fill('Std2'); await p.locator('#ss-k1').fill('10'); await p.locator('#ss-v1').fill('16');
    await p.locator('#ss-n1').dispatchEvent('change'); await p.locator('#ss-k1').dispatchEvent('change'); await p.locator('#ss-v1').dispatchEvent('change');
    await h.wait(500);

    await p.click('#intAuto').catch(() => {});
    await h.wait(500);

    await p.evaluate(() => {
        const el = document.getElementById('o-secMono');
        if (el) { el.value = '50'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(400);

    // This intentionally fails to establish the alternative 1 contract
    // The current main branch shows the '× monomer' column when SEC mass and monomer mass are set.
    // If alternative 1 is adopted, the column would be completely removed.
    const tableHeaders = await p.evaluate(() => Array.from(document.querySelectorAll('th')).map(th => th.textContent));
    T.check('sec/no-oligomer-column-strict', !tableHeaders.includes('× monomer'), 'Expected × monomer column to be explicitly absent under alternative 1, currently failing pending approval');
  });

  T.done();
})();
