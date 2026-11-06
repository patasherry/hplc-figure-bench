const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');
    // Keeping failing check per user instructions
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

const replace = `    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Cleaned up");
} else {
  console.log("Not found.");
}
