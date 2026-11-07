const {open, H, suite, src} = require('../lib/harness');
const path = require('path');

(async () => {
  const T = suite('47_raw_files');

  await T.t('store and retrieve raw files UI', async () => {
    try {
        const {p, errs, close} = await open(), h = H(p);

        p.on('console', msg => console.log('PAGE LOG 1:', msg.text()));

        await h.newProject('Raw Test UI');

        const absolutePath = path.resolve(__dirname, '..', 'data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
        await h.addRun([absolutePath]);

        await h.wait(1500);

        // We need to unhide the panel to inspect it using locator
        await p.evaluate(() => {
          const el = document.getElementById('rawPanel');
          if (el) el.hidden = false;
        });
        await h.wait(500);

        // Check if the uploaded file is visible in the raw files panel before closing
        const hasFileBefore = await p.evaluate(() => {
          const el = document.getElementById('rawFileList');
          return el ? el.innerHTML.includes('imac_HisTrap_FF_1mL_step_u7.csv') : false;
        });

        // Trigger a save so it is persisted
        await h.step('figure');
        await h.wait(2000); // Give it time to save

        // Close and reopen the app
        await close();
        const {p: p2, errs: errs2, close: close2} = await open(), h2 = H(p2);

        p2.on('console', msg => console.log('PAGE LOG 2:', msg.text()));

        await p2.waitForTimeout(1000);

        // Open the most recent project from the recent projects list on the home screen
        await p2.evaluate(() => {
           const rec = document.querySelector('.recent');
           if (rec) rec.click();
        });

        await h2.wait(1500);

        await p2.evaluate(() => {
          const el = document.getElementById('rawPanel');
          if (el) el.hidden = false;
        });

        const hasFileAfter = await p2.evaluate(() => {
          const el = document.getElementById('rawFileList');
          return el ? el.innerHTML.includes('imac_HisTrap_FF_1mL_step_u7.csv') : false;
        });

        T.check('raw files present in DOM before load', hasFileBefore, 'File not visible before load');
        T.check('raw files present in DOM after load', hasFileAfter, 'File not visible after load');

        await close2();
    } catch (e) {
        T.check('threw', false, e.toString());
    }
  });

  T.done();
})();
