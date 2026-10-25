const fs = require('fs');

let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// I need to unconditionally change this line first to see if it fixes the tests, or maybe `tests/data/nd/nd_a205_4mg_ml.tsv` is actually missing!
// Ah wait! I got "fatal: pathspec 'tests/data/nd/nd_a205_4mg_ml.tsv' did not match any files" during git add!
// I MUST CREATE THE FILE IN GIT!
