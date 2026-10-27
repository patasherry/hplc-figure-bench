const {open, H, suite, fs, path, DATA} = require('../lib/harness');
const F = require('../data/gen_import_sec');

(async () => {
  const T = suite('test_sec_calibration_units');
  const SEL = {quick: '#homeQuick', project: '#projFile', save: '#projSave'};
  const click = (p, sel) => p.locator(sel).evaluate(e => e.click());

  await T.t('missing_units_defaults', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      const fixture = F.project();
      // Introduce an old SEC calibration structure missing units and stds
      fixture.opt.secCals.push({
        id: "scTestNoUnit",
        name: "Custom",
        col: "custom",
        v0: 8,
        vt: 24,
        set: "custom"
      });

      await click(p, SEL.quick);
      await p.setInputFiles(SEL.project, F.file('synthetic.json', JSON.stringify(fixture)));
      await h.wait(400);

      // Save it and check defaults
      const download = p.waitForEvent('download'); await click(p, SEL.save);
      const saved = JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));

      const cal = saved.opt.secCals.find(c => c.id === 'scTestNoUnit');
      T.check('default_unit_is_ml', cal && cal.unit === 'mL', `Default unit is ${cal?.unit}, expected mL`);
      T.check('default_stds_array_valid', cal && Array.isArray(cal.stds), `Stds is ${typeof cal?.stds}, expected array`);

      T.check('no page errors', !errs.length, errs.join(' | '));
    } finally {
      await close();
    }
  });

  T.done();
})();
