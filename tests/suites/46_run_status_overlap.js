const {open, H, suite, src, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('46_run_status_overlap');
  const {p, errs, close} = await open();
  const h = H(p);

  await T.t('overlap/toast-heading', async () => {
    // wait for layout
    await p.setViewportSize({ width: 800, height: 600 });

    // Add run
    await h.newProject('Smoke');
    await h.addRun([path.join(__dirname, '../data/chrom/imac_HisTrap_FF_1mL_step_u7.csv')]);

    const toast = p.locator('#toast');
    await toast.waitFor({ state: 'visible' });

    // Ensure we are viewing run panel
    await p.evaluate(() => { const el = document.querySelector('.run-panel'); if (el) el.click(); });
    await p.waitForSelector('#intPanel .intp-head');

    // Make the viewport very short so the toast overlaps the panel if it's at the bottom
    await p.setViewportSize({ width: 800, height: 400 });
    await p.waitForTimeout(200);

    // Scroll the #intPanel to the BOTTOM of the viewport
    // Scroll so that the bottom of the viewport is exactly the bottom of the intp-head.
    await p.evaluate(() => {
      const hd = document.querySelector('#intPanel .intp-head');
      // Scroll until it touches the bottom of the viewport
      window.scrollTo(0, hd.getBoundingClientRect().top + window.scrollY - window.innerHeight + hd.offsetHeight);
    });
    await p.waitForTimeout(200);

    // Check overlap at narrow width
    const hBox = await p.evaluate(() => document.querySelector('#intPanel .intp-head').getBoundingClientRect());
    const tBox = await p.evaluate(() => document.querySelector('#toast').getBoundingClientRect());

    if (hBox && tBox) {
      const overlap = !(tBox.bottom <= hBox.top || tBox.top >= hBox.bottom || tBox.right <= hBox.left || tBox.left >= hBox.right);
      T.check('no overlap at narrow width', !overlap, JSON.stringify({hBox, tBox}));
    }

    await p.setViewportSize({ width: 1200, height: 400 });
    await p.waitForTimeout(200);

    await p.evaluate(() => {
      const hd = document.querySelector('#intPanel .intp-head');
      window.scrollTo(0, hd.getBoundingClientRect().top + window.scrollY - window.innerHeight + hd.offsetHeight);
    });
    await p.waitForTimeout(200);

    const hBoxD = await p.evaluate(() => document.querySelector('#intPanel .intp-head').getBoundingClientRect());
    const tBoxD = await p.evaluate(() => document.querySelector('#toast').getBoundingClientRect());
    if (hBoxD && tBoxD) {
      const overlapD = !(tBoxD.bottom <= hBoxD.top || tBoxD.top >= hBoxD.bottom || tBoxD.right <= hBoxD.left || tBoxD.left >= hBoxD.right);
      T.check('no overlap at desktop width', !overlapD, JSON.stringify({hBoxD, tBoxD}));
    }
  });

  await close();
  T.done();
})();
