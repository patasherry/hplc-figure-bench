const fs = require('fs');
let content = fs.readFileSync('suites/45_yield_semantic.js', 'utf8');
content = content.replace(
  /const mySteps2 =/g,
  "let mySteps2 ="
);
fs.writeFileSync('suites/45_yield_semantic.js', content, 'utf8');
