const fs = require('fs');
const js = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const updated = js.replace(
  /const sec = isSec\(run\), thr = Math\.max/,
  "const sec = isSec(run) && !(xUnit(run) === 'min' && !(uvFlow(run) > 0)), thr = Math.max"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', updated);
