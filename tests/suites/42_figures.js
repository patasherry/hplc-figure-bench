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

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
