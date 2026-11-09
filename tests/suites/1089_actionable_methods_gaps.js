// Issue #1089: Make missing Methods details actionable
// Clicking a missing detail chip in #methodsGaps navigates to the step and focuses the field.
const {open, H, suite} = require('../lib/harness');
const path = require('path');

(async () => {
  const T = suite('1089_actionable_methods_gaps'), {p, errs, close} = await open(), h = H(p);

  await T.t('methods-gaps-actionable-buttons', async () => {
    await h.newProject('Methods Gaps Test');
    await h.wait(500);

    const figEmptySummary = (await p.locator('#tl [data-step="figure"] .ts').textContent())?.trim();
    T.check('figure-empty-summary', figEmptySummary === 'Builds after you add a purification step.', `summary: ${figEmptySummary}`);

    // Add a run and pool fractions so purification summary is visible
    await h.addRun(path.join(__dirname, '..', 'data', 'standins', 'imac_histrap_1ml_step.csv'));
    await h.pool('T1-T6');

    // Select Figure and methods step
    await h.step('figure');
    await h.wait(500);

    const gapsEl = p.locator('#methodsGaps');
    T.check('methods-gaps-visible', await gapsEl.isVisible());

    const buttons = gapsEl.locator('button.gap-btn');
    const count = await buttons.count();
    T.check('gap-buttons-rendered', count > 0, `count: ${count}`);

    // Click the flow rate gap button
    const flowBtn = p.locator('#methodsGaps button.gap-btn[data-gap*="flow"]').first();
    const hasFlowBtn = await flowBtn.count() > 0;
    T.check('flow-rate-gap-button-found', hasFlowBtn);

    if (hasFlowBtn) {
      await flowBtn.click();
      await h.wait(500);

      // Verify that active element is mFlow input
      const activeId = await p.evaluate(() => document.activeElement ? document.activeElement.id : null);
      T.check('flow-rate-field-focused', activeId && activeId.startsWith('mFlow'), `activeId: ${activeId}`);

      // Verify active step in timeline is the run step
      const stepSel = await p.evaluate(() => document.querySelector('.tl li.cur button')?.dataset.step || '');
      T.check('step-navigated-to-run', stepSel.startsWith('run:'), `active step: ${stepSel}`);
    }

    // Now navigate back to Figure and methods and click Transformation gap
    await h.step('figure');
    await h.wait(500);
    const trBtn = p.locator('#methodsGaps button.gap-btn[data-gap="Transformation"]').first();
    const hasTrBtn = await trBtn.count() > 0;
    T.check('transformation-gap-button-found', hasTrBtn);

    if (hasTrBtn) {
      await trBtn.click();
      await h.wait(500);

      const activeIdTr = await p.evaluate(() => document.activeElement ? document.activeElement.id : null);
      T.check('transform-field-focused', activeIdTr === 'pr-trPlasmid' || activeIdTr === 'pr-strain2', `activeId: ${activeIdTr}`);

      const stepSelTr = await p.evaluate(() => document.querySelector('.tl li.cur button')?.dataset.step || '');
      T.check('step-navigated-to-transform', stepSelTr === 'transform', `active step: ${stepSelTr}`);
    }
  });

  T.check('no-page-errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
