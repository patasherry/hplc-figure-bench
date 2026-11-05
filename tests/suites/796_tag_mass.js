const { open, H, suite, path, DATA, fs } = require('../lib/harness');

const T = suite('796_tag_mass_sync');

T.t('10_tag_mass_sync', async () => {
  const { p, h, close, errs } = await open();

  // 1. New project; add the synthetic gel stand-in and select the gel step so the gel figure is shown.
  await p.evaluate(() => { document.querySelector('#pickGel').click(); });
  await p.setInputFiles('#gelFile', [path.join(DATA, 'standins', 'gel_photo.jpg')]);
  await p.waitForTimeout(400);

  // 2. Choose His-SUMO in #o-tagPreset (the menu starts at No tag since #1007); paste the 100-residue sequence above into #protSeq.
  const seq = "ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY";
  await p.evaluate(() => {
    const e = document.querySelector('#o-tagPreset');
    e.value = 'sumo';
    e.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await p.waitForTimeout(200);
  await p.evaluate(t => {
    const e = document.querySelector('#protSeq');
    e.value = t;
    e.dispatchEvent(new Event('input', {bubbles: true}));
    e.dispatchEvent(new Event('change', {bubbles: true}));
  }, seq);
  await p.waitForTimeout(500);

  // 3. Read the kDa cell of the Tag only row of #protTable.
  const tagTableContent = await p.evaluate(() => {
    const tbl = document.querySelector('#protTable');
    if (!tbl) return null;
    const rows = Array.from(tbl.querySelectorAll('tr')).slice(1);
    for (const r of rows) {
      const cells = r.querySelectorAll('td');
      if (cells.length > 2 && cells[0].textContent.includes('Tag only')) {
        return cells[2].textContent;
      }
    }
    return null;
  });

  const untaggedContent = await p.evaluate(() => {
    const tbl = document.querySelector('#protTable');
    if (!tbl) return null;
    const rows = Array.from(tbl.querySelectorAll('tr')).slice(1);
    for (const r of rows) {
      const cells = r.querySelectorAll('td');
      if (cells.length > 2 && cells[0].textContent.includes('Untagged')) {
        return cells[2].textContent;
      }
    }
    return null;
  });

  // 4. Tick #o-cleaveDetect; type the Untagged kDa into #o-protKda.
  await p.evaluate(() => {
    const e = document.querySelector('#o-cleaveDetect');
    if (e && !e.checked) e.click();
  });
  await p.waitForTimeout(200);

  const m = parseFloat(untaggedContent || '0');

  await p.evaluate(t => {
    const e = document.querySelector('#o-protKda');
    e.value = t;
    e.dispatchEvent(new Event('input', {bubbles: true}));
    e.dispatchEvent(new Event('change', {bubbles: true}));
  }, m);
  await p.waitForTimeout(500);

  // 5. Parse the kDa after "free His-SUMO" out of #cleaveInfo.
  const cleaveInfoText = await p.evaluate(() => {
    const e = document.querySelector('#cleaveInfo');
    return e ? e.textContent : null;
  });

  let freeTagMatch = null;
  if (cleaveInfoText) {
    const mm = cleaveInfoText.match(/free His-SUMO\s+([0-9.]+)\s+kDa/);
    if (mm) freeTagMatch = mm[1];
  }

  // 6. Assert the two agree within 0.15 kDa.
  T.check('10_tag_mass_sync.tag_only_exists', tagTableContent !== null, 'Tag only row should exist');
  T.check('10_tag_mass_sync.free_tag_exists', freeTagMatch !== null, 'Free tag mass should be parsed');

  if (tagTableContent !== null && freeTagMatch !== null) {
    const v1 = parseFloat(tagTableContent);
    const v2 = parseFloat(freeTagMatch);
    T.check('10_tag_mass_sync.mass_agree', Math.abs(v1 - v2) <= 0.15, `Expected ${v1} and ${v2} to agree within 0.15 kDa. (Got: Tag=${v1}, Free=${v2})`);
  }

  await close();
  T.done();
});
