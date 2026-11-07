const {open, H, suite, path, ROOT, DATA, fs, purif} = require('../lib/harness');
const T = suite('49_zero_measurement');

(async () => {
    await T.t('zero-measurement.import', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Zero Conc');
      await p.locator('#homeQuick').evaluate(e => e.click());
      await p.waitForTimeout(600);

      const csv = `Sample Name\tNucleic Acid(ng/uL)\tA260/A280\tA230\nZeroTest\t0.0\t1.8\t1.0\nNormalTest\t2.5\t1.8\t1.0`;
      await p.setInputFiles('#file', {name: 'zero_nd.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
      await p.waitForTimeout(1500);

      const ndRows = await p.$$('.ndr');
      T.check('zero-measurement.kept', ndRows.length === 2, `should keep 0.0 concentration. Expected 2 ndr, found ${ndRows.length}.`);
      await close();
    });

    T.done();
})();
