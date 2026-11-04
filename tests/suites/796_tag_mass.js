const { open, H, suite, path, DATA, fs } = require('../lib/harness');

const T = suite('796_tag_mass_sync');

T.t('10_tag_mass_sync', async () => {
  const { p, h, close, errs } = await open();

  await p.evaluate(() => { document.querySelector('#pickGel').click(); });
  await p.setInputFiles('#gelFile', [path.join(DATA, 'standins', 'gel_photo.jpg')]);
  await p.waitForTimeout(400);

  const seq = "ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWY";
  await p.evaluate(t => {
    const e = document.querySelector('#protSeq');
    e.value = t;
    e.dispatchEvent(new Event('input', {bubbles: true}));
    e.dispatchEvent(new Event('change', {bubbles: true}));
  }, seq);
  await p.waitForTimeout(500);

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

  const cleaveInfoText = await p.evaluate(() => {
    const e = document.querySelector('#cleaveInfo');
    return e ? e.textContent : null;
  });

  let freeTagMatch = null;
  if (cleaveInfoText) {
    const mm = cleaveInfoText.match(/free His-SUMO\s+([0-9.]+)\s+kDa/);
    if (mm) freeTagMatch = mm[1];
  }

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
