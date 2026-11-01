// 41 workflow drag hint: a selected workflow panel advertises its move gesture (#675).
// UI and DOM only.
const {open, H, suite, src} = require('../lib/harness');

(async () => {
  const T = suite('41_workflow_drag_hint'), {p, errs, close} = await open(), h = H(p);
  await T.t('selected-panel-drag-guidance', async () => {
    await h.newProject('Workflow drag hint');
    await h.addRun(src('his'));
    await h.step('figure'); await h.wait(700);

    const hint = await p.$eval('#spec2', e => e.textContent);
    T.check('workflow-drag-hint.text', hint.includes('Click a panel to edit it; drag the selected panel to move it'), hint);

    const point = await p.evaluate(() => {
      const t = [...document.querySelectorAll('#paper svg text')].find(e => /^[A-Z]\s+\S/.test(e.textContent.trim()));
      if (!t) return null;
      const r = t.getBoundingClientRect(); return {x: r.left + 20, y: r.bottom + 40};
    });
    T.check('workflow-drag-hint.panel-found', !!point, JSON.stringify(point));
    if (point) {
      await p.mouse.click(point.x, point.y); await h.wait(250);
      const selected = await p.$eval('#wfSelBox', e => !e.hidden && e.getClientRects().length > 0);
      T.check('workflow-drag-hint.panel-selected', selected, 'clicking a panel shows its selection box');
      await p.mouse.move(point.x, point.y);
      T.check('workflow-drag-hint.grab-cursor', await p.$eval('#paper', e => getComputedStyle(e).cursor) === 'grab', await p.$eval('#paper', e => getComputedStyle(e).cursor));
      await p.mouse.down(); await p.mouse.move(point.x + 8, point.y + 8);
      T.check('workflow-drag-hint.grabbing-cursor', await p.$eval('#paper', e => getComputedStyle(e).cursor) === 'grabbing', await p.$eval('#paper', e => getComputedStyle(e).cursor));
      await p.mouse.up();
    }
  });
  T.check('no page errors', !errs.length, errs.join(' | '));
  await close(); T.done();
})();
