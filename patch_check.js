const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

console.log(html.includes('updateCloneStatus'));
console.log(html.includes('CLONE_SCHEMA'));
