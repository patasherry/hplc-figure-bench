const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const regex = /const labs = gelLabels\(g\), used = new Set\(labs\.map\(\(_, i\) => laneAssign\(g, i\)\)\.filter\(a => a && a !== 'marker'\)\);\n\s*set\('st-lanes', `\$\{labs.length\} lanes` \+ \(used.size \? `, \$\{used.size\} run\$\{used.size > 1 \? 's' : ''\}` : ', no runs'\)\);/g;

console.log(regex.exec(html));
