const fs = require('fs');
let t = fs.readFileSync('tests/suites/30_robust.js', 'utf8');
t = t.replace("const tl = await h.timeline();", "const tl = await h.timeline();\n  if (!tl.length) { errs.push('timeline empty'); }");
fs.writeFileSync('tests/suites/30_robust.js', t);
