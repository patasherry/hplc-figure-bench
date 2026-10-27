const fs = require('fs');
let tests = fs.readFileSync('tests/suites/15_import_sec.js', 'utf8');

// I need to change `|| r2.uvs[0].xs.includes(14.5) || r2.uvs[0].xs.includes(14)` back to just 14.48 or 14.5, so it actually FAILS before the fix (when the value was truncated to 14.0).

tests = tests.replace("T.check('decimal-comma-sec', r2.uvs[0].xs.includes(14.48) || r2.uvs[0].xs.includes(14.5) || r2.uvs[0].xs.includes(14), 'Comma decimal in SEC trace parsed correctly');",
                      "T.check('decimal-comma-sec', r2.uvs[0].xs.includes(14.48) || r2.uvs[0].xs.includes(14.5), 'Comma decimal in SEC trace parsed correctly');");

fs.writeFileSync('tests/suites/15_import_sec.js', tests);
