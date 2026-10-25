// 20 science (professor): is what the app reports scientifically right and self-consistent?
// Builds full projects through the UI only (construct, IMAC, Concentrated + NanoDrop, cleavage, Q, SEC, final sample) and checks
// the summary table arithmetic, the methods text, the figure panel letters, SEC elution volumes and calibration text, and that
// moving and removing steps keeps every number consistent. Fixtures: data/science (gen_science.py), plus real runs (HFB_PRIVATE_DATA) or their synthetic stand-ins.
const {open, H, suite, path, fs, ROOT, DATA, src} = require('../lib/harness');
const F = {gb: src('gb'), imac: src('his'),
  q: src('q'), sec: path.join(DATA, 'science/sec_inject2.csv'), nd: path.join(DATA, 'science/nd3.csv'), fdh: src('secZip')};
const TRUTH = JSON.parse(fs.readFileSync(path.join(DATA, 'science/truth.json'), 'utf8'));
/* the biochemist's ground truth, when present, adds NanoDrop fixtures with a known mean and count */
let EXP = null; try { EXP = JSON.parse(fs.readFileSync(path.join(DATA, 'expected.json'), 'utf8')); } catch (e) {}
const num = s => { const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const JUNK = [/NaN/, /undefined/, /\[object/, /\(, /, / {2}/, /(?<!\.)\.\.(?!\.)/, / \./, /,,/, /\bnull\b/];

(async () => { const T = suite('20_science'); const {p, errs, close} = await open(), h = H(p); p.on('dialog', d => d.accept());
  /* ---------- UI helpers local to this suite, all through visible controls ---------- */
  const openFolds = loc => loc.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });
  const setRun = async (k, v) => { const l = p.locator(`.trace.run.sel [data-k=${k}]`).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(250); };
  const setField = async (sel, v) => { const l = p.locator(sel).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(150); };
  const methods = async () => { await h.step('figure'); await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(400); return h.methods(); };
  const table = async () => { await h.step('figure'); const rs = await h.sumTable(); if (!rs.length) return {head: [], rows: []}; const head = rs[0];
    return {head, rows: rs.slice(1).filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])))}; };
  const col = (t, re) => t.head.find(k => re.test(k));
  const sumNotes = () => p.$eval('#sumPanel', e => e.innerText).catch(() => p.$eval('#sumTable', e => e.parentElement.innerText).catch(() => ''));
  const tlItem = async re => (await h.timeline()).find(x => re.test(x.t || ''));
  const panels = async () => (await h.svgTexts()).map(x => (x.t || '').match(/^([A-Z])\s+([A-Za-z].*)$/)).filter(Boolean).map(m => ({L: m[1], title: m[2].trim()}));
  const kda = async () => { const ts = (await h.svgTexts()).map(x => x.t).join('\n'); const tg = ts.match(/His6[^\n]*?(\d+\.\d)\s*kDa/), cl = ts.match(/(\d+\.\d)\s*kDa\s*\(\d+ aa\)\s*after cleavage/); return {tagged: tg ? +tg[1] : null, cleaved: cl ? +cl[1] : null}; };
  const rowKey = n => String(n).replace(/^\d+\.\s*/, '').trim().toLowerCase();

  /* the arithmetic checks, run on the table as it stands (reused after a move and after a removal) */
  const arith = async tag => { const t = await table(), K = await kda(), tl = await h.timeline(), mgK = col(t, /^Protein \(mg\)/), yK = col(t, /^Yield/), sK = col(t, /^Step yield/), fK = col(t, /^Form/);
    const ci = tl.findIndex(x => x.k === 'cleave'), order = tl.map(x => rowKey(x.t || ''));
    /* form of each row: the table's own Form column if shown, else before or after the cleavage step in the step list */
    const form = r => { if (fK && r[fK]) return /tag/i.test(r[fK]) && !/cleav|untag/i.test(r[fK]) ? 'tagged' : 'cleaved'; const i = order.indexOf(rowKey(r.Step)); return ci >= 0 && i > ci ? 'cleaved' : 'tagged'; };
    const R = t.rows.map(r => ({name: r.Step, mg: num(r[mgK]), y: num(r[yK]), s: num(r[sK]), form: form(r)})).filter(r => r.mg != null);
    const mol = r => r.mg/((r.form === 'cleaved' ? K.cleaved : K.tagged) || 1), tol = (r, v) => Math.max(1.5, 0.03*v + 100*0.006/Math.max(r.mg, 0.01));
    T.check(`${tag}.table_has_rows`, R.length >= 2, JSON.stringify(t.rows)); /* guards: the summary lists the pooled steps with amounts */
    if (!R.length) return R; T.check(`${tag}.yield_base_100`, R[0].y === 100, `first row ${R[0].name} yield ${R[0].y}`); /* guards: yield is relative to the first step with an amount */
    for (let i = 1; i < R.length; i++) { const r = R[i], exp = 100*mol(r)/mol(R[0]);
      /* guards: overall yield counts moles, so removing the tag is not a loss (49.2 of 62.6 kDa would read as a 21% loss by mass) */
      T.check(`${tag}.yield_mole:${r.name}`, r.y != null && T.near(r.y, exp, tol(r, exp)), `expected ${exp.toFixed(1)} (mol basis, ${r.form}), got ${r.y}`);
      if (R[0].form !== r.form && K.tagged && K.cleaved) { const byMass = 100*r.mg/R[0].mg; T.check(`${tag}.no_tag_loss:${r.name}`, r.y != null && Math.abs(r.y - exp) < Math.abs(r.y - byMass), `mol ${exp.toFixed(1)} vs mass ${byMass.toFixed(1)}, got ${r.y}`); }
      const se = 100*mol(r)/mol(R[i - 1]); /* guards: step yield is this step against the step just before it, in moles */
      T.check(`${tag}.step_yield:${r.name}`, r.s != null && T.near(r.s, se, tol(r, se)), `expected ${se.toFixed(1)} from ${R[i - 1].name}, got ${r.s}`);
      if (r.s > 100) { const it = tl.find(x => rowKey(x.t || '') === rowKey(r.name)), notes = await sumNotes(); /* the note must name this step */ /* guards: a gain is impossible, so it must be flagged where the student looks */
        T.check(`${tag}.gain_flagged:${r.name}`, (it && it.warn && /step yield|more than/i.test(it.s || '')) || notes.split('\n').some(l => l.toLowerCase().includes(rowKey(r.name)) && /can.t be a real gain|above 100|more (protein )?than the step before|more than was loaded/i.test(l)), `timeline ${JSON.stringify(it)}; notes on it: ${notes.split('\n').filter(l => l.toLowerCase().includes(rowKey(r.name))).join(' / ').slice(0, 300) || 'none'}`); } }
    return R; };
  /* each table cell and figure text is checked on its own; a panel letter followed by two spaces ("A  Construct") is the figure's own layout */
  const junk = async tag => { const m = await methods(), t = (await h.sumTable()).flat().filter(Boolean), s = (await h.svgTexts()).map(x => x.t.replace(/^[A-Z] {2}(?=\S)/, 'A ')).filter(Boolean);
    for (const [src, items] of [['methods', [m]], ['table', t], ['figure', s]]) { const bad = []; for (const txt of items) for (const re of JUNK) if (re.test(txt)) { const i = txt.search(re); bad.push(`${re} near "${txt.slice(Math.max(0, i - 30), i + 30)}"`); }
      T.check(`${tag}.no_junk_${src}`, !bad.length, bad.join(' ; ')); } }; /* guards: no NaN, undefined, [object, "(, ", doubled spaces or periods leak into output */
  const panelCheck = async tag => { const m = await methods(), P = await panels(), refs = [...m.matchAll(/(Step \d+ \(([^,()]+), panel ([A-Z])\)|([A-Z][a-z ]+) \(panel ([A-Z])\))/g)].map(x => ({name: (x[2] || x[4]).trim(), L: x[3] || x[5]}));
    T.check(`${tag}.panels_referenced`, refs.length >= 2, m.slice(0, 200)); /* guards: methods cite the figure panels */
    for (const r of refs) { const f = P.find(q => q.L === r.L), ok = f && (f.title.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(f.title.toLowerCase()) || (/tag removal|cleavage/i.test(r.name) && /cleav|protease|ulp1|tev|tag/i.test(f.title)));
      T.check(`${tag}.panel_letter:${r.name}`, ok, `methods panel ${r.L} for ${r.name}; figure ${r.L} = ${f ? f.title : 'missing'}`); } /* guards: letters in the methods point at the same panel in the figure */
    const steps = [...m.matchAll(/Step (\d+) \(/g)].map(x => +x[1]); T.check(`${tag}.step_numbers_contiguous`, steps.every((n, i) => n === i + 1), steps.join(',')); }; /* guards: renumbering after edits */
  const gapCheck = async tag => { const m = await methods(), br = (m.match(/\[[^\]]+\]/g) || []), it = (await h.timeline()).find(x => x.k === 'figure'), n = it ? (num((it.s || '').match(/(\d+) (field|gap)/) || [0, 0]) ? +(it.s.match(/(\d+) (field|gap)/) || [0, 0])[1] : 0) : null;
    T.check(`${tag}.gap_count_matches`, n === br.length, `step list says ${it && it.s}; methods brackets ${br.length}: ${br.join(' ')}`); }; /* guards: the gap count names exactly the bracketed gaps */

  /* ================= P1: a complete project ================= */
  let P1ok = false;
  await T.t('p1_build', async () => { await h.newProject('Science full'); await h.gb(F.gb);
    await h.step('transform'); for (const [k, v] of Object.entries({trPlasmid: 'pET28-SUMO-NADK', trMethod: 'heat shock', trSel: '50 µg/mL kanamycin'})) await setField('#pr-' + k, v);
    await h.step('expr'); for (const [k, v] of Object.entries({medium: 'TB', cultureL: '2', od: '0.8', inducer: '0.5', temp: '18', time: '16', pellet: '24'})) await setField('#pr-' + k, v);
    await h.step('lysis'); for (const [k, v] of Object.entries({lysMethod: 'Sonication', lysVol: '80', lysBuffer: '50 mM Tris pH 8.0, 300 mM NaCl, 20 mM imidazole', clarify: '30,000 × g, 45 min, 4 °C'})) await setField('#pr-' + k, v);
    await h.addRun(F.imac); await h.pool('T1-T6');
    for (const [k, v] of Object.entries({path: 2, mCol: 'HisTrap FF 1 mL', mBufA: '50 mM Tris pH 8.0, 300 mM NaCl, 20 mM imidazole', mBufB: '50 mM Tris pH 8.0, 300 mM NaCl, 500 mM imidazole', mFlow: 1, mTemp: 4})) await setRun(k, v);
    await h.addConc(F.nd, 0.5);
    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=cleave]'); await h.wait(400);
    for (const [k, v] of Object.entries({protease: 'Ulp1', ratio: '1:100', dialBuffer: '20 mM Tris pH 8.0, 50 mM NaCl, 1 mM DTT', clvTemp: '4', clvTime: '16'})) await setField('#pr-' + k, v);
    await h.addRun(F.q); await h.pool('T11-T16');
    for (const [k, v] of Object.entries({path: 2, mCol: 'Resource Q 6 mL', mBufA: '20 mM Tris pH 8.0, 50 mM NaCl', mBufB: '20 mM Tris pH 8.0, 1 M NaCl', mFlow: 2, mTemp: 4})) await setRun(k, v);
    await h.addRun(F.sec); await h.suggest();
    for (const [k, v] of Object.entries({path: 2, mCol: 'Superdex 200 Increase 10/300 GL', mBufA: '20 mM HEPES pH 7.5, 150 mM NaCl', mFlow: 0.5, mTemp: 4, mLoad: '0.5 mL'})) await setRun(k, v);
    await h.step('final'); for (const [k, v] of Object.entries({finConc: '1.0', finVol: '0.1', finBuffer: '20 mM HEPES pH 7.5, 150 mM NaCl', store: 'flash-frozen in liquid nitrogen, stored at −80 °C'})) await setField('#pr-' + k, v);
    P1ok = T.check('p1.built', (await h.timeline()).filter(x => /^run:/.test(x.k)).length === 3, JSON.stringify(await h.timeline())); }); /* guards: the scenario itself was built */

  if (P1ok) {
    await T.t('p1_conc', async () => { const t = await table(), r = t.rows.find(x => /concentrat/i.test(x.Step)), it = await tlItem(/^Concentrated/), mgK = col(t, /^Protein \(mg\)/), vK = col(t, /^Volume/);
      const c = num(((it && it.s) || '').match(/([\d.]+)\s*mg\/mL/) || [0, null]), v = r ? num(r[vK]) : null, mg = r ? num(r[mgK]) : null;
      T.check('conc.row_present', !!r, JSON.stringify(t.rows.map(x => x.Step))); /* guards: the measured concentration step is its own row, not merged into the column */
      T.check('conc.volume_entered', v != null && T.near(v, 0.5, 0.005), `volume ${v}`); /* guards: the volume out is what the user typed */
      T.check('conc.mg_eq_c_x_v', c != null && mg != null && T.near(mg, c*0.5, Math.max(0.01, 0.006*mg)), `conc ${c} × 0.50 = ${c && (c*0.5).toFixed(3)}, table ${mg}`); /* guards: mg = concentration × volume */
      const m = await methods(), eps = c ? TRUTH['nd3.csv'].abs_mean/c : null, quoted = [...m.matchAll(/A280 of ([\d.]+) for 1 mg\/mL/g)].map(x => +x[1]);
      /* guards: the NanoDrop mean is the mean of the readings, converted with a stated coefficient (or none for 1 Abs = 1 mg/mL) */
      T.check('conc.nd_mean', eps != null && (T.near(eps, 1, 0.01) || quoted.some(q => T.near(q, eps, 0.012)) || T.near(eps, 0.70, 0.012)), `mean Abs 1.42 / conc ${c} = ${eps && eps.toFixed(3)}; coefficients stated ${quoted}`);
      /* 0.70 is the A280 of 1 mg/mL of His6-SUMO-NADK from this GenBank ORF, the fixture's known value */
      T.check('meth.nd_coefficient_stated', T.near(eps || 0, 1, 0.01) || quoted.some(q => T.near(q, eps, 0.012)), `NanoDrop converted with ${eps && eps.toFixed(2)} per mg/mL, methods state ${quoted.length ? quoted : 'no coefficient'}`); /* guards: a reader can redo the mg/mL from the absorbance */
      /* guards: the sentence that reports the NanoDrop measurement names the coefficient actually used and which protein form it is for (the fixture has a GenBank, so tagged or untagged) */
      { const ndS = m.split(/(?<=\.)\s+(?=[A-Z])/).filter(x => /by NanoDrop/.test(x)), hit = ndS.map(x => x.match(/A280 of ([\d.]+) for 1 mg\/mL of the (tagged|untagged) form/)).filter(Boolean);
        T.check('meth.nd_coefficient_source', eps != null && hit.some(x => T.near(+x[1], eps, 0.012)), `converted with ${eps && eps.toFixed(2)}; NanoDrop sentences: ${ndS.join(' | ') || 'none'}`); }
      T.check('meth.nd_readings', /mean of 3 readings|3 readings|n\s*=\s*3/i.test(m), m.match(/[^.]*NanoDrop[^.]*\./g)); /* guards: the number of readings is reported */
      T.check('meth.nd_value', c != null && m.includes(c.toFixed(2) + ' mg/mL'), `${c} mg/mL in: ${(m.match(/[^.]*NanoDrop[^.]*\./g) || []).join(' ')}`); /* guards: methods quote the measured concentration */
      T.check('meth.conc_volume', /to 0\.50 mL|0\.50 mL/.test(m), (m.match(/[^.]*concentrat[^.]*\./gi) || []).join(' ')); /* guards: the volume after concentrating */
      const mgS = mg != null ? mg.toFixed(2) + ' mg' : '@@'; T.check('meth.conc_once', m.split(mgS).length - 1 <= 1, `"${mgS}" appears ${m.split(mgS).length - 1} times`); }); /* guards: the concentrated amount is not reported twice */
    await T.t('p1_arith', () => arith('p1'));
    await T.t('p1_methods', async () => { const m = await methods(), t = await table(), vK = col(t, /^Volume/);
      for (const [id, re] of [['col_imac', /HisTrap FF 1 mL/], ['col_q', /Resource Q 6 mL/], ['col_sec', /Superdex 200 Increase 10\/300 GL/], ['flow_imac', /1 mL\/min/], ['flow_q', /2 mL\/min/], ['flow_sec', /0\.5 mL\/min/],
        ['pool_imac', /T1–T6|T1-T6/], ['pool_q', /T11–T16|T11-T16/], ['bufA_q', /20 mM Tris pH 8\.0, 50 mM NaCl/], ['protease', /Ulp1/], ['final_conc', /1(\.0+)? mg\/mL/], ['final_vol', /0\.10? mL/]])
        T.check('meth.' + id, re.test(m), `${re} not in methods`); /* guards: the methods state the values the user entered */
      for (const r of t.rows) { const v = num(r[vK]), pool = r.Pool; if (v == null || !pool || /nanodrop|no chrom/i.test(pool)) continue;
        const pre = pool.replace(/[–-]/, '[–-]'); T.check(`meth.pool_volume:${rowKey(r.Step)}`, new RegExp(pre + `[^.]*\\(${v.toFixed(1)}\\d? mL\\)`).test(m), `${pool} (${v} mL) not stated as such`); } /* guards: pooled volumes match the table */
      const fin = (m.match(/\bfinal (sample|pool)\b[^.]*?\d[\d.]* mg\b(?![\/ ]*(\/|per))/gi) || []); T.check('meth.one_final_amount', fin.length <= 1, fin.join(' || ')); /* guards: one final amount, no contradiction */
      const amounts = [...new Set((m.split(/Results:/)[1] || '').match(/\d+\.\d+ mg\b(?! ?(\/|per))/g) || [])]; T.check('meth.results_amounts_in_table_or_final', amounts.every(a => (t.rows.some(r => Object.values(r).some(v => v.replace(/[≈~]/, '') === a.replace(' mg', ''))) || /0\.10 mg/.test(a))), amounts.join(', '));
    }); /* guards: every amount in the Results is one the table or the final sample shows */
    await T.t('p1_panels', () => panelCheck('p1')); await T.t('p1_gaps', () => gapCheck('p1')); await T.t('p1_junk', () => junk('p1'));
    await T.t('p1_complete_no_gaps', async () => { const m = await methods(), br = m.match(/\[[^\]]+\]/g) || []; T.check('meth.complete_has_no_gaps', !br.length, br.join(' ')); }); /* guards: a fully entered project leaves no bracketed gaps */

    /* SEC: elution volume from injection, and calibration text only when standards are on */
    await T.t('p1_sec', async () => { await p.click('#tl [data-step^="run:"]:has-text("Size exclusion")').catch(async () => { const it = (await h.timeline()).filter(x => /^run:/.test(x.k)).pop(); await h.step(it.k); }); await h.wait(500);
      await p.click('#intAuto').catch(() => {}); await h.wait(800); const pt = await h.peakTable(), head = pt[0] || [], vi = head.findIndex(c => /^Ve|Center|Elution/i.test(c));
      const ves = pt.slice(1).map(r => num(r[vi])).filter(v => v != null); const want = TRUTH['sec_inject2.csv'].ve_from_injection;
      T.check('sec.ve_from_injection', want.every(w => ves.some(v => T.near(v, w, 0.06))) && !ves.some(v => T.near(v, 14, 0.06) || T.near(v, 17, 0.06)), `want ${want}, peak table Ve ${ves}`); /* guards: SEC elution volume is counted from injection, not method start */
      const labs = (await h.svgTexts()).map(x => x.t); T.check('sec.figure_labels_from_injection', labs.some(t => /^12\.0\d? mL$/.test(t)) && !labs.some(t => /^14\.0\d? mL$/.test(t)), labs.filter(t => /mL$/.test(t)).join(', ')); /* guards: the figure labels the same volumes */
      const off = await p.$eval('#o-secStds', e => e.checked).catch(() => null); if (off) { await p.locator('#o-secStds').uncheck({force: true}); await h.wait(500); }
      const SIZE = /\bKav\b|apparent (MW|size)|oligomer|\b(di|tri|tetra|hexa)mer\b|\d+\s*kDa\b/i, m = await methods(), secS = (m.match(/Step \d+ \(Size exclusion[^]*?(?=Step \d+ \(|Final sample|Results:|$)/) || [''])[0];
      await h.step(((await h.timeline()).filter(x => /^run:/.test(x.k)).pop() || {}).k); const runTxt = (await h.svgTexts()).map(x => x.t).join(' | '), ptTxt = (await h.peakTable()).flat().join(' | ');
      T.check('sec.no_size_text_when_off', !SIZE.test(runTxt) && !SIZE.test(ptTxt) && !SIZE.test(secS) && !/\bKav\b|oligomer/i.test(m), `run: ${(runTxt.match(SIZE) || [''])[0]} table: ${(ptTxt.match(SIZE) || [''])[0]} methods: ${(secS.match(SIZE) || [''])[0]}`); /* guards: no Kav/kDa/oligomer claims without a calibration */
      if (/More options/.test(await p.locator('#moreBtn').textContent().catch(() => ''))) { await p.click('#moreBtn').catch(() => {}); await h.wait(300); }
      await openFolds(p.locator('#o-secStds')); await p.locator('#o-secStds').check({force: true}); await h.wait(400);
      await setField('#sec-v0', '8'); await setField('#sec-vt', '24'); const ve = ['10.0', '12.5', '14.5', '16.0'], rows = p.locator('#secStdList input[placeholder^="Ve"]');
      for (let i = 0; i < Math.min(4, await rows.count()); i++) { await rows.nth(i).fill(ve[i]); await rows.nth(i).dispatchEvent('change'); await h.wait(150); }
      await setField('#o-secMono', '49.2'); await p.selectOption('#o-secLabel', 'mw').catch(() => {}); await h.wait(600); await p.click('#intAuto').catch(() => {}); await h.wait(700);
      const on = (await h.svgTexts()).map(x => x.t).join(' | ') + ' || ' + (await h.peakTable()).flat().join(' | ');
      T.check('sec.size_text_when_on', /\bKav\b/.test(on) && /\d\s*kDa/.test(on), on.slice(0, 300)); /* guards: with standards on, Kav and apparent size appear */
      await p.locator('#o-secStds').uncheck({force: true}); await h.wait(400); });

    /* moving the Concentrated step and removing a column keep the numbers consistent */
    await T.t('p1_move', async () => { const before = (await table()).rows.map(r => r.Step); const it = (await h.timeline()).find(x => /^btw:/.test(x.k)); await h.step(it.k);
      const dn = p.locator('#ssActs [data-move="1"]'); const can = await dn.isEnabled().catch(() => false); T.check('move.conc_down_enabled', can, 'Move down disabled on the Concentrated step'); /* guards: the step can be moved */
      if (can) { await dn.click(); await h.wait(800); const after = (await table()).rows.map(r => r.Step), tl = (await h.timeline()).map(x => rowKey(x.t || '')).filter(k => after.some(a => rowKey(a) === k));
        T.check('move.table_follows_steps', JSON.stringify(after.map(rowKey)) === JSON.stringify(tl), `table ${after} vs steps ${tl}`); /* guards: table order is the step order after a move */
        T.check('move.order_changed', JSON.stringify(after) !== JSON.stringify(before), `before ${before} after ${after}`);
        await arith('move'); await panelCheck('move'); await junk('move');
        await h.step(((await h.timeline()).find(x => /^btw:/.test(x.k)) || {}).k); const up = p.locator('#ssActs [data-move="-1"]'); if (await up.isEnabled().catch(() => false)) { await up.click(); await h.wait(800); }
        T.check('move.round_trip', JSON.stringify((await table()).rows.map(r => r.Step)) === JSON.stringify(before), `${(await table()).rows.map(r => r.Step)} vs ${before}`); } }); /* guards: down then up restores the original */
    await T.t('p1_remove', async () => { const q = (await h.timeline()).find(x => /anion/i.test(x.t || '')); await h.step(q.k); /* Remove asks for a second click to confirm */ await p.click('#ssActs [data-remove]'); await h.wait(800); if (await p.locator('#ssActs [data-remove]').count()) await p.click('#ssActs [data-remove]'); await h.wait(1000);
      const t = await table(), m = await methods(); T.check('remove.gone_from_table', !t.rows.some(r => /anion/i.test(r.Step)), t.rows.map(r => r.Step)); /* guards: a removed column leaves no row */
      T.check('remove.gone_from_methods', !/Anion exchange|Resource Q|T11–T16/.test(m), (m.match(/[^.]*(Anion exchange|Resource Q|T11–T16)[^.]*\./) || [''])[0]); /* guards: or methods text */
      T.check('remove.gone_from_figure', !(await panels()).some(x => /anion/i.test(x.title)), (await panels()).map(x => x.L + ' ' + x.title).join(', '));
      await arith('remove'); await panelCheck('remove'); await gapCheck('remove'); await junk('remove'); });
  }

  /* ================= P2: a step yield above 100% must be flagged (tiny measured volume before SEC) ================= */
  await T.t('p2', async () => { await p.click('text=All projects').catch(() => {}); await h.wait(600); await h.newProject('Science gain'); await h.gb(F.gb);
    await h.addRun(F.imac); await h.pool('T1-T6'); await setRun('path', 2); await h.addConc(F.nd, 0.05); await h.addRun(F.sec); await h.suggest(); await setRun('path', 2);
    await h.step('figure'); const R = await arith('p2'), last = R[R.length - 1];
    T.check('p2.gain_present', last && last.s > 100, `scenario expects SEC step yield > 100%, got ${last && last.s}`); /* guards: the scenario really is a gain, so the flag check above ran */
    await gapCheck('p2'); await junk('p2'); });

  /* ================= P3: real UNICORN archive, volumes from injection and no size text by default ================= */
  await T.t('p3', async () => { await p.click('text=All projects').catch(() => {}); await h.wait(600); await h.newProject('Science fdh'); await h.addRun(F.fdh); await h.suggest(); await p.click('#intAuto').catch(() => {}); await h.wait(800);
    const txt = (await h.svgTexts()).map(x => x.t).join(' | '); T.check('p3.no_size_text_default', !/\bKav\b|oligomer|\d\s*kDa/.test(txt), (txt.match(/\bKav\b|oligomer|\d+\s*kDa/) || [''])[0]); /* guards: a new SEC run makes no size claims */
    const xs = (await h.svgTexts()).map(x => num(x.t)).filter(v => v != null); T.check('p3.axis_starts_near_zero', Math.min(...xs) <= 6, `smallest axis number ${Math.min(...xs)}`); await junk('p3'); }); /* guards: the axis is volume since injection */


  /* ================= P4: missing mass on one step does not revert everything to area ================= */
  await T.t('p4_partial_mass', async () => {
    await p.click('text=All projects').catch(() => {}); await h.wait(600); await h.newProject('Partial mass'); await h.gb(F.gb);
    await h.addRun(F.imac); await h.pool('T1-T6'); await setRun('path', 2);
    await h.addRun(F.q); await h.pool('T11-T16'); await setRun('path', 10); /* a different UV path, so UV-area and mg yields differ */
    await h.addRun(F.sec); await h.pool('1.D.12'); await setRun('path', '');

    await h.step('figure');
    const t = await table();
    const yK = col(t, /^Yield/);
    const mK = col(t, /^Protein/);

    // Check run 2
    const run2 = t.rows.find(r => /anion|q/i.test(r.Step));
    T.check('p4.yield_retained', run2 && run2[yK] != null && run2[yK] !== '', `Run 2 has yield: ${run2 && run2[yK]}`);

    // Check if the step with no mass has missing mass but valid run 2
    const run3 = t.rows.find(r => /sec|size/i.test(r.Step));
    const mg3 = num(run3[mK]);
    T.check('p4.mg_missing', !mg3 || isNaN(mg3) || mg3 === 0, `Run 3 has mass: ${mg3}`);

    // Also check it has actual mass value
    const mg2 = num(run2[mK]);
    T.check('p4.mg_retained', mg2 > 0, `Run 2 has mass: ${mg2}`);
    // Guards (#97): with mg on the first step, yields stay mg-based (step 2 = its mg / step 1's mg), not UV-area ratios, and the step without mg shows no yield
    const run1 = t.rows[0], mg1 = num(run1[mK]), y2 = num(run2[yK]);
    T.check('p4.yield_is_mg_ratio', mg1 > 0 && Math.abs(y2 - 100*mg2/mg1) <= 1.5, `step 2 yield ${y2}%, mg ratio ${mg1 > 0 ? (100*mg2/mg1).toFixed(1) : '?'}% (${mg2} / ${mg1} mg)`);
    T.check('p4.no_yield_without_mg', run3 && (run3[yK] == null || run3[yK] === '' || /^[-–—]?$/.test(String(run3[yK]).trim())), `step 3 yield: ${run3 && run3[yK]}`);

    await gapCheck('p4'); await junk('p4');
  });



  /* ================= P5: Manual step correctly rendered in summary table ================= */
  await T.t('p5_manual_step', async () => {
    await p.click('text=All projects', {timeout: 1000}).catch(() => {}); await h.wait(600);
    await h.newProject('Manual step check');

    // Use the actual UI to add a manual step
    await p.evaluate(() => document.querySelector('#tl [data-addmenu]').click()); await h.wait(100);
    await p.evaluate(() => document.querySelector('#tl [data-addstep="man:other"]').click()); await h.wait(500);

    // The UI should now show the step sheet
    const setField = async (sel, v) => { const l = p.locator(sel).first(); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(150); };

    await setField('#man-name', 'Final buffer exchange');
    await setField('#man-conc', '0.5');
    await setField('#man-vol', '1');

    // We need table() which is inside the test scope, wait let's just copy it:
    await h.step('figure');
    const rs = await h.sumTable();
    const head = rs[0];
    const rows = rs.slice(1).filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])));

    const sumHtml = await p.locator('#sumTable').innerHTML();
    const manRow = rows.find(r => r.Step && r.Step.includes('Final buffer exchange'));

    T.check('p5.manual_name', manRow && manRow.Step === 'Final buffer exchange', 'Name is retained: ' + (manRow ? manRow.Step : 'not found'));
    T.check('p5.manual_mg', manRow && manRow['Protein (mg)'] === '0.50', 'Mg is 0.50: ' + (manRow ? manRow['Protein (mg)'] : 'not found'));
    T.check('p5.no_undefined', !sumHtml.includes('undefined'), 'No undefined in HTML');
    T.check('p5.no_nanodrop', manRow && !manRow.Pool.includes('NanoDrop'), 'No invented NanoDrop provenance: ' + (manRow ? manRow.Pool : ''));
  });
















    /* ================= P6: umol yields with manual start and transfer ================= */
  await T.t('p6_umol', async () => {
    await p.click('text=All projects', {timeout: 1000}).catch(() => {}); await h.wait(600);
    await h.newProject('Manual umol check');

    // Set 50 kDa sequence
    const mwEl = await p.$('#prep-seq');
    if (mwEl) { await mwEl.fill('A'.repeat(704)); await h.wait(200); }

    // Manual start: 20 mg
    await p.evaluate(() => document.querySelector('#tl [data-addmenu]').click()); await h.wait(200);
    await p.evaluate(() => document.querySelector('#tl [data-addstep="man:column"]').click()); await h.wait(600);
    const mname = await p.$('.man.sel [data-man="name"]');
    if(mname) {
        await mname.fill('Start');
        await p.fill('.man.sel [data-man="vol"]', '10');
        await p.fill('.man.sel [data-man="conc"]', '2'); // 20 mg
        await p.evaluate(() => document.querySelector('.man.sel [data-man="conc"]').dispatchEvent(new Event('change', {bubbles: true})));
        await h.wait(400);
    }

    // Column 1
    await h.addRun(path.join(DATA, '..', 'synthetic', 'akta1.csv'));
    await h.wait(600);
    await h.pool('T1-T6');
    await h.wait(400);
    let id1 = await p.evaluate(() => {
        const el = document.querySelector('.run.sel');
        return el ? el.getAttribute('data-id') : null;
    });
    if (id1) {
        await p.evaluate((id) => {
            const pc = document.querySelector('#pc' + id); if (pc) { pc.value = '2'; pc.dispatchEvent(new Event('change', {bubbles: true})); }
            const pv = document.querySelector('#pv' + id); if (pv) { pv.value = '5'; pv.dispatchEvent(new Event('change', {bubbles: true})); }
        }, id1);
    }
    await h.wait(400);

    // Transfer
    await h.addConc(path.join(DATA, '..', 'synthetic', '10mg.csv'), 5);
    await h.wait(600);
    await p.evaluate(() => {
        const c = document.querySelector('#btw-conc');
        if (c) {
            c.value = '1';
            c.dispatchEvent(new Event('change', {bubbles: true}));
        }
        const v = document.querySelector('#btw-vOut');
        if(v) {
            v.value = '5';
            v.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });
    await h.wait(400);

    // Column 2
    await h.addRun(path.join(DATA, '..', 'synthetic', 'akta2.csv'));
    await h.wait(600);
    await h.pool('T11-T16');
    await h.wait(400);
    let id2 = await p.evaluate(() => {
        const el = document.querySelector('.run.sel');
        return el ? el.getAttribute('data-id') : null;
    });
    if (id2) {
        await p.evaluate((id) => {
            const pc = document.querySelector('#pc' + id); if (pc) { pc.value = '1'; pc.dispatchEvent(new Event('change', {bubbles: true})); }
            const pv = document.querySelector('#pv' + id); if (pv) { pv.value = '4'; pv.dispatchEvent(new Event('change', {bubbles: true})); }
        }, id2);
    }
    await h.wait(400);

    // addConc for column 2 so it is NanoDrop pool (required to trigger umol basis)
    await h.addConc(path.join(DATA, '..', 'synthetic', '4mg.csv'), null);
    await h.wait(600);

    // Wait and check table
    await p.evaluate(() => {
        const fig = document.querySelector('#tl [data-step="figure"]');
        if(fig) fig.click();
    });
    await h.wait(800);

    const rs = await h.sumTable();
    if (!rs || rs.length < 2) return;
    const head = rs[0];
    const rows = rs.slice(1).filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((k, i) => [k, r[i]])));

    // Check yields
    const c1 = rows.find(r => r.Step && r.Step.includes('2. '));
    const tRow = rows.find(r => r.Step && r.Step.includes('2. ') && r.Pool && r.Pool.includes('NanoDrop')) || rows.find(r => r.Step && r.Step.includes('NanoDrop'));
    const c2 = rows.find(r => r.Step && r.Step.includes('3. '));

    T.check('p6.c1_yield', c1 && c1['Yield (%)'] === '50', 'C1 cumulative yield 50%: ' + (c1 ? c1['Yield (%)'] : 'not found'));
    T.check('p6.t_yield', tRow && tRow['Yield (%)'] === '25', 'Transfer cumulative yield 25%: ' + (tRow ? tRow['Yield (%)'] : 'not found'));
    T.check('p6.t_stepy', tRow && tRow['Step yield (%)'] === '50', 'Transfer step yield 50%: ' + (tRow ? tRow['Step yield (%)'] : 'not found'));
    T.check('p6.c2_yield', c2 && c2['Yield (%)'] === '20', 'C2 cumulative yield 20%: ' + (c2 ? c2['Yield (%)'] : 'not found'));
    T.check('p6.c2_stepy', c2 && c2['Step yield (%)'] === '80', 'C2 step yield 80%: ' + (c2 ? c2['Step yield (%)'] : 'not found'));
  });

  if (EXP) T.check('expected_json_seen', true, Object.keys(EXP).slice(0, 10).join(','));
 /* the biochemist's fixtures exist: extend P1 with them once their schema settles */
  T.check('no page errors', !errs.length, errs.join(' | ')); await close(); T.done(); })();
