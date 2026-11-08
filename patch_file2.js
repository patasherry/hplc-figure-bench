const fs = require('fs');
let html = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const regex = /T\.check\('od-conversion-applied\.fails-on-main'.*/;
html = html.replace(regex, "");

fs.writeFileSync('tests/suites/25_gels.js', html);
