const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

code = code.replace(
  'samples.push({x: fit.X(rw.apex), mw: si.mw, name: rw.name, run: r.name});',
  'samples.push({x: fit.X(rw.apex), mw: si.mw, name: rw.name, run: r.name, extrap: si.extrap});'
);

code = code.replace(
  'const tx = `\\u25B2 ${q.name} (${kdaRound(q.mw)} kDa)`;',
  'const tx = `\\u25B2 ${q.name} (${q.extrap ? \'~\' : \'\'}${kdaRound(q.mw)} kDa)`;'
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
