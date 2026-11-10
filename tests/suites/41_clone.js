const {open, H, suite, src} = require('../lib/harness');
suite('Clone Selection UI check', async p => {
  const h = new H(p);
  await open(p, 'empty');
  await h.newProject('clones');

  await p.locator('#tabBtn-prep').click();
  await p.evaluate(() => { document.getElementById('prepBox').open = true; });

  await p.evaluate(() => {
    window.prep.clones = [
      { id: 'cl1', name: 'Clone A', status: 'verified' },
      { id: 'cl2', name: 'Clone B', status: 'failed' }
    ];
    window.render();
  });
  await p.waitForTimeout(200);

  await p.evaluate(() => {
    const sel = document.getElementById('pr-selectedCloneId');
    sel.value = 'cl1';
    sel.dispatchEvent(new Event('change'));
  });
  await p.waitForTimeout(200);
  const v1 = await p.evaluate(() => window.prep.selectedCloneId);
  if (v1 !== 'cl1') throw new Error('Could not select valid clone');
  const disabled = await p.evaluate(() => {
    const sel = document.getElementById('pr-selectedCloneId');
    return Array.from(sel.options).find(o => o.value === 'cl2').disabled;
  });
  if (!disabled) throw new Error('Failed clone was not disabled in select');
});
