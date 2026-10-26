const fs = require('fs');
let code = fs.readFileSync('tests/suites/30_robust.js', 'utf8');

const s1 = `  await reject('other-zip', path.join(Q, 'not_unicorn.zip'), 'zip with text files');`;
const r1 = `  await reject('other-zip', path.join(Q, 'not_unicorn.zip'), 'zip with text files');

  /* opt.known and opt.secCals sanitization */
  await T.t('malformed-opt', async () => {
    await h.newProject('Malformed opt');
    await p.setInputFiles(SEL.importFile, path.join(Q, 'malformed_project.json'));

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
      const closeBtn = document.querySelector('#homeBtn');
      if (closeBtn) closeBtn.click();
    });
  });`;

code = code.replace(s1, r1);
fs.writeFileSync('tests/suites/30_robust.js', code);
