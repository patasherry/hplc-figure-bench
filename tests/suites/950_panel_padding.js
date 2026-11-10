// 950 content-driven padding: in the Stacked workflow, a text panel (a step without a chromatogram) is as tall as its text plus a margin,
// not as tall as a chromatogram, and the margin is set by "Margin under text panels (pt)" in the workflow's Figure options.
// Measured on screen: the space from the bottom of the text panel's content to the top of the next panel's chart, against that chart's height.
const {open, H, suite, src} = require('../lib/harness');

(async () => { const T = suite('950_panel_padding');
  await T.t('stacked_text_panel', async () => {
    const {p, close} = await open({width: 1400, height: 1000}), h = H(p);
    try {
      await h.newProject('Padding');
      /* a batch step first (no column yet, so it sits before the first column), then an IMAC run after it */
      await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep="man:batch"]'); await h.wait(400);
      await p.locator('#man-resin').fill('Ni-NTA agarose'); await p.locator('#man-buffer').fill('50 mM Tris pH 8.0'); await h.wait(300);
      await h.addRun(src('his'));
      await h.step('figure');
      const setOpt = async (sel, v) => { await p.evaluate(([s, v]) => { const el = document.querySelector(s); if (!el) return; if (el.type === 'radio') el.checked = true; else el.value = v;
        el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, [sel, v]); await h.wait(700); };
      await setOpt('#wf-stack', 'stack');
      /* in SVG units: the gap below the text panel's content and the next panel's chart height */
      const measure = () => p.evaluate(() => { const svg = document.querySelector('#paper svg'); if (!svg) return {err: 'no figure'};
        const k = svg.getScreenCTM().d, gs = [...svg.querySelectorAll('g[data-wfp]')], i = gs.findIndex(g => /^m\d+$/.test(g.dataset.wfp));
        if (i < 0) return {err: 'no text panel', ids: gs.map(g => g.dataset.wfp)}; if (i === gs.length - 1) return {err: 'text panel is last', ids: gs.map(g => g.dataset.wfp)};
        const parts = [...gs[i].querySelectorAll('text, path')].map(e => e.getBoundingClientRect()).filter(r => r.height > 0), nx = gs[i + 1].querySelector('svg');
        if (!parts.length || !nx) return {err: 'nothing to measure', parts: parts.length, ids: gs.map(g => g.dataset.wfp)};
        const bottom = Math.max(...parts.map(r => r.bottom)), top = nx.getScreenCTM().f;
        return {gap: (top - bottom)/k, chartH: nx.height.baseVal.value, ids: gs.map(g => g.dataset.wfp)}; });
      const a = await measure();
      T.check('950.stack.measured', !a.err && a.chartH > 0, JSON.stringify(a));
      if (a.err) return;
      /* on main the text panel kept a whole chromatogram's height, so the gap was about the chart height; now it is the margin, the step gap and the next title */
      T.check('950.stack.text_panel_fits_content', a.gap < 0.6*a.chartH, `gap ${a.gap.toFixed(1)} vs next chart height ${a.chartH.toFixed(1)} (SVG units)`);
      T.check('950.stack.no_overlap', a.gap > 0, `gap ${a.gap.toFixed(1)}`);
      /* the margin is configurable: 30 pt instead of the automatic 0.8 × font size (6.4 pt at 8 pt) widens the gap by about the difference */
      const has = await p.locator('#o-wfPad').count();
      T.check('950.margin.control', has === 1, 'no "Margin under text panels" field (#o-wfPad)');
      if (!has) return;
      await setOpt('#o-wfPad', '30');
      const b = await measure();
      T.check('950.margin.applies', !b.err && b.gap - a.gap > 15 && b.gap - a.gap < 35, `gap ${a.gap.toFixed(1)} -> ${b.err || b.gap.toFixed(1)}`);
    } finally { await close(); } });

  await T.t('grid_text_panel', async () => {
    const {p, close} = await open({width: 1400, height: 1000}), h = H(p);
    try {
      await h.newProject('Padding grid');
      await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep="man:batch"]'); await h.wait(400);
      await p.locator('#man-resin').fill('Ni-NTA agarose'); await p.locator('#man-buffer').fill('50 mM Tris pH 8.0'); await h.wait(300);
      await h.addRun(src('his')); await h.addRun(src('q'));
      await h.step('figure');
      const setOpt = async (sel, v) => { await p.evaluate(([s, v]) => { const el = document.querySelector(s); if (!el) return; if (el.type === 'radio') el.checked = true; else el.value = v;
        el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }, [sel, v]); await h.wait(700); };
      await setOpt('#wf-grid', 'grid');
      /* the height each panel is actually given, text panel against the tallest chromatogram panel */
      const measure = () => p.evaluate(() => { const svg = document.querySelector('#paper svg'); if (!svg) return {err: 'no figure'};
        const gs = [...svg.querySelectorAll('g[data-wfp]')], i = gs.findIndex(g => /^m\d+$/.test(g.dataset.wfp));
        if (i < 0) return {err: 'no text panel', ids: gs.map(g => g.dataset.wfp)};
        const own = gs[i].querySelector('svg'), others = gs.filter((_, j) => j !== i).map(g => g.querySelector('svg')).filter(Boolean);
        if (!own || !others.length) return {err: 'nothing to measure', own: !!own, others: others.length};
        return {panels: gs.length, textH: own.height.baseVal.value, chartH: Math.max(...others.map(c => c.height.baseVal.value)),
          own_dataset_wfp: gs[i].dataset.wfp
        }; });
      const g = await measure();
      T.check('950.grid.measured', !g.err && g.panels >= 3 && g.chartH > 0, JSON.stringify(g));
      if (g.err) return;
      T.check('950.grid.text_panel_fits_content', g.textH < 0.8*g.chartH,
        `text panel height ${g.textH.toFixed(1)} vs chromatogram panel height ${g.chartH.toFixed(1)} (SVG units)`);
    } finally { await close(); } });

  T.done();
})();
