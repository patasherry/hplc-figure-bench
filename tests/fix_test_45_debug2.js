const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

// I also need to replace `locator().fill()` with `p.evaluate()` because it times out!
content = content.replace(
  /const setField = async \(sel, v\) => \{ const l = p\.locator\(sel\)\.first\(\); await openFolds\(l\); await l\.fill\(String\(v\)\); await l\.dispatchEvent\('change'\); await h\.wait\(150\); \};/g,
  "const setField = async (sel, v) => { await p.evaluate(({s, val}) => { const el = document.querySelector(s); if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }, {s: sel, val: v}); await h.wait(150); };"
);

// We need to bypass `p.click` that timed out earlier!
content = content.replace(
  /await p\.click\(`#tl \[data-step="\$\{manStep\}"\]`\);/g,
  "await p.evaluate((ms) => { const el = document.querySelector(`#tl [data-step=\"${ms}\"]`); if (el) el.click(); }, manStep);"
);

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
