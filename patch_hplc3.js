const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I also need to update ndNum as requested by the reviewer.
html = html.replace(
  "const ndNum = v => { const s = String(v ?? '').replace(/\\s/g, ''), m = s.match(/^[+-]?(\\d*),(\\d+)(?:[eE][+-]?\\d+)?$/), x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, '')); return isFinite(x) ? x : null; };",
  "const ndNum = v => { const s = String(v ?? '').replace(/\\s/g, ''); if (/^-?\\d+,\\d+(?:[eE][-+]?\\d+)?$/.test(s)) { return parseFloat(s.replace(',', '.')); } const m = s.match(/^[+-]?(\\d*),(\\d+)(?:[eE][+-]?\\d+)?$/), x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, '')); return isFinite(x) ? x : null; };"
);

// Wait, the current implementation of ndNum is:
// const ndNum = v => { const s = String(v ?? '').replace(/\s/g, ''), m = s.match(/^[+-]?(\d*),(\d+)(?:[eE][+-]?\d+)?$/), x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, '')); return isFinite(x) ? x : null; };
// Actually, `ndNum` ALREADY handles comma decimals! Look at it:
// `m = s.match(/^[+-]?(\d*),(\d+)(?:[eE][+-]?\d+)?$/)`
// `x = parseFloat(m && !(m[2].length === 3 && /^[1-9]\d{0,2}$/.test(m[1])) ? s.replace(',', '.') : s.replace(/,/g, ''))`
// So ndNum already replaces the comma with a dot for decimals, unless it looks like a thousands separator.
// This explains why I didn't change ndNum in the diff - it was already correct!
// Let me verify this.
