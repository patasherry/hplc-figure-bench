const fs = require('fs');
let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: Manual step correctly rendered in summary table ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5.no_nanodrop'")) + 3;

const newP5 = `  /* ================= P5: umol check ================= */
  await T.t('p5_umol', async () => {
    await p.click('text=All projects', {timeout: 1000}).catch(() => {}); await h.wait(600);
    await h.newProject('Umol manual');

    await p.evaluate(() => { window.__HFB.PROJ.prep = { on: true, eps: { kda: 50, extc: 50000, mw: 50000, form: 'untagged' } }; });

    await p.click('#tl [data-addmenu]'); await h.wait(100);
    await p.click('#tl [data-addstep="man:column"]'); await h.wait(400);

    const setF = async (sel, v) => {
        await p.evaluate(({sel, val}) => {
            const el = document.querySelector(sel);
            if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
        }, {sel, val: String(v)});
        await h.wait(150);
    };

    await setF('#man-name', 'Manual start');
    await setF('#man-vol', '10');
    await setF('#man-conc', '2');

    // Run 1
    await h.addRun(F.imac);
    await setF('.trace.run.sel [data-k=shade]', 'T1-T6');
    await h.addConc(path.join(DATA, 'nd', 'umol_10mg.tsv'), 1);

    // Transfer
    await h.addConc(path.join(DATA, 'nd', 'umol_5mg.tsv'), 1);

    // Run 2
    await h.addRun(path.join(DATA, 'chrom', 'hplc_export.csv'));
    await setF('.trace.run.sel [data-k=shade]', '11.5-12.0');
    await h.addConc(path.join(DATA, 'nd', 'umol_4mg.tsv'), 1);

    await p.click('#tl [data-step="figure"]'); await h.wait(450);

    const rs = await h.sumTable();
    const head = rs[0];
    const rows = rs.slice(1).filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])));

    T.check('p5_umol.row1_yld', rows[0] && rows[0]['Yield (%)'] === '100', 'Manual start yld: ' + (rows[0] && rows[0]['Yield (%)']));
    T.check('p5_umol.row2_yld', rows[1] && rows[1]['Yield (%)'] === '50', 'Col 1 yld: ' + (rows[1] && rows[1]['Yield (%)']));
    T.check('p5_umol.row3_yld', rows[2] && rows[2]['Yield (%)'] === '25', 'Concentrated yld: ' + (rows[2] && rows[2]['Yield (%)']));
    T.check('p5_umol.row3_stepY', rows[2] && rows[2]['Step yield (%)'] === '50', 'Concentrated step yld: ' + (rows[2] && rows[2]['Step yield (%)']));
    T.check('p5_umol.row4_yld', rows[3] && rows[3]['Yield (%)'] === '20', 'Col 2 yld: ' + (rows[3] && rows[3]['Yield (%)']));
    T.check('p5_umol.row4_stepY', rows[3] && rows[3]['Step yield (%)'] === '80', 'Col 2 step yld: ' + (rows[3] && rows[3]['Step yield (%)']));
    T.check('p5_umol.nmol_display', rows[0] && rows[0]['Protein (nmol)'] === '400', 'nmol is preserved: ' + (rows[0] && rows[0]['Protein (nmol)']));
  });`;

tests = tests.substring(0, p5UmolStart) + newP5 + tests.substring(p5UmolEnd);

tests = tests.replace(/await p\.click\('text=All projects', \{timeout: 1000\}\)\.catch\(\(\) => \{\}\);/g, `await p.evaluate(() => { const el = document.querySelector('button, a, div:has-text("All projects")'); if(el) el.click(); }).catch(() => {});`);
tests = tests.replace(/await p\.click\('text=All projects'\)\.catch\(\(\) => \{\}\);/g, `await p.evaluate(() => { const el = document.querySelector('button, a, div:has-text("All projects")'); if(el) el.click(); }).catch(() => {});`);

fs.writeFileSync('tests/suites/20_science.js', tests);
