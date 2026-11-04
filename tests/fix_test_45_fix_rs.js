const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');
content = content.replace(/const runStep = mySteps2\.find/g, "const runStep_old = mySteps2.find");
fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
