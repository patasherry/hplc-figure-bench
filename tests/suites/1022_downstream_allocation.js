// 1022 downstream allocation (#1022): a Concentrated step can say how much of its measured output was loaded on the next column
// and how much was kept back. The next column's step yield then counts from the loaded share (mg × loaded / output, for a well-mixed
// sample), while the Concentrated row still reports the whole measured output. No loaded volume (every project saved before this) keeps
// the old meaning, all of it loaded, and a split whose loaded plus kept is more than the output is flagged and also counts as all.
// Synthetic only: the IMAC and anion-exchange stand-in runs, and a typed reading of 5 mg/mL in 5 mL (25 mg).
const {open, H, suite, src} = require('../lib/harness');
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,%]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const CONC = 5, VOUT = 5;

(async () => { const T = suite('1022_downstream_allocation');
  /* one project: IMAC pooled, Concentrated (typed reading and volume, optional split), Q pooled; returns the table and the card's hint */
  const scenario = async split => { const {p, close} = await open(), h = H(p); p.on('dialog', d => d.accept());
    const setVal = (sel, v) => p.evaluate(({sel, v}) => { const e = document.querySelector(sel); if (!e) return false; e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); return true; }, {sel, v: String(v)});
    try {
      await h.newProject('Allocation');
      /* a coefficient, so each column's pool has an mg from its UV area (as in 20_science p7) */
      await setVal('#o-protKda', 50); await setVal('#o-eps', 1); await h.wait(200);
      await h.addRun(src('his')); await h.pool('T1-T6');
      await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await h.wait(500);
      await setVal('#btw-conc', CONC); await setVal('#btw-vOut', VOUT); await h.wait(300);
      const sum = p.locator('#btwSplitBox > summary'); if (await sum.isVisible()) await sum.click(); await h.wait(150); /* the fields sit behind a closed disclosure so the card stays short */
      const fields = await p.evaluate(() => ['#btw-vLoad', '#btw-vKeep', '#btw-keepAs'].map(s => { const e = document.querySelector(s); return !!e && !!e.offsetParent; }));
      if (split) { for (const [k, v] of Object.entries(split)) await setVal(`#btw-${k}`, v); await h.wait(400); }
      const hint = await p.$eval('#btwSplit', e => e.hidden ? '' : e.textContent).catch(() => '');
      await h.addRun(src('q')); await h.pool('T11-T16'); await h.wait(300);
      await h.step('figure'); await h.wait(400);
      const rs = await h.sumTable(), head = rs[0] || [], rows = rs.slice(1).filter(r => r.length === head.length);
      const mi = head.findIndex(k => /^Protein \(mg\)/.test(k)), si = head.findIndex(k => /^Step yield/.test(k)), ci = rows.findIndex(r => /concentrat/i.test(r[0] || ''));
      const conc = ci >= 0 ? rows[ci] : null, next = ci >= 0 ? rows[ci + 1] : null;
      return {fields, hint, head, concMg: conc && mi >= 0 ? num(conc[mi]) : null, nextName: next ? next[0] : null, nextMg: next && mi >= 0 ? num(next[mi]) : null, nextStep: next && si >= 0 ? num(next[si]) : null};
    } finally { await close(); } };
  /* step yield = 100 × the next column's mg / mg loaded; the tolerance covers the 2-decimal mg and the whole-percent step yield */
  const near = (S, loaded) => S.nextMg > 0 && S.nextStep != null && Math.abs(S.nextStep - 100*S.nextMg/loaded) <= Math.max(1, 0.02*100*S.nextMg/loaded);
  const info = (S, loaded) => `expected ${S.nextMg > 0 ? (100*S.nextMg/loaded).toFixed(1) : '?'}% (${S.nextMg} mg of ${loaded} mg loaded), got ${S.nextStep}% on "${S.nextName}"; ${JSON.stringify(S)}`;

  /* ================= no split entered: all 25 mg loaded, as in every older project ================= */
  await T.t('legacy', async () => { const S = await scenario(null);
    T.check('legacy.conc_mg', S.concMg === CONC*VOUT, JSON.stringify(S)); /* guards: the Concentrated row is the measured output */
    T.check('legacy.step_yield_from_all', near(S, CONC*VOUT), info(S, CONC*VOUT)); /* guards: an absent allocation means all of it was loaded */
    T.check('legacy.no_hint', S.hint === '', S.hint); });

  /* ================= 1 mL loaded, 4 mL kept: the next column counts from 5 mg ================= */
  await T.t('split', async () => { const S = await scenario({vLoad: 1, vKeep: 4, keepAs: 'flash-frozen, -80 °C'}), loaded = CONC*VOUT*1/VOUT;
    T.check('split.fields_shown', S.fields.every(Boolean), JSON.stringify(S.fields)); /* guards: the loaded, kept and kept-as fields are on the Concentrated card */
    T.check('split.conc_mg_whole_output', S.concMg === CONC*VOUT, JSON.stringify(S)); /* guards: the output itself is still 25 mg */
    /* guards: the step yield of the next column counts from the 1 of 5 mL loaded (5 mg); on main it counted from all 25 mg, a fifth of this */
    T.check('split.step_yield_from_loaded', near(S, loaded), info(S, loaded));
    T.check('split.hint_names_loaded', /5\.00 mg \(1\.0 of 5\.0 mL\) went on to the next step, 4\.0 mL kept back/.test(S.hint), S.hint); });

  /* ================= only the kept volume: the rest (1 of 5 mL) was loaded ================= */
  await T.t('kept_only', async () => { const S = await scenario({vKeep: 4}), loaded = CONC*1;
    T.check('kept_only.step_yield_from_rest', near(S, loaded), info(S, loaded)); /* guards: 4 mL kept back of 5 mL leaves 1 mL loaded */
    T.check('kept_only.hint', /5\.00 mg \(1\.0 of 5\.0 mL\)/.test(S.hint), S.hint); });

  /* ================= loaded plus kept more than the output: flagged, and counted as all ================= */
  await T.t('over', async () => { const S = await scenario({vLoad: 2, vKeep: 4});
    T.check('over.flagged', /is 6\.0 mL, more than the 5\.0 mL/.test(S.hint), S.hint); /* guards: an impossible split is said out loud */
    T.check('over.step_yield_from_all', near(S, CONC*VOUT), info(S, CONC*VOUT)); });

  /* ================= nothing loaded (0 mL): no amount to count from, flagged and counted as all, never a silent fallback ================= */
  await T.t('zero', async () => { const S = await scenario({vLoad: 0, vKeep: 5});
    T.check('zero.flagged', /load of 0 mL/.test(S.hint), S.hint);
    T.check('zero.step_yield_from_all', near(S, CONC*VOUT), info(S, CONC*VOUT)); });
  T.done();
})();
