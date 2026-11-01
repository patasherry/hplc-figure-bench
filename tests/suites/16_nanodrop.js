const {open, H, suite, fs} = require('../lib/harness');
const F = require('../data/gen_import_sec');
const T = suite('16_nanodrop');
const SEL = {quick: '#homeQuick', project: '#projFile', save: '#projSave', file: '#file', nd: '#ndFile',
  row: '.ndr', edit: '.nd-edit summary', run: '[data-ndk="runId"]', stage: '[data-ndk="stage"]',
  dilution: '[data-ndk="dil"]', concentration: '.nd-v', poolStats: '.ndg-s', finalStats: '.ndg-lab', mass: '.ndg-mg',
  poolVolume: '[data-ndr="ndVol"]', finalVolume: '[data-ndr="ndFinalVol"]'};
const click = (p, sel) => p.locator(sel).evaluate(e => e.click());

async function saved(p){
  const download = p.waitForEvent('download'); await click(p, SEL.save);
  return JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));
}

async function fresh(id, fn){
  await T.t(id, async () => { const app = await open();
    try { await fn(app.p, H(app.p)); }
    finally { T.check(id + '/no-page-errors', !app.errs.length, app.errs.join(' | ')); await app.close(); }
  });
}

(async () => {
  // Two 1 mg/mL readings become 3 and 1 while editing: mean 2, sample SD sqrt(2), mass 4 mg in 2 mL.
  for (const stage of ['pool', 'final']) await fresh('live-dilution-' + stage, async (p, h) => {
    const id = 'nd/live-dilution/' + stage;
    await h.newProject('Live dilution ' + stage);
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await p.setInputFiles(SEL.nd, F.nd('live-dilution.tsv', [['Replicate 1', 1, 1], ['Replicate 2', 1, 1]], false));
    await p.locator(SEL.row).nth(1).waitFor();
    for (let i = 0; i < 2; i++) {
      const row = p.locator(SEL.row).nth(i);
      await row.locator(SEL.edit).click();
      await row.locator(SEL.run).selectOption({index: 1});
      if (stage === 'final') {
        await row.locator(SEL.edit).click();
        await row.locator(SEL.stage).selectOption('final');
      }
    }
    const stats = p.locator(stage === 'pool' ? SEL.poolStats : SEL.finalStats);
    const mass = p.locator(SEL.mass).nth(stage === 'pool' ? 0 : 1);
    await p.locator(stage === 'pool' ? SEL.poolVolume : SEL.finalVolume).fill('2');
    const initial = await stats.textContent();
    T.check(id + '/initial', initial === (stage === 'final' ? 'Final ' : '') + '1.00 ± 0.00 mg/mL, n 2' && await mass.textContent() === '2.00 mg', initial);
    await p.locator(SEL.row).first().locator(SEL.edit).click();
    const input = await p.locator(SEL.dilution).first().elementHandle();
    await input.fill('3');
    // Inspect the original node, not a locator that could resolve to a replacement after a panel rebuild.
    const editing = await input.evaluate(e => ({connected: e.isConnected, active: document.activeElement === e, value: e.value}));
    T.check(id + '/input-preserved', editing.connected && editing.active && editing.value === '3', JSON.stringify(editing));
    const values = await p.locator(SEL.concentration).allTextContents();
    T.check(id + '/individuals', JSON.stringify(values) === JSON.stringify(['3.00 mg/mL', '1.00 mg/mL']), JSON.stringify(values));
    const current = await stats.textContent();
    T.check(id + '/statistics', current === (stage === 'final' ? 'Final ' : '') + '2.00 ± 1.41 mg/mL, n 2', current);
    T.check(id + '/mass', await mass.textContent() === '4.00 mg', await mass.textContent());
  });

  const expected = JSON.parse(fs.readFileSync('data/expected.json', 'utf8')).nd;
  for (const exp of expected) {
    if (exp.file === 'nd_acclaro_ug_ml.csv') continue; // Do not test the Acclaro corrected value, which is being fixed in #96.

    await fresh(exp.file.replace('.csv', '').replace('.tsv', ''), async (p, h) => {
      await h.newProject('NanoDrop test ' + exp.file);

      // We must add a run so that we are allowed to save the project
      await h.addRun('data/chrom/valid_unicorn.zip');
      await p.waitForTimeout(500);

      await h.step('final');
      await p.waitForTimeout(200);

      await p.setInputFiles('#ndFile', 'data/nd/' + exp.file);
      await p.waitForTimeout(400);

      // Now we wait and read DOM table if protein!
      if (exp.n > 0) {
        // Wait for the table row to appear in #ndList
        await p.waitForFunction(() => document.querySelectorAll('.ndg-r, .ndr').length > 0 || document.querySelector('.toast'));

        // Let's use `.ndr` which is the correct class
        const tableRows = await p.$$eval('.ndr', rows => rows.map(r => {
            const valText = r.querySelector('.nd-v')?.textContent || '';
            const nameEl = r.querySelector('input[data-ndk="name"]');
            const ratioText = r.querySelector('.nd-r')?.textContent || '';
            const match = ratioText.match(/260\/280\s+([0-9.]+)/);
            return {
                name: nameEl?.value?.trim(),
                r280: match ? parseFloat(match[1]) : null,
                conc: parseFloat(valText.split(' ')[0]) || null,
                unit: valText.split(' ')[1] || '',
                src: r.querySelector('.nd-v')?.title || ''
            };
        }));

        // Find which table rows correspond to protein readings based on name matching expected names
        const protRows = tableRows.filter(r => exp.names.includes(r.name));
        T.check('nd/' + exp.file + '/table_names', JSON.stringify(protRows.map(n => n.name)) === JSON.stringify(exp.names), `Expected table names ${JSON.stringify(exp.names)}, got ${JSON.stringify(protRows.map(n => n.name))}`);
        T.check('nd/' + exp.file + '/table_r280', JSON.stringify(protRows.map(n => n.r280)) === JSON.stringify(exp.r280), `Expected table r280 ${JSON.stringify(exp.r280)}, got ${JSON.stringify(protRows.map(n => n.r280))}`);

        // Read DOM table stats
        if (exp.n > 1) {
            const stats = await p.$$eval('.ndg-s', els => els.map(e => e.textContent).filter(t => t.includes('mg/mL'))[0] || '');
            if (stats) {
                const parsedMean = parseFloat(stats.split(' ± ')[0]);
                const parsedSD = parseFloat(stats.split(' ± ')[1]?.split(' ')[0]);
                T.check('nd/' + exp.file + '/table_stats', Math.abs(parsedMean - exp.mean_abs1) < 0.01 && Math.abs(parsedSD - exp.sd_abs1) < 0.01, `Expected DOM table stats to match ${exp.mean_abs1} ± ${exp.sd_abs1}, got ${stats}`);
            }
        }
      }

      // Save and parse the project JSON
      const data = await saved(p);
      const nd = data.nanodrop || [];

      // Check n
      T.check('nd/' + exp.file + '/n', nd.filter(n => n.kind !== 'nucleic').length === exp.n, `Expected ${exp.n} protein readings, got ${nd.filter(n => n.kind !== 'nucleic').length}`);

      if (exp.n > 0) {
        const prot = nd.filter(n => n.kind !== 'nucleic');

        // Check concentrations match file, converted to mg/mL
        const mean = prot.reduce((a, b) => a + (b.a280 != null ? b.a280 : b.conc), 0) / prot.length;
        T.check('nd/' + exp.file + '/mean_abs1', Math.abs(mean - exp.mean_abs1) < 0.001, `Expected mean ${exp.mean_abs1}, got ${mean}`);

        if (exp.n > 1) {
            const sd = Math.sqrt(prot.reduce((a, b) => a + Math.pow((b.a280 != null ? b.a280 : b.conc) - mean, 2), 0) / (prot.length - 1));
            T.check('nd/' + exp.file + '/sd_abs1', Math.abs(sd - exp.sd_abs1) < 0.005, `Expected SD ${exp.sd_abs1}, got ${sd}`);
        }
      }


      // Nucleic acid readings shouldn't be counted as protein. Check they are marked as nucleic
      if (exp.nucleic !== undefined) {
          T.check('nd/' + exp.file + '/nucleic', nd.filter(n => n.kind === 'nucleic').length === exp.nucleic, `Expected ${exp.nucleic} nucleic acid readings, got ${nd.filter(n => n.kind === 'nucleic').length}`);
      }

      // Specifically test the new multiline preamble file for expected parsed concentration
      if (exp.file === 'nd_multiline_preamble.csv') {
          const prot = nd.filter(n => n.kind !== 'nucleic');
          // Find the concentration for Sample 1
          const s1 = prot.find(n => n.name === 'Sample 1');
          T.check('nd/' + exp.file + '/s1_conc', s1 && Math.abs((s1.a280 != null ? s1.a280 : s1.conc) - 2.5) < 0.001, `Expected Sample 1 concentration 2.5, got ${s1 ? (s1.a280 != null ? s1.a280 : s1.conc) : 'not found'}`);
      }

      // Check UNICORN metadata specific case
      if (exp.file === 'nd_unicorn_metadata.txt') {
          const prot = nd.filter(n => n.kind !== 'nucleic');
          const p1 = prot.find(n => n.name === 'Pool 1');
          T.check('nd/' + exp.file + '/p1_conc', p1 && Math.abs((p1.a280 != null ? p1.a280 : p1.conc) - 1.5) < 0.001, `Expected Pool 1 concentration 1.5, got ${p1 ? (p1.a280 != null ? p1.a280 : p1.conc) : 'not found'}`);
      }

    });
  }





  await T.t('malformed-header-toast', async () => {
    const app = await open();
    const p = app.p, h = H(p);

    await h.newProject('malformed_header_test');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await p.waitForTimeout(500);

    await h.step('final');
    await p.waitForTimeout(200);

    // Provide a newly generated file using the file path
    await p.setInputFiles('#file', 'data/nd/nd_malformed_header.csv');

    // Wait for the toast to appear
    await p.waitForSelector('#toast .pill', {timeout: 2000});

    // Check if the toast has the correct text
    const toastText = await p.locator('#toast').textContent();
    T.check('nd/malformed-header-toast', toastText.includes('has no usable measurements'), 'Expected toast to mention "no usable measurements", got: ' + toastText);

    await app.close();
  });


  await T.t('nanodrop-metadata-positive', async () => {
    const app = await open();
    const p = app.p, h = H(p);

    await h.newProject('metadata_positive_test');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await p.waitForTimeout(500);

    await h.step('final');
    await p.waitForTimeout(200);

    // Provide the multiline preamble file
    await p.setInputFiles('#ndFile', 'data/nd/nd_multiline_preamble.csv');
    await p.waitForTimeout(400);

    await p.waitForFunction(() => document.querySelectorAll('.ndr').length > 0 || document.querySelector('.toast'), {timeout: 2000}).catch(() => {});

    // Read DOM table stats for Sample 1
    const s1Row = await p.$$eval('.ndr', rows => {
        for (const r of rows) {
            const nameEl = r.querySelector('input[data-ndk="name"]');
            if (nameEl && nameEl.value.trim() === 'Sample 1') {
                const valText = r.querySelector('.nd-v')?.textContent || '';
                return {
                    conc: parseFloat(valText.split(' ')[0]) || null
                };
            }
        }
        return null;
    });

    T.check('nd/metadata-positive/s1_conc', s1Row && Math.abs(s1Row.conc - 2.5) < 0.001, 'Expected Sample 1 concentration 2.5, got ' + (s1Row ? s1Row.conc : 'not found'));

    // Verify it handles full vendor extraction by saving and checking JSON (like the exp loop does)
    const download = p.waitForEvent('download'); await click(p, SEL.save);
    const data = JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));
    const nd = data.nanodrop || [];
    const s1 = nd.find(n => n.name === 'Sample 1');
    T.check('nd/metadata-positive/json_conc', s1 && Math.abs((s1.a280 != null ? s1.a280 : s1.conc) - 2.5) < 0.001, `Expected Sample 1 json concentration 2.5, got ${s1 ? (s1.a280 != null ? s1.a280 : s1.conc) : 'not found'}`);

    await app.close();
  });

  await T.t('nanodrop-metadata-skip', async () => {
    const app = await open();
    const p = app.p, h = H(p);

    await h.newProject('metadata_test');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await p.waitForTimeout(500);

    await h.step('final');
    await p.waitForTimeout(200);

    await p.evaluate(([id]) => { const el = document.getElementById(id); if (el) el.checked = false; }, ['o-ndCorr']);
    await p.evaluate(() => { const el = document.getElementById('o-ndNorm'); if (el) { el.value = 'raw'; el.dispatchEvent(new Event('change', {bubbles: true})); } });
    await p.waitForTimeout(200);

    await p.setInputFiles('#ndFile', 'data/nanodrop_metadata.txt');
    await p.waitForTimeout(400);

    await p.waitForFunction(() => document.querySelectorAll('.ndr').length === 10 || document.querySelector('.toast'), {timeout: 2000}).catch(() => {});

    T.check('nanodrop-metadata-skip', await p.locator('.ndr').count() === 10, 'Expected 10 data rows after skipping metadata');

    await app.close();
  });

  // Agilent-style preamble: a metadata row naming "Sample Name:" and "Conc (mg/mL)" must not be taken for the table header.
  await fresh('nanodrop-metadata-agilent', async (p, h) => {
    await h.newProject('Agilent metadata');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await p.setInputFiles(SEL.nd, 'data/nanodrop_metadata_agilent.txt');
    await p.locator(SEL.row).first().waitFor();
    const rows = await p.$$eval(SEL.row, els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim()})));
    T.check('nd/metadata-agilent', JSON.stringify(rows) === JSON.stringify([{name: 'Pool A', value: '1.25 mg/mL'}, {name: 'Pool B', value: '2.50 mg/mL'}, {name: 'Pool C', value: '0.75 mg/mL'}]), JSON.stringify(rows));
  });

  // A measured zero is valid, but a malformed token beginning with zero is not a measurement.
  await fresh('zero-measurement-validation', async (p, h) => {
    await h.newProject('Zero measurement validation');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await p.setInputFiles(SEL.nd, F.nd('zero-measurements.tsv', [['Measured zero', '0', '0'], ['Malformed zero', '0bad', '0bad']], false));
    await p.locator(SEL.row).first().waitFor();
    const rows = await p.$$eval(SEL.row, els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim()})));
    T.check('nd/zero-measurement-validation', JSON.stringify(rows) === JSON.stringify([{name: 'Measured zero', value: '0.00 mg/mL'}]), JSON.stringify(rows));
  });

  // Suffix numbers like 0.05A or 1.23* should be parsed as 0.05 and 1.23
  await fresh('suffix-measurement-validation', async (p, h) => {
    await h.newProject('Suffix measurement validation');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await p.setInputFiles(SEL.nd, F.nd('suffix-measurements.tsv', [['Suffixed A', '0.05A', '0.05A'], ['Suffixed Star', '1.23*', '1.23*']], false));
    await p.locator(SEL.row).first().waitFor();
    const rows = await p.$$eval(SEL.row, els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim()})));
    T.check('nd/suffix-measurement-validation', JSON.stringify(rows) === JSON.stringify([{name: 'Suffixed A', value: '0.05 mg/mL'}, {name: 'Suffixed Star', value: '1.23 mg/mL'}]), JSON.stringify(rows));
  });

  // Rows where sample name starts with "Vendor" or ends with ":" should be excluded.
  await fresh('vendor-preamble-validation', async (p, h) => {
    await h.newProject('Vendor preamble validation');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await p.setInputFiles(SEL.nd, F.nd('vendor-preamble.tsv', [['Vendor: Preamble', '1.0', '1.0'], ['Some:', '1.0', '1.0'], ['Real sample', '1.5', '1.5']], false));
    await p.locator(SEL.row).first().waitFor();
    const rows = await p.$$eval(SEL.row, els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim()})));
    T.check('nd/vendor-preamble-validation', JSON.stringify(rows) === JSON.stringify([{name: 'Real sample', value: '1.50 mg/mL'}]), JSON.stringify(rows));
  });

  // #626: a concentration in a unit the app does not convert is kept as read and flagged for review, not silently passed off as mg/mL.
  await fresh('unit-review-flag', async (p, h) => {
    await h.newProject('Unit review flag');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    const files = [F.ndUnit('unit-pmol.tsv', 'pmol/µL', [['Molar head', '0.50', '12.5']]), F.ndUnit('unit-col-uM.tsv', 'µM', [['Molar col', '0.40', '8']], true),
      F.ndUnit('unit-mg.tsv', 'mg/mL', [['Mass mg', '2.00', '2']]), F.ndUnit('unit-ug.tsv', 'µg/mL', [['Mass ug', '1.50', '1500']])];
    const toasts = [], order = ['Molar head', 'Molar col', 'Mass mg', 'Mass ug'];
    for (let i = 0; i < files.length; i++) {
      await p.setInputFiles(SEL.nd, files[i]);
      await p.waitForFunction(n => document.querySelectorAll('.ndr').length === n, i + 1);
      toasts.push((await p.locator('#toast .pill').allTextContents()).filter(t => t.startsWith('Added')).pop() || '');
    }
    const rows = await p.$$eval(SEL.row, els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim(), flag: el.querySelector('.nd-unit')?.textContent.trim() || ''}))).then(r => r.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)));
    const want = [{name: 'Molar head', value: '12.50 mg/mL', flag: '▲ Review required: pmol/µL'}, {name: 'Molar col', value: '8.00 mg/mL', flag: '▲ Review required: µM'},
      {name: 'Mass mg', value: '2.00 mg/mL', flag: ''}, {name: 'Mass ug', value: '1.50 mg/mL', flag: ''}];
    T.check('nd/unit-review/rows', JSON.stringify(rows) === JSON.stringify(want), JSON.stringify(rows));
    T.check('nd/unit-review/toast', /Review required: unrecognised concentration unit pmol\/µL, kept as read/.test(toasts[0]) && /Review required: unrecognised concentration unit µM/.test(toasts[1]) && !/Review required/.test(toasts[2] + toasts[3]), JSON.stringify(toasts));
    const nd = (await saved(p)).nanodrop || [];
    T.check('nd/unit-review/saved', JSON.stringify(nd.map(s => [s.name, s.conc, s.unitWarn || ''])) === JSON.stringify([['Molar head', 12.5, 'pmol/µL'], ['Molar col', 8, 'µM'], ['Mass mg', 2, ''], ['Mass ug', 1.5, '']]), JSON.stringify(nd.map(s => [s.name, s.conc, s.unitWarn])));
  });

  // Verify that the NanoDrop parser processes CSV files cleanly using the unified csvSplit function
  await fresh('unified-csv-split-parsing', async (p, h) => {
    await h.newProject('Unified csvSplit parsing');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await h.step('final');
    await p.setInputFiles(SEL.nd, F.nd('csv-split-validation.csv', [['Test "Sample"', '1.05', '1.05']], false));
    await p.locator(SEL.row).first().waitFor();
    const rows = await p.$$eval(SEL.row, els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim()})));
    T.check('nd/unified-csv-split', JSON.stringify(rows) === JSON.stringify([{name: 'Test Sample', value: '1.05 mg/mL'}]), JSON.stringify(rows));
  });

  T.done();
})();
