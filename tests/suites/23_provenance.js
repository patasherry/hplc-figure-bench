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

  /* typed flow, temperature and %B gradient are checked against the curves in the file (5 mL/min, 4 °C, 0 to 100% B from 30 to 80 mL) */
  await T.t('cond_schema', async () => {
    const setRun = async (k, v) => { const l = p.locator(`.trace.run.sel [data-k=${k}]`).first(); await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(250); };
    const chk = m => (m.match(/\[[^\]]*in the file:[^\]]*\]/g) || []);
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Condition schema');
    await h.addRun(F.grad);
    const m0 = await methods();
    T.check('cond_schema.auto_no_check', chk(m0).length === 0, `values read from the file need no check: ${chk(m0).join(' ')}`); /* guards: no false positive on the file's own values */
    await h.step((await h.timeline()).find(x => /^run:/.test(x.k)).k);
    for (const [k, v] of Object.entries({mFlow: '5', mTemp: '6 °C', mGrad: 'linear 0–100% B over 10 CV'})) await setRun(k, v);
    const m1 = await methods();
    T.check('cond_schema.match_no_check', chk(m1).length === 0, `typed values that agree with the file within tolerance: ${chk(m1).join(' ')} | ${m1}`); /* guards: tolerances for rounding and sensor drift */
    await h.step((await h.timeline()).find(x => /^run:/.test(x.k)).k);
    for (const [k, v] of Object.entries({mFlow: '2.5', mTemp: '20', mGrad: 'linear 0–50% B over 10 CV'})) await setRun(k, v);
    const m2 = await methods();
    T.check('cond_schema.flow_check', /flow rate in the file: 5\.0 mL\/min, check/.test(m2), `typed 2.5 mL/min, file 5.0: ${m2}`);
    T.check('cond_schema.temp_check', /temperature in the file: 4\.0 °C, check/.test(m2), `typed 20 °C, file 4.0: ${m2}`);
    T.check('cond_schema.grad_check', /gradient in the file: 0% to 100% B[^\]]*, check/.test(m2), `typed 0–50% B, file 0–100%: ${m2}`);
    T.check('cond_schema.typed_kept', /2\.5 mL\/min/.test(m2) && /0–50% B/.test(m2), `the typed values are still what Methods states: ${m2}`); /* guards: the check flags, it does not overwrite */
  });

  await close();
  T.done();
})();
