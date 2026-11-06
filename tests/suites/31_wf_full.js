// 31 workflow, full chromatogram: the workflow figure can draw each run over its whole length instead of the cropped window (#552).
// UI and DOM only.
const {open, H, suite, src} = require('../lib/harness');
(async () => {
  const T = suite('31_wf_full'), {p, errs, close} = await open(), h = H(p);
  await T.t('wf-full-chromatogram', async () => {
    await h.newProject('Full chrom'); await h.dropFiles(src('his')); await h.dropFiles(src('q'));
    await p.click('#tl [data-step="figure"]'); await h.wait(900);
    /* every number printed in the workflow figure, in order: the axis ticks change when the drawn range changes */
    const xmax = () => p.evaluate(() => [...document.querySelectorAll('#paper svg text')].map(t => t.textContent.trim()).filter(s => /^-?\d+(\.\d+)?$/.test(s)).join(' '));
    const box = '#o-wfFull', set = async v => { await p.evaluate(([s, v]) => { const e = document.querySelector(s); if (e.checked !== v) e.click(); }, [box, v]); await h.wait(900); };
    const nOpts = await p.locator(box).count();
    T.check('wf-full.option-present', nOpts === 1, `${nOpts} checkboxes`);
    const a = await xmax(); await set(true); const b = await xmax(); await set(false); const c = await xmax();
    T.check('wf-full.axis-changes', b !== a && !!b, `cropped [${a}] full [${b}]`); // the axis labels change when the whole run is drawn
    T.check('wf-full.off-restores', c === a, `before ${a}, after ${c}`); // switching it off gives the cropped figure back
    const view = '#wfFullView', modal = '#wfFullModal';
    const hasView = (await p.locator(view).count()) === 1;
    T.check('wf-full.modal-trigger-present', hasView, 'workflow settings has a full chromatogram view button');
    if (!hasView) {
      T.check('wf-full.modal-opens', false, 'no full chromatogram trigger');
      T.check('wf-full.modal-shows-full-ranges', false, 'no full chromatogram modal');
      T.check('wf-full.modal-closes', false, 'no full chromatogram modal');
      return;
    }
    await p.click(view); await h.wait(400);
    T.check('wf-full.modal-opens', await p.locator(modal).evaluate(e => e.open), 'full chromatograms opens in a modal');
    const modalTicks = await p.evaluate(() => [...document.querySelectorAll('#wfFullModal svg text')].map(t => t.textContent.trim()).filter(s => /^-?\d+(\.\d+)?$/.test(s)).join(' '));
    T.check('wf-full.modal-shows-full-ranges', modalTicks !== a && !!modalTicks, `cropped [${a}] modal [${modalTicks}]`);
    await p.click('#wfFullModalClose'); await h.wait(100);
    T.check('wf-full.modal-closes', !(await p.locator(modal).evaluate(e => e.open)), 'modal closed');
  });
  T.check('no page errors', !errs.length, errs.join(' | '));
  await close(); T.done();
})();
