const {open, H, suite, src, fs, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('669_persistence_roundtrip');

  await T.t('round-trip-yields-and-methods', async () => {
    const {p, errs, close} = await open(), h = H(p);

    const F = {gb: src('gb'), imac: src('his'), sec: path.join(DATA, 'science/sec_inject2.csv'), q: src('q')};

    await h.newProject('Split Yield Persistence');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');
    await h.addRun(F.sec);
    await h.suggest();
    await h.addRun(F.q);
    await h.suggest();

    const tl = (await h.timeline()).filter(x => x.k.startsWith('run:'));
    const ids = tl.map(x => x.k.slice(4));

    // Branch both SEC and Q from IMAC
    const setFrom = async (stepKey, value) => { await h.step(stepKey); await p.selectOption('#ssFrom', value); await p.waitForTimeout(500); };
    await setFrom(tl[2].k, ids[0]);
    await p.fill('#ssFromNote', 'fractions B9-B12');
    await p.dispatchEvent('#ssFromNote', 'change');
    await h.wait(300);

    await h.step(tl[1].k);
    await p.fill('#ssFromNote', 'fractions B5-B8');
    await p.dispatchEvent('#ssFromNote', 'change');
    await h.wait(300);

    // Turn on Yield line
    await p.click('#tl [data-step=figure]'); await p.waitForTimeout(700);
    await p.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    // Save state before persistence
    const brTextsBefore = (await h.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t));
    const methBefore = await h.methods();
    const sumRowsBefore = await p.$$eval('#sumTable tbody tr', rows => rows.map(r => r.innerText));

    // Persist via export
    const downloadPromise = p.waitForEvent('download');
    await p.click('#projSave');
    const download = await downloadPromise;
    const savePath = await download.path();

    // Reopen App
    await p.click('#homeBtn').catch(() => {});
    await h.wait(500);
    await p.click('#homeQuick');
    await h.wait(1500);

    await p.setInputFiles('#projFile', savePath);
    await h.wait(3000);

    // Ensure Yield line is active
    await p.click('#tl [data-step=figure]'); await p.waitForTimeout(700);

    const brTextsAfter = (await h.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t));
    const methAfter = await h.methods();
    const sumRowsAfter = await p.$$eval('#sumTable tbody tr', rows => rows.map(r => r.innerText));

    const clean = t => t.map(x => x.t).sort().join(' | ');
    T.check('round-trip: branch texts preserved', clean(brTextsBefore) === clean(brTextsAfter), `Before: ${clean(brTextsBefore)} | After: ${clean(brTextsAfter)}`);
    T.check('round-trip: methods preserved', methBefore === methAfter, 'Methods changed');
    T.check('round-trip: methods contains split', /split:/i.test(methAfter), methAfter);
    T.check('round-trip: summary table preserved', JSON.stringify(sumRowsBefore) === JSON.stringify(sumRowsAfter), `Before: ${JSON.stringify(sumRowsBefore)} | After: ${JSON.stringify(sumRowsAfter)}`);

    T.check('no page errors', !errs.length, errs.join(' | '));
    await close();
  });

  T.done();
})();
