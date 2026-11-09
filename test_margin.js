const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');
console.log(html.indexOf('min_safety_margin'));
