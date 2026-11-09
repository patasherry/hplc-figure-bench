const {open, H, suite, path, DATA} = require('../lib/harness');
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

(async () => {
  const T = suite('41_sec_mass');
  const {p, errs, close} = await open(), h = H(p);
  p.on('dialog', d => d.accept());

  await T.t('est_mass_column_evidence', async () => {
    await h.newProject('SEC mass calc 41');
    await h.addRun(path.join(DATA, 'science/sec_inject2.csv'));

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

    const pt = await h.peakTable();
    const head = pt[0] || [];

    // This check strictly fails on 'Apparent mass (kDa)' (main) and passes with 'Est. Mass (kDa)'
    const hasEstMass = head.some(c => c.trim() === 'Est. Mass (kDa)');
    T.check('sec.mass_col_renamed', hasEstMass, `Table headers: ${head.join(', ')}`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
