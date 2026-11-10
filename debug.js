const {open, H, suite, src} = require('./tests/lib/harness');
(async () => {
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

      const v = await p.evaluate(() => { const svg = document.querySelector('#paper svg'); if (!svg) return {err: 'no figure'};
        const gs = [...svg.querySelectorAll('g[data-wfp]')];
        return gs.map(g => {
            const h = g.querySelector('svg')?.height?.baseVal?.value;
            return {
                id: g.dataset.wfp,
                h: h
            }
        });
      });
      console.log(v);
    } finally {
        await close();
    }
})();
