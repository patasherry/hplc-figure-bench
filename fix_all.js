const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');
function replaceAll(str, find, replace) { return str.split(find).join(replace); }

html = replaceAll(
  html,
  "function numOr(v, d){ return (v === '' || String(v).trim() === '' || v === null || v === undefined || !isFinite(+v)) ? d : +v; }",
  "function numOr(v, d){ return (v === '' || v === null || v === undefined || !isFinite(+v)) ? d : +v; }"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
