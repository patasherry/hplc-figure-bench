// 1007 untagged default (#1007, second half of #772): a sequence pasted on its own is untagged, so Protein (mg) from the UV area uses the
// untagged A280 of 1 mg/mL; a tag preset chosen on purpose uses the tagged form's; settings saved under the old His-SUMO default keep it.
// Expected mg = pool area (mAU·mL) / 1000 / (A280 per mg/mL × path in cm), read from the displayed area, path and #protTable coefficient.
// Synthetic only: the IMAC stand-in run and a made-up W/Y-rich sequence (the His-SUMO fusion's A280 is about half the untagged one).
const {open, H, suite, src} = require('../lib/harness');
const SEQ = 'M' + 'AKWYE'.repeat(20), PATH_MM = 2;
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

(async () => { const T = suite('1007_untagged_default');
  /* one project: optional saved settings, optional tag preset, the sequence, one pooled run with a known path; returns what the UI shows */
  const scenario = async ({saved, preset} = {}) => { const {p, close} = await open(), h = H(p); p.on('dialog', d => d.accept());
    try {
      if (saved) { await p.addInitScript(s => { localStorage.setItem('hplc-fig-opt', s); }, JSON.stringify(saved)); await p.reload(); await p.waitForSelector('#npName', {state: 'visible', timeout: 15000}); }
      await h.newProject('Tag default');
      await h.step('construct');
      const setVal = (sel, v) => p.evaluate(({sel, v}) => { const e = document.querySelector(sel); e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); }, {sel, v});
      if (preset != null) { await setVal('#o-tagPreset2', preset); await h.wait(300); }
      const shownPreset = await p.$eval('#o-tagPreset2', e => e.value);
      await setVal('#protSeq', SEQ); await h.wait(500);
      const prot = await p.$$eval('#protTable tr', rs => rs.slice(1).map(r => [...r.cells].map(c => c.textContent.trim())));
      const a280 = k => { const r = prot.find(c => c[0].startsWith(k)); return r ? num(r[r.length - 1]) : null; };
      await h.addRun(src('his')); await h.pool('T1-T6');
      { const l = p.locator('.trace.run.sel [data-k=path]').first(); await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }); await l.fill(String(PATH_MM)); await l.dispatchEvent('change'); await h.wait(400); }
      const pool = await p.$$eval('#intTable tr', rs => { const head = [...(rs[0] || {cells: []}).cells].map(c => c.textContent.trim()), pr = rs.find(r => r.classList.contains('pool')); if (!pr) return null;
        const i = head.findIndex(t => /^Area/.test(t)); return {head: head[i], area: i >= 0 && pr.cells[i] ? pr.cells[i].textContent.trim() : null}; });
      await h.step('figure');
      const rs = await h.sumTable(), head = rs[0] || [], mi = head.findIndex(k => /^Protein \(mg\)/.test(k));
      const row = rs.slice(1).find(r => r.length === head.length && mi >= 0 && num(r[mi]) > 0);
      return {shownPreset, untagged: a280('Untagged'), tagged: a280('Tagged'), pool, mg: row ? num(row[mi]) : null};
    } finally { await close(); } };
  /* mg expected from the displayed area and coefficient; the tolerance covers the area shown to whole mAU·mL and the 2-decimal mg */
  const expMg = (S, e) => S.pool && num(S.pool.area) > 0 && e > 0 ? num(S.pool.area)/1000/(e*PATH_MM/10) : null;
  const near = (got, exp) => got != null && exp != null && Math.abs(got - exp) <= Math.max(0.011, 0.01*exp);

  /* ================= no tag chosen: the untagged coefficient ================= */
  await T.t('no_tag', async () => { const S = await scenario(), e = expMg(S, S.untagged);
    T.check('no_tag.preset_is_none', S.shownPreset === '', `Tag menu starts at "${S.shownPreset}"`); /* guards: a bare sequence gains no His-SUMO tag by default */
    T.check('no_tag.only_untagged_form', S.untagged > 0 && S.tagged == null, JSON.stringify(S));
    T.check('no_tag.area_in_mL', S.pool && /mL/.test(S.pool.head || ''), JSON.stringify(S.pool));
    /* guards: Protein (mg) = area / 1000 / (untagged A280 × path cm); on main the His-SUMO fusion's smaller A280 roughly doubled it */
    T.check('no_tag.mg_untagged_coefficient', near(S.mg, e), `expected ${e == null ? '?' : e.toFixed(3)} mg (area ${S.pool && S.pool.area}, A280 ${S.untagged}, ${PATH_MM} mm), got ${S.mg}`); });

  /* ================= His-SUMO chosen on purpose: the tagged coefficient, shown in the table ================= */
  await T.t('sumo_chosen', async () => { const S = await scenario({preset: 'sumo'}), e = expMg(S, S.tagged);
    T.check('sumo_chosen.tagged_form_shown', S.shownPreset === 'sumo' && S.tagged > 0 && S.untagged > 0 && S.tagged < S.untagged, JSON.stringify(S));
    T.check('sumo_chosen.mg_tagged_coefficient', near(S.mg, e), `expected ${e == null ? '?' : e.toFixed(3)} mg (area ${S.pool && S.pool.area}, tagged A280 ${S.tagged}, ${PATH_MM} mm), got ${S.mg}`); });

  /* ================= saved settings from before the change keep the old His-SUMO default ================= */
  for (const [k, saved] of [['saved_sumo', {tagPreset: 'sumo', tidy13: true, tidy14: true}], ['saved_no_key', {tidy13: true, tidy14: true}]]) {
    await T.t(k, async () => { const S = await scenario({saved}), e = expMg(S, S.tagged);
      T.check(`${k}.keeps_sumo`, S.shownPreset === 'sumo' && S.tagged > 0, JSON.stringify(S)); /* guards: the tidy15 migration never drops a tag saved settings carried */
      T.check(`${k}.mg_tagged_coefficient`, near(S.mg, e), `expected ${e == null ? '?' : e.toFixed(3)} mg (tagged A280 ${S.tagged}), got ${S.mg}`); });
  }
  T.done();
})();
