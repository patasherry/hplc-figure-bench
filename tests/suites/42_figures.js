// 42 figures: checks that figure settings reach the exported SVG and PNG.
// UI and DOM only.
const {open, H, suite, src, fs, path} = require('../lib/harness');

(async () => {
  const T = suite('42_figures'), {p, errs, close} = await open(), h = H(p);

  await T.t('figure_settings', async () => {
    // 1. Load example data
    // the palette, axis title and legend controls belong to the HPLC overlay figure, so use Quick mode's example chromatograms (an ÄKTA run is drawn as a run chart with its own styling)
    await p.click('#homeQuick'); await h.wait(800);
    const legendNames = await p.evaluate(() => [...document.querySelectorAll('#paper svg text')].map(t => t.textContent.trim()).filter(Boolean));

    const download = async (selector, timeout = 10000) => {
      const loc = p.locator(selector);
      await loc.scrollIntoViewIfNeeded();
      const [dl] = await Promise.all([
        p.waitForEvent('download', { timeout }).catch(() => null),
        loc.click()
      ]);
      if (!dl) return null;
      const name = dl.suggestedFilename();
      const tmpPath = path.join(path.resolve(__dirname, '../results'), name);
      await dl.saveAs(tmpPath);
      const buf = fs.readFileSync(tmpPath);
      return { name, buf, str: buf.toString('utf8') };
    };

    const settings = [
      { id: 'default', checks: { w: 3.5, font: 'Arial', fs: 8, pal: ['#1a1a1a', '#D55E00'], xl: '', xr: '', lw: 0.75, leg: true } },
      { id: 'w_onehalf', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-preset'); e.value = 'onehalf'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); }); }, checks: { w: 5, font: 'Arial', fs: 8, pal: ['#1a1a1a', '#D55E00'], xl: '', xr: '', lw: 0.75, leg: true } },
      { id: 'w_double', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-preset'); e.value = 'double'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); }); }, checks: { w: 7, font: 'Arial', fs: 8, pal: ['#1a1a1a', '#D55E00'], xl: '', xr: '', lw: 0.75, leg: true } },
      { id: 'font_times', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-preset'); e.value = 'single'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); const f = document.querySelector('#o-font'); f.value = 'Times'; f.dispatchEvent(new Event('change', {bubbles: true})); f.dispatchEvent(new Event('input', {bubbles: true})); }); }, checks: { w: 3.5, font: 'Times', fs: 8, pal: ['#1a1a1a', '#D55E00'], xl: '', xr: '', lw: 0.75, leg: true } },
      { id: 'fs_12', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-fs'); e.value = '12'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); }); }, checks: { w: 3.5, font: 'Times', fs: 12, pal: ['#1a1a1a', '#D55E00'], xl: '', xr: '', lw: 0.75, leg: true } },
      { id: 'palette_blues', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-palette'); e.value = 'blues'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); }); }, checks: { w: 3.5, font: 'Times', fs: 12, pal: ['#08306b', '#74b3dc'], xl: '', xr: '', lw: 0.75, leg: true } },
      { id: 'axis_labels', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-xlabel'); e.value = 'My X Axis'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); const f = document.querySelector('#o-ylabel'); f.value = 'My Y Axis'; f.dispatchEvent(new Event('change', {bubbles: true})); f.dispatchEvent(new Event('input', {bubbles: true})); }); await h.wait(150); }, checks: { w: 3.5, font: 'Times', fs: 12, pal: ['#08306b', '#74b3dc'], xl: 'My X Axis', xr: 'My Y Axis', lw: 0.75, leg: true } },
      { id: 'axis_range', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-xmin'); e.value = '10'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); const f = document.querySelector('#o-xmax'); f.value = '50'; f.dispatchEvent(new Event('change', {bubbles: true})); f.dispatchEvent(new Event('input', {bubbles: true})); }); await h.wait(150); }, checks: { w: 3.5, font: 'Times', fs: 12, pal: ['#08306b', '#74b3dc'], xl: 'My X Axis', xr: 'My Y Axis', lw: 0.75, leg: true, xmin: 10, xmax: 50 } },
      { id: 'line_width', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-lw'); e.value = '2'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); }); await h.wait(150); }, checks: { w: 3.5, font: 'Times', fs: 12, pal: ['#08306b', '#74b3dc'], xl: 'My X Axis', xr: 'My Y Axis', lw: 2, leg: true, xmin: 10, xmax: 50 } },
      { id: 'legend_off', setup: async () => { await p.evaluate(() => { const e = document.querySelector('#o-legend'); e.value = 'none'; e.dispatchEvent(new Event('change', {bubbles: true})); e.dispatchEvent(new Event('input', {bubbles: true})); }); }, checks: { w: 3.5, font: 'Times', fs: 12, pal: ['#08306b', '#74b3dc'], xl: 'My X Axis', xr: 'My Y Axis', lw: 2, leg: false, xmin: 10, xmax: 50 } }
    ];

    await p.evaluate(() => {
      document.querySelectorAll('.grp').forEach(g => g.classList.remove('closed'));
      document.querySelectorAll('details').forEach(d => d.open = true);
    });

    const svgTexts = {};
    for (const step of settings) {
      if (step.setup) {
        await step.setup();
        await h.wait(500);
      }
      const svg = await download('#saveSvg');
      T.check(`svg_${step.id}_downloaded`, !!svg, 'SVG downloaded');
      if (svg) {
        const s = svg.str;
        const wMatch = s.match(/<svg[^>]*width="([^"]+)"/);
        let actW = wMatch ? parseFloat(wMatch[1]) : 0;
        if (wMatch && wMatch[1].endsWith('in')) actW *= 72; // Convert in to points
        const expW = step.checks.w * 72; // in is *72 for points
        T.check(`svg_${step.id}_width`, Math.abs(actW - expW) < 1, `width: act ${actW}, exp ${expW}`);

        const c1 = step.checks.pal[0];
        T.check(`svg_${step.id}_pal1`, s.includes(c1) || s.includes(c1.toLowerCase()), `pal1: ${c1}`);

        // Font check: font-family="Arial" or font-family="Times New Roman" (app uses Times New Roman for Times)
        const expFont = step.checks.font === 'Times' ? '\'Times New Roman\', Times, serif' : (step.checks.font === 'Arial' ? 'Arial, Helvetica, sans-serif' : step.checks.font);
        T.check(`svg_${step.id}_font`, s.includes(`font-family="${expFont}"`), `font: ${expFont}`);

        // Font size check
        const actFsMatch = s.match(/font-size="([^"]+)"/);
        if(actFsMatch) {
            T.check(`svg_${step.id}_fs`, Math.abs(parseFloat(actFsMatch[1]) - step.checks.fs) < 0.1 || s.includes(`font-size="${step.checks.fs}"`), `fs: ${step.checks.fs}`);
        } else {
             T.check(`svg_${step.id}_fs`, s.includes(`font-size="${step.checks.fs}"`), `fs: ${step.checks.fs}`);
        }

        // Axis labels
        if (step.checks.xl) {
          T.check(`svg_${step.id}_xlabel`, s.includes(step.checks.xl), `xlabel: ${step.checks.xl}`);
        }
        if (step.checks.xr) {
          T.check(`svg_${step.id}_ylabel`, s.includes(step.checks.xr), `ylabel: ${step.checks.xr}`);
        }

        // Line width
        T.check(`svg_${step.id}_lw`, s.includes(`stroke-width="${step.checks.lw}"`), `lw: ${step.checks.lw}`);

        // legend: compared after the loop, from the text of the figure with the legend on and off
        svgTexts[step.id] = [...s.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1].trim());

        // Axis range check. xmin=10, xmax=50. The tick marks will show 10 and 50.
        if (step.checks.xmin !== undefined) {
           T.check(`svg_${step.id}_xmin`, s.includes(`>10<`) || s.includes(`>10.0<`), `xmin tick 10`);
           T.check(`svg_${step.id}_xmax`, s.includes(`>50<`) || s.includes(`>50.0<`), `xmax tick 50`);
        }
      }

      // Check PNG
      const png = await download('#savePng');
      T.check(`png_${step.id}_downloaded`, !!png, 'PNG downloaded');
      if (png) {
        const pngW = png.buf.readUInt32BE(16);
        // expected width is w (in) * dpi (600)
        const expPngW = Math.round(step.checks.w * 600);
        T.check(`png_${step.id}_width`, Math.abs(pngW - expPngW) <= 2, `pngW: act ${pngW}, exp ${expPngW}`);
      }
    }
    // Guards: the legend's entries (text present in the step before legend_off, gone after it) appear in every figure that keeps the legend, and turning it off removes them all.
    const ids = settings.map(st => st.id), prev = svgTexts[ids[ids.indexOf('legend_off') - 1]];
    if (prev && svgTexts.legend_off) { const legend = prev.filter(t => !svgTexts.legend_off.includes(t) && !/^[-−\d.,\s]+$/.test(t)); /* tick numbers move when the legend space goes, so only names count */ /* the step before legend_off has the same settings apart from the legend */
      T.check('svg_legend_has_entries', legend.length > 0, `texts only with the legend on: ${legend.join(', ') || 'none'}`);
      for (const st of settings) if (st.checks.leg && svgTexts[st.id]) T.check(`svg_${st.id}_legend`, legend.every(t => svgTexts[st.id].includes(t)), `missing legend entries: ${legend.filter(t => !svgTexts[st.id].includes(t)).join(', ')}`); }
  });

  // Crowded peak labels (#230): eight peaks 0.1 min apart cannot all be labelled above their apexes. A label that has no room
  // is left off and the footer under the figure says so; no label is drawn outside the figure. A fresh page, so the settings above do not carry over.
  await T.t('crowded_peak_labels', async () => {
    const {crowdedCsv, LABELS} = require('../data/gen_crowded_peaks');
    const q = await open(), hq = H(q.p), pg = q.p;
    try {
      await pg.click('#homeQuick'); await hq.wait(800);
      const foot = () => pg.$eval('#spec2', e => ({t: e.textContent, warn: e.classList.contains('warn'), shown: e.getClientRects().length > 0}));
      let f = await foot();
      T.check('crowded/example_no_warning', !/left off/.test(f.t) && !f.warn, f.t);
      await pg.setInputFiles('#file', {name: 'crowded_peaks.csv', mimeType: 'text/csv', buffer: Buffer.from(crowdedCsv())});
      await hq.wait(900);
      const g = await pg.evaluate(labels => { const svg = document.querySelector('#paper svg'); if (!svg) return null; const sr = svg.getBoundingClientRect();
        const labs = [...svg.querySelectorAll('text')].filter(t => labels.includes(t.textContent.trim())).map(t => { const r = t.getBoundingClientRect(); return {t: t.textContent.trim(), top: r.top - sr.top, bot: r.bottom - sr.top, l: r.left - sr.left, r: r.right - sr.left}; });
        return {w: sr.width, h: sr.height, labs}; }, LABELS);
      T.check('crowded/figure_drawn', g && g.labs.length > 0, g ? `${g.labs.length} peak labels drawn` : 'no figure');
      if (!g) return;
      const out = g.labs.filter(l => l.top < -1 || l.bot > g.h + 1 || l.l < -1 || l.r > g.w + 1);
      T.check('crowded/labels_inside_figure', !out.length, `outside the figure: ${out.map(l => `${l.t} (top ${Math.round(l.top)} px)`).join(', ')}`);
      const ov = (await hq.overlaps()).filter(s => LABELS.some(L => s.includes(L)));
      T.check('crowded/labels_dont_overlap', !ov.length, ov.join(', '));
      f = await foot();
      const nOff = +((f.t.match(/^(\d+) peak labels? left off/) || [])[1] || 0), drawn = new Set(g.labs.map(l => l.t));
      T.check('crowded/warning_shown', nOff > 0 && f.warn && f.shown, `footer: ${f.t}`);
      T.check('crowded/every_label_drawn_or_counted', drawn.size === g.labs.length && drawn.size + nOff === LABELS.length, `${drawn.size} drawn + ${nOff} left off, ${LABELS.length} peaks`);
      // two peaks per trace fit, so the warning goes away
      await pg.evaluate(() => { const e = document.getElementById('o-peakMax'); e.value = '2'; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); document.getElementById('detectAll').click(); });
      await hq.wait(600);
      f = await foot();
      T.check('crowded/warning_clears', !/left off/.test(f.t) && !f.warn, f.t);
      T.check('crowded/no_page_errors', !q.errs.length, q.errs.join(' | '));
    } finally { await q.close(); }
  });

  // Dragging a selected workflow panel moves it; the offset is saved, Reset position clears it, older projects load unmoved.
  await T.t('workflow_drag_panel', async () => {
    const q = await open(), pg = q.p, hq = H(pg), CH = path.join(__dirname, '..', 'data');
    try {
      await hq.newProject('Drag panels'); await hq.addRun(src('his')); await hq.addRun(src('q')); await hq.step('figure'); await hq.wait(600);
      /* the first panel's title: its x and y attributes are in SVG units, so they are exact */
      const first = () => pg.evaluate(() => { const t = [...document.querySelectorAll('#paper svg text')].find(e => /^A\s/.test(e.textContent)); if (!t) return null;
        const svg = t.ownerSVGElement, r = t.getBoundingClientRect(); return {x: +t.getAttribute('x'), y: +t.getAttribute('y'), k: svg.getScreenCTM().a, sx: r.left, sy: r.top, n: svg.querySelectorAll('text').length}; });
      const savedRun = async () => { const [dl] = await Promise.all([pg.waitForEvent('download'), pg.click('#projSave')]); const d = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); return {d, r: (d.runs || [])[0] || {}}; };
      const a0 = await first(); if (!T.check('drag/panel-found', !!a0, 'no panel title A')) return;
      /* select panel A by clicking inside it, then drag 40 px right and 30 px down */
      const sx = a0.sx + 30, sy = a0.sy + 60;
      await pg.mouse.click(sx, sy); await hq.wait(400);
      T.check('drag/toolbar-shows', await pg.isVisible('#wfTool'), 'clicking a panel opens the toolbar');
      await pg.mouse.move(sx, sy); await pg.mouse.down(); await pg.mouse.move(sx + 20, sy + 15, {steps: 4}); await pg.mouse.move(sx + 40, sy + 30, {steps: 4}); await pg.mouse.up(); await hq.wait(500);
      const a1 = await first(), ex = 40/a0.k, ey = 30/a0.k;
      T.check('drag/moved-x', !!a1 && Math.abs((a1.x - a0.x) - ex) <= 3, `moved ${a1 && (a1.x - a0.x).toFixed(1)} svg units, wanted about ${ex.toFixed(1)}`);
      T.check('drag/moved-y', !!a1 && Math.abs((a1.y - a0.y) - ey) <= 3, `moved ${a1 && (a1.y - a0.y).toFixed(1)} svg units, wanted about ${ey.toFixed(1)}`);
      /* a click that moves under 4 px does not move the panel */
      const b0 = await first(); await pg.mouse.move(sx + 40, sy + 30); await pg.mouse.down(); await pg.mouse.move(sx + 41, sy + 31); await pg.mouse.up(); await hq.wait(400);
      const b1 = await first(); T.check('drag/small-move-is-click', !!b1 && Math.abs(b1.x - b0.x) < 0.01 && Math.abs(b1.y - b0.y) < 0.01, `x ${b0.x} to ${b1 && b1.x}`);
      /* saved with the project */
      const sv = await savedRun(); T.check('drag/saved-offset', Math.abs(sv.r.wfDx) > 1 && Math.abs(sv.r.wfDy) > 1, `wfDx ${sv.r.wfDx}, wfDy ${sv.r.wfDy}`);
      /* an older project (no offset fields) loads at the unmoved position */
      const old = JSON.parse(JSON.stringify(sv.d)); (old.runs || []).forEach(r => { delete r.wfDx; delete r.wfDy; }); if (old.prep) delete old.prep.wfOff;
      await pg.setInputFiles('#projFile', {name: 'old_no_offsets.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old))}); await hq.wait(2500);
      await hq.step('figure'); await hq.wait(600); const o1 = await first();
      T.check('drag/old-project-unmoved', !!o1 && Math.abs(o1.x - a0.x) < 0.5 && Math.abs(o1.y - a0.y) < 0.5, `at ${o1 && o1.x},${o1 && o1.y}, was ${a0.x},${a0.y}`);
      /* reload the moved project, select the panel and reset it */
      await pg.setInputFiles('#projFile', {name: 'moved.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(sv.d))}); await hq.wait(2500);
      await hq.step('figure'); await hq.wait(600); const m1 = await first();
      T.check('drag/reload-keeps-offset', !!m1 && Math.abs((m1.x - a0.x) - ex) <= 3, `x ${m1 && m1.x}, unmoved ${a0.x}`);
      await pg.mouse.click(m1.sx + 30, m1.sy + 60); await hq.wait(400);
      await pg.click('#wfTool [data-wf=reset]'); await hq.wait(500);
      const r1 = await first(); T.check('drag/reset-position', !!r1 && Math.abs(r1.x - a0.x) < 0.5 && Math.abs(r1.y - a0.y) < 0.5, `at ${r1 && r1.x},${r1 && r1.y}, was ${a0.x},${a0.y}`);
      const sv2 = await savedRun(); T.check('drag/reset-saved', !sv2.r.wfDx && !sv2.r.wfDy, `wfDx ${sv2.r.wfDx}, wfDy ${sv2.r.wfDy}`);
      T.check('drag/no_page_errors', !q.errs.length, q.errs.join(' | '));
    } finally { await q.close(); }
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
