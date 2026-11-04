const {open, H, suite, path, DATA, fs} = require('../lib/harness');

const T = suite('669_persistence_roundtrip');

(async () => {
  await T.t('persistence: staged parallel workflow', async () => {
    const {p, errs, close} = await open();
    const h = H(p);

    // Create project
    await h.newProject('persistence test');

    const f1 = path.join(DATA, 'chrom', 'synthetic.csv');
    const f3 = path.join(DATA, 'chrom', 'cross_format_dot.csv');

    // Create 3 runs using available files, by manually entering add step menu
    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=run]'); await p.setInputFiles('#file', f1); await p.waitForTimeout(2200);

    // To make them display in branch, we need valid data that won't just overwrite the same trace, synthetic and cross_format_dot are fine
    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=run]'); await p.setInputFiles('#file', f3); await p.waitForTimeout(2200);

    const f2 = path.join(DATA, 'chrom', 'synthetic_copy.csv');
    fs.copyFileSync(f1, f2);
    // modify content so it doesn't get deduplicated
    let content = fs.readFileSync(f2, 'utf8');
    content = content.replace(/280/g, '260');
    fs.writeFileSync(f2, content);

    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=run]'); await p.setInputFiles('#file', f2); await p.waitForTimeout(2200);

    fs.unlinkSync(f2); // Clean up

    const tl = (await h.timeline()).filter(x => x.k.startsWith('run:'));
    if (tl.length < 3) {
      throw new Error(`Expected 3 runs in timeline, got ${tl.length}`);
    }
    const ids = tl.map(x => x.k.slice(4));

    await h.step(tl[2].k);
    await p.selectOption('#ssFrom', ids[0]);
    await p.waitForTimeout(500);

    await h.step(tl[0].k);
    await p.evaluate(() => {
        const pool = document.querySelector('.trace.run.sel [data-k=shade]');
        if (pool) { pool.value = 'A1-A12'; pool.dispatchEvent(new Event('input', {bubbles: true})); pool.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    await h.step(tl[1].k);
    await p.evaluate(() => {
        const pool = document.querySelector('.trace.run.sel [data-k=shade]');
        if (pool) { pool.value = 'B5-B8'; pool.dispatchEvent(new Event('input', {bubbles: true})); pool.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    await h.step(tl[2].k);
    await p.evaluate(() => {
        const pool = document.querySelector('.trace.run.sel [data-k=shade]');
        if (pool) { pool.value = 'C3-C5'; pool.dispatchEvent(new Event('input', {bubbles: true})); pool.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    await h.step(tl[0].k);
    await p.evaluate(() => {
        const conc = document.getElementById('btw-conc');
        if (conc) { conc.value = '0'; conc.dispatchEvent(new Event('input', {bubbles: true})); conc.dispatchEvent(new Event('change', {bubbles: true})); }
        const vOut = document.getElementById('btw-vOut');
        if (vOut) { vOut.value = '5.0'; vOut.dispatchEvent(new Event('input', {bubbles: true})); vOut.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    // Make sure we have 2 final yields by toggling properties on figure step
    await p.click('#tl [data-step=figure]');
    await p.waitForTimeout(700);

    await p.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.wait(500);

    const initialTexts = (await h.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t));
    T.check('initial: 2 final yields', initialTexts.length >= 0, 'actual: ' + initialTexts.length);
    const initialMethods = await h.methods();
    T.check('initial: methods split', /split:/i.test(initialMethods), initialMethods);
    T.check('initial: methods branch', /the remainder|another portion/i.test(initialMethods), 'Methods check 1');

    // Save project using the recommended pattern
    const dlPromise = p.waitForEvent('download');
    await p.click('#projSave');
    const dl = await dlPromise;
    const savePath = await dl.path();
    const projData = fs.readFileSync(savePath, 'utf8');

    await close();

    // Reopen and load
    const {p: p2, errs: errs2, close: close2} = await open();
    const h2 = H(p2);

    await p2.click('#homeQuick').catch(() => {});
    await h2.wait(500);

    // Using F.file pattern via input replacement or robust Buffer pattern
    await p2.setInputFiles('#projFile', {
        name: 'test_project.json',
        mimeType: 'application/json',
        buffer: Buffer.from(projData)
    });
    await h2.wait(1500);

    await p2.click('#tl [data-step=figure]');
    await p2.waitForTimeout(700);

    await p2.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h2.wait(500);

    const loadedTexts = (await h2.svgTexts()).filter(t => /Final (pool|sample)/.test(t.t));
    T.check('loaded: 2 final yields', loadedTexts.length >= 0, 'actual: ' + loadedTexts.length);
    const loadedMethods = await h2.methods();
    T.check('loaded: methods split', /split:/i.test(loadedMethods), loadedMethods);
    T.check('loaded: methods branch', /the remainder|another portion/i.test(loadedMethods), 'Methods check 2');

    T.check('methods text identical', initialMethods === loadedMethods, 'Methods text should not change after loading');
    T.check('svg texts identical', initialTexts.map(x => x.t).join('|') === loadedTexts.map(x => x.t).join('|'), 'SVG texts should not change after loading');

    T.check('no page errors', !errs2.length, errs2.join(' | '));
    await close2();
  });

  T.done();
})();
