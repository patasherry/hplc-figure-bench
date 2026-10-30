const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

const p5UmolStart = tests.indexOf("/* ================= P5: umol check ================= */");
const p5UmolEnd = tests.indexOf("});", tests.indexOf("T.check('p5_umol.nmol_display'")) + 3;

// The `locator.fill` timed out!
// This means `.trace.run.sel [data-k=...]` didn't work for `man:column`!
// Wait! `hplc-figure-bench` manual steps have `id="man-name"`, `id="man-vol"`, `id="man-conc"`!!
// They DO NOT have `.trace.run.sel [data-k="..."]`!
// The user said: "Use setRun from tests/suites/10_data_truth.js to set manual/transfer amounts. This avoids overriding window.__HFB.ndSamples and stays UI-only."
// How does `setRun` in `10_data_truth.js` work?
// It works on `.trace.run.sel [data-k=... ]`.
// If I can't use `setRun` for manual steps, what did the user mean?
// Maybe they meant: Use `setField` (which is `const setField = async (sel, v) => { const l = p.locator(sel).first(); ... }`)?
// Yes! `setField` takes a raw selector!

let p5Umol = tests.substring(p5UmolStart, p5UmolEnd);

p5Umol = p5Umol.replace(/const setRunLocal = async \(k, v\) => \{[\s\S]*?await h\.wait\(250\); \n    \};/g, '');
p5Umol = p5Umol.replace(/await setRunLocal\('#man-name', 'Manual start'\);/g, `await setField('#man-name', 'Manual start');`);
p5Umol = p5Umol.replace(/await setRunLocal\('#man-vol', '10'\);/g, `await setField('#man-vol', '10');`);
p5Umol = p5Umol.replace(/await setRunLocal\('#man-conc', '2'\);/g, `await setField('#man-conc', '2');`);
p5Umol = p5Umol.replace(/await setRunLocal\('\.trace\.run\.sel \[data-k=shade\]', 'T1-T6'\);/g, `await setRun('shade', 'T1-T6');`);
p5Umol = p5Umol.replace(/await setRunLocal\('\.trace\.run\.sel \[data-k=shade\]', '11\.5-12\.0'\);/g, `await setRun('shade', '11.5-12.0');`);

tests = tests.substring(0, p5UmolStart) + p5Umol + tests.substring(p5UmolEnd);
fs.writeFileSync('tests/suites/20_science.js', tests);
