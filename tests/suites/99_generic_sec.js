const {open, H, suite, path, fs, DATA} = require('../lib/harness');

(async () => {
  const T = suite('99_generic_sec');
  const {p, errs, close} = await open();
  const h = H(p);
  try {
    await T.t('generic_sec', async () => {
      await h.newProject('generic sec test');
      await h.addRun(path.join(DATA, 'chrom', 'fixture_frac_uneven.csv'));
      await p.waitForTimeout(1000);
      const tl = await h.timeline();
      const run = tl.find(x => /^run/.test(x.k || '')) || tl.find(x => /IMAC|exclusion|exchange|column|run/i.test(x.t || ''));
      T.check('99_generic_sec/step-name', run && /Size exclusion/i.test(run.t || ''), 'expected Size exclusion');
      await h.step('figure');
    });
  } finally {
    T.check('99_generic_sec/no-page-errors', !errs.length, errs.join(' | '));
    await close();
  }
  T.done();
})();
