const {open, H, suite, path} = require('../lib/harness');

(async () => {
  const T = suite('843_y_axis_ticks_preset'), {p, errs, close} = await open(), h = H(p);

  await T.t('y_axis_ticks_density', async () => {
    await h.newProject('Test Project');

    // Add run
    const csvPath = path.join(__dirname, '../data/chrom/sec_semicolon_unicorn7.csv');
    await p.evaluate(() => { const btn = document.querySelector('#tl [data-addmenu]'); if (btn) btn.click(); });
    await h.wait(100);
    await p.evaluate(() => { const btn = document.querySelector('#tl [data-addstep="run"]'); if (btn) btn.click(); });
    await h.wait(100);
    await p.setInputFiles('#file', [csvPath]);
    await h.wait(1500);

    let info = await p.evaluate(() => {
      document.querySelector('#o-preset').value = 'poster';
      document.querySelector('#o-preset').dispatchEvent(new Event('input', {bubbles: true}));
      return new Promise(resolve => setTimeout(resolve, 500)).then(() => {
        const svg = document.querySelector('#paper svg');
        if (!svg) return {height: null};
        const texts = Array.from(svg.querySelectorAll('text'));
        const labels = texts.map(t => ({text: t.textContent, anchor: t.getAttribute('text-anchor')}));
        const yTicks = texts.filter(t => t.getAttribute('text-anchor') === 'end' && /^[0-9.\-−]+$/.test(t.textContent.replace('\u2212', '-')));
        return {height: svg.getAttribute('height'), count: yTicks.length, labels};
      });
    });

    console.log("Labels:", info.labels.filter(t => t.anchor === 'end'));

    // Check it successfully reduces it.
    if (info.count > 6) throw new Error("Too many y-axis ticks at poster preset: " + info.count);
    if (info.count < 2) throw new Error("Too few y-axis ticks at poster preset: " + info.count);
  });

  await close();
})();
