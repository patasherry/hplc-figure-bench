// 30 robustness (QA): bad inputs, seeded operation fuzz with invariants, persistence round trips, performance budgets.
// UI and DOM only. App-specific selectors not in the harness are collected in SEL below, so a rewrite needs one edit here.
const {open, H, suite, path, ROOT, DATA, fs, src} = require('../lib/harness');
const Q = path.join(DATA, 'qa'), CH = path.join(DATA, 'chrom');
const F = {his: src('his'), q: src('q'),
  ortho: src('ortho'), s200: src('s200'), zip: src('secZip'),
  nd: src('nd'), ndSpec: src('ndSpec'), big: path.join(Q, 'akta_200k_HisTrap_5mL.csv')};
const SEL = {move: d => `#ssActs [data-move="${d}"]`, remove: '#ssActs [data-remove]', wfTitle: '#wfT', layout: l => `label[for="wf-${l}"]`, cropSel: '.trace.run.sel [data-k=crop]',
  tabs: '.figtab', exportBtn: '#projSave', importFile: '#projFile', home: '#homeBtn', card: '.pcard[data-pid]', cardName: '.pn', methodsBox: '#methodsBox', ndBtnFile: '#btwNdFile', projName: '#projName'};
const T = suite('30_robust');
/* every toast shown, collected by a MutationObserver so short-lived toasts are not missed */
const watchToasts = p => p.evaluate(() => { window.__qaT = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { const t = (n.textContent || '').trim(); if (t && n.nodeType === 1 && (n.closest('#toast, .toast, [role=status]') || /toast|pill/.test(n.className || ''))) window.__qaT.push(t); }))).observe(document.body, {childList: true, subtree: true}); });
const takeToasts = async p => { const t = await p.evaluate(() => { const x = (window.__qaT || []).slice(); window.__qaT = []; return x; }).catch(() => []); return t; };
const purif = L => L.filter(x => /^(run|btw|man|conc|nc):/.test(x.k) || x.k === 'cleave');
const tabsOf = p => p.$$eval(SEL.tabs, e => e.map(x => x.textContent.trim()));
const panelTitles = p => p.$$eval('#paper svg text', ts => ts.filter(t => t.querySelector('tspan[font-weight="bold"], tspan[font-weight="700"]') && /^[A-Z]\s/.test(t.textContent.trim())).map(t => t.textContent.trim()));
const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const counts = async (p, h) => ({tl: (await h.timeline()).length, tabs: (await tabsOf(p)).length});
const openMethods = p => p.evaluate(sel => { const b = document.querySelector(sel); if (b) { b.open = true; b.dispatchEvent(new Event('toggle')); } }, SEL.methodsBox);
const figureTexts = p => p.$$eval('#paper svg text', ts => ts.map(t => t.textContent.trim()).filter(Boolean).join('|'));
async function snapshot(p, h){ await h.step('figure'); await p.waitForTimeout(500); await openMethods(p); await p.waitForTimeout(400);
  return {tl: JSON.stringify((await h.timeline()).map(x => [x.k.replace(/\d+/g, '#'), x.t, x.s])), tabs: JSON.stringify(await tabsOf(p)), sum: JSON.stringify(await h.sumTable()), methods: await h.methods().catch(() => ''), fig: await figureTexts(p)}; }
const diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).map(k => `${k}: ${String(a[k]).slice(0, 120)} => ${String(b[k]).slice(0, 120)}`).join(' ;; ');
async function openCard(p, name){ const ok = await p.evaluate(([c, n, nm]) => { const x = [...document.querySelectorAll(c)].find(e => (e.querySelector(n) || e).textContent.trim() === nm) || document.querySelector(c); if (x) { x.click(); return true; } return false; }, [SEL.card, SEL.cardName, name]); await p.waitForTimeout(2500); return ok; }
const sel1 = async (p, h, k) => { await p.click(`#tl [data-step="${k}"]`); await p.waitForTimeout(250); };

(async () => {
/* ---------------- bad inputs ---------------- */
await T.t('bad', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Bad inputs'); await watchToasts(p);
  await h.dropFiles(F.his); await h.pool('T1-T6'); await takeToasts(p);
  /* each rejected input: a toast that says something, no page error, no new step or tab */
  const reject = async (id, files, why) => { const e0 = errs.length, c0 = await counts(p, h); await h.dropFiles(files); const ts = await takeToasts(p), c1 = await counts(p, h);
    T.check(`bad.${id}.toast`, ts.some(t => t.length > 15), `${why}; toasts: ${ts.join(' | ') || 'none'}`); // a clear message, not silence
    T.check(`bad.${id}.nothing-added`, c1.tl === c0.tl && c1.tabs === c0.tabs, `timeline ${c0.tl}->${c1.tl}, tabs ${c0.tabs}->${c1.tabs}`); // nothing half-added
    T.check(`bad.${id}.no-error`, errs.length === e0, errs.slice(e0).join(' | ')); };
  await reject('empty', path.join(Q, 'empty.csv'), 'empty file');
  await reject('junk', path.join(Q, 'junk.csv'), 'random bytes named .csv');
  await reject('corrupt-zip', path.join(Q, 'corrupt_unicorn.zip'), 'UNICORN zip cut to a third');
  await reject('images-zip', path.join(Q, 'images_only.zip'), 'zip with only PNGs');
  await reject('other-zip', path.join(Q, 'not_unicorn.zip'), 'zip with text files');
  /* inputs that should load: they add exactly one step or tab, with no error */
  const accept = async (id, file, why) => { const e0 = errs.length, c0 = await counts(p, h); await h.dropFiles(file); const ts = await takeToasts(p), c1 = await counts(p, h);
    T.check(`ok.${id}.added`, c1.tl + c1.tabs > c0.tl + c0.tabs, `${why}; toasts: ${ts.join(' | ')}`); T.check(`ok.${id}.no-error`, errs.length === e0, errs.slice(e0).join(' | ')); return ts; };
  await accept('decimal-comma', path.join(Q, 'decimal_comma.csv'), 'semicolon-separated HPLC trace with decimal commas');
  const L0 = (await h.timeline()).length; await accept('bom-crlf', path.join(Q, 'bom_crlf_Q.csv'), 'UNICORN CSV with BOM and CRLF');
  T.check('ok.bom-crlf.is-run', (await h.timeline()).length === L0 + 1, 'BOM file should become a column step'); // BOM must not hide the UNICORN header
  const long = fs.readdirSync(Q).find(f => f.startsWith('Prøtein')); await accept('unicode-long-name', path.join(Q, long), '200-char unicode file name');
  T.check('ok.unicode-long-name.no-hscroll', !(await h.hScroll()), 'a long tab or step name must not widen the page'); // layout holds
  /* the same file twice: either refused, or added with a toast saying it is a duplicate */
  { const c0 = await counts(p, h); await h.dropFiles(F.his); const ts = await takeToasts(p), c1 = await counts(p, h);
    T.check('dup.same-file-twice', c1.tl === c0.tl || ts.some(t => /already|again|duplicate|twice|same/i.test(t)), `timeline ${c0.tl}->${c1.tl}; toasts: ${ts.join(' | ')}`); } // no silent duplicate
  /* NanoDrop button: nucleic-acid-only export and a picture */
  await h.addConc(null, null); await takeToasts(p); const step0 = (await h.timeline()).find(x => /^btw:|^conc:|^nc:/.test(x.k) || /Concentrat/.test(x.t)) || {};
  for (const [id, f] of [['nd-nucleic', path.join(Q, 'nanodrop_nucleic_only.csv')], ['nd-picture', path.join(Q, 'picture.jpg')]]) { const e0 = errs.length;
    await p.setInputFiles(SEL.ndBtnFile, f); await p.waitForTimeout(900); const ts = await takeToasts(p), st = (await h.timeline()).find(x => x.k === step0.k) || {};
    T.check(`bad.${id}.toast`, ts.some(t => t.length > 15), `toasts: ${ts.join(' | ') || 'none'}`); // says why nothing was used
    T.check(`bad.${id}.no-protein-reading`, !/mg\/mL/.test(st.s || ''), `step now reads: ${st.s}`); // DNA or a photo must not become a protein concentration
    T.check(`bad.${id}.no-error`, errs.length === e0, errs.slice(e0).join(' | ')); }
  /* adding a second Concentrated step when all column runs already have one adds a manual conc step without timing out */
  const cBefore = (await h.timeline()).length;
  await h.addConc(null, '0.5');
  const cAfter = (await h.timeline()).length;
  T.check('ok.second-conc-step', cAfter === cBefore + 1, `timeline ${cBefore}->${cAfter}`);
  await close(); });

/* ---------------- operation fuzz, fixed seed ---------------- */
await T.t('fuzz', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Fuzz');
  let seed = 20261022; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; };
  const pick = a => a[Math.floor(rnd()*a.length)], pool = [F.his, F.q, F.ortho, F.s200, F.zip], log = [], bad = {};
  const fail = (id, msg) => { if (!bad[id]) bad[id] = `after action ${log.length} [${log.slice(-4).join(' > ')}]: ${msg}`; };
  const steps = async () => purif(await h.timeline()).filter(x => x.k !== 'cleave');
  for (let i = 0; i < 150; i++) { const L = await steps(), runsN = L.filter(x => x.k.startsWith('run:')).length; let a = pick(['add', 'conc', 'move', 'move', 'remove', 'rename', 'pool', 'pool', 'crop', 'layout']);
    if (a === 'add' && runsN >= 6) a = 'move'; if (!L.length) a = 'add'; const e0 = errs.length;
    try {
      if (a === 'add') { const f = pick(pool); log.push('add ' + path.basename(f).slice(-18)); await h.dropFiles(f); }
      else if (a === 'conc') { log.push('conc'); await h.addConc(rnd() < 0.7 ? F.nd : null, rnd() < 0.7 ? (0.1 + rnd()).toFixed(2) : null); }
      else if (a === 'move' || a === 'remove') { const s = pick(L), d = rnd() < 0.5 ? -1 : 1; log.push(`${a} ${s.k}${a === 'move' ? ' ' + d : ''}`); await sel1(p, h, s.k);
        if (a === 'move') { const b = await p.$(SEL.move(d)); if (b && !(await b.isDisabled())) { await b.click(); await p.waitForTimeout(300); } }
        else { const b = await p.$(SEL.remove); if (b) { await b.click(); await p.waitForTimeout(700); await p.click(SEL.remove).catch(() => {}); await p.waitForTimeout(400); } } }
      else if (a === 'rename') { await h.step('figure'); const ts = await p.$$('#paper svg text'); const cand = []; for (const t of ts) if (/^[A-Z]\s/.test(((await t.textContent()) || '').trim())) cand.push(t);
        if (cand.length) { const t = pick(cand), nm = 'P' + i; log.push('rename ' + ((await t.textContent()) || '').trim().slice(0, 12) + ' -> ' + nm); await t.click(); await p.waitForTimeout(300);
          const inp = await p.$(SEL.wfTitle); if (inp) { await inp.fill(nm); await inp.press('Enter'); await p.waitForTimeout(300); } else fail('fuzz.rename-toolbar', 'no title box after clicking a panel title'); } }
      else if (a === 'pool') { const r = L.filter(x => x.k.startsWith('run:')); if (r.length) { const s = pick(r), v = pick(['T1-T6', 'T2-T4', '', 'T10-T20', 'A1-A5', 'nonsense', 'T3']); log.push(`pool ${s.k} "${v}"`); await sel1(p, h, s.k); await p.locator('.trace.run.sel [data-k=shade]').fill(v).catch(() => {}); await p.waitForTimeout(300); } }
      else if (a === 'crop') { const r = L.filter(x => x.k.startsWith('run:')); if (r.length) { const s = pick(r); await sel1(p, h, s.k); const c = await p.$(SEL.cropSel); if (c) { const opts = await c.$$eval('option', o => o.map(x => x.value)); const v = pick(opts); log.push(`crop ${s.k} ${v || 'all'}`); await c.selectOption(v); await p.waitForTimeout(300); } else log.push('crop (n/a)'); } }
      else if (a === 'layout') { const l = pick(['row', 'stack', 'grid']); log.push('layout ' + l); await h.step('figure'); await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, SEL.layout(l)); await p.waitForTimeout(300); }
    } catch (e) { fail('fuzz.action-threw', a + ': ' + e.message.split('\n')[0]); }
    /* invariants after every action */
    if (errs.length > e0) fail('fuzz.no-page-error', errs.slice(e0).join(' | '));
    const L2 = await steps(); if (!L2.length) continue;
    L2.forEach((x, j) => { if (/^(btw|conc|nc):/.test(x.k) && !(j > 0 && L2[j - 1].k.startsWith('run:'))) fail('fuzz.conc-after-column', `${x.k} follows ${j ? L2[j - 1].k : 'nothing'}`); }); // a Concentrated step always follows a column
    await h.step('figure'); const P = await panelTitles(p);
    const letters = P.map(t => t[0]).join(''), want = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, P.length); if (P.length && letters !== want) fail('fuzz.letters', `panel letters ${letters}`); // A.. in order, no gaps
    const pt = P.map(t => norm(t.slice(1))), tt = L2.map(x => norm(x.t)); const ok = pt.length === tt.length && tt.every((t, j) => pt[j].startsWith(t.slice(0, 10)) || t.startsWith(pt[j].slice(0, 10)));
    if (!ok) fail('fuzz.order', `timeline [${tt.join(', ')}] vs figure [${pt.join(', ')}]`); // timeline order = figure order
    const rows = (await h.sumTable()).slice(1).filter(r => r[0]); if (rows.length && rows.length !== L2.length) fail('fuzz.summary-rows', `${rows.length} summary rows for ${L2.length} steps: ${rows.map(r => r[0]).join(', ')}`); // one row per step
  }
  for (const id of ['fuzz.no-page-error', 'fuzz.action-threw', 'fuzz.conc-after-column', 'fuzz.letters', 'fuzz.order', 'fuzz.summary-rows', 'fuzz.rename-toolbar']) T.check(id, !bad[id], bad[id]);
  fs.writeFileSync(path.join(ROOT, 'results', '30_robust_fuzz_actions.txt'), log.map((x, i) => `${i + 1} ${x}`).join('\n'));
  await close(); });

/* ---------------- persistence ---------------- */
await T.t('save-reload', async () => { const {p, errs, close} = await open(), h = H(p);
  await h.newProject('SaveReload');
  await h.dropFiles(path.join(DATA, 'standins', 'imac_histrap_1ml_step.csv'));
  await h.pool('T1-T6');
  await h.addConc(path.join(DATA, 'nd', 'nd_one_protein_a280.csv'), 0.5);
  await h.step('figure');
  const ts = await p.$$('#paper svg text');
  for (const t of ts) if (/^[A-Z]\s/.test(((await t.textContent()) || '').trim())) {
    await t.click(); await p.waitForTimeout(300);
    const i = await p.$(SEL.wfTitle); if (i) { await i.fill('IMAC Step'); await i.press('Enter'); }
    break;
  }
  await openMethods(p); await p.waitForTimeout(400);
  const tl0 = JSON.stringify(await h.timeline()), sum0 = JSON.stringify(await h.sumTable()), mth0 = await h.methods().catch(() => '');
  await p.waitForTimeout(3500);
  await p.reload(); await p.waitForTimeout(1200);
  const opened = await openCard(p, 'SaveReload');
  T.check('save-reload.listed', opened, 'opened project from home screen');
  await h.step('figure'); await openMethods(p); await p.waitForTimeout(400);
  const tl1 = JSON.stringify(await h.timeline()), sum1 = JSON.stringify(await h.sumTable()), mth1 = await h.methods().catch(() => '');
  T.check('save-reload.timeline', tl0 === tl1, diff({tl: tl0}, {tl: tl1}));
  T.check('save-reload.sumTable', sum0 === sum1, diff({sum: sum0}, {sum: sum1}));
  T.check('save-reload.methods', mth0 === mth1, `methods before len ${mth0.length} vs after len ${mth1.length}`);
  T.check('save-reload.no-error', !errs.length, errs.join(' | '));
  await close(); });

async function build(p, h){ await h.newProject('Persist'); await h.dropFiles(F.his); await h.pool('T1-T6'); await h.addConc(F.ndSpec, 0.25); await h.dropFiles(F.zip); await h.dropFiles(F.q); await h.pool('T11-T16');
  await h.step('figure'); const t = (await p.$$('#paper svg text')); for (const x of t) if (/^[A-Z]\s/.test(((await x.textContent()) || '').trim())) { await x.click(); await p.waitForTimeout(300); const i = await p.$(SEL.wfTitle); if (i) { await i.fill('Renamed panel'); await i.press('Enter'); } break; }
  await p.waitForTimeout(3500); }
for (const cloud of [false, true]) await T.t(cloud ? 'persist-cloud' : 'persist-local', async () => { const tag = cloud ? 'cloud' : 'local', {p, errs, close} = await open({cloud}), h = H(p);
  await build(p, h); const a = await snapshot(p, h);
  await p.reload(); await p.waitForTimeout(1200); T.check(`persist.${tag}.listed`, await openCard(p, 'Persist'), 'project card on the home screen'); // the project survives a reload
  const b = await snapshot(p, h); T.check(`persist.${tag}.same`, !diff(a, b), diff(a, b)); // timeline, tabs, summary, methods and figure text all identical
  if (!cloud) { const [dl] = await Promise.all([p.waitForEvent('download'), p.click(SEL.exportBtn)]); const f = path.join(ROOT, 'results', 'persist_export.json'); await dl.saveAs(f);
    await p.click(SEL.home); await p.waitForTimeout(600); await p.setInputFiles(SEL.importFile, f); await p.waitForTimeout(3500); const c = await snapshot(p, h);
    T.check('persist.export-import.same', !diff(a, c), diff(a, c)); } // an exported file imports to the same project
  T.check(`persist.${tag}.no-error`, !errs.length, errs.join(' | ')); await close(); });

/* ---------------- damaged or partial files ---------------- */
await T.t('legacy-sec', async () => {
  const {p, errs, close} = await open(), h = H(p);
  const proj = {
    app: 'HPLC Figure Bench',
    version: 1,
    runs: [{
      id: '1',
      name: 'SEC run',
      inWf: true,
      secMode: 'on',
      secCal: 'sc_old',
      fracs: [],
      uvs: [{name: 'UV', xs: [8.0, 10.0, 12.0, 14.0, 16.0], ys: [10.0, 50.0, 200.0, 80.0, 15.0]}],
      run: {vol: 24, cv: 1}
    }],
    prep: {name: 'Legacy SEC Protein'},
    opt: {
      secStds: true,
      secCals: [{
        id: 'sc_old',
        name: 'Legacy Column',
        col: 's200i',
        v0: 8.5,
        vt: 24,
        stds: [
          {name: 'Thyroglobulin', kda: 670, ve: 9.5},
          {name: 'Ovalbumin', kda: 44, ve: 14.5}
        ]
      }]
    }
  };

  await h.newProject('Legacy SEC Setup');
  await p.click('#homeBtn').catch(() => {});
  await p.waitForTimeout(600);
  await p.setInputFiles('#projFile', {
    name: 'legacy_sec.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(proj))
  });
  await p.waitForTimeout(3000);

  const tl = await h.timeline();
  const runStep = tl.find(x => x.k && x.k.startsWith('run:'));
  T.check('legacy-sec.run-found', !!runStep, `timeline: ${JSON.stringify(tl)}`);

  if (runStep) {
    await h.step(runStep.k);
    await p.waitForTimeout(500);

    const calVal = await p.$eval('#sec-cal', el => el.value).catch(e => e.message);
    T.check('legacy-sec.cal-selected', calVal === 'sc_old', `cal: ${calVal}`);

    const calText = await p.$eval('#sec-cal option:checked', el => el.textContent).catch(e => e.message);
    T.check('legacy-sec.unit-present', typeof calText === 'string' && calText.includes('(mL)'), `text: ${calText}`);
  }

  await close();
});

await T.t('falsey-preserve', async () => {
  const {p, errs, close} = await open(), h = H(p);
  const proj = {
    app: 'HPLC Figure Bench',
    version: 1,
    runs: [{
      id: '1',
      name: 'Falsey test run',
      inWf: true,
      secMode: 'on',
      fracs: [],
      uvs: [{name: 'UV', xs: [8.0, 10.0, 12.0], ys: [10.0, 50.0, 15.0]}],
      run: {vol: 24, cv: 1},
      injShift: 0,
      injX: 0,
      pathFromFile: false
    }],
    prep: {name: 'Protein'},
    opt: {}
  };

  await h.newProject('Falsey Preserve');
  await p.click('#homeBtn').catch(() => {});
  await p.waitForTimeout(600);
  await p.setInputFiles('#projFile', {
    name: 'falsey_preserve.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(proj))
  });
  await p.waitForTimeout(3000);

  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
  const f = path.join(ROOT, 'results', 'falsey_preserve_export.json');
  await dl.saveAs(f);

  const exported = JSON.parse(fs.readFileSync(f, 'utf8'));
  const expRun = exported.runs[0];

  T.check('falsey-preserve.injShift', expRun.injShift === 0, `injShift is ${expRun.injShift}`);
  T.check('falsey-preserve.injX', expRun.injX === 0, `injX is ${expRun.injX}`);
  T.check('falsey-preserve.pathFromFile', expRun.pathFromFile === false, `pathFromFile is ${expRun.pathFromFile}`);
  T.check('falsey-preserve.no-error', !errs.length, errs.join(' | '));
  await close();
});

await T.t('legacy-sec-project', async () => {
  const {p, errs, close} = await open(), h = H(p);
  await p.setInputFiles(SEL.importFile, path.join(Q, 'legacy_sec_proj.json'));
  await p.waitForTimeout(3000);

  const tl = await h.timeline();
  T.check('legacy-sec.opens', tl.some(x => x.k.startsWith('run:')), `timeline: ${tl.map(x => x.k).join(', ')}`);

  const r = tl.find(x => x.k.startsWith('run:'));
  if (r) {
    await h.step(r.k);
    await p.waitForTimeout(500);
  }

  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click(SEL.exportBtn)]);
  const f = path.join(ROOT, 'results', 'legacy_sec_proj_export.json');
  await dl.saveAs(f);

  const exported = JSON.parse(fs.readFileSync(f, 'utf8'));
  const expRun = exported.runs[0];

  T.check('legacy-sec.injShift', expRun.injShift === 1.2, `injShift is ${expRun.injShift}`);
  T.check('legacy-sec.injX', expRun.injX === 1.2, `injX is ${expRun.injX}`);
  T.check('legacy-sec.no-error', !errs.length, errs.join(' | '));

  await close();
});

await T.t('empty-uvs-project', async () => { const {p, errs, close} = await open(), h = H(p);
  await p.setInputFiles(SEL.importFile, path.join(Q, 'empty_uvs_proj.json')); await p.waitForTimeout(3000);
  await h.step('figure'); await p.waitForTimeout(500);
  T.check('empty-uvs.no-error', !errs.length, errs.join(' | ')); await close(); });

/* a project file with unusable entries opens with what is usable, says what was skipped, and raises no error */
await T.t('damaged-project', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Partial source'); await h.dropFiles(F.his);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click(SEL.exportBtn)]); const good = path.join(ROOT, 'results', 'partial_src.json'); await dl.saveAs(good);
  const d = JSON.parse(fs.readFileSync(good, 'utf8')); d.runs.push(null, {id: 'r999'}); d.traces = {}; d.nanodrop = 'none'; d.gels = [null, 5]; d.struct = 'none'; d.opt = [1];
  await p.click(SEL.home); await p.waitForTimeout(600); await watchToasts(p); const e0 = errs.length;
  await p.setInputFiles(SEL.importFile, {name: 'partial_project.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))}); await p.waitForTimeout(3000);
  const ts = await takeToasts(p), tl = await h.timeline();
  T.check('partial.no-error', errs.length === e0, errs.slice(e0).join(' | ')); // no crash on null, empty or wrongly typed entries
  T.check('partial.keeps-usable-run', tl.some(x => x.k.startsWith('run:')), `timeline: ${tl.map(x => x.k).join(', ')}`); // the good run is not lost
  T.check('partial.says-skipped', ts.some(t => /skipped 4/i.test(t)), `toasts: ${ts.join(' | ') || 'none'}`); // the user is told 4 entries were unusable
  await close(); });
/* a project file whose prep sub-objects are null or the wrong type (hand-edited, or from another tool) opens, and every step still renders (#146) */
await T.t('malformed-prep', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Malformed prep'); await h.dropFiles(F.his); await h.pool('T1-T6');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click(SEL.exportBtn)]); const src = path.join(ROOT, 'results', 'malformed_prep_src.json'); await dl.saveAs(src);
  const d = JSON.parse(fs.readFileSync(src, 'utf8')); d.prep = Object.assign({}, d.prep, {btw: null, manual: null, skip: 'x', stepMeta: [], offs: 5, titles: null});
  await p.click(SEL.home); await p.waitForTimeout(600); const e0 = errs.length;
  await p.setInputFiles(SEL.importFile, {name: 'malformed_prep.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))}); await p.waitForTimeout(3000);
  const tl = await h.timeline(); T.check('malformed-prep.opens', tl.some(x => x.k.startsWith('run:')), `timeline: ${tl.map(x => x.k).join(', ')}`);
  for (const x of tl) { await h.step(x.k); await p.waitForTimeout(250); } // every step, including the run's, renders from the normalized prep
  T.check('malformed-prep.no-error', errs.length === e0, errs.slice(e0).join(' | '));
  await close(); });
/* a project whose opt.known has a null entry and whose opt.secCals is not a list opens, and the known-protein list renders with built-in sizes (#145) */
await T.t('malformed-opt', async () => { const {p, errs, close} = await open(); await p.click('#homeQuick'); await p.waitForTimeout(600); await watchToasts(p); const e0 = errs.length;
  const image = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 200; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#eee'; x.fillRect(0, 0, 200, 240); x.fillStyle = '#333'; [40, 90, 150].forEach(y => x.fillRect(10, y, 80, 6)); x.fillRect(110, 100, 80, 8); return c.toDataURL('image/png'); });
  const d = {app: 'HPLC Figure Bench', version: 1, runs: [], traces: [], cur: 'g1', gels: [{id: 'g1', name: 'synthetic gel', image, nLanes: 2, labels: 'M, A', marksManual: true, marks: [{kda: 100, y: .15}, {kda: 10, y: .65}], black: 0, white: 255, autoLv: false, tags: [], cl: 0, cr: 0, ct: 0, cb: 0, rot: 0, fine: 0, assign: []}],
    opt: {known: [null, {name: 'Synthetic X', kda: 42, kind: 'label', on: true, src: 'added by you'}, {name: 'DnaK', kda: 1, kind: 'contam', on: true, ctx: 'any', src: 'old note'}], secCals: 'invalid', gelAutoCrop: false, tidy13: true, tidy14: true}};
  await p.setInputFiles(SEL.importFile, {name: 'malformed_opt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))}); await p.waitForTimeout(2500);
  const ts = await takeToasts(p), rows = await p.$$eval('#knownList .krow', rs => rs.map(r => [r.querySelector('[data-kf=name]').value, r.querySelector('[data-kf=kda]').value]));
  T.check('malformed-opt.opens', ts.some(t => /Opened malformed_opt/.test(t)) && !ts.some(t => /could not open/i.test(t)), `toasts: ${ts.join(' | ') || 'none'}`); // the null entry does not stop the project opening
  T.check('malformed-opt.known-listed', rows.some(r => r[0] === 'Synthetic X' && +r[1] === 42), `rows: ${JSON.stringify(rows)}`); // the project's own protein is kept
  const dnak = rows.filter(r => r[0] === 'DnaK'); T.check('malformed-opt.builtin-size', dnak.length === 1 && +dnak[0][1] === 69.1, `DnaK rows: ${JSON.stringify(dnak)}`); // a built-in protein takes its current size, once
  T.check('malformed-opt.no-error', errs.length === e0, errs.slice(e0).join(' | '));
  await close(); });
/* migrating legacy NanoDrop stage: 'final' to 'conc' properly checks for prep.btw to prevent yield loss */
await T.t('legacy-nd-migrate', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Migrate ND'); await h.dropFiles(F.his);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click(SEL.exportBtn)]); const projPath = path.join(ROOT, 'results', 'migrate_src.json'); await dl.saveAs(projPath);
  const d = JSON.parse(fs.readFileSync(projPath, 'utf8')), rId = d.runs[0].id;
  d.prep = d.prep || {}; d.prep.btw = d.prep.btw || {}; d.prep.btw[rId] = {how: 'conc', conc: '10', vOut: '1'};
  d.nanodrop = [ {id: 'nd1', name: 'Has conc', a280: 2.5, kind: 'protein', stage: 'final', runId: rId, dil: 1}, {id: 'nd2', name: 'No conc', a280: 3.5, kind: 'protein', stage: 'final', runId: rId + '_fake', dil: 1} ];
  await p.click(SEL.home); await p.waitForTimeout(600);
  await p.setInputFiles(SEL.importFile, {name: 'migrate_proj.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))}); await p.waitForTimeout(3000);
  const [dl2] = await Promise.all([p.waitForEvent('download'), p.click(SEL.exportBtn)]); const outPath = path.join(ROOT, 'results', 'migrate_out.json'); await dl2.saveAs(outPath);
  const d2 = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const nd1 = d2.nanodrop.find(x => x.id === 'nd1'), nd2 = d2.nanodrop.find(x => x.id === 'nd2');
  T.check('legacy-nd.migrated', nd1 && nd1.stage === 'conc', 'valid runId with btw migrated to conc');
  T.check('legacy-nd.preserved', nd2 && nd2.stage === 'final', 'no btw preserved as final');
  await close(); });
/* a project file dropped together with other files: the others are not loaded, and the user is told */
await T.t('project-with-others', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Mixed drop'); await watchToasts(p); const e0 = errs.length;
  await p.setInputFiles('#file', [{name: 'tiny_project.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"HPLC Figure Bench","version":1,"runs":[]}')}, {name: path.basename(F.his), mimeType: 'text/csv', buffer: fs.readFileSync(F.his)}]); await p.waitForTimeout(3000);
  const ts = await takeToasts(p);
  T.check('mixed.toast', ts.some(t => /not loaded/i.test(t)), `toasts: ${ts.join(' | ') || 'none'}`); // no silent drop of the second file
  T.check('mixed.no-error', errs.length === e0, errs.slice(e0).join(' | ')); await close(); });
/* pictures in formats the browser cannot read, and spreadsheets, get a message that says what to do */
await T.t('unsupported-formats', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Formats'); await watchToasts(p);
  for (const [id, name, re] of [['heic', 'gel_scan.heic', /PNG/], ['xlsx', 'run_export.xlsx', /CSV/]]) { const e0 = errs.length, c0 = await counts(p, h);
    await p.setInputFiles('#file', {name, mimeType: 'application/octet-stream', buffer: Buffer.from('PK\u0003\u0004 not really a file, just bytes '.repeat(20))}); await p.waitForTimeout(1500);
    const ts = await takeToasts(p), c1 = await counts(p, h);
    T.check(`format.${id}.says-what-to-do`, ts.some(t => re.test(t)), `toasts: ${ts.join(' | ') || 'none'}`); // names the format to export instead
    T.check(`format.${id}.nothing-added`, c1.tl === c0.tl && c1.tabs === c0.tabs, `timeline ${c0.tl}->${c1.tl}`);
    T.check(`format.${id}.no-error`, errs.length === e0, errs.slice(e0).join(' | ')); }
  await close(); });
/* settings saved in this browser that are damaged (a null in the known-proteins list) must not stop the page from starting */
await T.t('damaged-settings', async () => { const {ctx, p, errs, close} = await open(), h = H(p);
  await ctx.addInitScript(() => { try { localStorage.setItem('hplc-fig-opt', JSON.stringify({known: [null, 5, {name: 'Keep me', kda: 10, kind: 'contaminant'}], palette: 'okabe'})); } catch (e) {} });
  await p.reload(); await p.waitForTimeout(1500);
  T.check('settings.no-error-on-start', !errs.length, errs.join(' | ')); // the script gets to the end
  await h.newProject('After damaged settings'); T.check('settings.app-usable', (await h.timeline()).length > 0, 'a new project should open a timeline'); // buttons are wired
  await close(); });
/* ---------------- older and partial project files ---------------- */
await T.t('partial-project', async () => { const {p, errs, close} = await open(), h = H(p); await watchToasts(p);
  await h.newProject('Partial base'); await h.dropFiles(F.his); await h.addConc(F.ndSpec, 0.25);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click(SEL.exportBtn)]);
  const origPath = path.join(ROOT, 'results', 'partial_orig.json'); await dl.saveAs(origPath);
  const origJson = JSON.parse(fs.readFileSync(origPath, 'utf8'));
  for (const sec of ['gels', 'nanodrop', 'traces', 'opt']) {
    const mod = JSON.parse(JSON.stringify(origJson)); delete mod[sec];
    const modPath = path.join(ROOT, 'results', `partial_no_${sec}.json`); fs.writeFileSync(modPath, JSON.stringify(mod));
    const e0 = errs.length; await p.setInputFiles(SEL.importFile, modPath); await p.waitForTimeout(3000); const ts = await takeToasts(p);
    T.check(`partial.${sec}.no-error`, errs.length === e0, errs.slice(e0).join(' | '));
    const tl = await h.timeline(), hasRun = tl.some(x => x.k.startsWith('run:')), hasND = tl.some(x => /mg\/mL/.test(x.s || ''));
    if (sec === 'nanodrop') T.check(`partial.${sec}.remaining-data`, hasRun && !hasND, `run=${hasRun}, nd=${hasND}`);
    else T.check(`partial.${sec}.remaining-data`, hasRun && hasND, `run=${hasRun}, nd=${hasND}`);
    T.check(`partial.${sec}.message`, ts.length > 0, `toasts: ${ts.join(' | ') || 'none'}`);
  }
  await close(); });

/* ---------------- performance budgets ---------------- */
await T.t('perf', async () => { const {p, errs, close} = await open(), h = H(p); await h.newProject('Perf');
  { const n0 = (await h.timeline()).length, t0 = Date.now(); await p.setInputFiles('#file', F.big); let ms = null;
    for (let k = 0; k < 120; k++) { await p.waitForTimeout(100); if ((await h.timeline()).length > n0) { ms = Date.now() - t0; break; } }
    T.check('perf.load-200k-under-6s', ms != null && ms < 6000, ms == null ? 'not loaded in 12 s' : ms + ' ms'); } // a long run must load quickly
  { await p.waitForTimeout(800); const r = (await h.timeline()).find(x => x.k.startsWith('run:')); if (r) await h.step(r.k);
    const ms = await p.evaluate(async () => { const e = document.querySelector('.trace.run.sel [data-k=shade]'); if (!e) return -1; const t = performance.now(); e.value = 'A3-A12'; e.dispatchEvent(new Event('input', {bubbles: true})); await new Promise(r => requestAnimationFrame(() => r())); return Math.round(performance.now() - t); });
    T.check('perf.pool-typing-under-400ms', ms >= 0 && ms < 400, ms + ' ms on the 200k run'); } // typing in the pool box stays responsive
  { for (const f of [F.his, F.ortho, F.q, F.s200, F.zip]) await h.dropFiles(f); await h.addConc(F.nd, 0.3); await h.addConc(null, 0.2); await h.addConc(null, 0.1); const n = purif(await h.timeline()).length;
    const ms = await p.evaluate(async () => { const b = document.querySelector('#tl [data-step="figure"]'); const t = performance.now(); b.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t); });
    T.check('perf.workflow-8-steps-under-1.5s', n >= 8 && ms < 1500, `${n} steps, ${ms} ms`); } // the full figure renders in time
  T.check('perf.no-error', !errs.length, errs.join(' | ')); await close(); });

/* a hand-made or older project file whose trace has only an id, a name and rows still opens, and the trace is drawn on the overlay (#148) */
await T.t('missing-trace-fields', async () => { const {p, errs, close} = await open();
  await p.locator('#homeQuick').evaluate(e => e.click()); await p.waitForTimeout(600); await watchToasts(p); const e0 = errs.length;
  const d = {app: 'HPLC Figure Bench', version: 1, cur: 'overlay', runs: [], traces: [{id: 1, name: 'Trace 1', rows: [[0, 0], [1, 10], [2, 0]]}]};
  await p.setInputFiles(SEL.importFile, {name: 'bare_trace.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))}); await p.waitForTimeout(2000);
  const ts = await takeToasts(p), op = ts.find(t => /^Opened/.test(t)) || '';
  T.check('missing-trace-fields.trace-kept', /1 trace,/.test(op) && !/skipped/i.test(op), `toast: ${op || ts.join(' | ') || 'none'}`); // the trace is not dropped as damaged
  const nPath = await p.$$eval('#paper svg path', ps => ps.filter(e => (e.getAttribute('d') || '').split(/[ML]/).filter(s => s.trim()).length >= 3).length).catch(() => 0);
  T.check('missing-trace-fields.renders-path', nPath > 0, `${nPath} data paths in #paper svg`); // the three points are drawn as a line
  T.check('missing-trace-fields.no-error', errs.length === e0, errs.slice(e0).join(' | '));
  await close(); });

await T.t('legacy-prep-name', async () => { const {p, errs, close} = await open(), h = H(p);
  const fixture = {
    app: 'HPLC Figure Bench',
    version: 1,
    runs: [],
    traces: [],
    gels: [],
    nanodrop: [],
    prep: {
      manual: [],
      name: 'Test Prep'
    }
  };
  await p.locator('#homeQuick').evaluate(e => e.click());
  await p.setInputFiles('#projFile', {name: 'legacy_prep.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
  await p.waitForTimeout(1000);
  /* prep.name is the plasmid name: it shows in the construct step's Plasmid name field (the Methods mention it only with a construct and a sequence) */
  const plasmid = await p.locator('#pr-name').inputValue().catch(() => '');
  T.check('legacy/prep-name', plasmid === 'Test Prep', `Plasmid name field: "${plasmid}"`);
  await close();
});

await T.t('legacy-project', async () => { const {p, errs, close} = await open(), h = H(p);
  await p.locator('#homeQuick').evaluate(e => e.click());
  await p.setInputFiles('#projFile', path.join(__dirname, '..', 'data', 'legacy_project.json'));
  await p.waitForTimeout(3000);

  const tl = await h.timeline();

  const r = tl.find(x => x.k.startsWith('run:'));
  T.check('legacy-project.run-preserved', !!r);
  if (r) {
    await h.step(r.k);
    await p.waitForTimeout(500);
  }

  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
  const exported = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  /* a saved gel keeps its image and its lane names, which the app stores in gel.labels (an older fixture used an invented lanes: [{name}] shape and a gel without an image, which the app rightly skips as damaged) */
  const g = (exported.gels || [])[0];
  T.check('legacy-project.gel-lane-preserved', (exported.gels || []).length === 1, `gels saved: ${(exported.gels || []).length}`);
  T.check('legacy-project.gel-lane-exact', !!g && Array.isArray(g.labels) && g.labels[0] === 'lane1' && g.labels[1] === 'lane2', `labels: ${JSON.stringify(g && g.labels)}`);
  /* prep.name is the construct name. The Methods mention it only when the construct section is on and a sequence is set, so the check reads the saved project */
  T.check('legacy-project.prep-name-preserved', !!exported.prep && typeof exported.prep.name === 'string', JSON.stringify(exported.prep || null).slice(0, 200));
  T.check('legacy-project.prep-name-exact', !!exported.prep && exported.prep.name === 'Legacy Protein', `prep.name: ${exported.prep && exported.prep.name}`);
  T.check('legacy-project.export-run-preserved', exported.runs && exported.runs.length === 1 && exported.runs[0].id === 'r1');

  await close();
});

/* malformed manual step IDs do not disrupt ID allocation (#380) */
await T.t('malformed-id', async () => { const {p, errs, close} = await open(), h = H(p);
  await p.locator('#homeQuick').evaluate(e => e.click());
  await p.waitForTimeout(600);
  const d1 = {app: 'HPLC Figure Bench', version: 1, runs: [], prep: {manual: [{id: 'mabc', kind: 'column', name: 'Bad 1'}, {id: 'm-1', kind: 'other', name: 'Bad 2'}, {id: 'm1.5', kind: 'other', name: 'Bad 3'}]}};
  await p.setInputFiles('#projFile', {name: 'malformed_only.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d1))});
  await p.waitForTimeout(1000);
  await p.click('#tl [data-addmenu]');
  await p.waitForTimeout(300);
  await p.click('#tl [data-addstep="man:column"]');
  await p.waitForTimeout(500);
  const steps1 = await p.$$eval('#tl button[data-step^="man:"]', els => els.map(e => e.getAttribute('data-step')));
  T.check('malformed-id.first-available', steps1.includes('man:m1'), `first available ID: ${steps1.join(', ')}`);
  T.check('malformed-id.no-error', errs.length === 0, errs.join(' | '));

  const d2 = {app: 'HPLC Figure Bench', version: 1, runs: [], prep: {manual: [{id: 'm999', kind: 'column', name: 'Valid 999'}, {id: 'mabc', kind: 'other', name: 'Bad 1'}, {id: 'm1.5', kind: 'other', name: 'Bad 2'}]}};
  await p.setInputFiles('#projFile', {name: 'malformed_pair.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d2))});
  await p.waitForTimeout(1000);
  await p.click('#tl [data-addmenu]');
  await p.waitForTimeout(300);
  await p.click('#tl [data-addstep="man:column"]');
  await p.waitForTimeout(500);
  const steps2 = await p.$$eval('#tl button[data-step^="man:"]', els => els.map(e => e.getAttribute('data-step')));
  T.check('malformed-id.advances-valid', steps2.includes('man:m1000'), `advances valid highest suffix: ${steps2.join(', ')}`);
  await close();
});

/* only prep.manual[].id is scanned for the next manual step ID: "m900" in the prep name, a run name, a step name or a stepMeta key is free text, not an ID (#378) */
await T.t('manual-id-scope', async () => { const {p, errs, close} = await open(), h = H(p);
  await p.locator('#homeQuick').evaluate(e => e.click());
  await p.waitForTimeout(600);
  const d = {app: 'HPLC Figure Bench', version: 1, runs: [], prep: {name: 'm900', trPlasmid: 'm900', manual: [{id: 'm2', kind: 'column', name: 'm900'}], stepMeta: {'man:m900': {}}, titles: {m900: 'm900'}}};
  await p.setInputFiles('#projFile', {name: 'manual_id_scope.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(d))});
  await p.waitForTimeout(1000);
  await p.click('#tl [data-addmenu]');
  await p.waitForTimeout(300);
  await p.click('#tl [data-addstep="man:column"]');
  await p.waitForTimeout(500);
  const steps = await p.$$eval('#tl button[data-step^="man:"]', els => els.map(e => e.getAttribute('data-step')));
  T.check('manual-id-scope.next-after-manual', steps.includes('man:m3') && !steps.includes('man:m901'), `manual step IDs: ${steps.join(', ')}`);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
  const ex = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  T.check('manual-id-scope.prep-name-kept', !!ex.prep && ex.prep.name === 'm900', `prep.name: ${ex.prep && ex.prep.name}`);
  T.check('manual-id-scope.no-error', errs.length === 0, errs.join(' | '));
  await close();
});

T.done(); })();
