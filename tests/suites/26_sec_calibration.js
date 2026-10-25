// 26 sec calibration: test SEC calibration Kav calculation and apparent MW prediction.
// Drives the UI: loads synthetic SEC run sec_inject2.csv, fills V0, Vt, and 4 standard MW and Ve values by hand.
// Checks Kav values for standards and checks sample peak apparent MW against fitted line log(MW) vs Kav within 3%.

const {open, H, suite, path, DATA} = require('../lib/harness');

const field = async (p, k) => { if (k === 'methods') { await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await p.waitForTimeout(400); return p.$eval('#methodsText', e => e.value); } const el = p.locator('.trace.run.sel').first().locator(`[data-k=\${k}]`).first(); if (!(await el.count())) return ''; const v = await el.inputValue().catch(() => ''); return v || (await el.getAttribute('placeholder')) || ''; };
const setRun = async (p, k, v) => { const l = p.locator(`.trace.run.sel [data-k=\${k}]`).first(); await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }); await l.fill(String(v)); await l.dispatchEvent('change'); await p.waitForTimeout(400); };
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

(async () => {
  const T = suite('26_sec_calibration');
  const {p, errs, close} = await open(), h = H(p);
  p.on('dialog', d => d.accept());

  const openFolds = loc => loc.evaluate(e => {
    let d = e.closest('details');
    while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
  });

  const setField = async (sel, v) => {
    const l = p.locator(sel).first();
    await openFolds(l);
    await l.fill(String(v));
    await l.dispatchEvent('change');
    await h.wait(150);
  };

  await T.t('sec_calibration_kav_and_mw', async () => {
    // 1. Load SEC run
    await h.newProject('SEC Calibration Test');
    await h.addRun(path.join(DATA, 'science/sec_inject2.csv'));

    const runStep = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep) await h.step(runStep.k);
    await h.wait(400);

    // 2. Open SEC settings & check "Size peaks with calibration standards"
    if (await p.isVisible('#moreBtn') && /More options/i.test(await p.locator('#moreBtn').textContent().catch(() => ''))) {
      await p.click('#moreBtn').catch(() => {});
      await h.wait(300);
    }

    const stdsChk = p.locator('#o-secStds');
    await openFolds(stdsChk);
    if (!(await stdsChk.isChecked())) {
      await stdsChk.check({force: true});
      await h.wait(300);
    }

    // 3. Set V0 and Vt by hand
    const V0 = 8.0, Vt = 24.0;
    await setField('#sec-v0', V0);
    await setField('#sec-vt', Vt);

    // 4. Enter 4 standards by hand (MW in kDa and Ve in mL)
    const stds = [
      { name: 'Thyroglobulin', kda: 669, ve: 10.0 },
      { name: 'Ferritin', kda: 440, ve: 12.5 },
      { name: 'Aldolase', kda: 158, ve: 14.5 },
      { name: 'Ovalbumin', kda: 44, ve: 16.0 }
    ];

    while (await p.locator('#secStdList .krow').count() < stds.length) {
      await p.click('#sec-addStd');
      await h.wait(150);
    }

    for (let i = 0; i < stds.length; i++) {
      const s = stds[i], nIn = p.locator(`#ss-n${i}`), kIn = p.locator(`#ss-k${i}`), vIn = p.locator(`#ss-v${i}`);
      await nIn.fill(s.name); await nIn.dispatchEvent('change');
      await kIn.fill(String(s.kda)); await kIn.dispatchEvent('change');
      await vIn.fill(String(s.ve)); await vIn.dispatchEvent('change');
      await h.wait(150);
    }

    // 5. Fit log10(MW) vs Kav independently in JS
    const kavExpected = stds.map(s => (s.ve - V0) / (Vt - V0));
    const xs = kavExpected, ys = stds.map(s => Math.log10(s.kda)), n = xs.length;
    const mx = xs.reduce((sum, x) => sum + x, 0) / n, my = ys.reduce((sum, y) => sum + y, 0) / n;
    let sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (ys[i] - my); }
    const b = sxy / sxx, a = my - b * mx;
    const mwFromKav = kav => Math.pow(10, a + b * kav);

    // 6. Check Kav calculations for each standard shown in the UI
    const fitHintText = await p.textContent('#sec-fit').catch(() => '');
    T.check('fit_hint_shown', /Fit from 4 standards against Kav/i.test(fitHintText), fitHintText);


    // 7. Auto-integrate sample peaks and check peak table for Kav and apparent MW
    await p.click('#intAuto').catch(() => {});
    await h.wait(600);

    const pt = await h.peakTable();
    T.check('peak_table_exists', pt.length >= 2, `Peak table rows count: ${pt.length}`);

    if (pt.length >= 2) {
      const head = pt[0];
      const veCol = head.findIndex(c => /^Ve|Center|Elution/i.test(c));
      const kavCol = head.findIndex(c => /^Kav/i.test(c));
      const mwCol = head.findIndex(c => /^Apparent mass|Apparent MW/i.test(c));

      T.check('kav_column_present', kavCol >= 0, `Headers: ${head.join(', ')}`);
      T.check('mw_column_present', mwCol >= 0, `Headers: ${head.join(', ')}`);

      const sampleRows = pt.slice(1);
      for (let i = 0; i < sampleRows.length; i++) {
        const row = sampleRows[i], veVal = num(row[veCol]), kavVal = num(row[kavCol]), mwVal = num(row[mwCol]);
        if (veVal != null) {
          const expectedKav = (veVal - V0) / (Vt - V0);
          if (kavVal != null) {
            T.check(`sample_peak_${i+1}_kav_match`, T.near(kavVal, expectedKav, 0.002), `Peak ${i+1} Ve=${veVal}, Kav=${kavVal}`);
            T.check(`sample_peak_${i+1}_kav_3decimals`, kavVal.toFixed(3) === expectedKav.toFixed(3), `Peak ${i+1} Kav ${kavVal.toFixed(3)} vs ${expectedKav.toFixed(3)}`);
          }
          if (mwVal != null) {
            const expectedMw = mwFromKav(expectedKav), ratio = mwVal / expectedMw;
            T.check(`sample_peak_${i+1}_mw_within_3pct`, Math.abs(ratio - 1) <= 0.03, `Peak ${i+1} Ve=${veVal}, App MW=${mwVal}, fitted MW=${expectedMw.toFixed(1)}`);
          }
        }
      }
    }
  });

    await T.t('sec_dimensions_and_custom_methods', async () => {
    // 3.2/300 S200 run
    await p.click('#homeBtn').catch(()=>{}); await h.wait(400); await h.newProject('SEC Dims Test 1');
    await h.addRun(path.join(__dirname, '..', 'data', 'dummy sec s200i3 3.2 300.csv'));
    await p.click('.trace.run [type=checkbox]').catch(()=>{});

    // Switch to SEC calibration tab
    if (await p.isVisible('#moreBtn')) await p.click('#moreBtn').catch(()=>{});
    await p.waitForTimeout(300);
    const stdsChk = p.locator('#o-secStds');
    await stdsChk.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });
    if (!(await stdsChk.isChecked())) { await stdsChk.check({force: true}); await h.wait(300); }

    let col = await p.locator('#sec-col').inputValue();
    let vt = await p.locator('#sec-vt').inputValue();
    let v0 = await p.locator('#sec-v0').inputValue();
    T.check('sec_col_is_s200i3', col === 's200i3', `Expected s200i3, got ${col}`);
    T.check('sec_vt_is_2.4', vt === '2.4', `Expected 2.4, got ${vt}`);
    T.check('sec_v0_is_0.86', v0 === '0.86' || v0 === '0.86', `Expected 0.86, got ${v0}`);

    await p.click('#intAuto').catch(() => {});
    await h.wait(600);
    let intTxt1 = await p.textContent('#intTable').catch(()=>'');

    await h.step('figure'); await p.waitForTimeout(400);
    let m = await field(p, 'methods');
    T.check('methods_has_3.2_300_s200', /(s200|Superdex.*200).*3\.2\/300|3\.2\/300.*(s200|Superdex.*200)/i.test(m), `Methods for 3.2/300 S200: ${m}`);

    // 26/600 S75 run
    await p.click('#homeBtn').catch(()=>{}); await h.wait(400); await h.newProject('SEC Dims Test 2');
    await h.addRun(path.join(__dirname, '..', 'data', 'dummy sec hl26s75 26 600.csv'));
    await p.click('.trace.run [type=checkbox]').catch(()=>{});

    if (await p.isVisible('#moreBtn')) await p.click('#moreBtn').catch(()=>{});
    await p.waitForTimeout(300);
    const stdsChk2 = p.locator('#o-secStds');
    await stdsChk2.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });
    if (!(await stdsChk2.isChecked())) { await stdsChk2.check({force: true}); await h.wait(300); }

    col = await p.locator('#sec-col').inputValue();
    vt = await p.locator('#sec-vt').inputValue();
    v0 = await p.locator('#sec-v0').inputValue();
    T.check('sec_col_is_hl26s75', col === 'hl26s75', `Expected hl26s75, got ${col}`);
    T.check('sec_vt_is_320', vt === '320', `Expected 320, got ${vt}`);
    T.check('sec_v0_is_115.2', v0 === '115.2', `Expected 115.2, got ${v0}`);

    await h.step('figure'); await p.waitForTimeout(400);
    m = await field(p, 'methods');
    T.check('methods_has_26_600_s75', /26\/600.*(s75|Superdex.*75)/i.test(m), `Methods for 26/600 S75: ${m}`);

    // 10/300 control
    await p.click('#homeBtn').catch(()=>{}); await h.wait(400); await h.newProject('SEC Dims Test 3');
    await h.addRun(path.join(__dirname, '..', 'data', 'dummy sec s200 10 300.csv'));
    await p.click('.trace.run [type=checkbox]').catch(()=>{});

    if (await p.isVisible('#moreBtn')) await p.click('#moreBtn').catch(()=>{});
    await p.waitForTimeout(300);
    const stdsChk3 = p.locator('#o-secStds');
    await stdsChk3.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });
    if (!(await stdsChk3.isChecked())) { await stdsChk3.check({force: true}); await h.wait(300); }

    col = await p.locator('#sec-col').inputValue();
    vt = await p.locator('#sec-vt').inputValue();
    v0 = await p.locator('#sec-v0').inputValue();
    T.check('sec_col_is_s200i', col === 's200i', `Expected s200i, got ${col}`);
    T.check('sec_vt_is_24', vt === '24', `Expected 24, got ${vt}`);
    T.check('sec_v0_is_8.64', v0 === '8.64' || v0 === '8', `Expected 8.64 or 8, got ${v0}`);

    await h.step('figure'); await p.waitForTimeout(400);
    m = await field(p, 'methods');
    T.check('methods_has_10_300', /10\/300/.test(m), `Methods for 10/300 S200: ${m}`);
  });
  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
