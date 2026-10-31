// 43 zoom inset: the whole run on the main plot, the X window magnified in a second small plot. Presentation only.
// UI and DOM only: options are set through the inputs, the figure is read from the SVG in #paper.
const {open, H, suite, path, DATA, APP} = require('../lib/harness');
const T = suite('43_zoom_inset');

const setOpt = (p, id, v) => p.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) return false;
  if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
  el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [id, v]);
/* numeric tick labels (true minus signs read as minus) of the plot under <g data-plot=...>, ignoring titles and peak labels */
const ticksOf = (p, which) => p.evaluate(w => { const g = document.querySelector(`#paper svg [data-plot=${w}]`); if (!g) return null;
  const xs = [...g.querySelectorAll('text[text-anchor=middle]')].filter(t => /^[-\u2212]?\d+(\.\d+)?$/.test(t.textContent.trim())); if (!xs.length) return null;
  const yb = Math.max(...xs.map(t => +t.getAttribute('y'))), row = xs.filter(t => Math.abs(+t.getAttribute('y') - yb) < 0.5);
  const v = row.map(t => +t.textContent.trim().replace(/\u2212/g, '-')); return {min: Math.min(...v), max: Math.max(...v), n: v.length}; }, which);
const plotAreas = p => p.evaluate(() => document.querySelectorAll('#paper svg clipPath[id$="plot-area"]').length);
const insetCount = p => p.evaluate(() => document.querySelectorAll('#paper svg [data-plot=inset]').length);

(async () => {
  /* overlay figure (Quick-Figure mode loads the example chromatograms) */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await p.click('#homeQuick'); await h.wait(900);
      T.check('overlay/off-by-default', (await plotAreas(p)) === 1 && (await insetCount(p)) === 0, 'one plot area and no inset with the option off');
      await setOpt(p, 'o-xmin', '5'); await setOpt(p, 'o-xmax', '8'); await h.wait(400);
      const offSvg = await p.evaluate(() => document.querySelector('#paper svg').outerHTML);
      await setOpt(p, 'o-zoomInset', true); await h.wait(600);
      T.check('overlay/two-plot-areas', (await plotAreas(p)) === 2 && (await insetCount(p)) === 1, `plot areas ${await plotAreas(p)}`);
      const m = await ticksOf(p, 'main'), z = await ticksOf(p, 'inset');
      T.check('overlay/main-covers-full-run', !!m && m.max >= 12 && m.min <= 1, JSON.stringify(m));
      T.check('overlay/inset-covers-window-only', !!z && z.min >= 5 - 1e-9 && z.max <= 8 + 1e-9 && z.n >= 2, JSON.stringify(z));
      T.check('overlay/region-marked', await p.evaluate(() => !!document.querySelector('#paper svg #zoom-region rect') && document.querySelectorAll('#paper svg #zoom-region line').length >= 2), 'region rectangle and connector lines');
      for (const pos of ['tl', 'br', 'beside']) {
        await setOpt(p, 'o-zoomInsetPos', pos); await h.wait(500);
        const zz = await ticksOf(p, 'inset'), mm = await ticksOf(p, 'main');
        T.check(`overlay/pos-${pos}`, (await plotAreas(p)) === 2 && !!zz && zz.min >= 5 - 1e-9 && zz.max <= 8 + 1e-9 && !!mm && mm.max >= 12, `inset ${JSON.stringify(zz)} main ${JSON.stringify(mm)}`);
      }
      await setOpt(p, 'o-zoomInsetPos', 'tr'); await setOpt(p, 'o-zoomInset', false); await h.wait(500);
      const back = await p.evaluate(() => document.querySelector('#paper svg').outerHTML);
      T.check('overlay/off-restores-figure', back === offSvg && (await plotAreas(p)) === 1, 'figure with the option off is the one from before');
      T.check('overlay/no-errors', errs.length === 0, errs.join(' | '));
    } catch (e) { T.check('overlay/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  /* old saved settings (no zoom keys) load with the inset off */
  {
    const {p, close} = await open(), h = H(p);
    try {
      await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('hplc-fig-opt') || '{}'); delete o.zoomInset; delete o.zoomInsetPos; delete o.zoomInsetSize; localStorage.setItem('hplc-fig-opt', JSON.stringify(o)); });
      await p.reload(); await h.wait(900); await p.click('#homeQuick'); await h.wait(900);
      T.check('settings/old-saved-load-with-inset-off', (await plotAreas(p)) === 1 && !(await p.$eval('#o-zoomInset', e => e.checked)), 'no inset, checkbox off');
    } catch (e) { T.check('settings/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  /* ÄKTA run chart */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await h.newProject('zoom run'); await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv')); await h.wait(500);
      await setOpt(p, 'o-xmin', '22'); await setOpt(p, 'o-xmax', '28'); await h.wait(500);
      await setOpt(p, 'o-zoomInset', true); await h.wait(700);
      const m = await ticksOf(p, 'main'), z = await ticksOf(p, 'inset');
      T.check('run/two-plot-areas', (await plotAreas(p)) === 2, `plot areas ${await plotAreas(p)}`);
      T.check('run/inset-covers-window', !!z && z.min >= 22 - 1e-9 && z.max <= 28 + 1e-9, JSON.stringify(z));
      T.check('run/main-wider-than-window', !!m && m.min <= 17 && m.max >= 33, JSON.stringify(m));
      await setOpt(p, 'o-zoomInset', false); await h.wait(500);
      T.check('run/off-one-plot-area', (await plotAreas(p)) === 1, 'inset removed');
      T.check('run/no-errors', errs.length === 0, errs.join(' | '));
    } catch (e) { T.check('run/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  /* Dragging interactions: zoom vs integration mode */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await h.newProject('zoom drag'); await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv')); await h.wait(500);
      const b = await p.evaluate(() => document.querySelector('#paper svg').getBoundingClientRect());

      // Default dragging: adds integration region
      await p.mouse.move(b.left + b.width / 3, b.top + b.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.left + b.width * 2 / 3, b.top + b.height / 2, {steps: 10});
      await p.mouse.up();
      await h.wait(500);

      // Verify integration via DOM (table #intTable) instead of internal state
      const regions = await p.evaluate(() => document.querySelectorAll('#intTable tbody tr').length);
      T.check('drag/integration-mode-default', regions > 0, `integration regions in table: ${regions}`);

      // Turn on zoom mode
      await setOpt(p, 'o-zoomMode', true); await h.wait(200);
      await p.mouse.move(b.left + b.width / 4, b.top + b.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.left + b.width / 2, b.top + b.height / 2, {steps: 10});
      await p.mouse.up();
      await h.wait(500);

      const newRegions = await p.evaluate(() => document.querySelectorAll('#intTable tbody tr').length);
      T.check('drag/zoom-mode-no-integration', newRegions === regions, `integration regions in table stayed at ${newRegions}`);

      const xmin = await p.$eval('#o-xmin', e => e.value);
      const xmax = await p.$eval('#o-xmax', e => e.value);
      T.check('drag/zoom-mode-updates-window', xmin !== '' && xmax !== '', `xmin: ${xmin}, xmax: ${xmax}`);

    } catch (e) { T.check('drag/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  T.done();
})();
