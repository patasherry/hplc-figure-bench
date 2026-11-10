// 1023 carryover semantics (#1023): what each quantity means when only part of a Concentrated output goes on to the next column.
//   Protein (mg) on the Concentrated row: all the material produced (the measured output, kept-back share included).
//   Step yield (%) of the next column: recovery of the material loaded on it (mg recovered / mg loaded).
//   Yield (%): the route shown, against step 1, so it counts only the loaded share; the kept-back share is named in a note under the
//   table (mg, volume, what it was kept as, and its % of step 1) so it does not read as purification loss.
// Case: IMAC pool (≈20 mL) → concentrated to 5 mL at 5 mg/mL (25 mg) → 1 mL (5 mg) loaded on SEC, 4 mL (20 mg) kept back; and the same
// project with no split (every project saved before #1022), where all 25 mg are loaded and no note appears. Synthetic stand-ins only.
const {open, H, suite, src, path, DATA} = require('../lib/harness');
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,%]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const CONC = 5, VOUT = 5, VIN = 20;

(async () => { const T = suite('1023_carryover_semantics');
  const scenario = async split => { const {p, close} = await open(), h = H(p); p.on('dialog', d => d.accept());
    const setVal = (sel, v) => p.evaluate(({sel, v}) => { const e = document.querySelector(sel); if (!e) return false; e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); return true; }, {sel, v: String(v)});
    try {
      await h.newProject('Carryover');
      await setVal('#o-protKda', 50); await setVal('#o-eps', 1); await h.wait(200);
      await h.addRun(src('his')); await h.pool('T1-T6');
      await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await h.wait(500);
      await setVal('#btw-vIn', VIN); await setVal('#btw-conc', CONC); await setVal('#btw-vOut', VOUT); await h.wait(300);
      const sum = p.locator('#btwSplitBox > summary'); if (await sum.isVisible()) await sum.click(); await h.wait(150);
      if (split) { for (const [k, v] of Object.entries(split)) await setVal(`#btw-${k}`, v); await h.wait(400); }
      const hint = await p.$eval('#btwSplit', e => e.hidden ? '' : e.textContent).catch(() => '');
      /* the SEC stand-in: a time axis run at 0.5 mL/min, 2 mm path; its pool holds ≈0.4 mg by the UV area, well under the 5 mg loaded */
      await h.addRun(path.join(DATA, 'chrom', 'sec_semicolon_unicorn7.csv')); await h.pool('1.A.1-1.A.3');
      await p.evaluate(() => { for (const [k, v] of [['path', '2'], ['mFlow', '0.5']]) { const el = document.querySelector(`.trace.run.sel [data-k=${k}]`); if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); } } });
      await h.wait(300); await h.step('figure'); await h.wait(400);
      const rs = await h.sumTable(), head = rs[0] || [], rows = rs.slice(1).filter(r => r.length === head.length);
      const col = re => head.findIndex(k => re.test(k)), mi = col(/^Protein \(mg\)/), yi = col(/^Yield/), si = col(/^Step yield/), ci = rows.findIndex(r => /concentrat/i.test(r[0] || ''));
      const g = (r, i) => r && i >= 0 ? num(r[i]) : null, s1 = rows[0], conc = ci >= 0 ? rows[ci] : null, sec = ci >= 0 ? rows[ci + 1] : null;
      const notes = await p.$$eval('#sumNotes li', ls => ls.map(l => l.textContent));
      return {hint, head, notes, s1Mg: g(s1, mi), concMg: g(conc, mi), concY: g(conc, yi), secName: sec ? sec[0] : null, secMg: g(sec, mi), secY: g(sec, yi), secStep: g(sec, si)};
    } finally { await close(); } };
  /* whole-percent cells against values from the 2-decimal mg cells */
  const pct = (a, b) => a > 0 && b > 0 ? 100*a/b : null, near = (got, want) => got != null && want != null && Math.abs(got - want) <= Math.max(1, 0.02*want);

  await T.t('split', async () => { const S = await scenario({vLoad: 1, vKeep: 4, keepAs: 'flash-frozen, -80 °C'}), info = JSON.stringify(S), loaded = CONC*1, kept = CONC*4;
    T.check('split.total_produced', S.concMg === CONC*VOUT, info); /* guards: the Concentrated row is all 25 mg produced */
    T.check('split.hint_loaded', /5\.00 mg \(1\.0 of 5\.0 mL\) went on to the next step, 4\.0 mL kept back/.test(S.hint), S.hint);
    T.check('split.sec_step_yield_from_loaded', near(S.secStep, pct(S.secMg, loaded)), info); /* guards: SEC step yield = SEC mg / 5 mg loaded */
    T.check('split.sec_step_yield_not_over_100', S.secStep != null && S.secStep <= 100, info); /* guards: a kept-back aliquot never pushes SEC recovery above 100% */
    T.check('split.sec_yield_route', near(S.secY, pct(S.secMg, S.s1Mg)), info); /* guards: Yield stays the route shown, against step 1 */
    /* guards (fails on main, which had no such note): the kept-back 20 mg is named, with its share of step 1, as not lost */
    const n = S.notes.find(t => /kept back/.test(t)) || '';
    T.check('split.note_amounts', /25\.00 mg in all; 5\.00 mg \(1\.0 of 5\.0 mL\) was loaded on the next step and 20\.00 mg \(4\.0 mL, flash-frozen, -80 °C\) kept back/.test(n), n || S.notes.join(' | '));
    T.check('split.note_kept_pct', near(num((n.match(/kept back, (\d+)% of step 1/) || [])[1]), pct(kept, S.s1Mg)), n);
    T.check('split.note_label', /Kept back is not lost: the next step's step yield counts from the 5\.00 mg loaded, and Yield after this point counts only the loaded share\./.test(n), n); });

  await T.t('legacy', async () => { const S = await scenario(null), info = JSON.stringify(S);
    T.check('legacy.total_produced', S.concMg === CONC*VOUT, info);
    T.check('legacy.sec_step_yield_from_all', near(S.secStep, pct(S.secMg, CONC*VOUT)), info); /* guards: no split means all 25 mg were loaded */
    T.check('legacy.sec_yield_route', near(S.secY, pct(S.secMg, S.s1Mg)), info);
    T.check('legacy.no_hint', S.hint === '', S.hint);
    T.check('legacy.no_kept_note', !S.notes.some(t => /kept back/.test(t)), S.notes.join(' | ')); });
  T.done();
})();
