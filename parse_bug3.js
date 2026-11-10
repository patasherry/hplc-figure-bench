const fs = require('fs');

// Reviewer: "The no_odd_yield_warning is triggered by yld > 100, which suggests sumRows is double-counting manual amounts."
// "Establish a single source of truth for the 'final step' index and implement validation logic to prevent additive double-counting of manual/transfer amounts."
// Where are manual amounts calculated?
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I will look at `manMg`
console.log(code.match(/function manMg\([\s\S]*?\n\}/)[0]);

// Look at `base` and `prev` in `sumRows`:
// 5618: const first = out.length ? amt(out[0]) : null; let prev = null, prevKept = false;
// 5619: if (out.length && prep.on) { const wf = wfList(), i = wf.indexOf(out[0].r); let mg = null; for (let j = 0; j < i; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a !== null) mg = a; }

// What if the reviewer is complaining that `mg = a` does NOT double count, but it SHOULD NOT double count?
// "implement validation logic to prevent additive double-counting of manual/transfer amounts."
// If multiple manual amounts exist, maybe `mg = a` overwrites, which is WRONG if it was additive?
// Wait. If it says "prevent additive double-counting", it means someone was doing `mg += a` but it was wrong?
// BUT currently in `main` it is `mg = a` ! So it is ALREADY not additive.

// What if the double-counting happens because BOTH `prev` and `base` use the manual amounts incorrectly?
// Wait! Look at `sumRows` branch logic.
