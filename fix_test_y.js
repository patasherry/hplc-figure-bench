const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');
content = content.replace(/edits: \{added: \[\{lane: 1, y: 120\.5\/360\}\], removed: \[\]\} \/\/ Band at ~27 kDa\./g, "edits: {added: [{lane: 1, y: 195/360}], removed: []} // Band at ~27 kDa.");
fs.writeFileSync('tests/suites/25_gels.js', content);
console.log("Fixed y-coordinate in test");
