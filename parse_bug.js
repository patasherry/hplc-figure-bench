const fs = require('fs');

let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// The reviewer said "Inspect sumRows in hplc-figure-bench(WF1.13).html to see how yld is calculated for each row. The no_odd_yield_warning is triggered by yld > 100, which suggests sumRows is double-counting manual amounts."
let sumRowsCode = code.match(/function sumRows\(\)\{[\s\S]*?return out;\n\}/)[0];

const bug1 = sumRowsCode.match(/let base = first; out\.baseMan = null;[\s\S]*?break; \} \} \}/)[0];
console.log(bug1);

const match = sumRowsCode.match(/out\.forEach\(x => \{ const a = amt\(x\); x\.yld = base > 0 && a > 0 \? 100\*a\/base : null;/);
console.log(match ? true : false);

// Wait... if `sumRows` IS double counting, WHERE does it sum?
// Let's look at `sumRows` string for `+=`
console.log(sumRowsCode.match(/\+=/g));
