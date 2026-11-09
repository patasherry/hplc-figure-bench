const fs = require('fs');
let text = fs.readFileSync('tests/suites/40_visual.js', 'utf-8');

text = text.replace(
  "conc: 1500, sec: 2300, final: 1900",
  "conc: 1600, sec: 2300, final: 1900"
);
text = text.replace(
  "conc: 1500, sec: 2300, final: 1900",
  "conc: 1600, sec: 2300, final: 1900"
);

fs.writeFileSync('tests/suites/40_visual.js', text);
