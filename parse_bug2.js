const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

let sumRowsCode = code.match(/function sumRows\(\)\{[\s\S]*?return out;\n\}/)[0];

const plus = sumRowsCode.match(/.*?\+=.*?/g);
console.log(plus);
