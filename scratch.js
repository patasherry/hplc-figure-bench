const fs = require('fs');
const js = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const updated = js.replace(
  /const sec = isSec\(run\), thr = Math\.max\(10\*nsd, range\*\(/,
  "const sec = isSec(run) && !(xUnit(run) === 'min' && !(uvFlow(run) > 0)), thr = Math.max(10*nsd, range*("
).replace(
  /if \(sec && pk\.length\) \{ const sw = Math\.max\(3, Math\.round\(n\*0\.006\)\), sm = sgSmooth\(ys, 2\*sw \+ 1\), d2 = new Float64Array\(n\);/,
  "if (isSec(run) && pk.length) { const sw = Math.max(3, Math.round(n*0.006)), sm = sgSmooth(ys, 2*sw + 1), d2 = new Float64Array(n);"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', updated);
