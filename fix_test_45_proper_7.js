const fs = require('fs');
let content = fs.readFileSync('tests/suites/45_yield_semantic.js', 'utf8');

content = content.replace(/runStep_old/g, "runStep");

fs.writeFileSync('tests/suites/45_yield_semantic.js', content, 'utf8');
