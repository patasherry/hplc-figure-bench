// Empty Quick mode and empty project at phone width (#1028, #1015): the empty-state view
// offers a centered Choose data files button, on screen without scrolling, that opens the file picker for several files.
const {open, H, suite} = require('../lib/harness');
(async () => { const T = suite('48_empty_start'), {p, errs, close} = await open({width: 390, height: 844}), h = H(p);

  await T.t('choose-data-files-in-empty-state', async () => {
    await p.click('#homeQuick'); await h.wait(1500);
    const go = p.locator('#nextGo');
    T.check('suggestion bar shown', await p.locator('#nextBar').isVisible());
    T.check('start tip shown', /to begin/.test(await p.locator('#nextText').innerText()), await p.locator('#nextText').innerText());
    const vis = await go.isVisible(), txt = vis ? (await go.innerText()).trim() : '';
    T.check('button shown', vis);
    T.check('button text', txt === 'Choose data files', JSON.stringify(txt));
    if (!vis) return;
    const r = await go.evaluate(e => { const b = e.getBoundingClientRect(); return {top: b.top, bottom: b.bottom, left: b.left, right: b.right, vh: innerHeight, vw: innerWidth}; });
    T.check('button above the fold', r.top >= 0 && r.bottom <= r.vh && r.left >= 0 && r.right <= r.vw, JSON.stringify(r));
    const [fc] = await Promise.all([p.waitForEvent('filechooser', {timeout: 5000}).catch(() => null), go.click()]);
    T.check('file picker opens', !!fc);
    T.check('picker takes several files', !!fc && fc.isMultiple());
  });

  await T.t('empty-bottom-bar', async () => {
    await p.click('#homeBtn');
    await h.wait(300);
    await h.newProject('Empty Project');
    await h.wait(500);
    const s2 = (await p.locator('#spec2').innerText()).trim();
    T.check('no peak label instruction when empty', s2 !== 'Click a peak to label it', 'spec2: ' + s2);
  });

  await T.t('empty-state-choose-files-centered', async () => {
    await p.click('#homeBtn');
    await h.wait(300);
    await p.click('#homeQuick');
    await h.wait(500);
    while (await p.locator('[data-act="del"]').count() > 0) {
      await p.locator('[data-act="del"]').first().click();
      await h.wait(200);
    }
    await p.evaluate(() => window.scrollTo(0, 0));
    await h.wait(200);
    const paperPick = p.locator('#paperPick');
    const vis = await paperPick.isVisible();
    T.check('empty-state choose files button shown', vis);
    const txt = vis ? (await paperPick.innerText()).trim() : '';
    T.check('empty-state choose files button text', txt === 'Choose data files', JSON.stringify(txt));
    if (vis) {
      const r = await paperPick.evaluate(e => { const b = e.getBoundingClientRect(); return {top: b.top, bottom: b.bottom, left: b.left, right: b.right, vh: innerHeight, vw: innerWidth}; });
      T.check('empty-state button above the fold', r.top >= 0 && r.bottom <= r.vh && r.left >= 0 && r.right <= r.vw, JSON.stringify(r));
      const midX = (r.left + r.right) / 2;
      T.check('empty-state button centered horizontally', Math.abs(midX - r.vw / 2) < 30, `midX: ${midX}, vw/2: ${r.vw / 2}`);
      const [fc] = await Promise.all([p.waitForEvent('filechooser', {timeout: 5000}).catch(() => null), paperPick.click()]);
      T.check('empty-state file picker opens', !!fc);
      T.check('empty-state picker takes several files', !!fc && fc.isMultiple());
    }
  });

  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
