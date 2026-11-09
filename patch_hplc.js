const fs = require('fs');
let text = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const sT = `x.stepY = myLoadedAmt > 0 && a > 0 ? 100*a/myLoadedAmt : null;
      x.fromKept = !!x.stepY && pk; x.loadedAmt = pk ? myLoadedAmt : null; if (a > 0) { const k = kept(x); prev = k > 0 ? k : a; prevKept = k > 0 || pk; }`;
const rT = `x.stepY = myLoadedAmt > 0 && a > 0 ? 100*a/myLoadedAmt : null;
      x.fromKept = !!x.stepY && pk; x.loadedAmt = pk ? myLoadedAmt : null; if (a > 0) { const k = kept(x); prev = k > 0 ? k : a; prevKept = k > 0 || (pk && k !== a); }`;
text = text.replace(sT, rT);

const sT2 = `x.stepY = calcPAmt > 0 && a > 0 ? 100*a/calcPAmt : null; x.fromKept = !!x.stepY && pk;
      x.loadedAmt = pKept ? pAmt : null;`;
const rT2 = `x.stepY = calcPAmt > 0 && a > 0 ? 100*a/calcPAmt : null; x.fromKept = !!x.stepY && pk;
      x.loadedAmt = pk ? calcPAmt : null;`;

text = text.replace(sT2, rT2);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', text);
