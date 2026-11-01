const {open, H, suite, path, fs, DATA, src} = require('../lib/harness');
const F = {gb: src('gb'), imac: src('his'), q: src('q'), sec: path.join(DATA, 'science/sec_inject2.csv'), nd: path.join(DATA, 'science/nd3.csv')};

(async () => {
  const T = suite('21_methods');
  const {p, errs, close} = await open();
  const h = H(p);
  p.on('dialog', d => d.accept());

  const openFolds = loc => loc.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });

  const setRun = async (k, v) => { const l = p.locator(`.trace.run.sel [data-k=${k}]`).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(250); };
  const setField = async (sel, v) => { const l = p.locator(sel).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(150); };

  const methods = async () => { await h.step('figure'); await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(400); return h.methods(); };
  const table = async () => { await h.step('figure'); const rs = await h.sumTable(); if (!rs.length) return {head: [], rows: []}; const head = rs[0];
    return {head, rows: rs.slice(1).filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])))}; };
  const col = (t, re) => t.head.find(k => re.test(k));
  const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };

  const JUNK = [/NaN/, /undefined/, /\[object/, /\(, /, / {2}/, /(?<!\.)\.\.(?!\.)/, / \./, /,,/, /\bnull\b/];

  await T.t('p1_imac_sec', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Methods P1');
    await h.addRun(F.imac);
    await h.pool('T1-T6');
    await setRun('mCol', 'My HisTrap FF 1 mL');
    // Note: cv and flow are tied to mCV and mFlow if they exist, but the UI actually binds them to cv and flow for runs.
    await setRun('mFlow', '1.0');
    await setRun('mBufA', 'IMAC Buffer A');
    await setRun('mBufB', 'IMAC Buffer B');

    await h.addRun(F.sec);
    await h.suggest();
    await setRun('mCol', 'My Superdex 200');
    await setRun('mFlow', '0.5');
    await setRun('mBufA', 'SEC Buffer A');

    const m = await methods();
    const t = await table();

    T.check('p1_no_junk', !JUNK.some(re => re.test(m)), 'Junk found in methods');

    T.check('p1_cols', /My HisTrap FF 1 mL/.test(m) && /My Superdex 200/.test(m), 'Methods missing column names');
    T.check('p1_cv_flow', /1(\.0)? mL\/min/.test(m) && /0\.5 mL\/min/.test(m), 'Methods missing CV or flow');
    T.check('p1_buffers', /IMAC Buffer A/.test(m) && /IMAC Buffer B/.test(m) && /SEC Buffer A/.test(m), 'Methods missing buffers');

    const vK = col(t, /^Volume/);
    const finalVol = num(t.rows[t.rows.length - 1][vK]);

    T.check('p1_vol_match', new RegExp(`\\(${finalVol.toFixed(1)}\\d? mL\\)`).test(m) || new RegExp(`\\(${finalVol}\\d? mL\\)`).test(m) || new RegExp(`${finalVol} mL`).test(m), `Final volume ${finalVol} not in methods`);

    T.check('p1_no_phantom_steps', !/cleavage|anion|cation|concentrated/i.test(m), 'Mentioned phantom steps');
  });

  await T.t('p2_imac_cleave_reverse_sec', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Methods P2');

    await h.addRun(F.imac);
    await h.pool('T1-T6');
    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=cleave]'); await h.wait(400);
    await setField('#pr-protease', 'TEV');
    await setField('#pr-dialBuffer', 'O/N at 4C'); // The dialBuffer field is used for conds

    await h.addRun(F.imac);
    await h.pool('FT');
    await setRun('mCol', 'Reverse HisTrap');

    await h.addRun(F.sec);
    await h.suggest();

    const m = await methods();

    T.check('p2_no_junk', !JUNK.some(re => re.test(m)), 'Junk found in methods');
    T.check('p2_protease', /TEV/.test(m) && /O\/N at 4C/.test(m), 'Cleavage details missing');
    T.check('p2_reverse', /Reverse HisTrap/i.test(m) || /HisTrap/i.test(m), 'Reverse IMAC details missing');
  });

  await T.t('p3_final_nd', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(600);
    await h.newProject('Methods P3');
    await h.gb(F.gb);
    await h.addRun(F.imac);
    await h.pool('T1-T6');
    await h.addConc(F.nd, 0.5);

    const m = await methods();
    const t = await table();
    const vK = col(t, /^Volume/);
    const finalVol = num(t.rows[t.rows.length - 1][vK]);
    const cK = col(t, /^Protein/);
    const finalAmount = num(t.rows[t.rows.length - 1][cK]);

    T.check('p3_no_junk', !JUNK.some(re => re.test(m)), 'Junk found in methods');
    T.check('p3_vol_match', new RegExp(`${finalVol}`).test(m), `Final volume ${finalVol} not in methods`);
    if(finalAmount != null) {
      T.check('p3_amount_match', new RegExp(`${finalAmount}`).test(m), `Final amount ${finalAmount} not in methods`);
    }
  });

  await T.t('timeline_methods_progress', async () => {
    const {p: narrow, close: closeNarrow} = await open({width: 390, height: 860}); const hn = H(narrow);
    const set = async (sel, val) => { await narrow.locator(sel).fill(val); await narrow.locator(sel).dispatchEvent('change'); await hn.wait(250); };
    await hn.newProject('Methods progress'); await hn.addRun(F.imac); await hn.pool('T1-T6');
    const text = () => narrow.locator('#tl [data-step="figure"] .ts').textContent();
    T.check('methods_progress_plural', await text() === '4 details still needed for Methods text', await text());
    await hn.step('transform'); await set('#pr-trMethod', 'heat shock');
    await hn.step('expr'); await set('#pr-medium', 'LB');
    const run = (await hn.timeline()).find(x => x.k.startsWith('run:')); await hn.step(run.k); await set('.trace.run.sel [data-k=mFlow]', '1');
    T.check('methods_progress_singular', await text() === '1 detail still needed for Methods text', await text());
    const clipped = await narrow.locator('#tl [data-step="figure"] .ts').evaluate(e => { const r = e.getBoundingClientRect(), p = e.closest('button').getBoundingClientRect(); return e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1 || r.bottom > p.bottom + 1; });
    T.check('methods_progress_narrow_unclipped', !clipped, 'Methods progress is clipped at 390 px');
    await closeNarrow();
  });

  await T.t('imac_missing_conditions_inline_mobile', async () => {
    const {p: narrow, close: closeNarrow} = await open({width: 390, height: 860}); const hn = H(narrow);
    await hn.newProject('IMAC inline conditions'); await hn.addRun(F.imac);
    const notes = () => narrow.$$eval('.trace.run.sel [data-condwarn]', els => els.map(e => ({field: e.dataset.condwarn, text: e.textContent.trim(), shown: !e.hidden, invalid: e.closest('label').querySelector('input').getAttribute('aria-invalid') === 'true'})));
    const initial = await notes();
    T.check('imac/missing-conditions-inline', JSON.stringify(initial.filter(x => x.shown)) === JSON.stringify([{field: 'mBufA', text: 'Enter buffer A.', shown: true, invalid: true}, {field: 'mFlow', text: 'Enter the flow rate.', shown: true, invalid: true}]), JSON.stringify(initial));
    const unclipped = await narrow.$$eval('.trace.run.sel [data-condwarn]:not([hidden])', els => els.every(e => { const r = e.getBoundingClientRect(), p = e.closest('label').getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1 && e.scrollWidth <= e.clientWidth + 1; }));
    T.check('imac/missing-conditions-mobile-unclipped', unclipped, 'Inline IMAC condition messages clip at 390 px');
    await narrow.locator('.trace.run.sel [data-k=mBufA]').fill('50 mM Tris pH 8.0'); await hn.wait(150);
    { const afterBuffer = await notes(), buf = afterBuffer.find(x => x.field === 'mBufA'), flow = afterBuffer.find(x => x.field === 'mFlow');
      T.check('imac/buffer-warning-clears', !!buf && !buf.shown && !!flow && flow.shown, JSON.stringify(afterBuffer)); }
    await narrow.locator('.trace.run.sel [data-k=mFlow]').fill('1'); await hn.wait(150);
    T.check('imac/condition-warnings-clear', !(await notes()).some(x => x.shown), JSON.stringify(await notes()));
    await closeNarrow();
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
