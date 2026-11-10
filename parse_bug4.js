const fs = require('fs');

let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');
const finalYieldStr = code.match(/function finalYield\([\s\S]*?return \{fin[\s\S]*?\}\); \}/)[0];

const finCode = finalYieldStr.match(/const fin = rows\.slice\(\)\.reverse\(\)\.find\(x => mgOf\(x\) !== null\); if \(!fin\) return null;/)[0];
// This is the current source of truth.
// If the issue asks to "Establish a single source of truth for the 'final step' index", I should put this in `sumRows`!
// And export it as `out.finIdx`.
// Let's modify `sumRows` to have `out.finIdx = out.slice().reverse().findIndex(x => out.mgOf(x) !== null);`
// Then use it in `finalYield`.
// Then what about the "validation logic to prevent additive double-counting of manual/transfer amounts." ?
// If I use `out.finIdx` in `finalYield`, then `finalYield` becomes:
// const fin = allRows[allRows.length - 1 - allRows.finIdx];
// Where is double counting?
// Look at `manLoad = mgOf(fin)` in `finalYield`:
// if (!meas && prep.on) { const wf = path || wfList(); for (let j = wf.indexOf(fin.r) + 1; j > 0 && j < wf.length; j++) if (wf[j].prep === 'manual' && manMg(wf[j].man) !== null) { const m = wf[j].man; fc = numOr(m.conc, null); fv = numOr(m.vol, null); meas = true; manLoad = mgOf(fin); } }
// If there are MULTIPLE manual steps, it loops and REPLACES `fc`, `fv`, `manLoad`. It does NOT double count.

// Wait. Look at the PR reviewer: "which suggests sumRows is double-counting manual amounts. You must fix the yld calculation in sumRows to pass the test"
// In `sumRows`, the `yld` calculation is:
// `x.yld = base > 0 && a > 0 ? 100*a/base : null;`
// where `base` is:
// `for (let j = 0; j < i; j++) if (wf[j].prep === 'manual') { const v = out.toAmt(manMg(wf[j].man), out[0]); if (v > 0) { base = v; out.baseMan = wf[j]; break; } }`
// The loop BREAKS after the first manual step. It doesn't sum them.
// But what if `manMg(wf[j].man)` itself is wrong? No.
