const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');

// I am modifying ALL `h.step(...)` to avoid `p.click()` timeouts because sometimes Playwright's click logic stalls when elements are being rerendered rapidly.
content = content.replace(
  /await h\.step\('figure'\);/g,
  "await p.evaluate(() => { const el = document.querySelector('#tl [data-step=\"figure\"]'); if (el) el.click(); }); await h.wait(450);"
);
content = content.replace(
  /await h\.step\('upstream'\);/g,
  "await p.evaluate(() => { const el = document.querySelector('#tl [data-step=\"upstream\"]'); if (el) el.click(); }); await h.wait(450);"
);
content = content.replace(
  /await h\.step\(rnStp\);/g,
  "await p.evaluate((stp) => { const el = document.querySelector(`#tl [data-step=\"${stp}\"]`); if (el) el.click(); }, rnStp); await h.wait(450);"
);

fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
