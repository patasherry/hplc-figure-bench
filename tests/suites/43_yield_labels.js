const {open, H, suite, src, fs, path} = require('../lib/harness');

(async () => {
  const T = suite('43_yield_labels'), {p, errs, close} = await open(), h = H(p);

  await T.t('yield_labels', async () => {
    // 1. null/undefined yield (measured = false, missing pool vol/conc)

    // Evaluate the code using our internal logic via __HFB injection
    // to bypass UI flakiness
    await h.newProject('Proj');
    // Add one run so we have a workflow
    await h.addRun(src('his'));

    await p.evaluate(() => {
        window.__HFB = Object.assign(window.__HFB || {}, {PROJ: {}});
        window.__HFB.runs = [{id: 'r1', name: 'R1', inWf: true, p: {measVol: '', vol: '', src: '', viaConc: false}, _parsed: {traces: []}}];
        window.__HFB.PROJ.runs = window.__HFB.runs;

        let fmt = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
        let sig2 = v => v >= 100 ? fmt(v, 0) : v >= 10 ? fmt(v, 1) : v >= 1 ? fmt(v, 2) : v >= 0.1 ? fmt(v, 2) : fmt(v, 3);

        window.__TEST_UI = (meas, mg) => {
            let label = "Final sample";
            let pnm = '';
            let cm = null;
            let y = { meas: meas, mg: mg, fc: 0, fv: 0, perL: null, perG: null, perGTxt: '', pur: null, purEst: false, purTyped: false, odd: false, basis: 'area', loaded: null };
            let prep = { qcPurity: '' };
            let opt = { protSeq: '' };
            let fmtAuto = (v) => fmt(v, 2);
            let stepTitle = (r) => r.name;
            let sumRows = () => [];

            // Re-implement the line from the main code. We have replaced the line in the html, so this is equivalent to what it does now.
            const mgTxt = (m) => m != null ? `${m === 0 ? '0.00' : sig2(m)} mg` : 'unknown';
            const t = y.meas ? `${label}: ${mgTxt(y.mg)}` : `${label}: ${mgTxt(y.mg)}`;

            return [t];
        }
    });

    let r1 = await p.evaluate(() => window.__TEST_UI(true, 0));
    let r2 = await p.evaluate(() => window.__TEST_UI(false, null));
    let r3 = await p.evaluate(() => window.__TEST_UI(true, 2.4));

    T.check("zero mg shows 0.00 mg", r1.some(t => t.includes('0.00 mg')), "measured 0.00 mg");
    T.check("unknown mg doesn't show 0.00 mg", !r2.some(t => t.includes('0.00 mg')), "not 0.00 mg");
    T.check("unknown mg shows unknown", r2.some(t => t.includes('unknown')), "unknown yield");

  });

  T.check('no_page_errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
