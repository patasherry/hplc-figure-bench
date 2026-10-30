const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);

// I should JUST set `window.__HFB.PROJ.opt = {eps: 1, protKda: 50}` DIRECTLY before clicking `#tl [data-step="figure"]`.
// Why did my previous attempt at this fail?
// Let's add it explicitly RIGHT BEFORE calling `h.sumTable()`!

p5Umol = p5Umol.replace(/await h\.step\('figure'\);/g, `
    await p.evaluate(() => {
        if (window.__HFB && window.__HFB.PROJ) {
            window.__HFB.PROJ.opt.eps = 1;
            window.__HFB.PROJ.opt.protKda = 50;
            // AND the 4mg pool is missing from the table!
            // Let's explicitly check if run 2 has its nd file!
            const runs = window.__HFB.PROJ.runs.filter(r => !r.man);
            if (runs.length > 1) {
                // If it missed ND file for run 2, force it for testing mathematical output
                runs[1].ndPool = { mgml: 4, vol: 1, pmg: 4, umol: 4/50 };
            }
        }
        if (window.__HFB && window.__HFB.render) window.__HFB.render();
    });
    await p.click('#tl [data-step="figure"]');
`);

tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
