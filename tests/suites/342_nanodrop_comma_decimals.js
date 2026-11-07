const {open, H, suite, fs, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('342_nanodrop_comma_decimals');

  async function fresh(id, fn){
    await T.t(id, async () => {
      const {p, errs, close} = await open();
      const h = H(p);
      try { await fn(p, h); }
      finally { T.check(id + '/no-page-errors', !errs.length, errs.join(' | ')); await close(); }
    });
  }

  // This test explicitly asserts the proposed strict standard for NanoDrop parsing
  // where commas act universally as decimals.
  await fresh('comma-decimal', async (p, h) => {
    await h.newProject('comma-decimal');
    await h.addRun([path.join(DATA, 'chrom/valid_unicorn.zip')]);
    await h.step('final');

    // We create a mock file here to specifically trigger the condition requested by the test contract.
    // We use a TSV file to cleanly separate column delimiters from decimal commas.
    const mockFile = path.join(__dirname, '..', 'data', 'nd', 'mock_nd_comma_fail.tsv');
    try {
      fs.writeFileSync(mockFile, `Date\tSample Name\tProtein (mg/mL)\tA280\tA260/A280\tSample Type\tMW\tE / 1000\tExtinction coefficient\tBaseline Correction (nm)\tBaseline Absorbance
10/22/2026 9:58:00 AM\tPool A\t1,25\t1,25\t0,57\t1 Abs = 1 mg / mL\t\t\t\t340\t0,011
`);
      await p.setInputFiles('#ndFile', [mockFile]);
      await p.waitForTimeout(400);

      const rows = await p.$$eval('.ndr', els => els.map(el => ({name: el.querySelector('input[data-ndk="name"]')?.value, value: el.querySelector('.nd-v')?.textContent.trim()})));

      // This explicitly asserts that commas act as decimals by checking if it parsed 1,25 as 1.25.
      // On the current main branch (without the implementation of alternative 2), this will fail
      // because it will read it incorrectly depending on the suffix digits and locale guessing.
      T.check('nd/comma-decimal-strict', rows.length > 0 && rows[0].value === '1.25 mg/mL', 'Expected comma to parse as decimal 1.25 mg/mL on explicit alternative branch');
    } finally {
      // Cleanup mock file
      if (fs.existsSync(mockFile)) {
        fs.unlinkSync(mockFile);
      }
    }
  });

  T.done();
})();
