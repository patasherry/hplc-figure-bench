const fs = require('fs');

let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const s = code.match(/function loadedAfter\([\s\S]*?return mg; \}/)[0];

const newS = s.replace(
  "for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a !== null) mg = a; }",
  "for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a !== null) { mg = mg === null ? a : mg + a; } }"
);

// If `mg` is NOT supposed to be additive, then `a !== null ? a : mg` was used.
// "prevent additive double-counting of manual/transfer amounts"
