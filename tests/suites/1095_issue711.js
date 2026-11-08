const {open, H, suite, src, path, DATA, fs} = require('../lib/harness');

(async () => {
  const T = suite('1095_issue711');
  const {p, errs, close} = await open();
  const h = H(p);

  const setRun = async (pg, k, v) => {
    const l = pg.locator(`.trace.run.sel [data-k="${k}"]`).first();
    await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });

    await l.evaluate((e, val) => {
        e.value = val;
        e.dispatchEvent(new Event('input', {bubbles: true}));
        e.dispatchEvent(new Event('change', {bubbles: true}));
    }, String(v));

    await pg.waitForTimeout(400);
  };

  await T.t('Issue 711 - finalYield and poolMeas with zero conc', async () => {
    await h.newProject('Zero Conc Test');
    await h.gb(src('gb'));
    await h.addRun(src('his'));
    await h.pool('T3-T6');
    await p.waitForTimeout(500);

    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    const f = path.join(__dirname, '..', 'results', 'pool_conc_zero.json');
    await dl.saveAs(f);

    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const r = (d.runs || []).find(x => x && x.shade);
    r.poolConc = 0;
    r.poolFinalVol = 5;

    await p.click('#homeBtn');
    await p.waitForTimeout(600);

    await p.setInputFiles('#projFile', {name: 'pool_conc_zero.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))});
    await p.waitForTimeout(1500);

    await h.step('figure');
    await p.waitForTimeout(500);

    await p.evaluate(() => {
        const methodsBox = document.querySelector('#methodsBox');
        if (methodsBox) {
            methodsBox.open = true;
            methodsBox.dispatchEvent(new Event('toggle'));
        }
    });
    await p.waitForTimeout(1000);

    const text = await p.$eval('#methodsText', el => el.value);
    T.check('Issue 711 check', text.includes('0 mg/mL in 5 mL') || text.includes('0.00 mg/mL in 5 mL') || text.includes('0 mg/mL') || text.includes('0.00 mg/mL'), `Text should mention 0 mg/mL in 5 mL, got: ${text}`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
