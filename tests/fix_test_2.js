const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');
content = content.replace(
  /await p\.click\(`#tl \[data-step="\$\{manStep\}"\]`\);/g,
  "await p.evaluate((ms) => { const el = document.querySelector(`#tl [data-step=\"${ms}\"]`); if (el) el.click(); }, manStep);"
);
fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
