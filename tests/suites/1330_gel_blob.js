const {open, H, suite, src} = require('../lib/harness');
/* #1330: a gel over the old 12 MB data-URL ceiling must survive save and reload in local mode with identical pixels, so identical purity. */
(async () => {
  const T = suite('1330_gel_blob');
  await T.t('big_gel_purity_survives_reload', async () => {
    const {p, errs, close} = await open(), h = H(p);
    /* synthetic: grey bands plus seeded noise, 3000x3000, so the PNG data URL is well over 12e6 characters */
    const png = await p.evaluate(() => { const W = 3000, Hh = 3000, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'), im = x.createImageData(W, Hh); let s = 12345; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s >>> 24) - 128; };
      for (let y = 0; y < Hh; y++) for (let a = 0; a < W; a++) { const lane = Math.floor(a / 1000), dx = Math.abs(a % 1000 - 500), w = Math.exp(-.5 * (dx / 240) ** 8), bands = lane === 0 ? [[600,60,38],[1450,65,38],[2160,65,38]] : [[1200,110,62],[2300,55,75]];
        const dark = bands.reduce((t, [mu, hh, z]) => t + hh * Math.exp(-.5 * ((y - mu) / z) ** 2), 0) * w, j = 4 * (W * y + a); for (let k = 0; k < 3; k++) im.data[j + k] = Math.max(0, Math.min(255, Math.round(235 - dark + rnd() * .3))); im.data[j + 3] = 255; }
      x.putImageData(im, 0, 0); return c.toDataURL('image/png'); });
    const big = png.length;
    const file = require('path').join(require('os').tmpdir(), 'hfb1330_gel.png'); require('fs').writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    T.check('image is over the old ceiling', big > 12e6, 'data URL length ' + big);
    const rd = async () => { const csvWait = p.waitForEvent('download', {timeout: 10000}); await p.evaluate(() => document.querySelector('#bandCsv').click()); const d = await csvWait; return require('fs').readFileSync(await d.path(), 'utf8'); };
    await h.newProject('Big gel');
    await h.addRun(src('his'));
    await p.setInputFiles('#gelFile', file); await h.wait(8000);
    const before = await rd();
    T.check('purity read before save', /\d/.test(before) && before.split('\n').length > 2, before.slice(0, 300));
    await h.wait(3000); /* autosave */
    await p.reload(); await h.wait(1200);
    const card = p.locator('#projList [data-pid]').first();
    T.check('saved project listed after reload', await card.count() > 0, 'no card');
    await card.click(); await h.wait(6000);
    /* the gel cards are hidden inside a project, so select the gel with a DOM click on its card */
    await p.evaluate(() => document.querySelector('.trace.gelc[data-kind=gel] .thead').click()); await h.wait(2000);
    const after = await rd();
    T.check('csv identical after save and reload', before === after, before.slice(0, 400) + ' || ' + after.slice(0, 400));
    T.check('no page errors', !errs.length, errs.join(' | '));
    await close();
  });
  T.done();
})();
