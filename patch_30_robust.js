const fs = require('fs');

let content = fs.readFileSync('tests/suites/30_robust.js', 'utf8');

content = content.replace("T.test.setTimeout(30000);", "if (T.test) { T.test.setTimeout(30000); }");

fs.writeFileSync('tests/suites/30_robust.js', content);
