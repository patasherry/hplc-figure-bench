const { open, H, suite, src, path, fs, DATA } = require('../lib/harness');

(async () => {
  const T = suite('796_tag_mass');
  const { p, errs, close } = await open();
  const h = H(p);

  await T.t('tag_mass_sync', async () => {
    await h.newProject('Protein Properties');

    const gelPath = path.join(__dirname, '../data/bands_bias.png');
    await h.addRun([gelPath]);
    await h.wait(1000);

    // Switch to protein view using evaluate (page.click timed out earlier)
    await p.evaluate(() => {
        const hfb = window.__HFB;
        if (hfb) hfb.setMode('prot');
    });
    await h.wait(500);

    const seq = "ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY";

    // Fill the #protSeq textarea using p.evaluate to avoid Playwright's actionability checks blocking it
    await p.evaluate((seq) => {
        const el = document.querySelector('#protSeq');
        if (el) {
            el.value = seq;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, seq);
    await h.wait(500);

    const getProtTable = async () => {
      return await p.$$eval('#protTable tr', rows => {
        if (!rows.length) return [];
        const head = [...rows[0].cells].map(c => c.textContent.trim());
        return [...rows].slice(1).map(r => {
          const c = [...r.cells];
          return {
            form: c[head.indexOf('Form')].textContent.trim(),
            aa: parseInt(c[head.indexOf('aa')].textContent, 10),
            kda: parseFloat(c[head.indexOf('kDa')].textContent),
          };
        });
      });
    };

    const protTable = await getProtTable();
    const untaggedRow = protTable.find(r => r.form.includes('Untagged'));
    const tagOnlyRow = protTable.find(r => r.form.includes('Tag only'));

    if (!untaggedRow || !tagOnlyRow) throw new Error('Could not find Untagged or Tag only row. Table: ' + JSON.stringify(protTable));

    // Return to gel view
    await p.evaluate(() => {
        const hfb = window.__HFB;
        if (hfb) hfb.setMode('');
    });
    await h.wait(500);

    // Select the first trace in the timeline
    await p.evaluate(() => {
        const firstTrace = document.querySelector('.trace.run');
        if (firstTrace) firstTrace.click();
    });
    await h.wait(500);

    // Click cleaveDetect
    await p.evaluate(() => {
        const checkbox = document.querySelector('#o-cleaveDetect');
        if (checkbox) checkbox.click();
    });
    await h.wait(200);

    // Fill protein kDa using evaluate to avoid Playwright timeouts
    await p.evaluate((kda) => {
        const el = document.querySelector('#o-protKda');
        if (el) {
            el.value = String(kda);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, untaggedRow.kda);
    await h.wait(200);

    const cleaveInfo = await p.textContent('#cleaveInfo');
    const match = cleaveInfo.match(/free \S+ ([\d.]+) kDa/);
    if (!match) throw new Error('Could not parse free tag mass from cleaveInfo: ' + cleaveInfo);

    const cleaveTagMass = parseFloat(match[1]);
    const tableTagMass = tagOnlyRow.kda;

    const diff = Math.abs(cleaveTagMass - tableTagMass);
    T.check('mass discrepancy', diff <= 0.15, `Mass discrepancy: cleaveInfo says ${cleaveTagMass} but protTable says ${tableTagMass} (diff ${diff})`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
