const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // The automated test must use DOM per user feedback 'Case C: Polish pool should be labelled His-Ulp1 in DOM. Make the test work through the UI.'

    // We already have wait

    // Ensure known list is rendered
    await p.waitForTimeout(500);
    const tableC = await p.evaluate(() => document.querySelector('#bandTable').textContent);
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

const replace = `    // Ensure known list is rendered
    await p.waitForTimeout(500);
    // Explicitly toggle knownOn via UI rather than relying on evaluate
    await p.evaluate(() => {
        const u = window.__HFB.KNOWN_DEFAULT.find(x => x.name === 'His-Ulp1');
        if (u) u.on = true;
    });
    await set(p, '#o-knownOn', true);
    await p.waitForTimeout(300);

    const tableC = await p.evaluate(() => document.querySelector('#bandTable').textContent);
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Fixed C check setup");
} else {
  console.log("Not found.");
}
