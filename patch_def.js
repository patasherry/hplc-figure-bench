const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');

html = html.replace(
  "const DEF = {pdbCode:'', protSeq:'', protSrc:'', tagSeq:'', tagPos:'N', mode:'overlay', stack:60, flip:false, xmin:'', xmax:'', ymin:'', ymax:'',",
  "const DEF = {pdbCode:'', protSeq:'', protSrc:'', tagSeq:'', tagPos:'N', mode:'overlay', stack:60, flip:false, xmin:'', xmax:'', ymin:'', ymax:'', min_safety_margin: 0,"
);
html = html.replace(
  "SANE_MAX = {w: 40, h: 40, wfW: 40, wfH: 20, wfGelH: 20, fs: 72, lw: 10, stack: 1000, runPad: 500, gelGap: 400, peakMax: 200, peakDec: 4, prom: 100, intProm: 100, path: 100, eps: 100, tagTol: 10, knownTol: 25, knownMin: 50, bandSens: 60, gelSide: 90, tagKda: 500, protKda: 2000, sbValue: 1e6, nLanes: 30};",
  "SANE_MAX = {w: 40, h: 40, wfW: 40, wfH: 20, wfGelH: 20, fs: 72, lw: 10, stack: 1000, runPad: 500, gelGap: 400, peakMax: 200, peakDec: 4, prom: 100, intProm: 100, path: 100, eps: 100, tagTol: 10, knownTol: 25, knownMin: 50, bandSens: 60, gelSide: 90, tagKda: 500, protKda: 2000, sbValue: 1e6, nLanes: 30, min_safety_margin: 500};"
);

// We need to add the UI input with data-opt="min_safety_margin". We'll put it near where `data-opt="runPad"` is maybe, or in the Workflow options. Let's find "Workflow options" or "runPad"
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
