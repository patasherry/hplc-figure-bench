const fs = require('fs');
let text = fs.readFileSync('tests/suites/16_nanodrop.js', 'utf8');

text = text.replace("T.check('nd/suffix-measurement-validation', JSON.stringify(rows) === JSON.stringify([{name: 'Suffix A', value: '0.05 mg/mL'}, {name: 'Suffix star', value: '1.23 mg/mL'}]), JSON.stringify(rows));",
"T.check('nd/suffix-measurement-validation', JSON.stringify(rows) === JSON.stringify([{name: 'Suffix A', value: '0.05 mg/mL'}, {name: 'Suffix star', value: '1.23 mg/mL'}]), JSON.stringify(rows));");

// Wait, the error is `els.map is not a function`. It means `p.$$eval(SEL.row, els => els.map(...))` failed because `els` was empty or something?
// Actually if `els` is empty, `els.map` is still a function (array).
// Wait, `p.$$eval(SEL.row, els => els.map(...))` - `els` is an Array of Elements.
// Wait, if no rows are present, the test might timeout or `els` could be wrong. Let's see the zero-measurement test:
// `await p.locator(SEL.row).first().waitFor();`
// If it fails to find `.ndr`, it will timeout. But the error is "page.$eval: TypeError: els.map is not a function".
// Oh! Did I use `p.$eval` instead of `p.$$eval` by mistake?
// Wait, the test uses `await p.$$eval(SEL.row, els => els.map(el => ({...})))`
// If `SEL.row` evaluates to an empty array for `$$eval` it works. If it evaluates to a string selector, it works.
// Let's check `tests/suites/16_nanodrop.js` what `SEL.row` is.
