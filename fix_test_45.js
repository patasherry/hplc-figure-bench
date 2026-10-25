const fs = require('fs');
let code = fs.readFileSync('tests/suites/26_sec_calibration.js', 'utf8');

// For test 2, the app did NOT print `~108`, it just printed `108`!
// Why is it not extrapolated when standards are 12.2 and 18.2?
// My extrapolation logic in `secInfo`:
// `out.extrap = x < fit.xlo || x > fit.xhi;`
// where `x = fit.X(ve)`.
// If useKav is true, `x = (ve - v0)/(vt - v0)`.
// V0 = 8, Vt = 24.
// For ve = 12, Kav = (12 - 8) / 16 = 0.25.
// Standards: 12.2 and 18.2.
// Kav(12.2) = (12.2 - 8) / 16 = 4.2 / 16 = 0.2625.
// Kav(18.2) = (18.2 - 8) / 16 = 10.2 / 16 = 0.6375.
// `fit.xlo` = min(0.2625, 0.6375) = 0.2625.
// `x` = 0.25.
// `0.25 < 0.2625` is TRUE! So it SHOULD be extrapolated!
// But why did it output `108` instead of `~108`?
// Ah! Wait. Look at the output of test 2.
// Text is: `P1 12.00 0.250 108 ...`
// Where is this text from? `intTable`? Yes.
// Look at my patch for `sumRows`. That's for `#sumTable` and `sumNotes`!
// Wait! `intTable` is the Peak Integration Table.
// I patched `integTable`?
// Let's check `integTable` code.
