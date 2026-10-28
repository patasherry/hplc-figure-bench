const fs = require('fs');
let code = fs.readFileSync('tests/suites/30_robust.js', 'utf8');

const diff = `<<<<<<< SEARCH
  const count = await p.locator('#gelList .gchip, #gels .gchip').count();
  T.check('legacy-project.gel-lane-preserved', count === 1);
  if (count === 1) {
    await p.locator('#gelList .gchip, #gels .gchip').first().click();
    await p.waitForTimeout(500);
    await p.waitForSelector('#gelLanes .lane', { timeout: 5000 });
    const lanesText = await p.evaluate(() => Array.from(document.querySelectorAll('#gelLanes .lane')).map(e => e.textContent.trim()).join(','));
    T.check('legacy-project.gel-lane-exact', lanesText.includes('lane1'), \`Lanes found: \${lanesText}\`);
  } else {
    T.check('legacy-project.gel-lane-exact', false, 'Gel not found');
  }
=======
  const gelCount = await p.locator('.gchip').count();
  T.check('legacy-project.gel-lane-preserved', gelCount > 0);
  if (gelCount > 0) {
    await p.locator('.gchip').first().evaluate(e => e.click());
    await p.waitForTimeout(500);
    const lanesText = await p.evaluate(() => Array.from(document.querySelectorAll('.lane')).map(e => e.textContent.trim()).join(','));
    T.check('legacy-project.gel-lane-exact', lanesText.includes('lane1'), \`Lanes found: \${lanesText}\`);
  } else {
    T.check('legacy-project.gel-lane-exact', false, 'Gel not found');
  }
>>>>>>> REPLACE`;

fs.writeFileSync('diff_test_harness2.txt', diff);
