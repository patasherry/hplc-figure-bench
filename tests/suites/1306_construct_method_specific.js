const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('1306_construct_method_specific'), {p, errs, close} = await open(), h = H(p);

  await T.t('construct-method-specific-fields', async () => {
    await h.newProject('Construct Method Test');
    await h.wait(500);

    // Click construct step
    await p.click('#tl [data-step="construct"]');
    await h.wait(300);

    // Initial check (should default to plasmid, method-specific inputs hidden)
    T.check('digest-hidden', await p.evaluate(() => document.querySelector('[data-cmethod="digest"]').hidden), 'Digest fields should be hidden initially');

    // Change to digest method
    await p.selectOption('#pr-cMethod', 'digest');
    await h.wait(300);

    T.check('digest-visible', await p.evaluate(() => !document.querySelector('[data-cmethod="digest"]').hidden), 'Digest fields should be visible');

    // Fill digest field
    await p.fill('#pr-cEnz', 'NdeI');
    await p.dispatchEvent('#pr-cEnz', 'change');
    await h.wait(300);

    // Change to overlap method
    await p.selectOption('#pr-cMethod', 'overlap');
    await h.wait(300);
    T.check('overlap-visible', await p.evaluate(() => !document.querySelector('[data-cmethod="overlap"]').hidden), 'Overlap fields should be visible');
    T.check('digest-hidden-again', await p.evaluate(() => document.querySelector('[data-cmethod="digest"]').hidden), 'Digest fields should be hidden again');

    // Verify value isn't deleted when hidden (checking the prep object state via UI if possible or just by changing back)
    await p.selectOption('#pr-cMethod', 'digest');
    await h.wait(300);
    T.check('digest-value-persists', await p.inputValue('#pr-cEnz') === 'NdeI', 'Digest field value should persist after hiding and showing');

  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
