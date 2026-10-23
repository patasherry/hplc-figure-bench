// 42 figures: checks that figure settings reach the exported SVG and PNG.
// UI and DOM only.
const {open, H, suite, src, fs, path} = require('../lib/harness');

(async () => {
  const T = suite('42_figures'), {p, errs, close} = await open(), h = H(p);

  await T.t('figure_settings', async () => {
    // 1. Load example data
    await h.newProject('Figure Settings');
    await h.addRun(src('his'));
    await h.wait(500);

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

        // Legend check (legend contains run name 'imac' or similar in this case 'his')
        const hasLegendItem = s.includes('>his<') || s.includes('>IMAC<');
        T.check(`svg_${step.id}_legend`, hasLegendItem === step.checks.leg, `legend: ${step.checks.leg} act: ${hasLegendItem}`);

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
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
