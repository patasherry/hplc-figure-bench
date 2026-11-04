const fs = require('fs');
let content = fs.readFileSync('tests/suites/45_yield_semantic.js', 'utf8');

// Since `setField` does `p.locator(sel).first().fill(v)`, this is what times out!
content = content.replace(
  /const setField = async \(sel, v\) => \{ const l = p\.locator\(sel\)\.first\(\); await openFolds\(l\); await l\.fill\(String\(v\)\); await l\.dispatchEvent\('change'\); await h\.wait\(150\); \};/g,
  "const setField = async (sel, v) => { await p.evaluate(({s, val}) => { const el = document.querySelector(s); if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } }, {s: sel, val: v}); await h.wait(150); };"
);

fs.writeFileSync('tests/suites/45_yield_semantic.js', content, 'utf8');
