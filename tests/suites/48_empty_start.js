// Empty Quick mode at phone width (#1028): the "what to do next" bar offers a Choose data files button, on screen
// without scrolling, that opens the file picker for several files. UI and DOM only.
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

  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
