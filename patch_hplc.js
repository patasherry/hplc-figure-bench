const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const s1 = `const tidyOpt = () => { if (!opt.tidy13) { opt.wfYield = false; opt.secStds = false; opt.tidy13 = true; } if (!opt.tidy14) { opt.noGelSlot = false; if (numOr(opt.wfGelH, 1.8) === 1.8) opt.wfGelH = 1.3; opt.tidy14 = true; } }; tidyOpt();
if (!Array.isArray(opt.known)) opt.known = KNOWN_DEFAULT.map(k => Object.assign({}, k));
else { opt.known = opt.known.filter(k => k && typeof k === 'object'); opt.known.forEach(k => { const d = KNOWN_DEFAULT.find(x => x.name === k.name && x.kind === k.kind); if (d) { k.kda = d.kda; k.ctx = d.ctx; k.src = d.src; if (d.app) k.app = d.app; else delete k.app; } }); }`;

const r1 = `const tidyOpt = () => { if (!opt.tidy13) { opt.wfYield = false; opt.secStds = false; opt.tidy13 = true; } if (!opt.tidy14) { opt.noGelSlot = false; if (numOr(opt.wfGelH, 1.8) === 1.8) opt.wfGelH = 1.3; opt.tidy14 = true; } };
function sanitizeOpt() {
  tidyOpt();
  if (!Array.isArray(opt.known)) opt.known = KNOWN_DEFAULT.map(k => Object.assign({}, k));
  else { opt.known = opt.known.filter(k => k && typeof k === 'object'); opt.known.forEach(k => { const d = KNOWN_DEFAULT.find(x => x.name === k.name && x.kind === k.kind); if (d) { k.kda = d.kda; k.ctx = d.ctx; k.src = d.src; if (d.app) k.app = d.app; else delete k.app; } }); }
  if (!Array.isArray(opt.secCals)) opt.secCals = [];
  else opt.secCals = opt.secCals.filter(c => c && typeof c === 'object');
}
sanitizeOpt();`;

code = code.replace(s1, r1);

const s2 = `if (myKnown) { const pk = Array.isArray(dopt.known) ? dopt.known : []; opt.known = myKnown.concat(pk.filter(k => !myKnown.some(m => m.name === k.name && +m.kda === +k.kda))); } tidyOpt(); }`;
const r2 = `if (myKnown) { const pk = Array.isArray(dopt.known) ? dopt.known : []; opt.known = myKnown.concat(pk.filter(k => !myKnown.some(m => m.name === k.name && +m.kda === +k.kda))); } sanitizeOpt(); }`;

code = code.replace(s2, r2);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
