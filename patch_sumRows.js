const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

code = code.replace(
  'secMw = {mw: top.sec.mw, ve: top.apex};',
  'secMw = {mw: top.sec.mw, ve: top.apex, extrap: top.sec.extrap};'
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
