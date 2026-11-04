const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('822_eps'), {p, errs, close} = await open(), h = H(p);

  await T.t('11_eps_field_visible', async () => {
    // Navigate to quick mode
    await p.click('#homeBtn').catch(() => {});
    await h.wait(500);

    await h.newProject('Visual checks');
    await h.wait(500);

    // Test extinction coefficient visibility in Protein section
    await h.step('construct');
    await h.wait(400);
    const epsSelector = '#protPanel #o-eps';
    const epsVisible = await p.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none';
    }, epsSelector);

    T.check('eps_field_visible', epsVisible, 'Extinction coefficient field should be visible in Protein section');
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  if (T.done) T.done();
})();
