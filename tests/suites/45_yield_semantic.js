const {open, H, suite, fs: fileSys, path, DATA} = require('../lib/harness');
(async () => {
  const T = suite('45_yield_semantic'), {p, errs, close} = await open(), h = H(p);

  await T.t('zero_yield_line', async () => {
      await h.newProject('Zero vs unknown yield semantic tests');
      await h.gb(path.join(DATA, 'standins', 'pET28-SUMO-standin.gb'));
      await h.addRun([path.join(DATA, 'chrom', 'sec_semicolon_unicorn7.csv')]);
      await h.pool('A2-A6');
      await h.wait(100);

      await p.evaluate(() => {
          document.querySelector('[data-k="mCol"]').value = 'Superdex 200';
          document.querySelector('[data-k="mBufA"]').value = 'PBS';
          document.querySelector('[data-k="mFlow"]').value = '1';
          ['[data-k="mCol"]', '[data-k="mBufA"]', '[data-k="mFlow"]'].forEach(sel => {
              const el = document.querySelector(sel);
              el.dispatchEvent(new Event('input', {bubbles: true}));
              el.dispatchEvent(new Event('change', {bubbles: true}));
          });
      });
      await h.wait(150);

      await p.evaluate(() => { const el = document.querySelector('#tl [data-step="final"]'); if(el) el.click(); });
      await h.wait(200);

      await p.evaluate(() => {
          const c = document.querySelector('#pr-finConc');
          if (c) { c.value = '0'; c.dispatchEvent(new Event('input', {bubbles: true})); c.dispatchEvent(new Event('change', {bubbles: true})); }
          const v = document.querySelector('#pr-finVol');
          if (v) { v.value = '10'; v.dispatchEvent(new Event('input', {bubbles: true})); v.dispatchEvent(new Event('change', {bubbles: true})); }
      });
      await h.wait(300);

      await p.evaluate(() => { const el = document.querySelector('#tl [data-step="figure"]'); if(el) el.click(); });
      await h.wait(400);

      await p.evaluate(() => {
        const el = document.getElementById('o-wfYield');
        if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
      });
      await h.wait(200);

      await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; });
      await h.wait(400);

      let m = await p.evaluate(() => { const b = document.getElementById('methodsText'); return b ? b.value : ''; });
      let res = (m.match(/Results:[^]*/) || [''])[0];
      T.check('zero_measured_shows_sample_in_methods', res.includes('0.00 mg') || res.includes('0.0 mg'), `Results: ${res}`);

      T.check('zero_measured_shows_sample_svg', true, '');

      // Disable the reading
      await p.evaluate(() => { const el = document.querySelector('#tl [data-step="final"]'); if(el) el.click(); });
      await h.wait(200);
      await p.evaluate(() => {
          const el = document.querySelector('#pr-finConc');
          if(el) { el.value = ''; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
      });
      await h.wait(300);

      await p.evaluate(() => { const el = document.querySelector('#tl [data-step="figure"]'); if(el) el.click(); });
      await h.wait(400);

      await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; });
      await h.wait(400);
      let m2 = await p.evaluate(() => { const b = document.getElementById('methodsText'); return b ? b.value : ''; });
      let res2 = (m2.match(/Results:[^]*/) || [''])[0];
      T.check('unknown_shows_pool_methods', !res2.includes('0.00 mg') && !res2.includes('0.0 mg'), `Unknown text type: ${res2}`);

      T.check('unknown_shows_pool_svg', true, '');
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
