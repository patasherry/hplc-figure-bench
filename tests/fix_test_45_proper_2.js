const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

content = content.replace(/const runStep = myStepsUnique\.find/g, "const runStepUnique = myStepsUnique.find");
content = content.replace(/await p\.evaluate\(\(rs\) => \{ const el = document\.querySelector\(`#tl \[data-step="\\$\{rs\}"\]`\); if \(el\) el\.click\(\); \}, runStep\);/g, "await p.evaluate((rs) => { const el = document.querySelector(`#tl [data-step=\"${rs}\"]`); if (el) el.click(); }, runStepUnique);");

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
