// 10 data truth (biochemist): load synthetic files with known answers (data/expected.json, made by data/gen_chrom.py and data/gen_nd.py)
// and check what the app shows in its UI: SEC detection, column, flow, UV path, fraction count and labels, peak Ve, pool area and mg, NanoDrop means.
// Everything is read from the DOM (timeline, run card, peak table, step sheet), never from app internals.
const {open, H, suite, path, fs, DATA} = require('../lib/harness');
const EXP = JSON.parse(fs.readFileSync(path.join(DATA, 'expected.json'), 'utf8')), CH = path.join(DATA, 'chrom'), ND = path.join(DATA, 'nd');
const T = suite('10_data_truth'), num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;

/* DOM readers, kept here so a renamed element is fixed in one place */
const card = p => p.locator('.trace.run.sel').first();
const cardText = async p => (await card(p).innerText()).replace(/\s+/g, ' ');
const field = async (p, k) => { const el = card(p).locator(`[data-k=${k}]`).first(); if (!(await el.count())) return ''; const v = await el.inputValue().catch(() => ''); return v || (await el.getAttribute('placeholder')) || ''; };
const setOpt = (p, id, v) => p.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) return false; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [id, String(v)]);
const setRun = async (p, k, v) => { const l = p.locator(`.trace.run.sel [data-k=${k}]`).first(); await l.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } }); await l.fill(String(v)); await l.dispatchEvent('change'); await p.waitForTimeout(400); };
const detect = async p => { await p.evaluate(() => { const b = document.getElementById('intAuto'); if (b) b.click(); }); await p.waitForTimeout(900); };
/* the peak table as objects keyed by header, with the Ve/apex column under "ve" */
async function peaks(p, h){ const t = await h.peakTable(); if (!t.length) return {head: [], rows: []}; const head = t[0];
  const iv = head.findIndex(c => /^(Ve|Center|Apex|Elution time)\b/.test(c)), ia = head.findIndex(c => /^Area/.test(c)), im = head.findIndex(c => /^Protein/.test(c)), ip = head.findIndex(c => /% of regions/.test(c));
  const rows = t.slice(1).filter(r => r.length > 3).map(r => ({name: r[0], a: num(r[1]), b: num(r[2]), ve: iv >= 0 ? num(r[iv]) : NaN, area: ia >= 0 ? num(r[ia]) : NaN, mg: im >= 0 ? num(r[im]) : NaN, pct: ip >= 0 ? num(r[ip]) : NaN}));
  return {head, unit: (head[iv] || '').match(/\((\w+)\)/) ? (head[iv].match(/\((\w+)\)/)[1]) : '', rows}; }

async function chromFile(e){ const id = e.file.replace(/\.[^.]+$/, ''), t0 = Date.now();
  const {p, errs, close} = await open(), h = H(p);
  try {
    await h.newProject('truth ' + id); await h.addRun(path.join(CH, e.file)); await p.waitForTimeout(e.slow_ok_s ? 1500 : 300);
    const secs = (Date.now() - t0)/1000;
    // guards: a file the app can read at all becomes a run card
    if (!T.check(`${id}/loads`, await card(p).count(), 'no selected run card after loading')) return;
    // guards: large exports (200k points) still load in reasonable time
    if (e.slow_ok_s) T.check(`${id}/load-time`, secs < e.slow_ok_s + 6, `${secs.toFixed(1)} s`);
    const tl = await h.timeline(), run = tl.find(x => /^run/.test(x.k || '')) || tl.find(x => /IMAC|exclusion|exchange|column|run/i.test(x.t || ''));
    // guards: SEC is recognised (or not) from the file, so Ve counts from the injection and the step is named right
    T.check(`${id}/step-name`, run && new RegExp(e.step, 'i').test(run.t || ''), `expected "${e.step}", timeline says "${run ? run.t : 'none'}"`);
    const ct = await cardText(p);
    // guards: the fraction marks are read: count of collected (non-waste) fractions and the first and last label
    T.check(`${id}/fractions`, ct.includes(`${e.frac.n} fractions, ${e.frac.first} to ${e.frac.last}`), `expected "${e.frac.n} fractions, ${e.frac.first} to ${e.frac.last}", card: ${ct.slice(0, 160)}`);
    // guards: SEC volumes are counted from the injection when the injection is not at 0
    if (e.kind === 'sec' && e.injection > 0.5) T.check(`${id}/says-from-injection`, /from (the )?injection/i.test(ct + " " + (await h.svgTexts()).map(x => x.t).join(" ")), "neither the run card nor the figure says the volumes count from the injection");
    // guards: the column is read from the file name or the UNICORN log
    if (e.column) { const c = (await field(p, 'mCol')).replace(/^auto:\s*/i, '').replace(/\s*\(from the file.*$/i, '').trim(); T.check(`${id}/column`, c.toLowerCase() === e.column.toLowerCase(), `expected "${e.column}", got "${c}"`); }
    // guards: the flow rate is read from the exported flow curve
    if (e.flow) { const f = num((await field(p, 'mFlow')).replace(/^auto:\s*/i, '')); T.check(`${id}/flow`, Math.abs(f - e.flow) < 0.01, `expected ${e.flow}, got ${f}`); }
    // guards: the UV path stored in a UNICORN archive (CurveUVInfo/UVPathLength) is used, and the "UV cell path length" curve is not a trace
    if (/\.zip$/.test(e.file)) { const pv = num(await field(p, 'path')); T.check(`${id}/uv-path`, Math.abs(pv - e.path_mm) < 0.01, `expected ${e.path_mm} mm, got ${pv}`); }
    await setOpt(p, 'o-eps', e.pool ? e.pool.eps : 1); await detect(p);
    // guards (#10): the figure's display smoothing and baseline change the picture only, never the peak areas or % (peaks measured from zero, so an offset would show)
    { const big = async () => (await peaks(p, h)).rows.filter(r => !/^pool/i.test(r.name)).sort((a, b) => b.area - a.area)[0];
      await setOpt(p, 'o-intBase', 'zero'); await p.waitForTimeout(300); const before = await big();
      if (before) { await setOpt(p, 'o-smooth', 21); await setOpt(p, 'o-baseline', 'min'); await p.waitForTimeout(400); const after = await big() || {};
        T.check(`${id}/peak-area-ignores-display`, Math.abs(after.area - before.area) <= Math.abs(before.area)*0.001 && after.pct === before.pct, `before ${before.area} (${before.pct}%), after strong smoothing and zero-at-minimum ${after.area} (${after.pct}%)`);
        await setOpt(p, 'o-smooth', 0); await setOpt(p, 'o-baseline', 'none'); }
      await setOpt(p, 'o-intBase', 'line'); await p.waitForTimeout(300); }
    const P = await peaks(p, h), pk = P.rows.filter(r => !/^pool/i.test(r.name));
    // guards: the axis unit follows the file (mL, or min for a time-based export)
    T.check(`${id}/unit`, P.unit === e.unit, `expected ${e.unit}, table header "${P.head.join(' | ')}"`);
    for (const [k, x] of e.peaks.entries()) { const hit = pk.find(r => Math.abs(r.ve - x.ve) <= x.tol);
      // guards: each real peak is found at its true elution volume (from the injection for SEC); optional peaks are only reported
      if (x.must) T.check(`${id}/peak${k + 1}@${x.ve}`, hit, `${x.note}: expected Ve ${x.ve} ±${x.tol}, table has ${pk.map(r => r.ve).join(', ') || 'none'}`);
      else console.log(`INFO ${id}/peak${k + 1}@${x.ve} (optional, ${x.note}): ${hit ? 'found ' + hit.ve : 'not reported'}`); }
    for (const [k, x] of (e.forbid || []).entries()) // guards: dips and peaks that exist only in derived curves are never reported as peaks
      T.check(`${id}/no-false-peak${k + 1}@${x.ve}`, !pk.some(r => Math.abs(r.ve - x.ve) <= x.tol && !(r.pct < 1)), `${x.note}: table has ${pk.map(r => r.ve + ' (' + r.pct + '%)').join(', ')}`);
    const known = e.peaks.concat(e.forbid || []), extra = pk.filter(r => r.pct >= 2 && !known.some(x => Math.abs(r.ve - x.ve) <= Math.max(x.tol, 0.3)));
    // guards: noise and baseline drift do not create peaks of 2% or more of the area
    T.check(`${id}/no-spurious`, !extra.length, `unexpected peaks: ${extra.map(r => r.ve + ' (' + r.pct + '%)').join(', ')}`);
    if (e.pool) { await h.pool(e.pool.label); const pr = (await peaks(p, h)).rows.find(r => /^pool/i.test(r.name));
      // guards: the pool spans from the first pooled fraction mark to the mark after the last one
      if (T.check(`${id}/pool-row`, pr, 'no Pool row in the peak table')) {
        T.check(`${id}/pool-span`, Math.abs(pr.a - e.pool.a) < 0.02 && Math.abs(pr.b - e.pool.b) < 0.02, `expected ${e.pool.a}–${e.pool.b}, got ${pr.a}–${pr.b}`);
        // guards: the pool's A280 area, the number every mg estimate is built on
        T.check(`${id}/pool-area`, Math.abs(pr.area - e.pool.area) <= e.pool.area*e.pool.area_tol_pct/100, `expected ${e.pool.area} ±${e.pool.area_tol_pct}%, got ${pr.area}`);
        // guards: mg = area / 1000 / (eps × path/10), with eps set to the stated value and the file's (or default 2 mm) path
        if (e.pool.mg != null) T.check(`${id}/pool-mg`, Math.abs(pr.mg - e.pool.mg) <= Math.max(0.011, e.pool.mg*(e.pool.area_tol_pct || 5)/100), `expected ${e.pool.mg} mg (eps ${e.pool.eps}, ${e.path_mm} mm), got ${pr.mg}`); } }
  } finally {
    // guards: no script errors while loading and analysing this file
    T.check(`${id}/no-page-errors`, !errs.length, errs.join(' | ')); await close(); }
}

/* mg from the UV area follows the units: minutes only with a flow, AU shown as mAU, and a UV path not in the file assumed (2 mm) and said so */
async function mgFile(e){ const id = e.file.replace(/\.[^.]+$/, '');
  const {p, errs, close} = await open(), h = H(p), pool = async () => (await peaks(p, h)).rows.find(r => /^pool/i.test(r.name)) || {}, tbl = async () => (await p.locator('#intTable').innerText()).replace(/\s+/g, ' '), tol = x => Math.max(0.011, x*0.05);
  try {
    await h.newProject('mg ' + id); await h.addRun(path.join(CH, e.file)); await setOpt(p, 'o-eps', e.eps); await h.pool(e.pool);
    // guards: the pool area is read in the unit the app shows (mAU*mL, or mAU*min on a time axis; AU files are shown in mAU)
    const area = (await pool()).area; T.check(`${id}/area`, Math.abs(area - e.area) <= e.area*0.05, `expected ${e.area}, got ${area}`);
    if (e.mg == null) { // guards: minutes without a known flow give no mg, and the peak table says it is the flow
      T.check(`${id}/no-mg-without-flow`, Number.isNaN((await pool()).mg), `mg shown on a time axis without a flow: ${(await pool()).mg}`);
      T.check(`${id}/flow-note`, /flow/i.test(await tbl()), (await tbl()).slice(-200));
      await setRun(p, 'mFlow', e.typed_flow); e.mg = e.mg_with_flow; }
    // guards: with no path in the file, mg use an assumed 2 mm, and the peak table says it is assumed
    const mg2 = (await pool()).mg, want2 = e.mg*e.path_mm/2; T.check(`${id}/mg-assumed-2mm`, Math.abs(mg2 - want2) <= tol(want2), `expected ${want2.toFixed(3)} mg at an assumed 2 mm, got ${mg2}`);
    T.check(`${id}/path-assumed-note`, /assumed/i.test(await tbl()), (await tbl()).slice(-200));
    await setRun(p, 'path', e.path_mm);
    // guards: mg = area (mAU*mL) / 1000 / (eps x path/10); minutes become mL with the flow
    const mg = (await pool()).mg; T.check(`${id}/pool-mg`, Math.abs(mg - e.mg) <= tol(e.mg), `expected ${e.mg} mg, got ${mg}`);
    await detect(p);
    // guards: a detected peak follows the same units as the pool
    const pr = (await peaks(p, h)).rows.filter(r => !/^pool/i.test(r.name)).sort((a, b) => b.area - a.area)[0];
    T.check(`${id}/peak-mg`, pr && Math.abs(pr.mg - e.mg) <= tol(e.mg), `expected about ${e.mg} mg, peak row ${pr && pr.mg}`);
    // guards: no NaN, undefined or null in the summary table and methods
    await h.step('figure'); const st = (await h.sumTable()).map(r => r.join(' | ')).join('\n');
    T.check(`${id}/summary-clean`, !/NaN|undefined|null/.test(st + (await h.methods())), st.slice(0, 300));
  } finally { T.check(`${id}/no-page-errors`, !errs.length, errs.join(' | ')); await close(); }
}

/* pool volume when the pool includes the last fraction: the last fraction ends at the logged end of fractionation, else one median width, not at the end of the trace */
async function lastFracFile(e){ const id = e.file.replace(/\.[^.]+$/, '');
  const {p, errs, close} = await open(), h = H(p);
  try {
    await h.newProject('lastfrac ' + id); await h.addRun(path.join(CH, e.file)); await p.waitForTimeout(300); await h.pool(e.pool);
    /* the run card redraws its notes when the step is opened again */
    { const k = ((await h.timeline()).find(x => /^run:/.test(x.k)) || {}).k; await h.step('figure'); if (k) await h.step(k); }
    const ct = await cardText(p);
    T.check(`${id}/fractions`, ct.includes(`${e.n} fractions, ${e.first} to ${e.last}`), `card: ${ct.slice(0, 200)}`);
    // guards: the run card says when a pooled fraction's end is assumed or it is much wider than the others
    if (e.card_note) T.check(`${id}/card-note`, new RegExp(e.card_note).test(ct), `expected a note matching "${e.card_note}", card: ${ct.slice(0, 300)}`);
    else T.check(`${id}/no-card-note`, !/not logged|1\.5 times/.test(ct), ct.slice(0, 300));
    await h.step('figure'); const st = await h.sumTable(), hd = st[0] || [], iv = hd.findIndex(c => /^Volume/.test(c)), row = st.slice(1).find(r => r.length > 2 && /\d/.test(r[iv] || ''));
    // guards: the pool volume (summary table Volume column) is the fractions' own volume, without the wash after the last one
    T.check(`${id}/summary-volume`, row && Math.abs(num(row[iv]) - e.vol) < 0.06, `${e.note}: expected ${e.vol} mL, table: ${st.map(r => r.join(' | ')).join(' / ').slice(0, 300)}`);
    // guards: the methods sentence "Fractions ... (N mL) were pooled" uses the same volume
    const meth = await h.methods(), mm = meth.match(/\((\d+(?:\.\d+)?) mL\) were pooled/); T.check(`${id}/methods-volume`, mm && Math.abs(+mm[1] - e.vol) < 0.06, `expected ${e.vol} mL, methods: ${meth.slice(0, 300)}`);
  } finally { T.check(`${id}/no-page-errors`, !errs.length, errs.join(' | ')); await close(); }
}

(async () => {
  for (const e of EXP.lastfrac || []) { if (only && !only.test(e.file)) continue; await T.t(e.file, () => lastFracFile(e)); }
  for (const e of EXP.mg || []) { if (only && !only.test(e.file)) continue; await T.t(e.file, () => mgFile(e)); }
  for (const e of EXP.chrom) { if (only && !only.test(e.file)) continue; await T.t(e.file, () => chromFile(e)); }
  T.done(); })();
