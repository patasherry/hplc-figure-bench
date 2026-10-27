const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// The reviewer noticed ndNum was not updated! Let's update ndNum!
html = html.replace(
  "const ndNum = v => { const s = String(v ?? '').replace(/\\s/g, ''), m = s.match(/^[+-]?(\\d*),(\\d+)(?:[eE][+-]?\\d+)?$/), x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, '')); return isFinite(x) ? x : null; };",
  "const ndNum = v => { const s = String(v ?? '').replace(/\\s/g, ''), m = s.match(/^[+-]?(\\d*),(\\d+)(?:[eE][+-]?\\d+)?$/), x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, '')); return isFinite(x) ? x : null; };" // wait, wait... let me check how it looks currently
);
// Actually, I'll just check it first.
