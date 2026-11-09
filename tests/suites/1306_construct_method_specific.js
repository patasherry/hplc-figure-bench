// Issue #1306: Add optional method-specific construct record templates
// Store common design facts plus namespaced method details, render only relevant fields
// without deleting hidden values, and label all templates as records rather than scientific validation.
const {open, H, suite, fs, src} = require('../lib/harness');

(async () => {
  const T = suite('1306_construct_method_specific'), {p, errs, close} = await open(), h = H(p);

  await T.t('construct-method-specific-records', async () => {
    await h.newProject('Construct Method Test');
    await h.wait(500);

    // Click construct step
    await p.click('#tl [data-step="construct"]');
    await h.wait(300);

    // 1. Check template record selector existence (fails on main, passes on branch)
    const selExists = await p.evaluate(() => !!document.querySelector('#pr-cMethod'));
    T.check('construct-template-selector', selExists, 'Cloning method record template selector should exist');

    // 2. Check record notice: templates labeled as records rather than scientific validation (fails on main, passes on branch)
    const noticeText = await p.evaluate(() => {
      const el = document.querySelector('#pr-cTemplateNotice');
      return el ? el.textContent : '';
    });
    T.check('construct-record-notice', noticeText.includes('records rather than scientific validation'), 'Record notice should specify templates are records rather than scientific validation');

    if (selExists) {
      // 3. Initial state: digest field hidden under default plasmid/custom record
      const digestHidden = await p.evaluate(() => {
        const el = document.querySelector('[data-cmethod="digest"]');
        return el ? (el.hidden || getComputedStyle(el).display === 'none') : false;
      });
      T.check('digest-hidden', digestHidden, 'Digest fields should be hidden initially');

      // 4. Change to digest method template
      await p.selectOption('#pr-cMethod', 'digest');
      await h.wait(300);
      const digestVisible = await p.evaluate(() => {
        const el = document.querySelector('[data-cmethod="digest"]');
        return el ? (!el.hidden && getComputedStyle(el).display !== 'none') : false;
      });
      T.check('digest-visible', digestVisible, 'Digest fields should be visible when digest template selected');

      // 5. Fill digest enzymes field
      await p.fill('#pr-cEnz', 'NdeI, XhoI');
      await p.dispatchEvent('#pr-cEnz', 'change');
      await h.wait(300);

      // 6. Switch to overlap extension / Gibson template
      await p.selectOption('#pr-cMethod', 'overlap');
      await h.wait(300);
      const overlapVisible = await p.evaluate(() => {
        const el = document.querySelector('[data-cmethod="overlap"]');
        return el ? (!el.hidden && getComputedStyle(el).display !== 'none') : false;
      });
      T.check('overlap-visible', overlapVisible, 'Overlap fields should be visible when overlap template selected');

      const digestHiddenAgain = await p.evaluate(() => {
        const el = document.querySelector('[data-cmethod="digest"]');
        return el ? (el.hidden || getComputedStyle(el).display === 'none') : false;
      });
      T.check('digest-hidden-again', digestHiddenAgain, 'Digest fields should be hidden when switched to overlap template');

      // 7. Fill overlap length field
      await p.fill('#pr-cOverlap', '25');
      await p.dispatchEvent('#pr-cOverlap', 'change');
      await h.wait(300);

      // 8. Verify hidden values are preserved without deletion
      await p.selectOption('#pr-cMethod', 'digest');
      await h.wait(300);
      const valEnz = await p.inputValue('#pr-cEnz');
      T.check('digest-value-persists', valEnz === 'NdeI, XhoI', 'Digest field value should persist without being deleted when hidden');

      // Switch back to overlap and verify overlap value persisted
      await p.selectOption('#pr-cMethod', 'overlap');
      await h.wait(300);
      const valOverlap = await p.inputValue('#pr-cOverlap');
      T.check('overlap-value-persists', valOverlap === '25', 'Overlap field value should persist without being deleted when hidden');

      // 9. Switch to recombination template and fill
      await p.selectOption('#pr-cMethod', 'recomb');
      await h.wait(300);
      const recombVisible = await p.evaluate(() => {
        const el = document.querySelector('[data-cmethod="recomb"]');
        return el ? (!el.hidden && getComputedStyle(el).display !== 'none') : false;
      });
      T.check('recomb-visible', recombVisible, 'Recombination fields should be visible when recomb template selected');

      await p.fill('#pr-cRecomb', 'attB1, attB2');
      await p.dispatchEvent('#pr-cRecomb', 'change');
      await h.wait(300);

      // 10. Add run and export project to verify persistence of common design facts and namespaced method details
      await h.addRun(src('his'));
      await h.wait(300);

      const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#projSave')]);
      const projData = JSON.parse(fs.readFileSync(await dl.path(), 'utf-8'));

      T.check('schema-has-cMethod', projData.prep.cMethod === 'recomb', `got ${projData.prep.cMethod}`);
      T.check('schema-has-cEnz-preserved', projData.prep.cEnz === 'NdeI, XhoI', `got ${projData.prep.cEnz}`);
      T.check('schema-has-cOverlap-preserved', projData.prep.cOverlap === '25', `got ${projData.prep.cOverlap}`);
      T.check('schema-has-cRecomb-preserved', projData.prep.cRecomb === 'attB1, attB2', `got ${projData.prep.cRecomb}`);
      T.check('schema-has-namespaced-details', projData.prep.cDetails && projData.prep.cDetails.digest && projData.prep.cDetails.digest.enzymes === 'NdeI, XhoI' && projData.prep.cDetails.overlap && projData.prep.cDetails.overlap.overlapBp === '25' && projData.prep.cDetails.recomb && projData.prep.cDetails.recomb.sites === 'attB1, attB2', JSON.stringify(projData.prep.cDetails));
    }
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
