const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');
content = content.replace(
  /let res = \(m\.match\(\/Results:\[\^\]\*\/\) \|\| \[''\]\)\[0\];\n\s*T\.check\('zero_measured_shows_sample_in_methods', \/After the Final buffer exchange step, the sample held 0\\\.00 mg\/\.test\(res\), `Results: \$\{res\}`\);/g,
  "let res = (m.match(/Results:[^]*/) || [''])[0];\n    T.check('zero_measured_shows_sample_in_methods', /After the Final buffer exchange step, the sample held 0\\.00 mg/.test(m), `Methods text: ${m}`);"
);

content = content.replace(
  /let res2 = \(m2\.match\(\/Results:\[\^\]\*\/\) \|\| \[''\]\)\[0\];\n\s*T\.check\('unknown_shows_pool_methods', !\/the sample held 0\\\.00 mg\/\.test\(res2\), `Unknown text type: \$\{res2\}`\);/g,
  "let res2 = (m2.match(/Results:[^]*/) || [''])[0];\n    T.check('unknown_shows_pool_methods', !/the sample held 0\\.00 mg/.test(m2), `Methods text: ${m2}`);"
);
fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
