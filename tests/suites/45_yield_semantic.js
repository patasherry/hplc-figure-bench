const {open, H, suite, fs, path, DATA, src} = require('../lib/harness');
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
    await h.pool('1.A.1-1.A.3');
    await p.evaluate(() => { const el = document.querySelector('.trace.run.sel [data-k=path]'); if (el) { el.value = '10'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } const f = document.querySelector('.trace.run.sel [data-k=mFlow]'); if (f) { f.value = '1'; f.dispatchEvent(new Event('input', {bubbles: true})); f.dispatchEvent(new Event('change', {bubbles: true})); } });

    await p.evaluate(() => document.querySelector('#tl [data-addmenu]').click()); await h.wait(100);
    await p.evaluate(() => document.querySelector('#tl [data-addstep="man:other"]').click()); await h.wait(500);
    await setField('#man-name', 'Final buffer exchange');
    await setField('#man-conc', '0');
    await setField('#man-vol', '10');

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

    await setField('#man-conc', ''); // Unknown!

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
      if (b) { b.value = '0% pure'; b.dispatchEvent(new Event('input', {bubbles: true})); b.dispatchEvent(new Event('change', {bubbles: true})); }
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

  await fresh('measured_output_allocation', async (p, h) => {
    const set = async (sel, value) => { const el = p.locator(sel); await el.fill(String(value)); await el.dispatchEvent('input'); await el.dispatchEvent('change'); await h.wait(250); };
    const stepYield = async () => { const t = await h.sumTable(), k = (t[0] || []).findIndex(x => /Step yield/.test(x)), row = t.find(r => /anion|exchange|resource q/i.test(r[0] || '')); return k >= 0 && row ? Number(String(row[k]).replace(/[^0-9.-]/g, '')) : NaN; };

    await h.newProject('Measured output allocation');
    await h.gb(src('gb'));
    await h.addRun(src('his')); await h.pool('T1-T6'); await h.addConc(null, '5');
    const conc = (await h.timeline()).find(x => x.k.startsWith('btw:'));
    await h.step(conc.k); await p.locator('#btwMore').evaluate(e => e.open = true); await set('#btw-conc', '2');
    await h.addRun(src('q')); await h.pool('T11-T16'); await h.step('figure');
    const before = await stepYield();

    const controls = await p.locator('#btw-vLoad, #btw-vRetain, #btw-retain').count() === 3;
    T.check('allocation/controls-present', controls, 'Measured-output allocation controls are available on the transfer card');
    if (!controls) { T.check('allocation/scales-step-yield', false, 'No allocation fields to represent a 1 mL load from 5 mL output'); return; }
    await h.step(conc.k); await p.locator('#btwAlloc').evaluate(e => e.open = true); await set('#btw-vLoad', '1'); await set('#btw-vRetain', '4'); await set('#btw-retain', 'stored at -80 C');
    const invalid = await p.locator('#btw-vRetain').evaluate(e => e.validationMessage);
    T.check('allocation/valid-split', !invalid, invalid || '1 mL loaded + 4 mL retained is within 5 mL output');
    await h.step('figure'); const after = await stepYield();
    T.check('allocation/scales-step-yield', Number.isFinite(before) && Number.isFinite(after) && Math.abs(after - before*5) <= 3, `before ${before}%, after ${after}% (1 of 5 mL loaded)`);

    await h.step(conc.k); await set('#btw-vRetain', '4.1');
    const over = await p.locator('#btw-vRetain').evaluate(e => e.validationMessage);
    T.check('allocation/rejects-over-output', /cannot exceed the measured output/i.test(over), over || 'no allocation validation message');
  });

  T.done();
})();
