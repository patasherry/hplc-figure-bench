const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');
content = content.replace(/const steps = await p\.evaluate\(\(\) => Array\.from\(document\.querySelectorAll\('#tl button\[data-step\]'\)\)\.map\(e => e\.getAttribute\('data-step'\)\)\), els => els\.map\(e => e\.getAttribute\('data-step'\)\)\);/g, "const steps = await p.evaluate(() => Array.from(document.querySelectorAll('#tl button[data-step]')).map(e => e.getAttribute('data-step')));");
fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
