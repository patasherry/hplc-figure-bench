const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    // Wait for render
    await p.waitForTimeout(300);

    // We must ensure His-Ulp1 is enabled in the UI list
    await p.evaluate(() => {
        const btn = document.querySelector('#knownBtn');
        if (btn) btn.click();
    });
    await p.waitForTimeout(100);
    await p.evaluate(() => {
        const rows = document.querySelectorAll('#knownList tr');
        for (const row of rows) {
            if (row.textContent.includes('His-Ulp1')) {
                const cb = row.querySelector('input[type="checkbox"]');
                if (cb && !cb.checked) {
                    cb.click();
                }
            }
        }
    });
    await p.waitForTimeout(300);

    const tableC = await p.evaluate(() => {
        const el = document.querySelector('#bandTable');
        return el ? el.textContent : '';
    });

    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

const replace = `    const L_C = lane(await csv(p), 1);
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', L_C.length > 0 && L_C[0][9].indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1, got: ' + (L_C.length ? L_C[0][9] : 'no band'));`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Fixed C");
} else {
  console.log("Not found.");
}
