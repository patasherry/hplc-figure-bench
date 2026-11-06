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

  await T.t('source_import_diagnostics', async () => {
    const F_SEC = require('../data/gen_import_sec');
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Source Diagnostics');

    const brokenCsv = {
      name: 'interrupted.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Time,UV\n0.0,0.1\n1.0,0.5\n2.0,bad\n3.0,1.2\n4.0,2.0\n5.0,2.5\n6.0,1.8\n7.0,0.9\n')
    };
    await p.setInputFiles('#file', brokenCsv);
    await h.wait(1500);

    const incompleteZip = F_SEC.unicornZip('incomplete.zip', [2]);
    await p.setInputFiles('#file', incompleteZip);
    await h.wait(2000);

    // 1. Source-level warning/details view in DOM
    const csvDiag = p.locator('#sourceDiags .source-diag[data-source="interrupted.csv"]');
    T.check('csv_diag_visible', await csvDiag.isVisible(), 'Source-level diagnostic for interrupted CSV should be visible');
    const csvText = await csvDiag.textContent();
    T.check('csv_diag_text', /3 rows skipped/i.test(csvText) && /Left out 3 rows of interrupted/i.test(csvText), `Expected skipped rows in diagnostic, got: ${csvText}`);

    const zipDiag = p.locator('#sourceDiags .source-diag[data-source="incomplete.zip"]');
    T.check('zip_diag_visible', await zipDiag.isVisible(), 'Source-level diagnostic for UNICORN archive should be visible');
    const zipText = await zipDiag.textContent();
    T.check('zip_diag_text', /unreadable curve/i.test(zipText) && /Curves with no readable data points were left out: Conductivity/i.test(zipText), `Expected lost curves in diagnostic, got: ${zipText}`);

    // 2. Run card has non-cluttering details warning view
    const runCardDiag = p.locator('.trace.run[data-kind="run"] .srcdiag');
    T.check('run_card_diag', (await runCardDiag.count()) > 0 && /Import warning/i.test(await runCardDiag.first().innerText()), 'Run card should show compact import warning details');

    // 3. Project export persists source diagnostics
    const downloadPromise = p.waitForEvent('download');
    await p.click('#projSave');
    const dl = await downloadPromise;
    const projData = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    T.check('export_has_sources', Array.isArray(projData.sources) && projData.sources.length === 2, `Expected 2 sources in export, got: ${JSON.stringify(projData.sources)}`);
    const expCsv = (projData.sources || []).find(s => s.file === 'interrupted.csv');
    T.check('export_csv_diagnostic', expCsv && expCsv.skipped === 3, `Exported CSV diagnostic should record 3 skipped rows: ${JSON.stringify(expCsv)}`);
    const expZip = (projData.sources || []).find(s => s.file === 'incomplete.zip');
    T.check('export_zip_diagnostic', expZip && Array.isArray(expZip.lost) && expZip.lost.includes('Conductivity'), `Exported ZIP diagnostic should record Conductivity lost curve: ${JSON.stringify(expZip)}`);

    // 4. Project import restores source diagnostics
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await p.click('#homeQuick'); await h.wait(1000);
    await p.setInputFiles('#projFile', await dl.path());
    await h.wait(2000);

    const reloadedCsvDiag = p.locator('#sourceDiags .source-diag[data-source="interrupted.csv"]');
    T.check('import_restores_csv_diag', await reloadedCsvDiag.isVisible(), 'Importing project should restore CSV source diagnostic');
    const reloadedZipDiag = p.locator('#sourceDiags .source-diag[data-source="incomplete.zip"]');
    T.check('import_restores_zip_diag', await reloadedZipDiag.isVisible(), 'Importing project should restore UNICORN archive source diagnostic');


    // 5. Successful reimport replaces/clears diagnostic for that source
    const cleanCsv = {
      name: 'interrupted.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Time,UV\n0.0,0.1\n1.0,0.5\n2.0,0.8\n3.0,1.2\n4.0,2.0\n5.0,2.5\n6.0,1.8\n7.0,0.9\n')
    };
    await p.setInputFiles('#file', cleanCsv);
    await h.wait(1500);

    const runStep = p.locator('#tl button[data-step^="run:"]');
    if (await runStep.count()) await runStep.first().click();
    await h.wait(500);

    T.check('reimport_clears_csv_diag', (await p.locator('#sourceDiags .source-diag[data-source="interrupted.csv"]').count()) === 0, 'Clean reimport should clear the diagnostic for that source');
    T.check('zip_diag_persists_after_csv_reimport', await p.locator('#sourceDiags .source-diag[data-source="incomplete.zip"]').isVisible(), 'Other source diagnostics should remain');
  });

  await close();
  T.done();
})();
