const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I also need to update `renderSumTable` to use `secMw.extrap`.
// Let's find where `secMw` is formatted in `renderSumTable`.
// Search for `kdaRound(sm.mw)` or similar.
