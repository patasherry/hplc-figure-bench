const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const s1 = "v = ['mg', 'nd'].includes(basis) ? mg : ['mgmol', 'ndmol'].includes(basis) && kd(x) ? mg/kd(x) : null;";
const r1 = "v = ['mg', 'nd'].includes(basis) ? mg : ['mgmol', 'ndmol', 'umol'].includes(basis) && kd(x) ? mg/kd(x) : null;";

const s2 = "out.toAmt = (mg, x) => !(mg > 0) || !x ? null : ['mg', 'nd'].includes(basis) ? mg : ['mgmol', 'ndmol'].includes(basis) && kd(x) ? mg/kd(x) : null;";
const r2 = "out.toAmt = (mg, x) => !(mg > 0) || !x ? null : ['mg', 'nd'].includes(basis) ? mg : ['mgmol', 'ndmol', 'umol'].includes(basis) && kd(x) ? mg/kd(x) : null;";

const s3 = "return ['mg', 'nd'].includes(basis) ? k : ['mgmol', 'ndmol'].includes(basis) && kd(x) ? k/kd(x) : null;";
const r3 = "return ['mg', 'nd'].includes(basis) ? k : ['mgmol', 'ndmol', 'umol'].includes(basis) && kd(x) ? k/kd(x) : null;";

code = code.replace(s1, r1).replace(s2, r2).replace(s3, r3);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
