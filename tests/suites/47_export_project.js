const {open, H, suite, src, fs, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('47_export_project');

  await T.t('export-and-import-project', async () => {
    const {p, errs, close} = await open(), h = H(p);

    const F = {gb: src('gb'), imac: src('his'), sec: path.join(DATA, 'science/sec_inject2.csv'), q: src('q')};

    await h.newProject('Export Test Project');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');

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

    const brTextsAfter = (await h.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t));
    const methAfter = await h.methods();
    const sumRowsAfter = await p.$$eval('#sumTable tbody tr', rows => rows.map(r => r.innerText));

    const clean = t => t.map(x => x.t).sort().join(' | ');
    T.check('round-trip: branch texts preserved', clean(brTextsBefore) === clean(brTextsAfter), `Before: ${clean(brTextsBefore)} | After: ${clean(brTextsAfter)}`);
    T.check('round-trip: methods preserved', methBefore === methAfter, 'Methods changed');
    T.check('round-trip: summary table preserved', JSON.stringify(sumRowsBefore) === JSON.stringify(sumRowsAfter), `Before: ${JSON.stringify(sumRowsBefore)} | After: ${JSON.stringify(sumRowsAfter)}`);

    // Verify button text
    const btnText = await p.$eval('#projSave', el => el.innerText);
    T.check('export project button text', btnText === 'Export project', `Expected "Export project", got "${btnText}"`);

    T.check('no page errors', !errs.length, errs.join(' | '));
    await close();
  });

  T.done();
})();
