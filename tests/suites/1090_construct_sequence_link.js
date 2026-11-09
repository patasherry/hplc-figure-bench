// Issue #1090: Construct-facing guidance provides an actionable "Enter protein sequence" link
// that scrolls to and focuses #protSeq in #protPanel.
// Issue #1304: Scaffold Construct and Primer data schemas, including parentConstructId and
// derivedConstructIds for construct lineage and branching cloning conditions.
const {open, H, suite, fs, src} = require('../lib/harness');

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

  await T.t('construct-lineage-and-schemas', async () => {
    // Add run so project can be saved/exported
    await h.addRun(src('his'));
    await h.wait(300);

    // Select the construct step
    await p.click('#tl [data-step="construct"]');
    await h.wait(300);

    const parentIn = p.locator('#pr-parentConstructId');
    const derivedIn = p.locator('#pr-derivedConstructIds');

    T.check('parent-construct-input-visible', await parentIn.isVisible());
    T.check('derived-constructs-input-visible', await derivedIn.isVisible());

    if (await parentIn.isVisible() && await derivedIn.isVisible()) {
      // Enter lineage values for branching construct
      await parentIn.fill('c-parent-1');
      await parentIn.dispatchEvent('change');
      await derivedIn.fill('c-derived-1, c-derived-2');
      await derivedIn.dispatchEvent('change');
      await h.wait(300);

      // Verify values in DOM
      T.check('parent-construct-value', (await parentIn.inputValue()) === 'c-parent-1');
      T.check('derived-constructs-value', (await derivedIn.inputValue()) === 'c-derived-1, c-derived-2');
    }

    // Export project and verify underlying data schemas
    const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#projSave')]);
    const projData = JSON.parse(fs.readFileSync(await dl.path(), 'utf-8'));

    T.check('schema-has-parent-construct-id', projData.prep.parentConstructId === 'c-parent-1', `got ${projData.prep.parentConstructId}`);
    T.check('schema-has-derived-construct-ids', Array.isArray(projData.prep.derivedConstructIds) && projData.prep.derivedConstructIds.length === 2 && projData.prep.derivedConstructIds[0] === 'c-derived-1' && projData.prep.derivedConstructIds[1] === 'c-derived-2', JSON.stringify(projData.prep.derivedConstructIds));
    T.check('schema-has-constructs-list', Array.isArray(projData.prep.constructs), 'prep.constructs is array');
    T.check('schema-has-primers-list', Array.isArray(projData.prep.primers), 'prep.primers is array');
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
