const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I modified line 3840
html = html.replace(
  "${hasTxt(prep.qcPurity) && !y.purTyped ? `, ${String(prep.qcPurity).trim()}` : y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}",
  "${hasTxt(prep.qcPurity) ? `, ${String(prep.qcPurity).trim()}` : y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}"
);
html = html.replace(
  "${hasTxt(prep.qcPurity) && !y.purTyped ? `, ${String(prep.qcPurity).trim()}` : y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}",
  "${hasTxt(prep.qcPurity) ? `, ${String(prep.qcPurity).trim()}` : y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
