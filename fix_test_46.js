const fs = require('fs');
let code = fs.readFileSync('tests/suites/26_sec_calibration.js', 'utf8');

// I am getting `108` instead of `~108`.
// Why?
// The standard is 10kDa at 18mL. Wait, 18.2mL!
// Standard 1: 100kDa at 12.2mL.
// Let's recalculate `fit.xlo` and `fit.xhi` for 12.2mL and 18.2mL standards!
// V0 = 8, Vt = 24.
// Kav(12.2) = (12.2 - 8) / 16 = 4.2 / 16 = 0.2625.
// Kav(18.2) = (18.2 - 8) / 16 = 10.2 / 16 = 0.6375.
// Wait, the sample peak is at 12.00mL.
// Kav(12.00) = (12 - 8) / 16 = 4 / 16 = 0.250.
// Is 0.250 < 0.2625? YES!
// Then WHY is `si.extrap` false for 12.00mL peak?
// Ah! Wait!
// `secInfo` uses `const x = fit.X(ve); out.extrap = x < fit.xlo || x > fit.xhi;`
// BUT wait, `secInfo` is in `hplc-figure-bench(WF1.13).html`.
// Let's look at `secInfo` again!
