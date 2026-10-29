const {open, H, suite, path, fs, DATA} = require('../lib/harness');
const EXP = JSON.parse(fs.readFileSync(path.join(DATA, 'expected_peaks.json'), 'utf8')), CH = path.join(DATA, 'chrom');
const T = suite('14_peaks');

// The integration helper functions similar to what's in 10_data_truth.js
const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
const setOpt = (p, id, v) => p.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) return false; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [id, String(v)]);

async function peaks(p, h) {
  const t = await h.peakTable(); if (!t.length) return {head: [], rows: []};
  const head = t[0];
  const iv = head.findIndex(c => /^(Ve|Center|Apex|Elution time)\b/.test(c)), ia = head.findIndex(c => /^Area/.test(c));
  const rows = t.slice(1).filter(r => r.length > 3).map(r => ({name: r[0], a: num(r[1]), b: num(r[2]), ve: iv >= 0 ? num(r[iv]) : NaN, area: ia >= 0 ? num(r[ia]) : NaN}));
  return {head, rows};
}

async function detect(p) {
  await p.evaluate(() => { const b = document.getElementById('intAuto'); if (b) b.click(); });
  await p.waitForTimeout(900);
}

async function peakFile(e) {
  const id = e.file.replace(/\.[^.]+$/, '');
  const {p, errs, close} = await open(), h = H(p);
  try {
    await h.newProject('peaks ' + id);
    await h.addRun(path.join(CH, e.file));
    await p.waitForTimeout(300);

    // Check all combinations of method and baseline to ensure no page errors are thrown
    const methods = ['gauss', 'trap'];
    const baselines = ['line', 'zero'];

    for (const m of methods) {
      for (const b of baselines) {
        await setOpt(p, 'o-intMethod', m);
        await setOpt(p, 'o-intBase', b);

        await p.evaluate(pool => {
            const el = document.querySelector('.trace.run.sel [data-k=shade]');
            if (el) {
                el.value = pool || '';
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }, e.pool);
        await detect(p);
        await p.waitForTimeout(300);
      }
    }

    // Now perform the specific checks using default settings (gauss + line) which are usually used
    await setOpt(p, 'o-intMethod', 'gauss');
    await setOpt(p, 'o-intBase', 'line');
    await p.evaluate(pool => {
            const el = document.querySelector('.trace.run.sel [data-k=shade]');
            if (el) {
                el.value = pool || '';
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }, e.pool);
    await detect(p);

    const P = await peaks(p, h);
    const pk = P.rows.filter(r => !/^pool/i.test(r.name)); // Filter out the pool row itself

    if (e.type === 'isolated') {
      const p1 = pk[0];
      if (T.check(`${id}/found-peak`, p1 != null, `Found peak`)) {
        T.check(`${id}/apex`, Math.abs(p1.ve - e.true_ve) <= 0.05, `Apex position ${p1.ve} within 1 sample (0.05) of ${e.true_ve}`);
        T.check(`${id}/area`, Math.abs(p1.area - e.true_area) / e.true_area <= 0.02, `Area ${p1.area} within 2% of true area ${e.true_area}`);
      }
    }
    else if (e.type === 'separated') {
      for (const expectedPeak of e.peaks) {
        const found = pk.find(p => Math.abs(p.ve - expectedPeak.ve) <= 0.05);
        T.check(`${id}/apex-${expectedPeak.ve}`, found != null, `Found peak near ${expectedPeak.ve}`);
        if (found) {
          // Increase tolerance for peak area checking because Gaussian fitting or numerical integration
          // might have some slight noise or variations.
          T.check(`${id}/area-${expectedPeak.ve}`, Math.abs(found.area - expectedPeak.area) / expectedPeak.area <= 0.03, `Area ${found.area} within 3% of ${expectedPeak.area}`);
        }
      }
    }
    else if (e.type === 'overlapping') {
      let sumArea = 0;
      for (const p of pk) {
        sumArea += p.area;
      }
      T.check(`${id}/area-sum`, Math.abs(sumArea - e.total_area) / e.total_area <= 0.02, `Overlapping area sum ${sumArea} within 2% of total ${e.total_area}`);
    }
    else if (e.type === 'ratio') {
      const P_res = await peaks(p, h);
      const pk_res = P_res.rows.filter(r => !/^pool/i.test(r.name));
            const moreBtn = await p.$('#intMore'); if (moreBtn) await p.evaluate(() => document.getElementById('intMore').click()); await p.waitForTimeout(300);
            const t = await h.peakTable();
      const head = t[0];
      const ratCol = head.findIndex(c => c.includes('A260/A280') || c.includes('A₂₆₀/A₂₈₀'));
      let ratioStr = '';
      if (pk_res.length > 0 && ratCol >= 0) {
         // Re-fetch the table because the raw array from peaks() doesn't include the ratio column if we didn't parse it.
         // Let's modify `peaks` or just parse the table here.
         const row = t[1];
         ratioStr = row[ratCol];
      }

      T.check(`${id}/ratio-col-exists`, ratCol >= 0, `A260/A280 column exists`);
      T.check(`${id}/ratio-val`, Math.abs(parseFloat(ratioStr) - e.expected_ratio) <= 0.05, `Ratio ${ratioStr} is near ${e.expected_ratio}`);
    }
    else if (e.type === 'sloped') {
      // 1. check area with baseline subtraction (line)
      await setOpt(p, 'o-intBase', 'line');
      await detect(p);
      const pkLine = (await peaks(p, h)).rows.filter(r => !/^pool/i.test(r.name));
      const areaLine = pkLine[0] ? pkLine[0].area : 0;

      // 2. check area with no baseline subtraction (zero)
      await setOpt(p, 'o-intBase', 'zero');
      await detect(p);
      const pkZero = (await peaks(p, h)).rows.filter(r => !/^pool/i.test(r.name));
      const areaZero = pkZero[0] ? pkZero[0].area : 0;

      T.check(`${id}/baseline-subtraction`, areaLine < areaZero, `Sloped baseline area with subtraction (${areaLine}) < area without subtraction (${areaZero})`);
    }

  } finally {
    T.check(`${id}/no-page-errors`, !errs.length, errs.join(' | '));
    await close();
  }
}

(async () => {
async function test215() {
  const id = 'sec_semicolon_unicorn7';
  const {p, errs, close} = await open(), h = H(p);
  try {
    await h.newProject('peaks 215');
    await h.addRun(path.join(CH, 'sec_semicolon_unicorn7.csv'));

    // Explicitly select the run step in timeline so the `#intAuto` button is visible.
    const tl = await h.timeline();
    const runStep = tl.find(x => x.k && x.k.startsWith('run:'));
    if (runStep) {
        await h.step(runStep.k);
    }
    await p.waitForTimeout(300);

    // Zoom/crop to a small window where peak detection currently fails on main
    // because it uses the small n of the zoomed region.
    await setOpt(p, 'o-xmin', 11.5);
    await setOpt(p, 'o-xmax', 15.5);
    await p.waitForTimeout(100);

    // Run detectPeaks via UI button
    await detect(p);

    const P = await peaks(p, h);
    const pk = P.rows.filter(r => !/^pool/i.test(r.name));
    const p1 = pk.find(x => Math.abs(x.ve - 12) <= 0.5);
    const p2 = pk.find(x => Math.abs(x.ve - 14) <= 0.5);
    T.check(`test215/peak1.area`, p1 && Math.abs(p1.area - 196) <= 5, `Expected peak1 area near 196, got ${p1 ? p1.area : 'not found'}`);
    T.check(`test215/peak2.area`, p2 && Math.abs(p2.area - 30) <= 5, `Expected peak2 area near 30, got ${p2 ? p2.area : 'not found'}`);

  } finally {
    T.check(`test215/no-page-errors`, !errs.length, errs.join(' | '));
    await close();
  }
}

  await T.t('test215', test215);
  for (const e of EXP) {
    await T.t(e.file, () => peakFile(e));
  }
  T.done();
})();
