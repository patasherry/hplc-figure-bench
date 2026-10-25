const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// IT STILL HAS PAD = 0.08!
// Why did my earlier replace fail?
// Oh! My earlier patch for `secInfo` must have been overwritten or didn't stick, or I was modifying the wrong thing!
// Let me patch it again!

code = code.replace(
  `  if (fit.mw) { out.mw = fit.mw(ve); const x = fit.X(ve), pad = 0.08*(fit.xhi - fit.xlo); out.extrap = x < fit.xlo - pad || x > fit.xhi + pad;`,
  `  if (fit.mw) { out.mw = fit.mw(ve); const x = fit.X(ve); out.extrap = x < fit.xlo || x > fit.xhi;`
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
