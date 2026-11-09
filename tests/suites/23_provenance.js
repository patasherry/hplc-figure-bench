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
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Source Diagnostics');

    // 1. Interrupted generic numeric block (generic CSV with an unreadable row splitting data)
    const malformedCsv = 'Time (min),UV 280 (mAU)\n0,0\n1,0bad\n2,0\n3,0\n';
    await p.setInputFiles('#file', {name: 'broken_block.csv', mimeType: 'text/csv', buffer: Buffer.from(malformedCsv)});
    await h.wait(600);

    const diagGeneric = p.locator('.trace:not(.run) .source-diag');
    T.check('generic_diag_present', (await diagGeneric.count()) > 0, 'source-level warning/details view appears on generic trace card');
    const genericSummary = await diagGeneric.locator('summary').textContent().catch(() => '');
    T.check('generic_diag_summary', /Import warning/i.test(genericSummary) && /2 rows/i.test(genericSummary), `summary mentions import warning and skipped rows: ${genericSummary}`);
    const genericMsg = await diagGeneric.locator('.source-diag-msg').textContent().catch(() => '');
    T.check('generic_diag_message', /Left out 2 rows of broken_block/i.test(genericMsg), `message has full diagnostic text: ${genericMsg}`);

    // 2. Unreadable UNICORN curves (.zip with unreadable/omitted Conductivity curve)
    const lostCurveZip = path.join(DATA, 'chrom', 'lost_curve.zip');
    await p.setInputFiles('#file', {name: 'lost_curve.zip', mimeType: 'application/zip', buffer: fs.readFileSync(lostCurveZip)});
    await h.wait(800);

    const diagUnicorn = p.locator('.trace.run .source-diag');
    T.check('unicorn_diag_visible', await diagUnicorn.isVisible(), 'source-level warning/details view appears on UNICORN run card');
    const unicornSummary = await diagUnicorn.locator('summary').textContent().catch(() => '');
    T.check('unicorn_diag_summary', /Import warning/i.test(unicornSummary) && /Conductivity/i.test(unicornSummary), `summary mentions omitted curve: ${unicornSummary}`);
    const unicornMsg = await diagUnicorn.locator('.source-diag-msg').textContent().catch(() => '');
    T.check('unicorn_diag_message', /Curves with no readable data points were left out: Conductivity/i.test(unicornMsg), `message has UNICORN loss text: ${unicornMsg}`);

    // 3. Persists through project export/import round-trip
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    const savePath = path.join(__dirname, '..', 'results', 'diag_test_proj.json');
    await dl.saveAs(savePath);

    await p.click('#homeBtn').catch(() => {});
    await h.wait(500);
    await p.click('#homeQuick');
    await h.wait(1000);

    await p.setInputFiles('#projFile', savePath);
    await h.wait(2000);

    const roundtripGeneric = p.locator('.trace:not(.run) .source-diag');
    const roundtripUnicorn = p.locator('.trace.run .source-diag');
    T.check('roundtrip_generic_diag_persists', (await roundtripGeneric.count()) > 0, 'generic import diagnostic persisted across project import');
    T.check('roundtrip_unicorn_diag_persists', await roundtripUnicorn.isVisible(), 'unicorn import diagnostic persisted across project import');

    // 4. Replaced / cleared when source is successfully reimported
    const cleanCsv = 'Time (min),UV 280 (mAU)\n0,0\n1,0\n2,0\n3,0\n';
    await p.setInputFiles('#file', {name: 'broken_block.csv', mimeType: 'text/csv', buffer: Buffer.from(cleanCsv)});
    await h.wait(600);
    T.check('reimport_clean_generic_clears_diag', (await p.locator('.trace:not(.run) .source-diag').count()) === 0, 'reimporting clean generic source clears warning');

    const cleanUnicornZip = path.join(DATA, 'chrom', 'valid_unicorn.zip');
    await p.setInputFiles('#file', {name: 'lost_curve.zip', mimeType: 'application/zip', buffer: fs.readFileSync(cleanUnicornZip)});
    await h.wait(800);
    T.check('reimport_clean_unicorn_clears_diag', (await p.locator('.trace.run .source-diag').count()) === 0, 'reimporting clean UNICORN archive clears warning');

    // 5. Generic export with separated substantial data blocks (warning identifies both blocks without rejecting the file)
    const lines1 = Array.from({length: 30}, (_, i) => `${(i * 0.1).toFixed(1)},${(Math.sin(i / 5)).toFixed(3)}`);
    const lines2 = Array.from({length: 20}, (_, i) => `${(i * 0.1).toFixed(1)},${(Math.cos(i / 5)).toFixed(3)}`);
    const multiBlockCsv = ['Time (min),UV 280 (mAU)', ...lines1, '[Run 2]', 'Time (min),UV 280 (mAU)', ...lines2].join('\n');
    await p.setInputFiles('#file', {name: 'multi_block.csv', mimeType: 'text/csv', buffer: Buffer.from(multiBlockCsv)});
    await h.wait(600);

    const multiDiag = p.locator('.trace:not(.run) .source-diag').last();
    T.check('multiblock_diag_present', (await multiDiag.count()) > 0, 'source-level warning appears for discarded substantial block');
    const mbSummary = await multiDiag.locator('summary').textContent().catch(() => '');
    T.check('multiblock_diag_summary', /Import warning/i.test(mbSummary) && /20 rows/i.test(mbSummary), `summary identifies omitted block count: ${mbSummary}`);
    const mbMsg = await multiDiag.locator('.source-diag-msg').textContent().catch(() => '');
    T.check('multiblock_identifies_both_blocks', /30 rows/i.test(mbMsg) && /lines 2[–-]31/i.test(mbMsg) && /20 rows/i.test(mbMsg) && /lines 34[–-]53/i.test(mbMsg), `message identifies both retained and omitted blocks with line ranges and row counts: ${mbMsg}`);

    // Persists across project export/reload
    const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    const savePath2 = path.join(__dirname, '..', 'results', 'diag_multiblock_proj.json');
    await dl2.saveAs(savePath2);

    await p.click('#homeBtn').catch(() => {});
    await h.wait(500);
    await p.click('#homeQuick');
    await h.wait(1000);

    await p.setInputFiles('#projFile', savePath2);
    await h.wait(2000);

    const reloadMbDiag = p.locator('.trace:not(.run) .source-diag').last();
    T.check('multiblock_diag_persists_reload', (await reloadMbDiag.count()) > 0, 'multiblock warning persists across project reload');
    const reloadMbMsg = await reloadMbDiag.locator('.source-diag-msg').textContent().catch(() => '');
    T.check('multiblock_reload_identifies_both_blocks', /30 rows/i.test(reloadMbMsg) && /20 rows/i.test(reloadMbMsg), `reloaded message identifies both blocks: ${reloadMbMsg}`);

    // 6. Harmless metadata table (< minimum row threshold) does not trigger warning
    const metaCsv = ['# Metadata', 'Flow,1.0', 'Temp,20', 'Pressure,5', 'Time (min),UV 280 (mAU)', ...lines1].join('\n');
    await p.setInputFiles('#file', {name: 'clean_meta.csv', mimeType: 'text/csv', buffer: Buffer.from(metaCsv)});
    await h.wait(600);
    const metaTrace = p.locator('.trace:not(.run)').filter({hasText: 'clean_meta'});
    T.check('metadata_table_no_false_warning', (await metaTrace.locator('.source-diag').count()) === 0, 'harmless metadata table does not trigger discarded block warning');
  });

  /* #1305: selected-clone handoff with status safeguards and legacy scalar retention */
  await T.t('clone_handoff_and_safeguards', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Clone Provenance');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');

    // 1. Legacy transformation scalars when no clone is selected
    await h.step('transform');
    await p.locator('#pr-trPlasmid').fill('pET28-SUMO-TEST');
    await p.locator('#pr-trMethod').fill('heat shock');
    await p.locator('#pr-trSel').fill('50 µg/mL kanamycin');
    await p.locator('#pr-trCol').fill('about 150');
    await p.locator('#pr-trStock').fill('box 1, B2');
    await p.locator('#pr-trStock').dispatchEvent('change');
    await h.wait(300);

    const mLegacy = await methods();
    T.check('legacy_scalars_retained_when_no_clone_selected',
      mLegacy.includes('pET28-SUMO-TEST was transformed into') && !mLegacy.includes('selected for expression'),
      `legacy transformation scalars retained: ${mLegacy}`);

    // 2. Add colonies: Colony 1 (unselected), Colony 2 (failed), Colony 3 (verified)
    await h.step('transform');
    await p.click('#prAddClone'); await h.wait(200);
    await p.click('#prAddClone'); await h.wait(200);
    await p.click('#prAddClone'); await h.wait(200);

    const nameInputs = p.locator('.clone-name');
    const statusSelects = p.locator('.clone-status');
    const stockInputs = p.locator('.clone-stock');

    await nameInputs.nth(0).fill('Colony 1');
    await nameInputs.nth(0).dispatchEvent('input');
    await statusSelects.nth(0).selectOption('unselected');
    await statusSelects.nth(0).dispatchEvent('change');

    await nameInputs.nth(1).fill('Colony 2');
    await nameInputs.nth(1).dispatchEvent('input');
    await statusSelects.nth(1).selectOption('failed');
    await statusSelects.nth(1).dispatchEvent('change');

    await nameInputs.nth(2).fill('Colony 3');
    await nameInputs.nth(2).dispatchEvent('input');
    await statusSelects.nth(2).selectOption('verified');
    await statusSelects.nth(2).dispatchEvent('change');
    await stockInputs.nth(2).fill('box 4, C3');
    await stockInputs.nth(2).dispatchEvent('input');
    await h.wait(300);

    // 3. Block selection of failed clone Colony 2
    const selDropdown = p.locator('#pr-selectedCloneId');
    const failedOptDisabled = await selDropdown.locator('option:has-text("Colony 2")').getAttribute('disabled');
    T.check('failed_clone_option_disabled', failedOptDisabled !== null, 'failed clone option has disabled attribute');

    // Attempt to select failed clone
    const failedVal = await selDropdown.locator('option:has-text("Colony 2")').getAttribute('value');
    await p.evaluate(val => {
      const el = document.getElementById('pr-selectedCloneId');
      if (el) { el.value = val; el.dispatchEvent(new Event('change', {bubbles: true})); }
    }, failedVal);
    await h.wait(300);

    const selValAfterFailedAttempt = await selDropdown.inputValue();
    T.check('failed_clone_selection_blocked', selValAfterFailedAttempt !== failedVal, 'selection of failed clone was blocked');

    // 4. Select verified clone Colony 3
    const verifiedVal = await selDropdown.locator('option:has-text("Colony 3")').getAttribute('value');
    await p.evaluate(val => {
      const el = document.getElementById('pr-selectedCloneId');
      if (el) { el.value = val; el.dispatchEvent(new Event('change', {bubbles: true})); }
    }, verifiedVal);
    await h.wait(300);

    const selValVerified = await selDropdown.inputValue();
    T.check('verified_clone_selected', selValVerified === verifiedVal, 'verified clone can be selected');

    // Check Methods text includes verified clone handoff and provenance retaining failed colonies
    const mVerified = await methods();
    T.check('verified_clone_methods_handoff',
      mVerified.includes('Verified clone Colony 3') && mVerified.includes('selected for expression') && mVerified.includes('3 colonies screened, 1 failed'),
      `methods text records verified clone and retain provenance: ${mVerified}`);

    // Check legacy scalar fields are still in DOM
    const trColVal = await p.locator('#pr-trCol').inputValue();
    T.check('legacy_scalar_colonies_retained_in_dom', trColVal === 'about 150', `Colonies scalar is ${trColVal}`);

    // 5. If Colony 3 is later changed to failed, selection safeguard auto-deselects it
    await h.step('transform');
    await statusSelects.nth(2).selectOption('failed');
    await statusSelects.nth(2).dispatchEvent('change');
    await h.wait(300);

    const selValAfterStatusChange = await selDropdown.inputValue();
    T.check('deselected_when_status_becomes_failed', selValAfterStatusChange === '', 'selected clone cleared when status changed to failed');

    // 6. Change Colony 2 from failed to verified, now it can be selected
    await statusSelects.nth(1).selectOption('verified');
    await statusSelects.nth(1).dispatchEvent('change');
    await h.wait(300);

    const colony2OptDisabled = await selDropdown.locator('option:has-text("Colony 2")').getAttribute('disabled');
    T.check('previously_failed_now_selectable', colony2OptDisabled === null, 'option is no longer disabled after status changed from failed to verified');

    await p.evaluate(val => {
      const el = document.getElementById('pr-selectedCloneId');
      if (el) { el.value = val; el.dispatchEvent(new Event('change', {bubbles: true})); }
    }, failedVal);
    await h.wait(300);

    const selValColony2 = await selDropdown.inputValue();
    T.check('newly_verified_clone_selected', selValColony2 === failedVal, 'previously failed clone can now be selected after status change');

    // 7. Project persistence round-trip
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    const savePath = path.join(__dirname, '..', 'results', 'clone_provenance_proj.json');
    await dl.saveAs(savePath);

    await p.click('#homeBtn').catch(() => {});
    await h.wait(500);
    await p.click('#homeQuick');
    await h.wait(1000);

    await p.setInputFiles('#projFile', savePath);
    await h.wait(2000);

    await h.step('transform');
    const roundtripSelVal = await p.locator('#pr-selectedCloneId').inputValue();
    T.check('roundtrip_selected_clone_persists', roundtripSelVal === failedVal, 'selected clone persisted across export/import');
    const roundtripCount = await p.locator('.clone-row').count();
    T.check('roundtrip_clones_count_persists', roundtripCount === 3, `clones count persisted: ${roundtripCount}`);
    try { fs.unlinkSync(savePath); } catch (e) {}
  });

  await close();
  T.done();
})();
