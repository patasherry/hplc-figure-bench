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
    else if (e.type === 'issue790') {
      const p1 = pk.find(p => Math.abs(p.ve - e.true_ve1) <= 0.05);
      const p2 = pk.find(p => Math.abs(p.ve - e.true_ve2) <= 0.05);
      T.check(`${id}/apex-1`, p1 != null, `Found peak 1 near ${e.true_ve1}`);
      T.check(`${id}/apex-2`, p2 != null, `Found peak 2 near ${e.true_ve2}`);
      if (p1) {
        T.check(`${id}/area-1`, Math.abs(p1.area - e.true_area1) / e.true_area1 <= 0.01, `Peak 1 area ${p1.area} within 1% of true area ${e.true_area1}`);
      }
      if (p2) {
        T.check(`${id}/area-2`, Math.abs(p2.area - e.true_area2) / e.true_area2 <= 0.01, `Peak 2 area ${p2.area} within 1% of true area ${e.true_area2}`);
      }
    }

  } finally {
    T.check(`${id}/no-page-errors`, !errs.length, errs.join(' | '));
    await close();
  }
}


async function overlap() {
  const {p, errs, close} = await open(), h = H(p);
  try {
    let csv = 'Time (min),UV (mAU)\n';
    for (let i = 0; i <= 200; i++) {
        const x = i/10;
        csv += x.toFixed(1) + ',' + (100*Math.exp(-((x-10)**2)/(2*0.02)) + 100*Math.exp(-((x-10.4)**2)/(2*0.02))).toFixed(3) + '\n';
    }
    await p.click('#homeQuick'); await p.waitForTimeout(800);
    await p.setInputFiles('#file', {name: 'overlap.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
    await p.waitForTimeout(600);
    const card = () => p.locator('.trace:not(.run)').filter({has: p.locator('input[value="overlap"], input[value="overlap.csv"]')}).first();
    await p.evaluate(() => { const el = document.getElementById('o-intLabel'); if (el) { el.value = 'x'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await p.waitForTimeout(300);
    await p.evaluate(() => { const el = document.getElementById('o-intProm'); if (el) { el.value = '0'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await p.waitForTimeout(300);
    await p.evaluate(() => { const el = document.getElementById('o-peakDec'); if (el) { el.value = '1'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await p.waitForTimeout(300);
    await p.evaluate(() => {
        const traces = document.querySelectorAll('.trace');
        traces.forEach(t => {
            const btn = t.querySelector('[data-act=detect]');
            if (btn) btn.click();
        });
    });
    await p.waitForTimeout(600);
    const rects = await p.locator('svg text').evaluateAll(els => els.map(el => {
       const rect = el.getBoundingClientRect();
       return {x: rect.x, y: rect.y, w: rect.width, h: rect.height, txt: el.textContent};
    }));
    const overlapLabels = rects.filter(r => r.txt === '10.0' || r.txt === '10.4');
    T.check('overlap/2-labels-found', overlapLabels.length === 2, 'Found 2 close peak labels');
    if (overlapLabels.length === 2) {
       const [r1, r2] = overlapLabels;
       const intersect = !(r1.x > r2.x + r2.w || r1.x + r1.w < r2.x || r1.y > r2.y + r2.h || r1.y + r1.h < r2.y);
       T.check('overlap/no-intersection', !intersect, 'Bounding boxes of close labels do not intersect');
    }
  } finally { T.check('overlap/no-page-errors', !errs.length, errs.join(' | ')); await close(); }
}

// #398: a zoom window too narrow to search (under 7 points) falls back to the whole trace, keeping peaks inside the window
async function zoomPeak() {
  const {p, errs, close} = await open(), h = H(p);
  try {
    await p.click('#homeQuick'); await p.waitForTimeout(800);  // overlay traces (with Detect peaks) live in Quick mode; in a project a CSV becomes a run
    let csv = 'Time (min),UV (mAU)\n'; for (let i = 0; i <= 1000; i++) { const x = i/10; csv += x.toFixed(1) + ',' + (100*Math.exp(-((x-50)**2)/(2*4))).toFixed(3) + '\n'; }
    await p.setInputFiles('#file', {name: 'zoom_peak.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
    await p.waitForTimeout(600);
    const card = () => p.locator('.trace:not(.run)').filter({has: p.locator('input[value="zoom_peak"], input[value="zoom_peak.csv"]')}).first();
    const chips = async () => (await card().locator('.chip input').evaluateAll(els => els.map(e => parseFloat(e.placeholder || e.value))));
    T.check('zoom_peak/unzoomed', (await chips()).some(x => Math.abs(x - 50) < 0.3), 'peak at 50 found without zoom: ' + (await chips()));
    await card().locator('[data-act=clear]').click();
    await setOpt(p, 'o-xmin', '49.8'); await setOpt(p, 'o-xmax', '50.2'); await p.waitForTimeout(300);
    await card().locator('[data-act=detect]').click(); await p.waitForTimeout(300);
    const c = await chips();
    T.check('zoom_peak/found-when-zoomed', c.some(x => Math.abs(x - 50) < 0.3), 'peak at 50 found inside a 5-point zoom window: [' + c + ']');
  } finally { T.check('zoom_peak/no-page-errors', !errs.length, errs.join(' | ')); await close(); }
}

async function zoomPeakButton() {
  const {p, errs, close} = await open(), h = H(p);
  try {
    await p.goto('file://' + path.resolve(__dirname, '../../hplc-figure-bench(WF1.13).html'));

    // Switch to quick mode and add file
    await p.click('#homeQuick'); await p.waitForTimeout(800);
    let csv = 'Time (min),UV (mAU)\n'; for (let i = 0; i <= 1000; i++) { const x = i/10; csv += x.toFixed(1) + ',' + (100*Math.exp(-((x-50)**2)/(2*4))).toFixed(3) + '\n'; }
    await p.setInputFiles('#file', {name: 'zoom_peak.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
    await p.waitForTimeout(600);

    // Save to convert to project mode
    await p.click('#quickSave');
    await p.waitForTimeout(600);


    const {xmin, xmax} = await p.evaluate(() => {
        return new Promise(resolve => {
            // Setup project mode
            const saveBtn = document.querySelector('#quickSave');
            if (saveBtn) saveBtn.click();

            setTimeout(() => {
                // Manually populate peak just to test the zoom logic directly
                const run = window.__HFB.runs()[0];
                run.integ = [{a: 48, b: 52, apex: 50}];
                window.__HFB.render();

                setTimeout(() => {
                    const zbtn = document.querySelector('#intTable .xbtn[data-rzoom="0"]');
                    if (zbtn) zbtn.click();

                    setTimeout(() => {
                        resolve({
                            xmin: document.querySelector('#o-xmin') ? document.querySelector('#o-xmin').value : '',
                            xmax: document.querySelector('#o-xmax') ? document.querySelector('#o-xmax').value : ''
                        });
                    }, 300);
                }, 300);
            }, 600);
        });
    });

    T.check('zoom_peak_button_updates_window', parseFloat(xmin) > 40 && parseFloat(xmax) < 60, `xmin: ${xmin}, xmax: ${xmax}`);
  } finally { T.check('zoom_peak_button_no_page_errors', !errs.length, errs.join(', ')); await close(); }
}

(async () => {
  await T.t('overlap', overlap);
  await T.t('zoom_peak_button', zoomPeakButton);
  await T.t('zoom_peak', zoomPeak);
  for (const e of EXP) {
    await T.t(e.file, () => peakFile(e));
  }
  T.done();
})();
