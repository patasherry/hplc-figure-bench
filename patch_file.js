const fs = require('fs');

let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// The issue: "Establish a single source of truth for the 'final step' index and implement validation logic to prevent additive double-counting of manual/transfer amounts."
// We know finalYield uses this:
// const fin = rows.slice().reverse().find(x => mgOf(x) !== null);

// And finalYield calculates manLoad via:
// if (!meas && prep.on) { const wf = path || wfList(); for (let j = wf.indexOf(fin.r) + 1; j > 0 && j < wf.length; j++) if (wf[j].prep === 'manual' && manMg(wf[j].man) !== null) { const m = wf[j].man; fc = numOr(m.conc, null); fv = numOr(m.vol, null); meas = true; manLoad = mgOf(fin); } }
// But wait, what if `sumRows` ALSO loops and creates double counting?
// In `sumRows`:
// `let mg = null; for (let j = 0; j < i; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a !== null) mg = a; }`
// The PR reviewer says: "The no_odd_yield_warning is triggered by yld > 100, which suggests sumRows is double-counting manual amounts."
// If `sumRows` calculates `base`:
// `if (out.length && prep.on) { const wf = wfList(), i = wf.indexOf(out[0].r); for (let j = 0; j < i; j++) if (wf[j].prep === 'manual') { const v = out.toAmt(manMg(wf[j].man), out[0]); if (v > 0) { base = v; out.baseMan = wf[j]; break; } } }`
// This gets the FIRST manual amount `base = v`.

// BUT what if `loadedAfter` is double-counting?
// function loadedAfter(r){ const wf = wfList(), i = wf.indexOf(r); let mg = r && r.id ? (btwMg(r) || {}).mg || null : null; if (mg) mg *= btwSplit((prep.btw || {})[r.id]).f;
//   for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a !== null) mg = a; }
//   return mg; }

// What if the "double counting" is caused by BOTH steps (manLoad) adding to something in `finalYield` or `yieldLine`?
