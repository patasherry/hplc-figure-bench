const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');
html = html.replace(
  "${hasTxt(prep.qcPurity) && !y.purTyped ? `, ${String(prep.qcPurity).trim()}`",
  "${hasTxt(prep.qcPurity) ? `, ${String(prep.qcPurity).trim()}`"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
