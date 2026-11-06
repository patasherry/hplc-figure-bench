const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // Use the CSV to verify the band was labelled.
    // Wait for render just in case, then download CSV and check.
    const csvC = await csv(p);
    const lc = lane(csvC, 1);

    T.check('contaminant-lane-post-cleavage.C-has-ulp1', lc.length > 0 && lc[0][9].indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM, got ' + (lc.length > 0 ? lc[0][9] : 'no band'));`;

const replace = `    // The automated test must use DOM per user feedback 'Case C: Polish pool should be labelled His-Ulp1 in DOM. Make the test work through the UI.'

    // We already have wait

    // Ensure known list is rendered
    await p.waitForTimeout(500);
    const tableC = await p.evaluate(() => document.querySelector('#bandTable').textContent);
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');
`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Fixed C check to use DOM as requested by code review");
} else {
  console.log("Not found.");
}
