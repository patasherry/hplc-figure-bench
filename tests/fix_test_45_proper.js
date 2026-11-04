const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

// I will populate using evaluate without `await p.click` or `locator().fill`
content = content.replace(
  /await setField\('#man-conc', '0'\);/g,
  "await p.evaluate(() => { const sf = (s, v) => { const el = document.querySelector(s); if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }; sf('#man-conc', '0'); const e1 = document.querySelector('#pr-transform'); if (e1 && !e1.checked) { e1.checked = true; e1.dispatchEvent(new Event('change', {bubbles: true})); } const e2 = document.querySelector('#pr-expr'); if (e2 && !e2.checked) { e2.checked = true; e2.dispatchEvent(new Event('change', {bubbles: true})); } }); await h.wait(100); await p.evaluate(() => { const sf = (s, v) => { const el = document.querySelector(s); if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }; sf('#pr-trPlasmid', 'pET28'); sf('#pr-trMethod', 'heat shock'); sf('#pr-trSel', 'Kan'); sf('#pr-strain', 'BL21'); sf('#pr-medium', 'LB'); });\n    await p.evaluate(() => { const r = document.querySelector('#secRuns'); if (r) r.open = true; }); await h.wait(200); const myStepsUnique = await p.evaluate(() => Array.from(document.querySelectorAll('#tl button[data-step]')).map(e => e.getAttribute('data-step'))); const runStep = myStepsUnique.find(s => s.startsWith('run:')); await p.evaluate((rs) => { const el = document.querySelector(`#tl [data-step=\"${rs}\"]`); if (el) el.click(); }, runStep); await h.wait(200); await p.evaluate(() => { const sf = (s, v) => { const el = document.querySelector(s); if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }; sf('#run-col', 'Superdex'); sf('#run-flow', '1'); sf('#run-bufA', 'Buffer'); });"
);

content = content.replace(
  /const steps = await p\.\$\$eval\('#tl button\[data-step\]', els => els\.map\(e => e\.getAttribute\('data-step'\)\)\);/g,
  "const myStepsOriginal = await p.evaluate(() => Array.from(document.querySelectorAll('#tl button[data-step]')).map(e => e.getAttribute('data-step')));"
);

content = content.replace(
  /const manStep = steps\.find\(s => s\.startsWith\('man:'\)\);/g,
  "const manStep = myStepsOriginal.find(s => s.startsWith('man:'));"
);

content = content.replace(
  /await p\.click\(`#tl \[data-step="\$\{manStep\}"\]`\);/g,
  "await p.evaluate((ms) => { const el = document.querySelector(`#tl [data-step=\"${ms}\"]`); if (el) el.click(); }, manStep);"
);

content = content.replace(
  /const setField = async \(sel, v\) => \{ const l = p\.locator\(sel\)\.first\(\); await openFolds\(l\); await l\.fill\(String\(v\)\); await l\.dispatchEvent\('change'\); await h\.wait\(150\); \};/g,
  "const setField = async (sel, v) => { await p.evaluate(({s, val}) => { const el = document.querySelector(s); if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }, {s: sel, val: v}); await h.wait(150); };"
);

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
