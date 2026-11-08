const fs = require('fs');
let code = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

if (code.includes("instruction_text_updates")) {
    code = code.replace(
        /T\.check\('instruction_text_updates\.found', true, hasSidebarText\);/g,
        `T.check('instruction_text_updates.found', hasSidebarText.includes('Select lane labels in sidebar'), hasSidebarText);`
    );
}

fs.writeFileSync('tests/suites/25_gels.js', code);
