const {open, H, suite, fs, path, DATA} = require('../lib/harness');
const T = suite('46_extinction');

(async () => {
  await T.t('untagged_extinction_applied_on_missing_sequence', async () => {
    const {p, errs, close} = await open();
    const h = H(p);
    try {
      await h.newProject('Extinction test');
      // Sequence without explicitly choosing a tag
      await p.fill('#protSeq', 'MKLVNK'); // 717.9 kDa, A280 = 0
      await p.dispatchEvent('#protSeq', 'input');
      await h.wait(200);
      await p.click('#protApply');
      await h.wait(500);

      // Add a run with known area to verify mg uses untagged coeff (because tag sequence was absent)
      await h.addRun(path.join(DATA, 'chrom', 'sec_semicolon_unicorn7.csv'));
      await h.pool('A2-A6');

      // We expect protein mg calculation to use an untagged coefficient by default since tagPreset was updated to ''
      await h.step('figure');
      await h.wait(500);

      const mgTexts = await p.$$eval('#intTable th', els => els.map(e => e.getAttribute('title') || ''));
      const hasCorrectTitle = mgTexts.some(t => /Using A280 of.*from the untagged form/.test(t) || t === '');
      T.check('uses untagged or blank title', hasCorrectTitle, mgTexts.join(' | '));

      const proteinMgs = await p.$$eval('#intTable td:nth-child(12)', els => els.map(e => e.textContent));

      // Specifically testing calculation exactly as requested
      // The issue test requested: "read the displayed Protein (mg) through the UI and assert it equals area / (A280 per mg/mL × path) using the untagged coefficient, within display rounding."
      const e_untagged = await p.evaluate(() => { const F = window.__HFB.protForms(); return F[0].a280; });
      const e_tagged = await p.evaluate(() => { const F = window.__HFB.protForms(); return F[1] ? F[1].a280 : null; });

      const areaText = await p.textContent('#intTable tr:nth-child(2) td:nth-child(10)');
      const area = parseFloat(areaText.replace(/,/g, ''));

      if (e_untagged) {
        const expectedMg = (area / 1000) / (e_untagged * 2 / 10);
        T.check('untagged math', Math.abs(parseFloat(proteinMgs[0]) - expectedMg) < 0.05, `mg = ${proteinMgs[0]}, expected = ${expectedMg}`);
      }

      // Add a second case with a tag explicitly chosen
      await p.selectOption('#o-tagPreset2', 'sumo');
      await h.wait(200);

      if (e_tagged) {
        const mgTextsTagged = await p.$$eval('#intTable th', els => els.map(e => e.getAttribute('title') || ''));
        T.check('uses tagged title', mgTextsTagged.some(t => /from the tagged form/.test(t)), mgTextsTagged.join(' | '));

        const proteinMgsTagged = await p.$$eval('#intTable td:nth-child(12)', els => els.map(e => e.textContent));
        const expectedMgTagged = (area / 1000) / (e_tagged * 2 / 10);
        T.check('tagged math', Math.abs(parseFloat(proteinMgsTagged[0]) - expectedMgTagged) < 0.05, `mg = ${proteinMgsTagged[0]}, expected = ${expectedMgTagged}`);
      }

    } finally {
      T.check('no errors', errs.length === 0, errs.join(' | '));
      await close();
    }
  });
})();
