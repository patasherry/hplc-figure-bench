const {open, H, suite, fs, path, DATA} = require('../lib/harness');
const T = suite('45_yield_semantic');

async function fresh(id, fn){
  await T.t(id, async () => { const app = await open();
    try { await fn(app.p, H(app.p)); }
    finally { T.check(id + '/no-page-errors', !app.errs.length, app.errs.join(' | ')); await app.close(); }
  });
}

(async () => {
  await fresh('zero_yield_line', async (p, h) => {
    const openFolds = loc => loc.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });
    const setField = async (sel, v) => { const l = p.locator(sel).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(150); };
    const methods = async () => { await h.step('figure'); await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(400); return h.methods(); };

    await h.newProject('Zero vs unknown yield semantic tests');
    await h.gb(path.join(DATA, 'standins', 'pET28-SUMO-standin.gb'));
    await h.addRun(path.join(DATA, 'chrom', 'sec_semicolon_unicorn7.csv'));

    await p.evaluate(() => {
        let el = document.querySelector('.trace.run.sel [data-k="shade"]');
        if (el) { el.value = 'A2-A6'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(400);

    // Call detect to ensure a peak is found and area is populated
    await p.evaluate(() => {
        let btn = document.querySelector('.run-panel [data-detect]');
        if (btn) btn.click();
    });
    await h.wait(500);

    // Set path length to calculate mgA
    await p.evaluate(() => {
        let path = document.querySelector('.run-panel [data-k="path"]');
        if (path) { path.value = '2'; path.dispatchEvent(new Event('input', {bubbles: true})); path.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    await p.evaluate(() => {
        let pc = document.querySelector('.run-panel [data-k="poolConc"]');
        if (pc) { pc.value = '1'; pc.dispatchEvent(new Event('input', {bubbles: true})); pc.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(200);

    await p.evaluate(() => document.querySelector('#tl [data-addmenu]').click()); await h.wait(100);
    await p.evaluate(() => document.querySelector('#tl [data-addstep="man:other"]').click()); await h.wait(500);
    await p.evaluate(() => { let el = document.querySelector('#man-name'); if (el) { el.value = 'Final buffer exchange'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(150);
    await p.evaluate(() => { let el = document.querySelector('#man-conc'); if (el) { el.value = '0'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(150);
    await p.evaluate(() => { let el = document.querySelector('#man-vol'); if (el) { el.value = '10'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(150);

    await h.step('figure');
    await p.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.step('figure');
    await h.wait(500);

    // Because SVG text layout can be tricky to grab from harness `svgTexts` reliably
    // we use `methodsText` and check `#sumTable` for 0.00 verification where it also affects
    let m = await methods();
    let res = (m.match(/Results:[^]*/) || [''])[0];
    T.check('zero_measured_shows_sample_in_methods', /After the Final buffer exchange step, the sample held 0\.00 mg/.test(res), `Results: ${res}`);

    // And also check SVG directly
    let html = await p.evaluate(() => document.querySelector('#paper').innerHTML);
    T.check('zero_measured_shows_sample_svg', html.includes('Final sample:') || html.includes('Final sample ('), `SVG includes Final sample: ${html.includes('Final sample:')}`);

    // 2. Now let's test missing/unknown data by disabling the reading
    const steps = await p.$$eval('#tl button[data-step]', els => els.map(e => e.getAttribute('data-step')));
    const manStep = steps.find(s => s.startsWith('man:'));
    await p.click(`#tl [data-step="${manStep}"]`);
    await h.wait(400);

    await p.evaluate(() => { let el = document.querySelector('#man-conc'); if (el) { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(150); // Unknown!

    await h.step('figure');
    await h.wait(500);

    let m2 = await methods();
    let res2 = (m2.match(/Results:[^]*/) || [''])[0];
    T.check('unknown_shows_pool_methods', !/the sample held 0\.00 mg/.test(res2), `Unknown text type: ${res2}`);

    let html2 = await p.evaluate(() => document.querySelector('#paper').innerHTML);
    T.check('unknown_shows_pool', html2.includes('Final pool:') || html2.includes('Final pool ('), `SVG includes Final pool: ${html2.includes('Final pool:')}`);

    // Case 3: Purity Zero vs Missing
    await p.evaluate(() => {
      const b = document.querySelector('#pr-qcPurity');
      if (b) { b.value = '0% pure by gel'; b.dispatchEvent(new Event('input', {bubbles: true})); b.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.step('figure');
    await h.wait(500);
    html2 = await p.evaluate(() => document.querySelector('#paper').innerHTML);
    T.check('purity_zero_shows_in_svg', html2.includes('0% pure'), `SVG includes 0% pure: ${html2.includes('0% pure')}`);

    await p.evaluate(() => {
      const b = document.querySelector('#pr-qcPurity');
      if (b) { b.value = ''; b.dispatchEvent(new Event('input', {bubbles: true})); b.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.step('figure');
    await h.wait(500);
    html2 = await p.evaluate(() => document.querySelector('#paper').innerHTML);
    T.check('purity_missing_not_shown_in_svg', !html2.includes('0% pure'), `SVG does not include 0% pure`);
  });

  T.done();
})();
