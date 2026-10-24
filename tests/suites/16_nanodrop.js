const {open, H, suite, fs} = require('../lib/harness');
const T = suite('16_nanodrop');
const SEL = {quick: '#homeQuick', project: '#projFile', save: '#projSave', file: '#file', nd: '#ndFile'};
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
    });
  }

  T.done();
})();
