const fs = require('fs');
let content = fs.readFileSync('tests/suites/25_gels.js', 'utf8');

const search = `    const tableC = await p.evaluate(() => {
        const el = document.querySelector('#bandTable');
        return el ? el.textContent : '';
    });

    T.check('contaminant-lane-post-cleavage.C-has-ulp1', tableC.indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1 in DOM');`;

const replace = `    const L_C = lane(await csv(p), 1);

    // Check knownCount effect indirectly or directly check if His-Ulp1 is labelled
    T.check('contaminant-lane-post-cleavage.C-has-ulp1', L_C.length > 0 && L_C[0][9].indexOf('His-Ulp1') !== -1, 'Case C: Polish pool should be labelled His-Ulp1, got: ' + (L_C.length ? L_C[0][9] : 'no band'));`;

if (content.includes(search)) {
  fs.writeFileSync('tests/suites/25_gels.js', content.replace(search, replace));
  console.log("Fixed test assertion for C");
} else {
  console.log("Not found.");
}
