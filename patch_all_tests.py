with open("tests/suites/950_panel_padding.js", "r") as f:
    test_text = f.read()

grid_test = """
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
        const gs = [...svg.querySelectorAll('g[data-wfp]')], i = gs.findIndex(g => /^m\\d+$/.test(g.dataset.wfp));
        if (i < 0) return {err: 'no text panel', ids: gs.map(g => g.dataset.wfp)};
        const own = gs[i].querySelector('svg'), others = gs.filter((_, j) => j !== i).map(g => g.querySelector('svg')).filter(Boolean);
        if (!own || !others.length) return {err: 'nothing to measure', own: !!own, others: others.length};
        return {panels: gs.length, textH: own.height.baseVal.value, chartH: Math.max(...others.map(c => c.height.baseVal.value))}; });
      const g = await measure();
      T.check('950.grid.measured', !g.err && g.panels >= 3 && g.chartH > 0, JSON.stringify(g));
      if (g.err) return;
      T.check('950.grid.text_panel_fits_content', g.textH < 0.8*g.chartH,
        `text panel height ${g.textH.toFixed(1)} vs chromatogram panel height ${g.chartH.toFixed(1)} (SVG units)`);
    } finally { await close(); } });
"""

if "Padding grid" not in test_text:
    test_text = test_text.replace("T.done();", grid_test + "\n  T.done();")

with open("tests/suites/950_panel_padding.js", "w") as f:
    f.write(test_text)
