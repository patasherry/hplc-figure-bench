const fs = require('fs');

let ts = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p6_start = ts.indexOf("/* ================= P6: A205 concentration provenance ================= */");
if (p6_start !== -1) {
    const next = ts.indexOf("if (EXP) T.check('expected_json_seen'", p6_start);
    ts = ts.substring(0, p6_start) + ts.substring(next);
}

ts = ts.replace("  if (EXP) T.check('expected_json_seen'", `
  /* ================= P6: A205 concentration provenance ================= */
  await T.t('p6_a205_provenance', async () => {
    await p.click('text=All projects', {timeout: 1000}).catch(() => {}); await h.wait(600);
    await h.newProject('A205 Provenance');
    await h.gb(F.gb); // Load GenBank file to set a valid A280 coefficient

    await h.addRun(F.imac);
    await p.locator('.trace.run.sel [data-k=shade]').fill('T1-T6'); await h.wait(400);

    // Let's use exactly the command required by instruction
    await h.addConc(F.a205, 1);

    // UI steps:
    await p.click('#tl [data-step="figure"]'); await h.wait(400);

    // Open the box properly to make sure text is populated
    await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(400);

    const m = await h.methods();

    T.check('p6.methods_says_a205', m && m.includes('A205'), 'Methods missing A205');
    T.check('p6.methods_no_a280_claim_for_a205', m && !m.includes('NanoDrop A280 (') && !m.includes(', A280 of '), 'Methods incorrectly claims A280 or coefficient was used');

    const t = await table();
    const cK = col(t, /^Protein/);
    const manRow = t.rows[t.rows.length - 1];

    T.check('p6.yield_mg_correct', manRow && Number(manRow[cK]) === 4.00, 'Yield is ' + (manRow ? manRow[cK] : 'undefined') + ', expected 4.00');
  });

  if (EXP) T.check('expected_json_seen'`);

fs.writeFileSync('tests/suites/20_science.js', ts);
