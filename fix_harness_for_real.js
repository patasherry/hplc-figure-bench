const fs = require('fs');

let tests = fs.readFileSync('tests/suites/20_science.js', 'utf8');

// What if the timeout on page.fill is inside h.newProject ?
// Because `await p.evaluate(() => { const el = document.querySelector('button, a, div:has-text("All projects")'); if(el) el.click(); }).catch(() => {});` doesn't wait for navigation!
// So when `h.newProject` is called, it does `await p.fill('#npName', name);` BUT we haven't navigated yet!
// So it times out!
// We MUST restore the original `await p.click('text=All projects', {timeout: 1000}).catch(() => {});`!

tests = tests.replace(/await p\.evaluate\(\(\) => \{ const el = document\.querySelector\('button, a, div:has-text\("All projects"\)'\); if\(el\) el\.click\(\); \}\)\.catch\(\(\) => \{\}\);/g, `await p.click('text=All projects', {timeout: 1000}).catch(() => {});`);

fs.writeFileSync('tests/suites/20_science.js', tests);
