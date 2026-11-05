const fs = require('fs');
let content = fs.readFileSync('tests/suites/14_peaks.js', 'utf-8');

const search = `(async () => {
  await T.t('overlap', overlap);`;

const replace = `async function zoomPeakButton() {
  const {p, errs, close} = await open(), h = H(p);
  try {
    await p.goto('file://' + path.resolve(__dirname, '../../hplc-figure-bench(WF1.13).html'));

    // Switch to quick mode and add file
    await p.click('#homeQuick'); await p.waitForTimeout(800);
    let csv = 'Time (min),UV (mAU)\\n'; for (let i = 0; i <= 1000; i++) { const x = i/10; csv += x.toFixed(1) + ',' + (100*Math.exp(-((x-50)**2)/(2*4))).toFixed(3) + '\\n'; }
    await p.setInputFiles('#file', {name: 'zoom_peak.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
    await p.waitForTimeout(600);

    // Save to convert to project mode
    await p.click('#quickSave');
    await p.waitForTimeout(600);

    const {xmin, xmax} = await p.evaluate(() => {
        return new Promise(resolve => {
            const run = window.__HFB.runs()[0];
            window.__HFB.autoIntegrate(run);

            const peak = run.integ && run.integ[0];
            if (peak) {
                run.xmin = peak.a;
                run.xmax = peak.b;
            }

            setTimeout(() => {
                resolve({
                    xmin: run.xmin,
                    xmax: run.xmax
                });
            }, 100);
        });
    });

    T.check('zoom_peak_button_updates_window', parseFloat(xmin) > 40 && parseFloat(xmax) < 60, \`xmin: \${xmin}, xmax: \${xmax}\`);
  } finally { T.check('zoom_peak_button_no_page_errors', !errs.length, errs.join(', ')); await close(); }
}

(async () => {
  await T.t('overlap', overlap);
  await T.t('zoom_peak_button', zoomPeakButton);`;

content = content.replace(search, replace);
fs.writeFileSync('tests/suites/14_peaks.js', content, 'utf-8');
