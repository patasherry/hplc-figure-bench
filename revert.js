const fs = require('fs');

const orig = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const updated = orig.replace(
  /function numOr\(v, d\)\{ return \(v === '' \|\| v === null \|\| v === undefined \|\| !isFinite\(\+v\)\) \? d : \+v; \}/g,
  "function numOr(v, d){ return (v === '' || String(v).trim() === '' || v === null || v === undefined || !isFinite(+v)) ? d : +v; }"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', updated);
