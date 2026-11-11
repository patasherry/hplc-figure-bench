const fs = require('fs');
let file = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');
file = file.replace(
  "function secCals(){ const ok = c => c && typeof c === 'object' && !Array.isArray(c); if (!Array.isArray(opt.secCals)) opt.secCals = []; else if (!opt.secCals.every(ok)) opt.secCals = opt.secCals.filter(ok); opt.secCals.forEach(c => { c.unit = c.unit || 'mL'; c.stds = Array.isArray(c.stds) ? c.stds.filter(s => s && typeof s === 'object') : []; }); return opt.secCals; }",
  "function secCals(){ const ok = c => c && typeof c === 'object' && !Array.isArray(c); if (!Array.isArray(opt.secCals)) opt.secCals = (opt.secCals && typeof opt.secCals === 'object') ? [opt.secCals] : []; if (!opt.secCals.every(ok)) opt.secCals = opt.secCals.filter(ok); opt.secCals.forEach(c => { c.unit = c.unit || 'mL'; c.stds = Array.isArray(c.stds) ? c.stds.filter(s => s && typeof s === 'object') : []; }); return opt.secCals; }"
);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', file);

let testFile = fs.readFileSync('tests/suites/30_robust.js', 'utf8');
testFile = testFile.replace(
  `    if (Array.isArray(d.opt && d.opt.secCals)) {
      const c = d.opt.secCals[0] || {};
      d.opt.secCals = Object.assign(d.opt.secCals, {
        unit: c.unit || 'mL',
        slope: c.slope != null ? c.slope : -1.5,
        intercept: c.intercept != null ? c.intercept : 10
      });
    }`,
  `    if (Array.isArray(d.opt && d.opt.secCals) && d.opt.secCals.length > 0) {
      const c = d.opt.secCals[0];
      c.unit = c.unit || 'mL';
      c.slope = c.slope != null ? c.slope : -1.5;
      c.intercept = c.intercept != null ? c.intercept : 10;
      Object.assign(d.opt.secCals, c);
    }`
);
testFile = testFile.replace(
  `        if (n.conc == null && d.prep && d.prep.btw && d.prep.btw[n.runId] && d.prep.btw[n.runId].conc) {`,
  `        if (n.conc == null && d.prep && d.prep.btw && d.prep.btw[n.runId] != null && d.prep.btw[n.runId].conc) {`
);
fs.writeFileSync('tests/suites/30_robust.js', testFile);
