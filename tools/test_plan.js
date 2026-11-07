const fs = require('fs');
let code = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const search = `  await T.t('p6_a205', async () => { const s = await poolNd('A205 provenance', F.a205, false), c = TRUTH['nd_a205.csv'].mean, want = \`held \${(c*2).toFixed(2)} mg in 2.0 mL (\${c.toFixed(2)} mg/mL)\`;
    /* guards: the amount is the mean of the instrument's A205 concentrations times the pool volume (1.22 mg/mL × 2 mL = 2.44 mg) */
    T.check('p6.a205_amount', s.includes(want), \`expected "\${want}": \${s}\`);
    /* guards: the methods name the method the instrument used, not A280 */
    T.check('p6.a205_method', /by NanoDrop A205\\b/.test(s), s);
    /* guards: no A280 coefficient is quoted for readings the app did not convert with it */
    T.check('p6.a205_no_a280_coefficient', !/A280 of \\d/.test(s) && !/NanoDrop A280/.test(s), s);
    T.check('p6.a205_no_junk', !!s && !/\\(, |\\(\\)/.test(s), s); });`;

const replace = `  await T.t('p6_a205', async () => { const s = await poolNd('A205 provenance', F.a205, false), c = TRUTH['nd_a205.csv'].mean, want = \`held \${(c*2).toFixed(2)} mg in 2.0 mL (\${c.toFixed(2)} mg/mL)\`;
    /* guards: the amount is the mean of the instrument's A205 concentrations times the pool volume (1.22 mg/mL × 2 mL = 2.44 mg) */
    T.check('p6.a205_amount', s.includes(want), \`expected "\${want}": \${s}\`);
    /* guards: the methods name the method the instrument used, not A280 */
    T.check('p6.a205_method', /by NanoDrop A205\\b/.test(s), s);
    /* guards: no A280 coefficient is quoted for readings the app did not convert with it */
    T.check('p6.a205_no_a280_coefficient', !/A280 of \\d/.test(s) && !/NanoDrop A280/.test(s), s);
    T.check('p6.a205_no_junk', !!s && !/\\(, |\\(\\)/.test(s), s); });

  await T.t('p6_a205_synthetic', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(600); await h.newProject('A205 synthetic'); await h.gb(F.gb);
    await h.addRun(F.imac); await h.pool('T1-T6');
    await h.addConc([require('path').join(__dirname, '../data/nd/nd_a205_4mg_ml.tsv')], 1);
    await p.evaluate(() => {
      const imac = window.__HFB.runs.find(r => r.name === 'IMAC');
      if (imac) { imac.protein = 'custom'; imac.e280 = 1; imac.kda = 50; }
      window.__HFB.appSync();
    });
    await h.wait(200);
    await h.step('figure'); await h.wait(200);
    const m = await p.inputValue('#methodsText');
    const want = \`held 4.00 mg in 1.0 mL (4.00 mg/mL)\`;
    T.check('p6.a205_synth_amount', m.includes(want), \`expected "\${want}": \${m}\`);
    T.check('p6.a205_synth_method', /by NanoDrop A205\\b/.test(m), m);
    T.check('p6.a205_synth_no_a280_coefficient', !/A280 of \\d/.test(m) && !/NanoDrop A280/.test(m), m);
  });`;

code = code.replace(search, replace);
fs.writeFileSync('tests/suites/20_science.js', code);
