// 43 full range: "Show full data range" draws each trace over its whole recorded range in the workflow figure. UI and DOM only.
const {open, H, suite, src} = require('../lib/harness');

(async () => {
  const T = suite('43_full_range'), {p, errs, close} = await open(), h = H(p);

  await T.t('full_range', async () => {
    await h.newProject('Full range'); await h.addRun(src('q')); await h.step('figure'); await h.wait(600);
    await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
    const set = async on => { await p.evaluate(on => { const e = document.querySelector('#o-wfFull'); e.checked = on; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); }, on); await h.wait(700); };
    /* the numbers on the bottom row of the figure are the x-axis ticks */
    const xr = () => p.evaluate(() => { const svg = document.querySelector('#paper svg'); if (!svg) return null;
      const t = [...svg.querySelectorAll('text')].map(e => ({v: +e.textContent.trim(), t: e.textContent.trim(), r: e.getBoundingClientRect()})).filter(o => /^\d+(\.\d+)?$/.test(o.t));
      if (!t.length) return null; const bot = Math.max(...t.map(o => o.r.bottom)), row = t.filter(o => Math.abs(o.r.bottom - bot) < 3), sr = svg.getBoundingClientRect();
      return {max: Math.max(...row.map(o => o.v)), w: Math.round(sr.width), h: Math.round(sr.height)}; });
    T.check('control_exists', await p.locator('#o-wfFull').count() === 1, 'checkbox #o-wfFull');
    const before = await xr(); await set(true); const full = await xr();
    T.check('widens_axis', !!before && !!full && full.max > before.max, JSON.stringify({before, full}));
    T.check('fits_page', !!full && full.h <= 9.5*96 + 2, JSON.stringify(full));
    T.check('no_overlap', !(await h.overlaps()).length, (await h.overlaps()).join(' | '));
    await set(false); const back = await xr();
    T.check('toggle_off_restores', !!back && !!before && back.max === before.max, JSON.stringify({before, back}));
  });

  T.check('no_errors', !errs.length, errs.join('|'));
  await close();
  if (T.done) T.done();
})();
