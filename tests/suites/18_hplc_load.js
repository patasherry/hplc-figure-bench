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
  await close();
  T.done();
})();
