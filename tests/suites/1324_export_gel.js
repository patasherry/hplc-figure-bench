const {open, suite, fs, path, RES} = require('../lib/harness');

/* #1324, #1426: project export used to turn PNG gel images over 12 million data-URL characters into JPEGs, and the
   displayed band areas and purity then changed after export and import. The export is now always PNG, and the
   displayed densitometry must survive the round trip exactly. */
const project = image => ({
  app: 'HPLC Figure Bench', version: 1, quick: true, runs: [], traces: [], cur: 'g1',
  gels: [{
    id: 'g1', name: 'oversized synthetic gel', image, nLanes: 3, labels: 'M, Sample A, Sample B',
    marksManual: true, marks: [{kda: 100, y: .2}, {kda: 10, y: .8}], black: 0, white: 255,
    autoLv: false, tags: [{kind: 'target', lane: 1, y: 1200 / 3000}, {kind: 'target', lane: 2, y: 1200 / 3000}], cl: 0, cr: 0, ct: 0, cb: 0,
    rot: 0, fine: 0, assign: []
  }],
  opt: {gelAutoCrop: false, bandSens: 5, purBase: 'lane', purRow: true, knownOn: false,
    tagPreset: 'custom', tagSeq: '', tidy13: true, tidy14: true}
});

async function oversizedGel(p) {
  return p.evaluate(() => {
    const W = 3000, H = 3000, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), image = x.createImageData(W, H); let seed = 1324;
    const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 24) - 128; };
    for (let y = 0; y < H; y++) for (let a = 0; a < W; a++) {
      const lane = Math.floor(a / 1000), dx = Math.abs(a % 1000 - 500), width = Math.exp(-.5 * (dx / 240) ** 8);
      const bands = lane === 0 ? [[600, 60, 38], [1450, 65, 38], [2160, 65, 38]] : [[1200, 110, 62], [2300, 55, 75]];
      const stain = bands.reduce((total, [mu, height, sigma]) => total + height * Math.exp(-.5 * ((y - mu) / sigma) ** 2), 0) * width;
      const j = 4 * (W * y + a), value = Math.max(0, Math.min(255, Math.round(235 - stain + noise() * .3)));
      image.data[j] = image.data[j + 1] = image.data[j + 2] = value; image.data[j + 3] = 255;
    }
    x.putImageData(image, 0, 0); return c.toDataURL('image/png');
  });
}

async function importProject(p, data, name) {
  await p.setInputFiles('#projFile', {name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data))});
  await p.waitForFunction(() => {
    const rows = [...document.querySelectorAll('#bandTable tr')];
    return rows.some(row => row.cells[1] && row.cells[1].textContent.trim() === 'Sample A' && row.cells[4].textContent.trim());
  }, null, {timeout: 15000});
}

async function displayedDensitometry(p) {
  return p.$$eval('#bandTable tr', rows => rows.filter(row => row.cells[1] && /^Sample /.test(row.cells[1].textContent.trim())).map(row => ({
    lane: row.cells[0].textContent.trim(), label: row.cells[1].textContent.trim(),
    purity: row.cells[4].textContent.trim(), bands: row.cells[5].textContent.trim()
  })));
}

(async () => {
  const T = suite('1324_export_gel');
  await T.t('oversized-export-round-trip', async () => {
    let first, fresh, saved;
    try {
    first = await open(); const png = await oversizedGel(first.p);
    T.check('source PNG exceeds legacy export ceiling', png.length > 12e6, 'data URL length ' + png.length);
    await first.p.click('#homeQuick');
    await importProject(first.p, project(png), 'oversized_source.json');
    const before = await displayedDensitometry(first.p);
    T.check('source shows purity and band areas', before.length === 2 && before.every(row => row.purity && row.bands), JSON.stringify(before));
    const [download] = await Promise.all([first.p.waitForEvent('download', {timeout: 20000}), first.p.click('#projSave')]);
    saved = path.join(RES, '1324-export-gel-' + Date.now() + '.json'); await download.saveAs(saved);
    const exported = JSON.parse(fs.readFileSync(saved, 'utf8'));
    T.check('an oversized gel is exported as PNG, not a JPEG copy', /^data:image\/png/.test(exported.gels[0].image || ''), (exported.gels[0].image || '').slice(0, 40));
    const sourceErrors = first.errs.slice(); await first.close(); first = null;

    fresh = await open(); await fresh.p.click('#homeQuick');
    await fresh.p.setInputFiles('#projFile', saved);
    await fresh.p.waitForFunction(() => {
      const rows = [...document.querySelectorAll('#bandTable tr')];
      return rows.some(row => row.cells[1] && row.cells[1].textContent.trim() === 'Sample A' && row.cells[4].textContent.trim());
    }, null, {timeout: 15000});
    const after = await displayedDensitometry(fresh.p);
    T.check('displayed purity and band areas survive export import', JSON.stringify(after) === JSON.stringify(before), JSON.stringify({before, after}));
    T.check('no page errors', !sourceErrors.length && !fresh.errs.length, sourceErrors.concat(fresh.errs).join(' | '));
    } finally {
      if (first) await first.close();
      if (fresh) await fresh.close();
      if (saved) fs.rmSync(saved, {force: true});
    }
  });
  T.done();
})();
