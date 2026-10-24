const fs = require('fs');
let code = fs.readFileSync('tests/suites/40_visual.js', 'utf8');
code = code.replace(/T\.check\('synthetic-calibrated-gel:elements-exist', labelChecks\.hasBand && labelChecks\.hasKnown && labelChecks\.hasVert, JSON\.stringify\(labelChecks\)\);/, `
    console.log(labelChecks.allTexts);
    T.check('synthetic-calibrated-gel:elements-exist', labelChecks.hasBand && labelChecks.hasKnown && labelChecks.hasVert, JSON.stringify(labelChecks));
`);
fs.writeFileSync('tests/suites/40_visual.js', code);
