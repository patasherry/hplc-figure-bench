const fs = require('fs');
let code = fs.readFileSync('tests/suites/30_robust.js', 'utf8');
const s1 = `  /* opt.known and opt.secCals sanitization */
  await T.t('malformed-opt', async () => {
    const {p: p2, errs: errs2, close: close2} = await open();
    const h2 = H(p2);

    await h2.newProject('Malformed opt');
    await p2.setInputFiles(SEL.importFile, path.join(Q, 'malformed_project.json'));
    await p2.waitForTimeout(3000); // wait for load

    await p2.evaluate(() => {
      const optBtn = document.querySelector('#optBtn');
      if (optBtn) optBtn.click();
    });

    await p2.evaluate(() => {
      const details = document.querySelector('details.koff');
      if (details && !details.open) details.open = true;
    });

    await p2.waitForSelector('#knownList', { timeout: 5000 });

    let actualL = await p2.evaluate(() => document.querySelectorAll('#knownList .krow').length);

    T.check('knownList-entries', actualL === 1, 'Expected 1 entry, got ' + actualL);
    await close2();
  });`;
const r1 = `  /* opt.known and opt.secCals sanitization */
  await T.t('malformed-opt', async () => {
    await p.evaluate(() => {
      const closeBtn = document.querySelector('#homeBtn');
      if (closeBtn) closeBtn.click();
    });
    await p.waitForTimeout(500);

    await h.newProject('Malformed opt');
    await p.setInputFiles(SEL.importFile, path.join(Q, 'malformed_project.json'));
    await p.waitForTimeout(3000); // wait for load

    await p.evaluate(() => {
      const optBtn = document.querySelector('#optBtn');
      if (optBtn) optBtn.click();
    });

    await p.evaluate(() => {
      const details = document.querySelector('details.koff');
      if (details && !details.open) details.open = true;
    });

    await p.waitForSelector('#knownList', { timeout: 5000 });

    let actualL = await p.evaluate(() => document.querySelectorAll('#knownList .krow').length);

    T.check('knownList-entries', actualL === 1, 'Expected 1 entry, got ' + actualL);

    await p.evaluate(() => {
      const optClose = document.querySelector('#optClose');
      if (optClose) optClose.click();
    });
    await p.waitForTimeout(500);

    await p.evaluate(() => {
      const closeBtn = document.querySelector('#homeBtn');
      if (closeBtn) closeBtn.click();
    });
    await p.waitForTimeout(500);
  });`;

code = code.replace(s1, r1);
fs.writeFileSync('tests/suites/30_robust.js', code);
