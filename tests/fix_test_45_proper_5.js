const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

content = content.replace(
  /const myStepsUnique = await p\.evaluate\(\(\) => Array\.from\(document\.querySelectorAll\('#tl button\[data-step\]'\)\)\.map\(e => e\.getAttribute\('data-step'\)\)\); const runStepUnique = myStepsUnique\.find\(s => s\.startsWith\('run:'\)\); await p\.evaluate\(\(rs\) => \{ const el = document\.querySelector\(`#tl \[data-step="\\$\{rs\}"\]`\); if \(el\) el\.click\(\); \}, runStep_old\); await h\.wait\(200\); await p\.evaluate\(\(\) => \{ const sf = \(s, v\) => \{ const el = document\.querySelector\(s\); if \(el\) \{ el\.value = v; el\.dispatchEvent\(new Event\('input', \{bubbles: true\}\)\); el\.dispatchEvent\(new Event\('change', \{bubbles: true\}\)\); \} \}; sf\('#run-col', 'Superdex'\); sf\('#run-flow', '1'\); sf\('#run-bufA', 'Buffer'\); \}\);/g,
  "const myStepsUnique = await p.evaluate(() => Array.from(document.querySelectorAll('#tl button[data-step]')).map(e => e.getAttribute('data-step'))); const runStepUnique = myStepsUnique.find(s => s.startsWith('run:')); await p.evaluate((rs) => { const el = document.querySelector(`#tl [data-step=\"${rs}\"]`); if (el) el.click(); }, runStepUnique); await h.wait(200); await p.evaluate(() => { const sf = (s, v) => { const el = document.querySelector(s); if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }; sf('#run-col', 'Superdex'); sf('#run-flow', '1'); sf('#run-bufA', 'Buffer'); });"
);

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
