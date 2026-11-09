const {open, H, suite, path, src, DATA} = require('../lib/harness');
(async () => {
  const T = suite('21_methods_text_gaps');
  const {p, errs, close} = await open();
  const h = H(p);
  await T.t('methods-missing-fields', async () => {
    await h.newProject('Missing Fields Test');
    await h.addRun(path.join(DATA, 'standins', 'imac_histrap_1ml_step.csv'));
    await h.pool('T1-T6');
    await h.step('figure');
    await h.wait(500);
    const ts = p.locator('#tl [data-step="figure"] .ts');
    const text = await ts.textContent();
    T.check('has-specific-missing-fields', text.includes('Still needed for Methods text:') && text.includes('Transformation') && text.includes('Expression') && text.includes('flow rate') && text.includes('buffer'), 'Should list specific missing fields, got: ' + text);
  });
  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();