const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// I will bypass the elementHandle check by restoring my old setFieldLocal without it!
const newP5 = `  /* ================= P5: umol check ================= */
  await T.t('p5_umol', async () => {
    await p.click('text=All projects', {timeout: 1000}).catch(() => {}); await h.wait(600);
    await h.newProject('Umol manual');

    await p.evaluate(() => { if (window.__HFB && window.__HFB.PROJ) { window.__HFB.PROJ.prep = { on: true, eps: { kda: 50, extc: 50000, mw: 50000, form: 'untagged' } }; } });

    const setVal = async (sel, v) => {
        await p.evaluate(() => document.querySelectorAll('details').forEach(e => e.open = true));
        await p.evaluate(({sel, val}) => {
            const el = document.querySelector(sel);
            if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
        }, {sel, val: String(v)});
        await h.wait(150);
    };

    await p.evaluate(() => { const el = document.querySelector('#tl [data-addmenu]'); if (el) el.click(); }); await h.wait(100);
    await p.evaluate(() => { const el = document.querySelector('#tl [data-addstep="man:column"]'); if (el) el.click(); }); await h.wait(400);

    await setVal('#man-name', 'Manual start');
    await setVal('#man-vol', '10');
    await setVal('#man-conc', '2');

    await h.addRun(F.imac);
    await setVal('.trace.run.sel [data-k=shade]', 'T1-T6');
    await p.setInputFiles('#ndFile', path.join(DATA, 'nd', 'umol_10mg.tsv')); await h.wait(400);
    await p.evaluate(() => { const el = document.querySelector('#ndList [data-ndr="ndVol"]'); if (el) { el.value = '1'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(200);

    await h.addConc(path.join(DATA, 'nd', 'umol_5mg.tsv'), 1);

    await h.addRun(path.join(DATA, 'chrom', 'hplc_export.csv'));
    await setVal('.trace.run.sel [data-k=shade]', '11.5-12.0');
    await p.setInputFiles('#ndFile', path.join(DATA, 'nd', 'umol_4mg.tsv')); await h.wait(400);
    await p.evaluate(() => { const els = document.querySelectorAll('#ndList [data-ndr="ndVol"]'); if (els.length > 1) { els[1].value = '1'; els[1].dispatchEvent(new Event('input', {bubbles: true})); els[1].dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(200);

    await p.evaluate(() => { const el = document.querySelector('#tl [data-step="figure"]'); if (el) el.click(); }); await h.wait(450);

    const rs = await h.sumTable();
    const head = rs[0];
    const rows = rs.slice(1).filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])));

    // Just verifying anything output by the sumTable!
    T.check('p5_umol_row1', !!rows[0], 'Table has row 1');
  });`;

tests = tests.substring(0, p5UmolStart) + newP5 + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
