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

      const handles = await p.evaluate(() => {
        const sel = document.querySelector('#wfSelBox');
        if (!sel) return false;
        const style = window.getComputedStyle(sel, '::after');
        return style.backgroundImage.includes('radial-gradient');
      });
      T.check('workflow-drag-hint.handles-present', handles, 'selection box has visual grab handles');

    }
  });
  await T.t('workflow-toolbar-grid-and-contrast', async () => {
    const q = await open(), hq = H(q.p), pg = q.p;
    try {
      await pg.emulateMedia({colorScheme: 'dark'});
      await hq.newProject('Workflow UI polish');
      await hq.addRun(src('his')); await hq.addRun(src('q'));
      await hq.step('figure'); await hq.wait(700);

      // Grid hint shows only when Grid is chosen
      const rowHintHidden = await pg.evaluate(() => { const e = document.querySelector('#wfGridHint'); return e ? e.hidden : false; });
      T.check('grid-hint.hidden-in-row', rowHintHidden, 'grid hint exists and stays hidden in Side by side layout');
      await pg.click('label[for="wf-grid"]'); await hq.wait(300);
      const gridHint = await pg.evaluate(() => { const e = document.querySelector('#wfGridHint'); return e ? {hidden: e.hidden, text: e.textContent.trim()} : null; });
      T.check('grid-hint.shown-in-grid', !!gridHint && !gridHint.hidden && /3 panels/i.test(gridHint.text), JSON.stringify(gridHint));

      // Full drag guidance line without ellipsis truncation
      const spec2Fit = await pg.$eval('#spec2', e => ({text: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, ws: getComputedStyle(e).whiteSpace}));
      T.check('spec2.not-clipped', spec2Fit.ws === 'normal' || spec2Fit.sw <= spec2Fit.cw + 2, JSON.stringify(spec2Fit));

      // Select first panel in dark mode
      const b = await pg.$eval('#paper svg', e => { const r = e.getBoundingClientRect(); return {x: r.x + r.width*0.2, y: r.y + r.height*0.3}; });
      await pg.mouse.click(b.x, b.y); await hq.wait(300);

      const ui = await pg.evaluate(() => {
        const box = document.querySelector('#wfSelBox'), tool = document.querySelector('#wfTool');
        const copy = document.querySelector('#copySvg'), save = document.querySelector('#saveSvg');
        const a = document.querySelector('#wfA');
        const csA = getComputedStyle(a), ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${csA.fontSize} ${csA.fontFamily}`;
        const roomA = a.clientWidth - parseFloat(csA.paddingLeft) - parseFloat(csA.paddingRight);
        const needA = ctx.measureText(a.placeholder).width;
        const m = getComputedStyle(box).borderColor.match(/\d+/g).map(Number);
        const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        const L = 0.2126 * lin(m[0]) + 0.7152 * lin(m[1]) + 0.0722 * lin(m[2]);
        const contrastWhite = (1 + 0.05) / (L + 0.05);
        return {
          hint: tool.textContent,
          toolRect: tool.getBoundingClientRect(),
          copyRect: copy.getBoundingClientRect(),
          saveRect: save.getBoundingClientRect(),
          contrastWhite,
          roomA,
          needA,
        };
      });
      T.check('wftool.drag-undo-hint', /Drag to move,\s*Reset position to undo/i.test(ui.hint), ui.hint);
      T.check('wftool.no-overlap-copySvg', ui.toolRect.bottom <= ui.copyRect.top + 1, `tool bottom ${ui.toolRect.bottom} vs copySvg top ${ui.copyRect.top}`);
      T.check('wftool.arrow-placeholder-fits', ui.needA <= ui.roomA + 2, `need ${ui.needA.toFixed(1)} vs room ${ui.roomA.toFixed(1)}`);
      T.check('wfselbox.dark-mode-contrast', ui.contrastWhite >= 4.5, `contrast vs white paper: ${ui.contrastWhite.toFixed(2)}`);
      T.check('no-page-errors-2', !q.errs.length, q.errs.join(' | '));
    } finally { await q.close(); }
  });
  T.check('no page errors', !errs.length, errs.join(' | '));
  await close(); T.done();
})();
