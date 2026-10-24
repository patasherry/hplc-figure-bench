const {open, H, suite, src, fs, path} = require('../lib/harness');

const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

(async () => {
  const T = suite('28_sec_figure'), {p, errs, close} = await open(), h = H(p);
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

  let mwFromKav, V0 = 8.0, Vt = 24.0, expectedPeaks = [];

  await T.t('setup_sec_run_and_calibration', async () => {
    await h.newProject('SEC Figure Test');
    await h.addRun(src('secZip')); // 'secZip' -> 'chrom/sec_Sup6_basic_unicorn7.zip', it's an SEC run

    // Select the SEC run in timeline
    const runStep = (await h.timeline()).find(x => /^run:/.test(x.k));
    if (runStep) await h.step(runStep.k);
    await h.wait(400);

    // Turn off automatic integration
    await p.click('#intAuto').catch(() => {});
    await h.wait(600);

    // Open more options
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

    // Set V0 and Vt by hand
    await setField('#sec-v0', V0);
    await setField('#sec-vt', Vt);

    // Enter 4 standards by hand
    const stds = [
      { name: 'S1', kda: 670, ve: 10.0 },
      { name: 'S2', kda: 158, ve: 15.0 },
      { name: 'S3', kda: 44, ve: 20.0 },
      { name: 'S4', kda: 17, ve: 22.0 }
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

    // Turn automatic integration back on
    await p.click('#intAuto').catch(() => {});
    await h.wait(600);

    // Read peaks from peak table
    const pt = await h.peakTable();
    if (pt.length >= 2) {
      const head = pt[0];
      const veCol = head.findIndex(c => /^Ve|Center|Elution/i.test(c));
      const mwCol = head.findIndex(c => /^Apparent mass|Apparent MW/i.test(c));
      const sampleRows = pt.slice(1);
      for (let i = 0; i < sampleRows.length; i++) {
        const row = sampleRows[i], veVal = num(row[veCol]), mwVal = num(row[mwCol]);
        if (veVal != null && mwVal != null) {
          expectedPeaks.push({ve: veVal, mw: mwVal});
        }
      }
    }
  });

  await T.t('export_and_check_figure', async () => {
    const download = async (selector, timeout = 10000) => {
      const loc = p.locator(selector);
      if (await loc.count() === 0) return null;
      await loc.scrollIntoViewIfNeeded();
      const [dl] = await Promise.all([
        p.waitForEvent('download', { timeout }).catch(() => null),
        loc.click()
      ]);
      if (!dl) return null;
      const name = dl.suggestedFilename();
      const tmpPath = path.join(path.resolve(__dirname, '../results'), name);
      await dl.saveAs(tmpPath);
      const buf = fs.readFileSync(tmpPath);
      return { name, buf, str: buf.toString('utf8') };
    };

    const svg = await download('#saveSvg');
    T.check('svg_downloaded', !!svg, 'SVG downloaded');
    if (svg) {
       const s = svg.str;

       // "x tick labels are elution volumes in mL counted from the injection."
       const hasVolume = /Volume/i.test(s) || /mL/i.test(s) || /Elution/i.test(s);
       T.check('x_axis_is_volume', hasVolume && !s.includes('Retention time'), 'x axis label is volume (mL), not Retention time');

       // "If the figure shows a molecular weight axis or labels, each labelled peak MW matches the calibration fit shown in the SEC panel (within 2%). Peaks outside the standards range are marked as extrapolated, or not given an MW (record which in the PR)."
       const texts = [...s.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
       const hasMwAxis = texts.some(t => /kDa/.test(t) || /~/.test(t));

       if (hasMwAxis) {
           T.check('has_mw_axis', true, 'contains Molecular weight labels');

           const extrapolated = texts.filter(t => /~/.test(t));
           // Record extrapolated peaks if requested
           if (extrapolated.length > 0) {
              T.check('has_extrapolated', true, `Extrapolated peaks: ${extrapolated.join(', ')}`);
           }

           // We need to check if the label values match the SEC calibration fit within 2%
           const kdaLabels = texts.filter(t => /kDa/.test(t) || /~/.test(t));

           let allMatch = true;
           for (const label of kdaLabels) {
              // Extract the numeric value
              const m = label.match(/[\d.]+/);
              if (!m) continue;
              const mwOnChart = parseFloat(m[0]);

              // Find the closest expected peak from the SEC panel table
              let matched = false;
              for (const ep of expectedPeaks) {
                 const ratio = mwOnChart / ep.mw;
                 if (Math.abs(ratio - 1) <= 0.02) {
                    matched = true;
                    break;
                 }
              }
              if (!matched) {
                 // Check if it's one of the standard marks drawn on the axis
                 if ([670, 158, 44, 17].some(st => Math.abs(st - mwOnChart) < 1)) {
                    matched = true;
                 }
              }

              if (!matched) {
                 allMatch = false;
                 T.check(`mw_label_match_${mwOnChart}`, false, `Label ${mwOnChart} kDa did not match any peak MW from panel within 2%`);
              }
           }

           T.check('peak_mw_labels_match', allMatch, 'Peak MW labels match expected values within 2%');
       } else {
           T.check('has_mw_axis', false, 'contains Molecular weight axis or label');
       }
    }
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
