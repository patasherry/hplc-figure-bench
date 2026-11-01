const {open, H, suite, src, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('29_workflow_persist');
  const openFolds = loc => loc.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });

  await T.t('branches-persist-roundtrip', async () => {
    const {p, errs, close} = await open(), h = H(p);
    const F = {gb: src('gb'), imac: src('his'), sec: path.join(DATA, 'science/sec_inject2.csv'), q: src('q')};
    await h.newProject('Persist Roundtrip');
    await h.gb(F.gb);
    await h.addRun(F.imac); await h.pool('T1-T6');
    await h.addRun(F.sec); await h.suggest();
    await h.addRun(F.q); await h.suggest();
    const tl = (await h.timeline()).filter(x => x.k.startsWith('run:'));
    const ids = tl.map(x => x.k.slice(4));

    const setFrom = async (p, h, stepKey, value) => { await h.step(stepKey); await p.selectOption('#ssFrom', value); await p.waitForTimeout(500); };
    const openWf = async (p) => { await p.click('#tl [data-step=figure]'); await p.waitForTimeout(700); };

    await openWf(p);
    await p.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    await setFrom(p, h, tl[2].k, ids[0]); await h.wait(300);
    await h.step(tl[1].k); await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await h.wait(400);
    await openFolds(p.locator('#btw-conc')); await p.fill('#btw-conc', '0'); await p.dispatchEvent('#btw-conc', 'change');
    await openFolds(p.locator('#btw-vOut')); await p.fill('#btw-vOut', '2.0'); await p.dispatchEvent('#btw-vOut', 'change'); await h.wait(400);
    await h.step(tl[2].k); await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await h.wait(400);
    await openFolds(p.locator('#btw-conc')); await p.fill('#btw-conc', ''); await p.dispatchEvent('#btw-conc', 'change');
    await openFolds(p.locator('#btw-vOut')); await p.fill('#btw-vOut', '1.5'); await p.dispatchEvent('#btw-vOut', 'change'); await h.wait(400);

    await openWf(p);
    const methBefore = await h.methods();
    const svgBefore = (await h.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t)).map(x => x.t).join(' | ');

    T.check('before persist: zero branch present', svgBefore.includes('0.00 mg'), svgBefore);
    T.check('before persist: unknown branch present', svgBefore.includes('1.28 mg'), svgBefore);

    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click('#projSave')]);
    const dPath = await dl.path();

    await p.locator('#homeQuick').evaluate(e => e.click());
    await h.wait(600);
    await p.setInputFiles('#projFile', dPath);
    await p.waitForTimeout(2500);

    await openWf(p);
    await p.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el && !el.checked) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    const methAfter = await h.methods();
    const svgAfter = (await h.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t)).map(x => x.t).join(' | ');

    T.check('after persist: zero branch present', svgAfter.includes('0.00 mg'), svgAfter);
    T.check('after persist: unknown branch present', svgAfter.includes('1.28 mg'), svgAfter);
    T.check('after persist: methods remain identical', methBefore === methAfter);

    T.check('no page errors', !errs.length, errs.join(' | '));
    await close();
  });

  T.done();
})();
