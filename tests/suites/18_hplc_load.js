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

  await T.t('zero_measurement_diagnostics', async () => {
    await p.reload();
    await h.wait(500);
    await h.newProject('zero measurements');
    const cases = [
      ['akta', 'empty_akta.csv', 'UV 1_280\tCond\nml\tmAU\tml\tmS/cm\n', /ÄKTA|UNICORN/i],
      ['nanodrop', 'empty_nd.csv', 'Date,Sample Name,Protein (mg/mL),A280,A260/A280,Sample Type\n', /NanoDrop/i],
      ['hplc', 'empty_hplc.csv', 'Time (min),UV 280 (mAU)\n', /chromatogram/i]
    ];
    for (const [id, name, content, reFmt] of cases) {
      await p.setInputFiles('#file', {name, mimeType: 'text/csv', buffer: Buffer.from(content)});
      const toast = p.locator('#toast .pill', {hasText: name}).last();
      await toast.waitFor({state: 'attached'});
      const message = await toast.textContent();
      T.check(`zero_meas/${id}/diagnosed`, reFmt.test(message) && /no usable measurements/i.test(message) && !/no columns of numbers found/i.test(message), `toast: ${message || 'none'}`);
    }
  });

  await T.t('zero_valued_measurements_load', async () => {
    await p.reload();
    await h.wait(500);
    await h.newProject('zero-valued measurements');
    await p.setInputFiles('#file', {name: 'zero_akta.csv', mimeType: 'text/csv', buffer: Buffer.from('UV 1_280\nml\tmAU\n0\t0\n1\t0\n2\t0\n')});
    await p.locator('.trace.run').waitFor();
    T.check('zero_values/akta/loads', await p.locator('.trace.run').count() === 1, 'All-zero ÄKTA UV records load as a run');

    await p.setInputFiles('#file', {name: 'zero_hplc.csv', mimeType: 'text/csv', buffer: Buffer.from('Time (min),UV 280 (mAU)\n0,0\n1,0\n2,0\n')});
    await p.waitForFunction(() => document.querySelectorAll('.trace').length === 2);
    T.check('zero_values/hplc/loads', await p.locator('.trace').count() === 2, 'All-zero HPLC records load as a trace');

    await p.setInputFiles('#file', {name: 'zero_nd.csv', mimeType: 'text/csv', buffer: Buffer.from('Date,Sample Name,Protein (mg/mL),A280,A260/A280,Sample Type\n2026-01-01,Zero sample,0,0,0,Protein\n')});
    const zeroReading = p.locator('#ndList .ndr').first();
    await zeroReading.waitFor({state: 'attached'});
    T.check('zero_values/nanodrop/loads', await zeroReading.locator('[data-ndk=name]').inputValue() === 'Zero sample' && await zeroReading.locator('.nd-v').textContent() === '0.00 mg/mL', `reading: ${await zeroReading.textContent()}`);
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
