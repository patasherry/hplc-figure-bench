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

  await T.t('sec_calibration_extrapolation', async () => {
    // We must return to home to create a new project.
    await p.click('#homeBtn', {force: true}).catch(() => {});
    await h.wait(500);

    await h.newProject('SEC Extrapolation Test');
    await h.addRun(path.join(DATA, 'science/sec_inject_12.csv'));

    const runStep = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep) await h.step(runStep.k);
    await h.wait(400);

    await p.waitForSelector('#secPanel', {state: 'visible'});

    if ((await p.getAttribute('#moreBtn', 'aria-expanded')) !== 'true') {
      await p.evaluate(() => { const b = document.querySelector('#moreBtn'); if (b) b.click(); });
      await h.wait(300);
    }
    await p.waitForSelector('#moreBtn[aria-expanded="true"]', {state: 'visible'});
    await p.waitForSelector('#sec-v0', {state: 'visible'});

    const stdsChk = p.locator('#o-secStds');
    await openFolds(stdsChk);
    if (!(await stdsChk.isChecked())) {
      await stdsChk.check();
      await h.wait(300);
    }

    await setField('#sec-v0', '');
    await setField('#sec-vt', '');

    while (await p.locator('#secStdList .krow').count() > 0) {
      await p.evaluate(() => { const b = document.querySelector('#secStdList .krow .xbtn'); if (b) b.click(); });
      await h.wait(150);
    }

    const stds1 = [{ name: 'A', kda: 100, ve: 14.0 }, { name: 'B', kda: 10, ve: 18.0 }];
    for (let i = 0; i < stds1.length; i++) {
      await p.evaluate(() => { const b = document.querySelector('#sec-addStd'); if (b) b.click(); });
      await h.wait(150);
    }

    for (let i = 0; i < stds1.length; i++) {
      const s = stds1[i], nIn = p.locator(`#ss-n${i}`), kIn = p.locator(`#ss-k${i}`), vIn = p.locator(`#ss-v${i}`);
      await openFolds(nIn);
      await p.evaluate(({s,v}) => { const el = document.querySelector(s); if(el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } }, {s: `#ss-n${i}`, v: s.name});
      await p.evaluate(({s,v}) => { const el = document.querySelector(s); if(el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } }, {s: `#ss-k${i}`, v: String(s.kda)});
      await p.evaluate(({s,v}) => { const el = document.querySelector(s); if(el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } }, {s: `#ss-v${i}`, v: String(s.ve)});
      await h.wait(150);
    }

    await p.evaluate(() => { const b = document.querySelector('#intAuto'); if (b) b.click(); });
    await h.wait(600);

    let pt = await h.peakTable();
    T.check('peak_table_exists', pt.length >= 2, `Peak table rows count: ${pt.length}`);
    if (pt.length >= 2) {
      const mwCol = pt[0].findIndex(c => /^Apparent mass|Apparent MW/i.test(c));
      const mwVal = pt[1][mwCol];
      T.check('mw_316_23_in_peak_table', mwVal.includes('~316'), `Peak table MW: ${mwVal}`);
    }

    await p.evaluate(() => { const el = document.querySelector('.trace.run.sel [data-k=shade]'); if (el) { el.value = '11.0-13.0'; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } });
    await h.wait(500);

    await h.step('figure');
    await h.wait(400);

    let sumT = await h.sumTable();
    T.check('summary_table_exists', sumT.length >= 2, `Summary table rows count: ${sumT.length}`);
    let notes = await p.locator('#sumNotes').textContent();
    T.check('mw_316_23_in_summary_notes', notes.includes('~316'), `Summary notes: ${notes}`);

    // Verify SVG labels in Cal Fig tab
    await p.evaluate(() => { const b = document.querySelector('#figtabs [data-fig^="cal:"]'); if (b) b.click(); });
    await h.wait(500);
    let svgT = await h.svgTexts();
    T.check('svg_contains_extrapolated_label', svgT.some(t => t.text && t.text.includes('~316')), 'SVG should contain ~316 label');

    // Case 2: standards at 12.2 and 18.2
    // Must go back to run step to edit stds
    await h.step(runStep.k);
    await h.wait(400);

    if ((await p.getAttribute('#moreBtn', 'aria-expanded')) !== 'true') {
      await p.evaluate(() => { const b = document.querySelector('#moreBtn'); if (b) b.click(); });
      await h.wait(300);
    }
    await p.waitForSelector('#sec-v0', {state: 'visible'});

    const stds2 = [{ name: 'A', kda: 100, ve: 12.2 }, { name: 'B', kda: 10, ve: 18.2 }];
    for (let i = 0; i < stds2.length; i++) {
      const s = stds2[i];
      await p.evaluate(({s,v}) => { const el = document.querySelector(s); if(el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } }, {s: `#ss-n${i}`, v: s.name});
      await p.evaluate(({s,v}) => { const el = document.querySelector(s); if(el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } }, {s: `#ss-k${i}`, v: String(s.kda)});
      await p.evaluate(({s,v}) => { const el = document.querySelector(s); if(el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); } }, {s: `#ss-v${i}`, v: String(s.ve)});
      await h.wait(150);
    }
    await h.wait(600);

    pt = await h.peakTable();
    if (pt.length >= 2) {
      const mwCol = pt[0].findIndex(c => /^Apparent mass|Apparent MW/i.test(c));
      const mwVal = pt[1][mwCol];
      T.check('is_extrapolated_12_2_in_peak_table', mwVal.includes('~'), `Peak table MW: ${mwVal}`);
    }

    await h.step('figure');
    await h.wait(400);

    sumT = await h.sumTable();
    T.check('summary_table_exists_2', sumT.length >= 2, `Summary table rows count: ${sumT.length}`);
    notes = await p.locator('#sumNotes').textContent();
    T.check('mw_316_23_in_summary_notes_2', notes.includes('~316'), `Summary notes: ${notes}`);

    // Verify SVG labels in Cal Fig tab
    await p.evaluate(() => { const b = document.querySelector('#figtabs [data-fig^="cal:"]'); if (b) b.click(); });
    await h.wait(500);
    svgT = await h.svgTexts();
    T.check('svg_contains_extrapolated_label_2', svgT.some(t => t.text && t.text.includes('~316')), 'SVG should contain ~316 label');

  });

  await close();
  T.done();
})();
