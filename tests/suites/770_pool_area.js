// 770 pool area (#770): a pool and a region over the same span, with the same baseline setting, give the same trapezoid area.
// The pool used to clamp each slice at 0, so a dip below the baseline inside the pool inflated it. Zero baseline here, so the
// pool's outward-walking valley baseline (kept) does not enter. Synthetic only: tests/data/gen_pool_dip.js (peak plus a dip, pooled F3-F6 = 8 to 12 mL).
const {open, H, suite} = require('../lib/harness');
const {poolDipCsv, trapArea, POOL, A, B} = require('../data/gen_pool_dip');
const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
const setVal = (p, sel, v) => p.evaluate(([sel, v]) => { const e = document.querySelector(sel); if (!e) return false; e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [sel, String(v)]);

(async () => { const T = suite('770_pool_area');
  await T.t('same_span', async () => { const {p, errs, close} = await open(), h = H(p);
    try {
      await h.newProject('Pool area');
      await h.addRun({name: 'pool_dip.csv', mimeType: 'text/csv', buffer: Buffer.from(poolDipCsv())});
      await setVal(p, '#o-intMethod', 'trap'); await setVal(p, '#o-intBase', 'zero'); await h.wait(300);
      await h.pool(POOL);
      await p.evaluate(() => document.getElementById('intAuto').click()); await h.wait(600);
      /* the first region is set to the pool's span through its Start and End boxes */
      await setVal(p, '#ia0', A); await h.wait(300); await setVal(p, '#ib0', B); await h.wait(400);
      const t = await h.peakTable(), head = t[0] || [], ia = head.findIndex(c => /^Area/.test(c));
      const reg = t.find(r => r[0] === 'P1'), pool = t.find(r => /^Pool/.test(r[0] || ''));
      T.check('same_span.rows_shown', ia >= 0 && reg && pool, JSON.stringify(t));
      if (ia >= 0 && reg && pool) {
        const ra = num(reg[ia]), pa = num(pool[ia]), exp = trapArea(A, B, true), info = `region ${reg[ia]} (${reg[1]} to ${reg[2]}), pool ${pool[ia]} (${pool[1]} to ${pool[2]}), closed form ${exp.toFixed(3)} mAU·mL`;
        T.check('same_span.same_interval', num(reg[1]) === A && num(reg[2]) === B && num(pool[1]) === A && num(pool[2]) === B, info);
        /* areas of 10 or more show to whole mAU·mL, so agreeing within display rounding means within 1 */
        T.check('same_span.pool_equals_region', Math.abs(pa - ra) <= 1, info); /* guards: on main the clamp turned the dip positive, so the pool showed more */
        T.check('same_span.pool_matches_trapezoid', Math.abs(pa - exp) <= 0.5 + 1e-9, info);
        T.check('same_span.region_matches_trapezoid', Math.abs(ra - exp) <= 0.5 + 1e-9, info);
      }
    } finally { T.check('same_span.no_page_errors', !errs.length, errs.join(' | ')); await close(); } });
  T.done();
})();
