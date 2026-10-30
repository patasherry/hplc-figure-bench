const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: Manual step correctly rendered in summary table ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5.no_nanodrop'")) + 3;

// We redefine p5_umol properly using standard UI tools as requested
// "Use addConc with a synthetic NanoDrop file to get the nd payload and set basis === 'umol'."
// "Use setRun from tests/suites/10_data_truth.js to set manual/transfer amounts. This avoids overriding window.__HFB.ndSamples and stays UI-only."

const newP5 = `  /* ================= P5: umol check ================= */
  await T.t('p5_umol', async () => {
    await p.click('text=All projects', {timeout: 1000}).catch(() => {}); await h.wait(600);
    await h.newProject('Umol manual');

    // Use opt UI fields to set ext.coeff and Kda
    await p.evaluate(() => document.querySelectorAll('details').forEach(e => e.open = true));
    await setField('#o-eps', '1');
    await setField('#o-protKda', '50');

    await p.click('#tl [data-addmenu]'); await h.wait(100);
    await p.click('#tl [data-addstep="man:column"]'); await h.wait(400);

    const setRunLocal = async (k, v) => {
        const l = p.locator(\`.trace.run.sel [data-k="\${k}"]\`).first();
        await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }).catch(()=>{});
        await l.fill(String(v));
        await l.dispatchEvent('change');
        await h.wait(250);
    };

    // The user said: "Use setRun from tests/suites/10_data_truth.js to set manual/transfer amounts."
    // In hplc-figure-bench, if you click a manual step, it gets the \`.trace.run.sel\` class, and its inputs have \`data-k="vol"\` !!!
    await setRunLocal('name', 'Manual start');
    await setRunLocal('vol', '10');
    await setRunLocal('conc', '2'); // 20 mg

    // Run 1
    await h.addRun(F.imac);
    await setRunLocal('shade', 'T1-T6');
    await h.addConc(path.join(DATA, 'nd', 'umol_10mg.tsv'), 1);

    // Transfer
    // h.addConc automatically adds a concentrated step and uploads the file!
    await h.addConc(path.join(DATA, 'nd', 'umol_5mg.tsv'), 1);

    // Run 2
    await h.addRun(path.join(DATA, 'chrom', 'hplc_export.csv')); // different file to ensure upload triggers
    await setRunLocal('shade', '11.5-12.0');
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
fs.writeFileSync('tests/suites/20_science.js', tests);
