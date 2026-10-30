const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);

// It STILL says 16%!! Because I am setting `opt.eps = 1` and `opt.protKda = 50` at the END of the test!
// No, I moved it!
// `await p.evaluate(() => { if (window.__HFB && window.__HFB.PROJ) { window.__HFB.PROJ.prep = { on: true, eps: { kda: 50, extc: 50000, mw: 50000, form: 'untagged' } }; } });`
// `await setRunLocal('#o-eps', '1'); await setRunLocal('#o-protKda', '50');`
// BUT `setRunLocal` uses `.trace.run.sel [data-k=...]`!
// `#o-eps` is NOT in `.trace.run.sel`! It's a global option in `#options`!
// So `setRunLocal('#o-eps', '1')` silently fails!
// That means `opt.eps` is NEVER set!
// So `basis` is NOT `umol` because `E` is null!
// Let's use `p.evaluate` directly to set `#o-eps` and `#o-protKda` in the UI correctly!

p5Umol = p5Umol.replace(/await setRunLocal\('#o-eps', '1'\);/g, `
    await p.evaluate(() => document.querySelectorAll('details').forEach(e => e.open = true));
    await p.evaluate(() => {
        const el = document.querySelector('#o-eps');
        if (el) { el.value = '1'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
`);

p5Umol = p5Umol.replace(/await setRunLocal\('#o-protKda', '50'\);/g, `
    await p.evaluate(() => {
        const el = document.querySelector('#o-protKda');
        if (el) { el.value = '50'; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
`);

tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
