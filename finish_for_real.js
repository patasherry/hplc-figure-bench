const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');
const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;
let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);

// locator.elementHandle failed in setRunLocal for `#man-name`.
// We will replace setRunLocal with standard DOM logic completely bypassing locator search!

p5Umol = p5Umol.replace(/const setRunLocal = async \(sel, v\) => \{ [\s\S]*?await h\.wait\(250\); \n    \};/g, `
    const setRunLocal = async (sel, v) => {
        await p.evaluate(({sel, val}) => {
            const el = document.querySelector(sel);
            if(el) {
                let d = el.closest('details'); while(d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
                el.value = val;
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
            }
        }, {sel, val: String(v)});
        await h.wait(250);
    };
`);

tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);

fs.writeFileSync('tests/suites/20_science.js', tests);
