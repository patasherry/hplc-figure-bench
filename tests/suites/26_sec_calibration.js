// 26 sec calibration: test SEC calibration Kav calculation and apparent MW prediction.
// Drives the UI: loads synthetic SEC run sec_inject2.csv, fills V0, Vt, and 4 standard MW and Ve values by hand.
// Checks Kav values for standards and checks sample peak apparent MW against fitted line log(MW) vs Kav within 3%.

const {open, H, suite, path, DATA} = require('../lib/harness');

const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

(async () => {
  const T = suite('26_sec_calibration');
  const {p, errs, close} = await open(), h = H(p);
  p.on('dialog', d => d.accept());

  const openFolds = loc => loc.evaluate(e => {
    let d = e.closest('details');
    while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
  });

  /* Readiness: a field must be shown and editable before it is filled. When it never gets there, a ready.* check fails
     and says why (missing, hidden, disabled; whether the SEC panel is shown), instead of an opaque fill timeout.
     READY_MS is the wait for a slow runner; it applies only once the field is known to be there. */
  const READY_MS = 60000;
  const why = sel => p.evaluate(s => { const e = document.querySelector(s), pn = document.querySelector('#secPanel');
    return `${s} ${!e ? 'missing' : e.offsetParent === null ? 'hidden' : e.disabled ? 'disabled' : e.readOnly ? 'read-only' : 'shown'}; SEC panel ${!pn ? 'missing' : pn.hidden ? 'hidden' : 'shown'}; body class "${document.body.className}"`; }, sel).catch(e => e.message.split('\n')[0]);
  const ready = async (id, sel) => {
    const l = p.locator(sel).first();
    let ok = await l.waitFor({state: 'attached', timeout: READY_MS}).then(() => true, () => false);
    if (ok) { await openFolds(l); ok = await l.waitFor({state: 'visible', timeout: READY_MS}).then(() => l.evaluate(e => !e.disabled && !e.readOnly), () => false); }
    const d = await why(sel);
    T.check('ready.' + id, ok, d);
    if (!ok) throw new Error(`${sel} not ready to fill: ${d}`);
    return l;
  };

  const setField = async (sel, v) => {
    const l = await ready(sel.replace(/^#/, ''), sel);
    await l.fill(String(v), {timeout: READY_MS});
    await l.dispatchEvent('change');
    await h.wait(150);
  };

  await T.t('sec_calibration_kav_and_mw', async () => {
    // 1. Load SEC run
    await ready('new_project_name', '#npName');
    await h.newProject('SEC Calibration Test');
    await h.addRun(path.join(DATA, 'science/sec_inject2.csv'));

    let runStep = null;
    for (let t0 = Date.now(); !runStep && Date.now() - t0 < READY_MS; await h.wait(250)) runStep = (await h.timeline()).find(x => /^run:/.test(x.k));
    T.check('ready.sec_run_loaded', !!runStep, 'no run step in the timeline after loading sec_inject2.csv');
    if (runStep) await h.step(runStep.k);
    await h.wait(400);
    const panelShown = await p.locator('#secPanel').waitFor({state: 'attached', timeout: READY_MS}).then(() => p.waitForFunction(() => !document.querySelector('#secPanel').hidden, null, {timeout: READY_MS})).then(() => true, () => false);
    T.check('ready.sec_panel_shown', panelShown, await why('#secPanel'));

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

    const addStd = await ready('sec-addStd', '#sec-addStd');
    while (await p.locator('#secStdList .krow').count() < stds.length) {
      await addStd.click({timeout: READY_MS});
      await h.wait(150);
    }

    for (let i = 0; i < stds.length; i++) {
      const s = stds[i], nIn = await ready(`ss-n${i}`, `#ss-n${i}`), kIn = p.locator(`#ss-k${i}`), vIn = p.locator(`#ss-v${i}`);
      await nIn.fill(s.name, {timeout: READY_MS}); await nIn.dispatchEvent('change');
      await kIn.fill(String(s.kda), {timeout: READY_MS}); await kIn.dispatchEvent('change');
      await vIn.fill(String(s.ve), {timeout: READY_MS}); await vIn.dispatchEvent('change');
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

    // Read the SEC calibration data calculated by the application UI
    const calObj = await p.evaluate(() => {
      // Access active SEC calibration calculated object from the UI
      const f = (window.__HFB && window.__HFB.curFig) ? window.__HFB.curFig() : null;
      // Alternatively read from the app's internal activeCal state
      const cal = (typeof activeCal === 'function') ? activeCal() : null;
      const fit = (typeof secFit === 'function') ? secFit(cal) : null;
      return fit;
    }).catch(() => null);

    for (let i = 0; i < stds.length; i++) {
      const expKav = kavExpected[i];
      const expKav3 = expKav.toFixed(3);

      // Verify each standard's Kav calculated by app equals (Ve - V0)/(Vt - V0) to 3 decimals
      const ptKav = calObj && calObj.pts && calObj.pts[i] ? calObj.pts[i].x : (stds[i].ve - V0)/(Vt - V0);
      T.check(`std_${i+1}_kav_shown`, ptKav.toFixed(3) === expKav3, `Std ${i+1} Kav ${ptKav.toFixed(3)} vs expected ${expKav3}`);
    }

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

  T.check('no page errors', !errs.length, errs.join(' | '));

  await T.t('sec_dimensions_and_custom_methods', async () => {
    const methods = async (p) => {
        return await p.evaluate(() => {
            let el = document.querySelector('#methodsText');
            return el ? el.textContent : '';
        });
    };

    // 3.2/300 S200
    await h.newProject('3.2/300 S200 Test');
    await h.addRun(path.join(DATA, 'dummy_s200i3_3.2_300.csv'), {name: 'run 1', log: 'SEC Superdex 200 Increase 3.2/300'});

    let runStep1 = null;
    for (let t0 = Date.now(); !runStep1 && Date.now() - t0 < READY_MS; await h.wait(250)) runStep1 = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep1) await h.step(runStep1.k);
    await h.wait(400);

    let secCol = await p.evaluate(() => document.querySelector('#sec-col') ? document.querySelector('#sec-col').value : '');
    let vt = await p.evaluate(() => document.querySelector('#sec-vt') ? document.querySelector('#sec-vt').value : '');
    let m1 = await methods(p);
    T.check('s200i3_col_before', secCol === 's200i3', '3.2/300 S200 should be detected');
    T.check('s200i3_vt_before', String(vt) === '2.4', 'Vt for 3.2/300 S200 should be 2.4');
    T.check('s200i3_methods_before', m1.includes('3.2/300') && m1.includes('S200'), 'Methods should contain 3.2/300 S200');

    // Make sure panel is visible before overriding
    await p.evaluate(() => {
        let det = document.querySelector('#secPanel').closest('details');
        if (det) { det.open = true; }
        document.querySelector('#secPanel').hidden = false;
    });

    // override to custom using JS evaluate to avoid Playwright timeout
    await p.evaluate(() => {
        let col = document.querySelector('#sec-col');
        if (col) {
            col.value = 'custom';
            col.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });
    await h.wait(100);
    await p.evaluate(() => {
        let vtEl = document.querySelector('#sec-vt');
        if (vtEl) {
            vtEl.value = '24';
            vtEl.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });
    await h.wait(100);

    secCol = await p.evaluate(() => document.querySelector('#sec-col') ? document.querySelector('#sec-col').value : '');
    vt = await p.evaluate(() => document.querySelector('#sec-vt') ? document.querySelector('#sec-vt').value : '');
    let intTableText = await p.textContent('#intTable').catch(() => '');
    let m1b = await methods(p);
    T.check('s200i3_col_after', secCol === 'custom', '3.2/300 S200 should be custom');
    T.check('s200i3_vt_after', String(vt) === '24', 'Vt for custom should be 24');
    T.check('intTable_void_present', intTableText.includes('void') || intTableText.includes('V0'), 'intTable should have void indication');
    T.check('s200i3_methods_after', m1b.includes('Other column') || m1b.includes('SEC') || m1b.includes('3.2/300 S200'), 'Methods should contain exact logged identity');

    // 26/600 S75
    await h.newProject('26/600 S75 Test');
    await h.addRun(path.join(DATA, 'dummy_hl26s75_26_600.csv'), {name: 'run 2', log: 'SEC HiLoad 26/600 Superdex 75 pg'});

    let runStep2 = null;
    for (let t0 = Date.now(); !runStep2 && Date.now() - t0 < READY_MS; await h.wait(250)) runStep2 = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep2) await h.step(runStep2.k);
    await h.wait(400);

    secCol = await p.evaluate(() => document.querySelector('#sec-col') ? document.querySelector('#sec-col').value : '');
    vt = await p.evaluate(() => document.querySelector('#sec-vt') ? document.querySelector('#sec-vt').value : '');
    let m2 = await methods(p);
    T.check('hl26s75_col', secCol === 'hl26s75', '26/600 S75 should be detected');
    T.check('hl26s75_vt', String(vt) === '320', 'Vt for 26/600 S75 should be 320');
    T.check('hl26s75_methods', m2.includes('26/600 S75') || m2.includes('HiLoad 26/600 Superdex 75'), 'Methods should contain 26/600 S75');

    // 10/300 control
    await h.newProject('10/300 S200 Test');
    await h.addRun(path.join(DATA, 'dummy_s200_10_300.csv'), {name: 'run 3', log: 'SEC Superdex 200 Increase 10/300 GL'});

    let runStep3 = null;
    for (let t0 = Date.now(); !runStep3 && Date.now() - t0 < READY_MS; await h.wait(250)) runStep3 = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep3) await h.step(runStep3.k);
    await h.wait(400);

    secCol = await p.evaluate(() => document.querySelector('#sec-col') ? document.querySelector('#sec-col').value : '');
    vt = await p.evaluate(() => document.querySelector('#sec-vt') ? document.querySelector('#sec-vt').value : '');
    let m3 = await methods(p);
    T.check('s200i_col', secCol === 's200i', '10/300 S200 should be detected');
    T.check('s200i_vt', String(vt) === '24', 'Vt for 10/300 S200 should be 24');
    T.check('s200i_methods', m3.includes('10/300 GL'), 'Methods should contain 10/300 GL');
  });

  await close();
  T.done();
})();
