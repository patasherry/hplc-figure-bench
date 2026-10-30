const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

html = html.replace(
  /if \(mg > 0\) \{ const x = out\[0\], v = \['mg', 'nd'\]\.includes\(basis\) \? mg : \['mgmol', 'ndmol'\]\.includes\(basis\) && kd\(x\) \? mg\/kd\(x\) : null; if \(v > 0\) \{ prev = v; prevKept = true; \} \} \}/,
  "if (mg > 0) { const x = out[0], v = ['mg', 'nd'].includes(basis) ? mg : ['mgmol', 'ndmol'].includes(basis) && kd(x) ? mg/kd(x) : basis === 'umol' && kd(x) ? mg/kd(x) : null; if (v > 0) { prev = v; prevKept = true; } } }"
);

html = html.replace(
  /out\.toAmt = \(mg, x\) => !\(mg > 0\) \|\| !x \? null : \['mg', 'nd'\]\.includes\(basis\) \? mg : \['mgmol', 'ndmol'\]\.includes\(basis\) && kd\(x\) \? mg\/kd\(x\) : null;/,
  "out.toAmt = (mg, x) => !(mg > 0) || !x ? null : ['mg', 'nd'].includes(basis) ? mg : ['mgmol', 'ndmol'].includes(basis) && kd(x) ? mg/kd(x) : basis === 'umol' && kd(x) ? mg/kd(x) : null;"
);

html = html.replace(
  /const kept = x => \{ const k = prep\.on \? loadedAfter\(x\.r\) : null; if \(!\(k > 0\)\) return null; return \['mg', 'nd'\]\.includes\(basis\) \? k : \['mgmol', 'ndmol'\]\.includes\(basis\) && kd\(x\) \? k\/kd\(x\) : null; \};/,
  "const kept = x => { const k = prep.on ? loadedAfter(x.r) : null; if (!(k > 0)) return null; return ['mg', 'nd'].includes(basis) ? k : ['mgmol', 'ndmol'].includes(basis) && kd(x) ? k/kd(x) : basis === 'umol' && kd(x) ? k/kd(x) : null; };"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
