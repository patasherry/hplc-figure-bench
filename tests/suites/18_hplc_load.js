const {open, H, suite, fs, path, DATA, src} = require('../lib/harness');

(async () => {
  const T = suite('18_hplc_load');
  const {p, errs, close} = await open();
  const h = H(p);

  await T.t('hplc_load', async () => {
    await h.newProject('hplc export');

    // Load directly through #file input instead of addRun for generic loadFiles pathway
    await p.setInputFiles('#file', {
      name: 'hplc_export.csv',
      mimeType: 'text/csv',
      buffer: fs.readFileSync(path.join(DATA, 'chrom', 'hplc_export.csv'))
    });

    await p.waitForTimeout(500);

    // Verify it appears in trace list
    const traces = await p.$$eval('.trace', els => els.map(e => e.textContent));
    T.check('hplc_export/loads', traces.length > 0, 'HPLC export file loaded successfully and appears in trace list');

    // Export project JSON
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    const fPath = path.join(__dirname, '..', 'results', 'hplc_export_proj.json');
    await dl.saveAs(fPath);
    const d = JSON.parse(fs.readFileSync(fPath, 'utf8'));

    // According to loadFiles/parseText, trace will be created (not runs)
    const r = (d.traces || []).find(x => x.name === 'hplc_export');
    T.check('hplc_export/has-trace', !!r, 'Project has the trace');
    if (r) {
      T.check('hplc_export/cols', r.cols[0] === 'Time (min)' && r.cols[1] === 'UV 280 (mAU)', 'Headers parsed correctly: ' + r.cols.join(', '));
      T.check('hplc_export/points', r.rows.length === 601, 'Correct number of points loaded: ' + r.rows.length);
      T.check('hplc_export/values', Math.abs(r.rows[0][0]) < 0.001 && Math.abs(r.rows[300][1] - 10) < 0.001, 'Correct first x and apex y value: ' + r.rows[0][0] + ', ' + r.rows[300][1]);
    }
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));

  await T.t('akta parses empty and zeros', async () => {
    await p.evaluate(() => { while (document.getElementById('toast').firstChild) document.getElementById('toast').firstChild.remove(); });
    await p.setInputFiles('#file', { name: 'empty_akta.csv', mimeType: 'text/csv', buffer: Buffer.from('') });
    await p.waitForTimeout(500);
    let toastText = await p.locator('#toast').textContent();
    T.check('empty akta fails', toastText.includes('no columns of numbers found') || toastText.includes('empty'), toastText);

    await p.evaluate(() => { while (document.getElementById('toast').firstChild) document.getElementById('toast').firstChild.remove(); });
    await p.setInputFiles('#file', { name: 'zeros_akta.csv', mimeType: 'text/csv', buffer: Buffer.from('UV 1_280\t\nml\tmAU\n0\t0\n1\t0\n2\t0\n3\t0\n') });
    await p.waitForTimeout(500);
    toastText = await p.locator('#toast').textContent();
    T.check('zero akta empty parse', toastText.includes('empty parse') || toastText.includes('zero measurements'), toastText);
  });
  await close();
  T.done();
})();
