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

    const labelText = await p.evaluate(() => {
      const el = document.getElementById('o-zoomInset');
      return el && el.parentElement ? el.parentElement.textContent.trim() : null;
    });
    T.check('zoom_inset_label_text', labelText === 'Show Inset View: whole run, with the X window magnified', `Label is ${labelText}`);

      await setOpt(p, 'o-zoomInset', true); await h.wait(600);
      T.check('overlay/two-plot-areas', (await plotAreas(p)) === 2 && (await insetCount(p)) === 1, `plot areas ${await plotAreas(p)}`);

      const m = await ticksOf(p, 'main'), z = await ticksOf(p, 'inset');
      T.check('overlay/main-covers-full-run', !!m && m.max >= 12 && m.min <= 1, JSON.stringify(m));
      T.check('overlay/inset-covers-window-only', !!z && z.min >= 5 - 1e-9 && z.max <= 8 + 1e-9 && z.n >= 2, JSON.stringify(z));

      // Check Y-axis label on inset
      const hasInsetYLabel = await p.evaluate(() => {
        const svg = document.querySelector('#paper svg [data-plot=inset]');
        if (!svg) return false;
        // Search for text matching the ylabel in the inset group
        const texts = Array.from(svg.querySelectorAll('text'));
        return texts.some(t => /mAU/i.test(t.textContent));
      });
      T.check('overlay/inset-ylabel', hasInsetYLabel, 'Inset has Y-axis label');

      T.check('overlay/region-marked', await p.evaluate(() => !!document.querySelector('#paper svg #zoom-region rect') && document.querySelectorAll('#paper svg #zoom-region line').length >= 2), 'region rectangle and connector lines');
      T.check('overlay/connectors-orthogonal', await p.evaluate(() => {
        const lines = Array.from(document.querySelectorAll('#paper svg #zoom-region line'));
        return lines.length >= 2 && lines.every(l => Math.abs(+l.getAttribute('x1') - +l.getAttribute('x2')) < 0.05 || Math.abs(+l.getAttribute('y1') - +l.getAttribute('y2')) < 0.05);
      }), 'connectors use straight segments or orthogonal elbows');

      const editorGeo = await p.evaluate(() => {
        const r = document.querySelector('#paper svg #zoom-region rect');
        const lines = Array.from(document.querySelectorAll('#paper svg #zoom-region line')).map(l => [l.getAttribute('x1'), l.getAttribute('y1'), l.getAttribute('x2'), l.getAttribute('y2')]);
        const ins = document.querySelector('#paper svg [data-plot=inset]');
        const insRect = ins ? ins.querySelector('rect') : null;
        return {
          bounds: r ? [r.getAttribute('x'), r.getAttribute('y'), r.getAttribute('width'), r.getAttribute('height')] : null,
          viewport: [ins ? ins.getAttribute('transform') : null, insRect ? [insRect.getAttribute('width'), insRect.getAttribute('height')] : null],
          connectors: lines
        };
      });
      const [dl] = await Promise.all([
        p.waitForEvent('download', {timeout: 10000}),
        p.click('#saveSvg')
      ]);
      const stream = await dl.createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const exportedSvg = Buffer.concat(chunks).toString('utf8');
      const exportGeo = await p.evaluate(svgText => {
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const r = doc.querySelector('#zoom-region rect');
        const lines = Array.from(doc.querySelectorAll('#zoom-region line')).map(l => [l.getAttribute('x1'), l.getAttribute('y1'), l.getAttribute('x2'), l.getAttribute('y2')]);
        const ins = doc.querySelector('[data-plot=inset]');
        const insRect = ins ? ins.querySelector('rect') : null;
        return {
          bounds: r ? [r.getAttribute('x'), r.getAttribute('y'), r.getAttribute('width'), r.getAttribute('height')] : null,
          viewport: [ins ? ins.getAttribute('transform') : null, insRect ? [insRect.getAttribute('width'), insRect.getAttribute('height')] : null],
          connectors: lines
        };
      }, exportedSvg);
      T.check('export-parity/overlay-bounds', JSON.stringify(editorGeo.bounds) === JSON.stringify(exportGeo.bounds) && !!editorGeo.bounds, 'overlay bounds parity');
      T.check('export-parity/inset-viewport', JSON.stringify(editorGeo.viewport) === JSON.stringify(exportGeo.viewport) && !!editorGeo.viewport[0], 'inset viewport parity');
      T.check('export-parity/connector-endpoints', JSON.stringify(editorGeo.connectors) === JSON.stringify(exportGeo.connectors) && editorGeo.connectors.length >= 2, 'connector endpoints parity');

      await setOpt(p, 'o-xmin', '8'); await setOpt(p, 'o-xmax', '11'); await h.wait(400);
      T.check('overlay/non-abutting-connectors', await p.evaluate(() => {
        const lines = Array.from(document.querySelectorAll('#paper svg #zoom-region line'));
        return lines.length >= 2 && lines.every(l => Math.abs(+l.getAttribute('x1') - +l.getAttribute('x2')) < 0.05 || Math.abs(+l.getAttribute('y1') - +l.getAttribute('y2')) < 0.05);
      }), 'connectors maintained and orthogonal when geometry does not abut');

      await setOpt(p, 'o-xmin', '5'); await setOpt(p, 'o-xmax', '9'); await h.wait(400);
      T.check('overlay/abutting-connectors-suppressed', await p.evaluate(() => {
        return document.querySelectorAll('#paper svg #zoom-region line').length === 0;
      }), 'connectors suppressed when source and inset visibly abut');
      await setOpt(p, 'o-xmin', '5'); await setOpt(p, 'o-xmax', '8'); await h.wait(400);
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

      // Shift drag acts as zoom mode without option
      await p.keyboard.down('Shift');
      await p.mouse.move(b.left + b.width / 4, b.top + b.height / 2);
      await p.mouse.down();
      await p.mouse.move(b.left + b.width / 2, b.top + b.height / 2, {steps: 10});
      await p.mouse.up();
      await p.keyboard.up('Shift');
      await h.wait(500);

      const newRegions = await p.evaluate(() => document.querySelectorAll('#intTable tbody tr').length);
      T.check('drag/zoom-mode-no-integration', newRegions === regions, `integration regions in table stayed at ${newRegions}`);

      const xmin = await p.$eval('#o-xmin', e => e.value);
      const xmax = await p.$eval('#o-xmax', e => e.value);
      T.check('drag/zoom-mode-updates-window', xmin !== '' && xmax !== '', `xmin: ${xmin}, xmax: ${xmax}`);

    } catch (e) { T.check('drag/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  /* Workflow Figure wfZoom option */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await h.newProject('wf zoom inset');
      await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv')); await h.wait(500);
      await p.click('#tl [data-step="figure"]'); await h.wait(500);
      await setOpt(p, 'o-xmin', '22'); await setOpt(p, 'o-xmax', '28'); await h.wait(400);

      T.check('wf/inset-appears-when-wfZoom-on/off-by-default', (await insetCount(p)) === 0, 'no inset by default');

      const b = await p.evaluate(() => document.querySelector('#paper svg').getBoundingClientRect());
      await p.mouse.click(b.left + b.width / 2, b.top + b.height / 2); await h.wait(400);
      await p.evaluate(() => { const el = document.querySelector('#wfTool input[data-wfz="1"]'); if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); } });
      await h.wait(500);
      T.check('wf/inset-appears-when-wfZoom-on', (await insetCount(p)) === 1, 'inset count is 1 after enabling wfZoom');
      T.check('wf/no-errors', errs.length === 0, errs.join(' | '));
    } catch (e) { T.check('wf/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  /* Aspect-ratio locked resizing and boundary clamping for zoom inset (Issue #1035) */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await p.click('#homeQuick'); await h.wait(900);
      await setOpt(p, 'o-zoomInset', true); await h.wait(500);

      const hasContainer = await p.evaluate(() => !!document.getElementById('zoomInsetContainer'));
      T.check('resize/container-id', hasContainer, '#zoomInsetContainer element exists');

      const handles = await p.evaluate(() => [...document.querySelectorAll('#zoomInsetContainer .zoom-inset-handles rect[data-handle]')].map(el => el.getAttribute('data-handle')));
      T.check('resize/handles-exist', handles.includes('se') && handles.includes('nw'), 'handles present: ' + handles.join(','));

      // Initial dimensions and aspect ratio
      const initBox = await p.evaluate(() => {
        const c = document.getElementById('zoomInsetContainer');
        const r = c.getBoundingClientRect();
        return { w: r.width, h: r.height, ratio: r.width / r.height };
      });

      // Drag 'se' handle to resize - without Shift (aspect ratio locked by default)
      const seBox = await p.evaluate(() => {
        const h = document.querySelector('#zoomInsetContainer [data-handle="se"]');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      await p.mouse.move(seBox.x, seBox.y);
      await p.mouse.down();
      // Move diagonally with unequal delta X and Y to test aspect ratio locking
      await p.mouse.move(seBox.x + 60, seBox.y + 50, {steps: 5});
      await p.mouse.up();
      await h.wait(400);

      const lockedBox = await p.evaluate(() => {
        const c = document.getElementById('zoomInsetContainer');
        const r = c.getBoundingClientRect();
        return { w: r.width, h: r.height, ratio: r.width / r.height };
      });

      T.check('resize/aspect-ratio-locked-by-default',
        lockedBox.w > initBox.w && Math.abs(lockedBox.ratio - initBox.ratio) < 0.05,
        'initial ratio: ' + initBox.ratio.toFixed(3) + ', locked ratio: ' + lockedBox.ratio.toFixed(3) + ', w: ' + initBox.w.toFixed(1) + ' -> ' + lockedBox.w.toFixed(1));

      // Drag 'se' handle with Shift held - aspect ratio should be unlocked (freeform)
      const seBox2 = await p.evaluate(() => {
        const h = document.querySelector('#zoomInsetContainer [data-handle="se"]');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      await p.keyboard.down('Shift');
      await p.mouse.move(seBox2.x, seBox2.y);
      await p.mouse.down();
      // Drag vertically downwards by 70px to change height independently of width
      await p.mouse.move(seBox2.x, seBox2.y + 70, {steps: 5});
      await p.mouse.up();
      await p.keyboard.up('Shift');
      await h.wait(400);

      const unlockedBox = await p.evaluate(() => {
        const c = document.getElementById('zoomInsetContainer');
        const r = c.getBoundingClientRect();
        return { w: r.width, h: r.height, ratio: r.width / r.height };
      });

      T.check('resize/aspect-ratio-unlocked-with-shift',
        Math.abs(unlockedBox.ratio - lockedBox.ratio) > 0.15,
        'unlocked ratio: ' + unlockedBox.ratio.toFixed(3) + ' vs locked ratio: ' + lockedBox.ratio.toFixed(3));

      // Boundary clamping: drag inset far beyond figure bottom-right bounds
      const seBox3 = await p.evaluate(() => {
        const h = document.querySelector('#zoomInsetContainer [data-handle="se"]');
        const r = h.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      await p.mouse.move(seBox3.x, seBox3.y);
      await p.mouse.down();
      await p.mouse.move(seBox3.x + 1000, seBox3.y + 1000, {steps: 5});
      await p.mouse.up();
      await h.wait(400);

      const clamped = await p.evaluate(() => {
        const svg = document.querySelector('#paper svg');
        const c = document.getElementById('zoomInsetContainer');
        const sRect = svg.getBoundingClientRect();
        const cRect = c.getBoundingClientRect();
        return {
          insideRight: cRect.right <= sRect.right + 1.5,
          insideBottom: cRect.bottom <= sRect.bottom + 1.5,
          insideLeft: cRect.left >= sRect.left - 1.5,
          insideTop: cRect.top >= sRect.top - 1.5,
          cRect: { right: cRect.right, bottom: cRect.bottom },
          sRect: { right: sRect.right, bottom: sRect.bottom }
        };
      });

      T.check('resize/boundary-clamped-inside-figure',
        clamped.insideRight && clamped.insideBottom && clamped.insideLeft && clamped.insideTop,
        'clamped within figure: ' + JSON.stringify(clamped));

      T.check('resize/no-errors', errs.length === 0, errs.join(' | '));
    } catch (e) { T.check('resize/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  /* Source-local visibility recovery and a deterministic recomputed layout (Issue #1034). */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await p.click('#homeQuick'); await h.wait(900);
      await setOpt(p, 'o-zoomInset', true); await h.wait(500);
      const controls = await p.evaluate(() => ['zoomInsetHide', 'zoomInsetRestore', 'zoomInsetReset'].every(id => {
        const el = document.getElementById(id); return !!el && el.offsetParent !== null;
      }));
      T.check('layout/recovery-controls-visible', controls, 'Hide, Restore last visible, and Reset inset layout controls are visible');
      if (controls) {
        const initial = await p.$eval('#zoomInsetContainer', el => el.getAttribute('transform'));
        await p.click('#zoomInsetHide'); await h.wait(400);
        T.check('layout/hide-is-source-local', (await insetCount(p)) === 0, 'inset hidden without changing the window');
        await p.click('#zoomInsetRestore'); await h.wait(400);
        const restored = await p.$eval('#zoomInsetContainer', el => el.getAttribute('transform'));
        T.check('layout/restore-last-visible', restored === initial, `initial ${initial}, restored ${restored}`);

        const move = await p.evaluate(() => { const r = document.querySelector('#zoomInsetContainer [data-handle="move"]').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; });
        await p.mouse.move(move.x, move.y); await p.mouse.down(); await p.mouse.move(move.x - 45, move.y + 35, {steps: 4}); await p.mouse.up(); await h.wait(400);
        const moved = await p.$eval('#zoomInsetContainer', el => el.getAttribute('transform'));
        await p.click('#zoomInsetReset'); await h.wait(400);
        const reset = await p.$eval('#zoomInsetContainer', el => el.getAttribute('transform'));
        T.check('layout/reset-recomputes-default', moved !== reset && reset === initial, `initial ${initial}, moved ${moved}, reset ${reset}`);
      }
      T.check('layout/no-errors', errs.length === 0, errs.join(' | '));
    } catch (e) { T.check('layout/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }

  /* Zoom inset event scoping (Issue #1332) */
  {
    const {p, errs, close} = await open(), h = H(p);
    try {
      await h.newProject('Zoom Test');
      await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv'));

      await setOpt(p, 'o-zoomMode', true);
      await setOpt(p, 'o-zoomInset', true);
      await h.wait(500);

      const initialXMin = await p.evaluate(() => {
        const minInput = document.querySelector('#o-xmin');
        return minInput ? minInput.value : '';
      });

      const boundingBox = await p.evaluate(() => {
        const el = document.querySelector('#zoomInsetContainer');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {x: r.left, y: r.top, w: r.width, h: r.height};
      });

      if (boundingBox) {
        const startX = boundingBox.x + boundingBox.w / 2;
        const startY = boundingBox.y + boundingBox.h / 2;

        await p.mouse.move(startX, startY);
        await p.mouse.down();
        await p.mouse.move(startX + 50, startY + 50, {steps: 5});
        await p.mouse.up();
      }

      await h.wait(500);

      const currentXMin = await p.evaluate(() => {
        const minInput = document.querySelector('#o-xmin');
        return minInput ? minInput.value : '';
      });

      T.check('scoping/no-xmin-change', currentXMin === initialXMin, 'Main chart xmin should not change when dragging inset: ' + currentXMin);
      T.check('scoping/no-errors', errs.length === 0, errs.join(' | '));
    } catch (e) { T.check('scoping/threw', false, String(e).slice(0, 300)); } finally { await close(); }
  }
  T.done();
})();
