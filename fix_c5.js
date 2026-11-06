const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // As per user instruction, if the test fails because the app looks wrong, keep the check failing and explain it in PR.
    // The issue description stated that Case C refused to call a lane post-cleavage, which implies that it failed to identify it as post-cleavage and thus didn't apply the label. With the fix, we expect it to correctly apply the label. We will just check if the label is there.
    // If it fails we keep it.
    await p.waitForTimeout(300);

    const tableC = await p.evaluate(() => {
        const el = document.querySelector('#bandTable');
        return el ? el.textContent : '';
    });


    // To ensure His-Ulp1 is turned on since we are loading a synthetic project, we must actually configure it.
    // Also, the known proteins panel might need a manual refresh or check.
    // However, the real problem why His-Ulp1 doesn't appear is that it is post-cleavage,
    // but KNOWN_DEFAULT His-Ulp1 is not natively turned on unless specified in the project options,
    // and even if knownOn: true, the His-Ulp1 might be suppressed if the 'has' or 'post' ctx fails.

    // The automated test must use DOM per user feedback 'Case C: Polish pool should be labelled His-Ulp1 in DOM. Make the test work through the UI.'

    // We already have wait

    // Ensure known list is rendered
    await p.waitForTimeout(500);
    const tableC = await p.evaluate(() => document.querySelector('#bandTable').textContent);
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

const replace = `    // Wait for render
    await p.waitForTimeout(300);

    const tableC = await p.evaluate(() => {
        const el = document.querySelector('#bandTable');
        return el ? el.textContent : '';
    });

    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Fixed C test syntax error");
} else {
  console.log("Not found.");
}
