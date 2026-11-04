const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

content = content.replace(
  /const runStep = mySteps2\.find\(s => s\.startsWith\('run:'\)\);/g,
  "const runStep_old = mySteps2.find(s => s.startsWith('run:'));"
);

content = content.replace(
  /await p\.evaluate\(\(rs\) => \{ const el = document\.querySelector\(`#tl \[data-step="\$\{rs\}"\]`\); if \(el\) el\.click\(\); \}, runStep\);/g,
  "await p.evaluate((rs) => { const el = document.querySelector(`#tl [data-step=\"${rs}\"]`); if (el) el.click(); }, runStep_old);"
);

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
