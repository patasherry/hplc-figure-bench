const {open, H, suite, src, fs, path} = require('../lib/harness');

(async () => {
  const T = suite('843_overlap');
  const {p, errs, close} = await open();
  const h = H(p);

  await T.t('Slide preset y-axis overlapping labels #843', async () => {

    // Evaluate bypassing UI to avoid timeouts
    await p.evaluate(() => {
      const el1 = document.querySelector('#tl [data-addmenu]');
      if (el1) el1.click();
      const el2 = document.querySelector('#tl [data-addstep=run]');
      if (el2) el2.click();
    });
    await p.setInputFiles('#file', path.resolve(__dirname, '../data/chrom/sec_semicolon_unicorn7.csv'));

    await p.evaluate(() => {
      document.querySelector('#o-preset').value = 'slide';
      document.querySelector('#o-preset').dispatchEvent(new Event('change'));
    });

    await h.wait(1000); // wait for render

    const ys = await p.locator('#paper svg > g[fill="#000000"] > text[text-anchor="end"]').evaluateAll(els => els.map(e => parseFloat(e.getAttribute('y'))));

    let overlap = false;
    for (let i = 0; i < ys.length - 1; i++) {
       if (Math.abs(ys[i] - ys[i+1]) < 10) overlap = true;
    }

    T.check("Slide preset y-axis doesn't overlap", !overlap, ys);
  });

  await T.t('Poster preset y-axis overlapping labels #843', async () => {

    await p.evaluate(() => {
      document.querySelector('#o-preset').value = 'poster';
      document.querySelector('#o-preset').dispatchEvent(new Event('change'));
    });

    await h.wait(1000); // wait for render

    const ys = await p.locator('#paper svg > g[fill="#000000"] > text[text-anchor="end"]').evaluateAll(els => els.map(e => parseFloat(e.getAttribute('y'))));

    let overlap = false;
    for (let i = 0; i < ys.length - 1; i++) {
       if (Math.abs(ys[i] - ys[i+1]) < 10) overlap = true;
    }

    T.check("Poster preset y-axis doesn't overlap", !overlap, ys);
  });

  T.done();
  await close();
})();
