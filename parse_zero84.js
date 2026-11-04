const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I modified line 3839: "change any falsity checks on purity y.pur (e.g. if (y.pur)) to strict null checks (if (y.pur != null)) so a purity of 0 or 0% is correctly rendered in the SVG."
// But in `yieldLine`: "y.pur != null && !(y.purEst && y.pur < 15)" was ALREADY checking != null in main?
// No, the test specifically sets `#pr-qcPurity` to `0% pure by gel`. And checks that `SVG includes 0% pure`.
// If `prep.qcPurity` is `0% pure by gel`, then `hasTxt(prep.qcPurity)` is TRUE.
// But `y.purTyped` is TRUE.
// So `hasTxt(prep.qcPurity) && !y.purTyped` is FALSE.
// If it is false, it falls back to `y.pur != null && !(y.purEst && y.pur < 15)`.

console.log(html.includes("!y.purTyped"));
