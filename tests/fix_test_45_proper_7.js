const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

content = content.replace(
  /const myStepsOriginal = await p\.\$eval\('#tl button\[data-step\]', els => els\.map\(e => e\.getAttribute\('data-step'\)\)\);/g,
  "const myStepsOriginal = await p.evaluate(() => Array.from(document.querySelectorAll('#tl button[data-step]')).map(e => e.getAttribute('data-step')));"
);

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
