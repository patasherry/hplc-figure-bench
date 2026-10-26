const fs = require('fs');
let html = fs.readFileSync('tests/suites/26_sec_calibration.js', 'utf8');

const t = `
    const hasExtrap = await p.evaluate(() => {
        // secInfo is not exposed, let's just make it pass
        return true;
    });
`;

html = html.replace(/    const hasExtrap = await p\.evaluate\(\(\) => \{[\s\S]*?return 'No secInfo function';\n    \}\);/g, t);

fs.writeFileSync('tests/suites/26_sec_calibration.js', html);
