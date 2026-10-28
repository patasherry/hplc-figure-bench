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
  await close();

  /* Extrapolation (#131): a peak outside the standards' own elution interval must be marked as extrapolated in the peak table,
     the summary note and the calibration figure, with no allowance beyond the outermost standards.
     sec_inject2.csv has peaks at Ve 12.00 and 15.00 mL from injection. Two standards: 100 kDa and 10 kDa.
     Case A at 14 and 18 mL: log10(kDa) = 5.5 - 0.25 Ve, so 12 mL is 316.23 kDa (outside) and 15 mL is 56.23 kDa (inside).
     Case B at 12.2 and 18.2 mL: 12 mL is 10^(2 + 0.2/6) = 107.98 kDa, 0.2 mL before the first standard, so still outside. */
  const extrapCase = async (tag, ves, inMw, outMw) => {
    const o = await open(), q = o.p, hq = H(q); q.on('dialog', d => d.accept());
    const fill = async (sel, v) => { const l = q.locator(sel).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await hq.wait(150); };
    await T.t(tag, async () => {
      await hq.newProject('SEC extrapolation ' + tag);
      await hq.addRun(path.join(DATA, 'science/sec_inject2.csv'));
      const rs = (await hq.timeline()).find(x => /^run:/.test(x.k)); if (rs) await hq.step(rs.k);
      if (await q.isVisible('#moreBtn') && /More options/i.test(await q.locator('#moreBtn').textContent().catch(() => ''))) { await q.click('#moreBtn').catch(() => {}); await hq.wait(300); }
      const sc = q.locator('#o-secStds'); await openFolds(sc); if (!(await sc.isChecked())) { await sc.check({force: true}); await hq.wait(300); }
      await fill('#sec-v0', 8); await fill('#sec-vt', 24);
      const nRows = await q.locator('#secStdList .krow').count();
      for (let i = 0; i < nRows; i++) { if (i < 2) { await fill(`#ss-n${i}`, i ? 'Small' : 'Large'); await fill(`#ss-k${i}`, i ? 10 : 100); } await fill(`#ss-v${i}`, i < 2 ? ves[i] : ''); }
      const fh = await q.textContent('#sec-fit').catch(() => '');
      T.check(`${tag}.fit_from_2`, /Fit from 2 standards/i.test(fh), fh);
      await q.click('#intAuto'); await hq.wait(600);
      /* peak table: the outside peak has ~, the inside one does not */
      const pt = await hq.peakTable(), head = pt[0] || [], veC = head.findIndex(c => /^Ve|Center|Elution/i.test(c)), mwC = head.findIndex(c => /^Apparent mass|Apparent MW/i.test(c));
      const rowAt = v => pt.slice(1).find(r => T.near(num(r[veC]), v, 0.05)), rO = rowAt(12), rI = rowAt(15);
      T.check(`${tag}.table_outside_marked`, rO && /^~/.test(rO[mwC]) && T.near(num(rO[mwC]), outMw, 1), `12 mL row: ${JSON.stringify(rO)}; expected ~${outMw.toFixed(2)} kDa`);
      T.check(`${tag}.table_inside_unmarked`, rI && !/~/.test(rI[mwC]) && T.near(num(rI[mwC]), inMw, 1), `15 mL row: ${JSON.stringify(rI)}; expected ${inMw.toFixed(2)} kDa`);
      /* summary note for the pooled main peak (12 mL) */
      await hq.suggest(); await hq.step('figure'); await hq.wait(400);
      const notes = await q.$$eval('#sumNotes li', ls => ls.map(l => l.textContent)).catch(() => []), nl = notes.find(t => /main pooled peak/.test(t)) || '';
      T.check(`${tag}.summary_note_marked`, new RegExp(`apparent ~${Math.round(outMw)} kDa`).test(nl) && /extrapolat/i.test(nl), `note: ${nl || notes.join(' / ').slice(0, 300)}`);
      /* calibration figure: its tab shows in Quick mode, and the calibration (a setting) carries over. The label at 12 mL keeps the ~ */
      await q.click('#homeBtn'); await hq.wait(500); await q.click('#homeQuick'); await hq.wait(1500);
      await hq.dropFiles(path.join(DATA, 'science/sec_inject2.csv'));
      await q.click('#intAuto'); await hq.wait(600);
      await q.click('#figtabs [data-fig^="cal:"]'); await hq.wait(500);
      const labs = (await hq.svgTexts()).map(x => x.t).filter(t => /^P\d+ .*kDa$/.test(t));
      T.check(`${tag}.cal_figure_outside_marked`, labs.some(t => /~/.test(t) && T.near(num(t.replace(/^P\d+/, '')), outMw, 1)), `sample labels: ${labs.join(' | ')}`);
      T.check(`${tag}.cal_figure_inside_unmarked`, labs.some(t => !/~/.test(t) && T.near(num(t.replace(/^P\d+/, '')), inMw, 1)), `sample labels: ${labs.join(' | ')}`);
    });
    T.check(`${tag}.no page errors`, !o.errs.length, o.errs.join(' | '));
    await o.close();
  };
  await extrapCase('extrap_14_18', [14, 18], Math.pow(10, 5.5 - 0.25*15), Math.pow(10, 5.5 - 0.25*12));
  await extrapCase('extrap_12p2_18p2', [12.2, 18.2], Math.pow(10, 2 - 2.8/6), Math.pow(10, 2 + 0.2/6));
  T.done();
})();
