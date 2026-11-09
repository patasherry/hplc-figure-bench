// 1267 status notifications: a toast sits below the header (it must not cover the top navigation) and a click on it dismisses it.
// Trigger: a synthetic malformed NanoDrop file loaded in a project, which shows a "has no usable measurements" toast.
const {open, H, suite, path, DATA} = require('../lib/harness');

(async () => { const T = suite('1267_toast_dismiss');
  for (const [k, vp] of [['desktop', {width: 1280, height: 860}], ['phone', {width: 390, height: 860}]]) await T.t('toast_' + k, async () => {
    const {p, close} = await open(vp), h = H(p);
    try {
      await h.newProject('Toast ' + k); await h.addRun(path.join(DATA, 'chrom/valid_unicorn.zip')); await h.step('final');
      await p.setInputFiles('#file', path.join(DATA, 'nd/nd_malformed_header.csv'));
      await p.waitForSelector('#toast .pill', {timeout: 3000});
      const g = await p.evaluate(() => { const t = document.querySelector('#toast .pill').getBoundingClientRect(), hd = document.querySelector('header.top').getBoundingClientRect(); return {toastTop: t.top, headerBottom: hd.bottom, scrolled: window.scrollY}; });
      T.check(`1267.${k}.below_header`, g.scrolled > 0 || g.toastTop >= g.headerBottom - 0.5, JSON.stringify(g));
      const bad = p.locator('#toast .pill', {hasText: 'no usable measurements'}); await bad.click();
      await h.wait(200);
      T.check(`1267.${k}.click_dismisses`, (await bad.count()) === 0, 'the toast is still shown after a click');
    } finally { await close(); } });
  T.done();
})();
