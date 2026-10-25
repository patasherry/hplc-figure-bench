const fs = require('fs');
let code = fs.readFileSync('tests/suites/40_visual.js', 'utf8');

// The test `min-font-size` was added, but the fix to `hplc-figure-bench(WF1.13).html` was reverted by `git reset HEAD ...`.
// So the test fails, which is expected before the fix!
