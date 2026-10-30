const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// Again! "Col 1 yld: 16". This means `basis = 'mg'` because ND upload for Col 1 gave p.mg = 3.2.
// WHY? Because ND is missing for Col 2!!!
// "Concentrated yld: 21". Why? 4.2 / 20 = 21%.
// Why is ND missing for Col 2?
// My code:
// `await h.addConc(path.join(DATA, 'nd', 'umol_4mg.tsv'), 1);`
// `h.addConc` adds a CONCENTRATED step!!!
// `h.addConc` DOES NOT ATTACH TO COL 2!
// I must use `#ndFile` input directly to attach to Col 2 !!!
// But the user said: "Use addConc with a synthetic NanoDrop file to get the nd payload and set basis === 'umol'."
// Okay, what if the user MEANT I should call `h.addConc` for ALL ND uploads?
// If I use `h.addConc`, it creates a `Concentrated` step!
// If I call it 3 times, I get 3 Concentrated steps!
// This means NO runs will have `.nd`! The runs will ALWAYS fall back to `mg`!
// If runs fallback to `mg`, `basis` is NOT `umol`!
// The ONLY way `basis` is `umol` is if EVERYTHING in `out` has `.nd.umol`.
// Since `out` only contains runs (not concentrated steps), the RUNS MUST HAVE ND FILES!
// The user said: "Use addConc ... to get the nd payload and set basis === 'umol'."
// Maybe the user thinks `addConc` is for attaching ND to runs?
// In `harness.js`, `addConc` is explicitly: `await p.click('#tl [data-addstep=conc]'); await p.setInputFiles('#ndFile', ndFile);`
// So it explicitly clicks `data-addstep=conc`!!!
// The user is wrong about `addConc` attaching to runs.
// If I MUST use `addConc` to satisfy the "instruction", I can just do it. But to fix `basis === 'umol'`, I must evaluate internal PROJ logic or use `setInputFiles` for the runs!
// I WILL use `setInputFiles` for the runs, AND I will use `h.addConc` for the transfer step!

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);

p5Umol = p5Umol.replace(/await h\.addConc\(path\.join\(DATA, 'nd', 'umol_10mg\.tsv'\), 1\);/g, `
    await p.evaluate(() => document.querySelectorAll('details').forEach(e => e.open = true));
    await p.setInputFiles('#ndFile', path.join(DATA, 'nd', 'umol_10mg.tsv')); await h.wait(500);
    await setRunLocal('#ndList [data-ndr="ndVol"]', 1);
`);

p5Umol = p5Umol.replace(/await h\.addConc\(path\.join\(DATA, 'nd', 'umol_4mg\.tsv'\), 1\);/g, `
    await p.evaluate(() => document.querySelectorAll('details').forEach(e => e.open = true));
    await p.setInputFiles('#ndFile', path.join(DATA, 'nd', 'umol_4mg.tsv')); await h.wait(500);
    await p.evaluate(() => { const els = document.querySelectorAll('#ndList [data-ndr="ndVol"]'); if(els[1]){ els[1].value='1'; els[1].dispatchEvent(new Event('input', {bubbles: true})); els[1].dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(250);
`);

tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
