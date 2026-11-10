const fs = require('fs');

let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I am asked to "prevent additive double-counting of manual/transfer amounts".
// Let's search for "additive" in the problem.
// Is it possible that `k = kept(x)` in `sumRows` double counts?
// `kept` is `loadedAfter(x.r)`.
// `loadedAfter` is:
// let mg = r && r.id ? (btwMg(r) || {}).mg || null : null; if (mg) mg *= btwSplit((prep.btw || {})[r.id]).f;
// for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a !== null) mg = a; }

// What if the reviewer meant: "In loadedAfter, if there are multiple manual steps, they shouldn't just overwrite mg. Or wait! The bug is that we SHOULD NOT double-count, so if they ADD them together somewhere... but where?
const methodsTextStr = code.match(/function methodsText\(\)\{[\s\S]*?\n\}/)[0];

// In `methodsText`:
// does `methodsText` sum them?
const manLinesMatch = methodsTextStr.match(/for \(let j = 0; j < wf.length; j\+\+\) \{[\s\S]*?\}/);
// console.log(methodsTextStr);
