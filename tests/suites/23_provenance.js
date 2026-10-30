const {open, H, suite, path, fs, DATA, src} = require('../lib/harness');
const F = {gb: src('gb'), imac: src('his'), grad: path.join(DATA, 'chrom/imac_HisTrap_HP_5mL_gradient_u7_tab_utf16.csv'), sec: path.join(DATA, 'science/sec_inject2.csv'), nd: path.join(DATA, 'science/nd3.csv')};

(async () => {
  const T = suite('23_provenance');
  const {p, errs, close} = await open();
  const h = H(p);
  p.on('dialog', d => d.accept());

  const methods = async () => { await h.step('figure'); await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(400); return h.methods(); };

  await T.t('matrix', async () => {
    // 1. Calculated (UV area)
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Calculated');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');
    const mCalc = await methods();
    T.check('calculated_provenance', mCalc.includes('by the A280 area') || mCalc.includes('by the UV area'), 'Methods text should mention calculated provenance');

    // 2. Measured (NanoDrop)
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Measured');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');
    await h.addConc(F.nd, 0.5);
    const mMeas = await methods();
    T.check('measured_provenance', mMeas.includes('by NanoDrop'), 'Methods text should mention measured provenance');

    // 3. Transferred (Concentrated step)
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Transferred');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');
    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await h.wait(400);
    await p.evaluate(() => {
      const vOut = document.getElementById('btw-vOut');
      if(vOut){ vOut.value = '2.5'; vOut.dispatchEvent(new Event('input', {bubbles: true})); vOut.dispatchEvent(new Event('change', {bubbles: true})); }
      const conc = document.getElementById('btw-conc');
      if(conc){ conc.value = '4.0'; conc.dispatchEvent(new Event('input', {bubbles: true})); conc.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await p.waitForTimeout(500);
    const mTrans = await methods();
    T.check('transferred_provenance', mTrans.includes('concentration left'), 'Methods text should mention transferred provenance');

    // 4. Manual (Batch step) per advice
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Manual');
    await h.gb(F.gb);

    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep="man:batch"]'); await h.wait(400);
    await p.locator('#man-name').fill('Batch Step');
    await p.locator('#man-resin').fill('My Resin');
    await p.locator('#man-buffer').fill('A');
    await p.locator('#man-wash').fill('W');
    await p.locator('#man-elution').fill('E');
    await p.waitForTimeout(500);

    const mMan = await methods();
    T.check('manual_provenance', /was bound in batch to/i.test(mMan) && /My Resin/i.test(mMan), 'Methods text should mention manual provenance');

    // 5. Missing inputs
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Missing');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await p.evaluate(() => {
      const b = document.getElementById('r-pool');
      if(b){ b.value = ''; b.dispatchEvent(new Event('input', {bubbles: true})); b.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await p.waitForTimeout(500);
    const mMiss = await methods();
    T.check('missing_provenance', mMiss.includes('not entered'), 'Methods text should mention missing provenance');
  });

  await T.t('measurable_parameters', async () => {
    const setRun = async (k, v) => { const l = p.locator(`.trace.run.sel [data-k=${k}]`).first(); await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(250); };
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Measured parameters');
    await h.addRun(F.grad);
    const source = await methods();
    T.check('parameter_schema.imported_values', /5(?:\.0)? mL\/min/.test(source) && /4(?:\.0)? °C/.test(source) && /linear gradient from 0% to 100% B/i.test(source), `Methods did not retain imported values: ${source}`);
    T.check('parameter_schema.no_false_warning', !/differs from run data/.test(source), `Automatic values should not warn: ${source}`);

    await h.step((await h.timeline()).find(x => /^run:/.test(x.k)).k);
    await setRun('mFlow', '2.5');
    await setRun('mTemp', '20');
    await setRun('mGrad', 'linear 0 to 80% B over 20 mL');
    const checked = await methods();
    T.check('parameter_schema.flow_mismatch', /flow rate differs from run data \(5(?:\.0)? mL\/min\), check/.test(checked), `Missing flow provenance check: ${checked}`);
    T.check('parameter_schema.temperature_mismatch', /temperature differs from run data \(4\.0 °C\), check/.test(checked), `Missing temperature provenance check: ${checked}`);
    T.check('parameter_schema.gradient_mismatch', /gradient differs from run data \(0% to 100% B over 49 mL, 10 CV\), check/.test(checked), `Missing gradient provenance check: ${checked}`);
  });

  await close();
  T.done();
})();
