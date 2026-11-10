const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const finalYieldMatch = code.match(/function finalYield\([\s\S]*?return \{fin[\s\S]*?\}\); \}/)[0];
let newFinalYieldMatch = finalYieldMatch.replace(
  "for (let j = wf.indexOf(fin.r) + 1; j > 0 && j < wf.length; j++) if (wf[j].prep === 'manual' && manMg(wf[j].man) !== null) { const m = wf[j].man; fc = numOr(m.conc, null); fv = numOr(m.vol, null); meas = true; manLoad = mgOf(fin); }",
  "const manSt = wf.slice(wf.indexOf(fin.r) + 1).filter(w => w.prep === 'manual' && manMg(w.man) !== null); if (manSt.length) { const m = manSt[manSt.length - 1].man; fc = numOr(m.conc, null); fv = numOr(m.vol, null); meas = true; manLoad = mgOf(fin); }"
);

// Wait, the single source of truth for the 'final step' index!
// We can define it in sumRows and assign it to the output, e.g. `out.finIdx`.
// We already replaced it!
const sumRowsMatch = code.match(/const amt = x =>[\s\S]*?out\.mgOf =[\s\S]*?const first =[\s\S]*?out\.baseMan = wf\[j\]; break; \} \} \}/)[0];

const newSumRows = sumRowsMatch.replace(
  "const wf = prep.on ? wfList() : runs.filter(r => r.inWf), hasBranches = wf.some(x => x.wfFrom);",
  "const wf = prep.on ? wfList() : runs.filter(r => r.inWf), hasBranches = wf.some(x => x.wfFrom);\n  out.finIdx = out.slice().reverse().findIndex(x => out.mgOf(x) !== null);\n  out.finIdx = out.finIdx >= 0 ? out.length - 1 - out.finIdx : -1;"
);

let newCode = code.replace(sumRowsMatch, newSumRows);

newFinalYieldMatch = newFinalYieldMatch.replace(
  "const fin = rows.slice().reverse().find(x => mgOf(x) !== null); if (!fin) return null;",
  "const fin = allRows.finIdx >= 0 && (!path || allRows[allRows.finIdx]) ? allRows[allRows.finIdx] : null; if (!fin || (path && !path.includes(fin.r))) return null;"
);

newCode = newCode.replace(finalYieldMatch, newFinalYieldMatch);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', newCode);
