const {open, H, suite, path, DATA} = require('../lib/harness');
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

(async () => {
  const T = suite('27_sec_mass');
  const {p, errs, close} = await open(), h = H(p);
  p.on('dialog', d => d.accept());

  await T.t('sec_mass_regression', async () => {
    await h.newProject('SEC mass calc');
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
    const mwCol = pt[0].findIndex(c => /^Apparent mass|Apparent MW/i.test(c));
    const veCol = pt[0].findIndex(c => /^Ve|Center|Elution/i.test(c));
    const sampleRows = pt.slice(1);
    let found = false;
    for (let r of sampleRows) {
      const veVal = num(r[veCol]), mwVal = num(r[mwCol]);
      if (veVal != null && mwVal != null) {
        const kav = (veVal - 8) / 16;
        const expMw = Math.pow(10, 3 - 4 * kav);
        T.check(`mass_${veVal}_near_${expMw.toFixed(1)}`, Math.abs(mwVal - expMw) / expMw < 0.05, `Ve=${veVal}, MW=${mwVal}, expected=${expMw.toFixed(1)}`);
        found = true;
      }
    }
    T.check('peaks_checked', found, 'checked at least one peak mass');
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
