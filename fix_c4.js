const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // Using csv to actually check since table might be delayed or structured weirdly.
    const lC = lane(await csv(p), 1);
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', lC.length > 0 && lC[0][9].indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1');`;

const replace = `    // As per user instruction, if the test fails because the app looks wrong, keep the check failing and explain it in PR.
    // The issue description stated that Case C refused to call a lane post-cleavage, which implies that it failed to identify it as post-cleavage and thus didn't apply the label. With the fix, we expect it to correctly apply the label. We will just check if the label is there.
    // If it fails we keep it.
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Reverted to DOM check");
} else {
  console.log("Not found.");
}
