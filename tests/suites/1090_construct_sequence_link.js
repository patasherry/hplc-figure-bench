// Issue #1090: Construct-facing guidance provides an actionable "Enter protein sequence" link
// that scrolls to and focuses #protSeq in #protPanel.
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('1090_construct_sequence_link'), {p, errs, close} = await open(), h = H(p);

  await T.t('link-to-protein-sequence-from-construct', async () => {
    await h.newProject('Construct Link Test');
    await h.wait(500);

    // Select the construct step
    await p.click('#tl [data-step="construct"]');
    await h.wait(300);

    const btn = p.locator('#gbGoProt');
    T.check('button-visible', await btn.isVisible());
    T.check('button-text', (await btn.innerText()).trim() === 'Enter protein sequence');

    // Click the button
    await btn.click();
    await h.wait(300);

    const activeId = await p.evaluate(() => document.activeElement ? document.activeElement.id : null);
    T.check('protSeq-focused', activeId === 'protSeq');

    const protPanelVis = await p.locator('#protPanel').isVisible();
    T.check('protPanel-visible', protPanelVis);
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
