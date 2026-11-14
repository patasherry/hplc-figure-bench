// #1439: the cloning steps join the rest of the project instead of running beside it. A sequence-verified clone fills the
// Transformation plasmid (and the Construct's plasmid name) unless something else was typed there, Transfer to expression is
// recorded at the Transformation step rather than in a row of its own, and the cloning-strain transformation is named
// "Cloning transformation". Older projects keep every value. Driven through the UI only. All values are synthetic.
const {open, H, suite, fs} = require('../lib/harness');

(async () => {
  const T = suite('1439_clone_join');
  const cl = p => p.locator('#clonePanel');
  const field = (p, label) => cl(p).locator('details[open] label.f', {hasText: label}).locator('input, textarea, select').first();
  const rows = async h => { await h.allSteps(); return (await h.timeline()).filter(x => /^clone:/.test(x.k)); };
  const go = async (h, title) => { const r = (await rows(h)).find(x => x.t === title); if (!r) throw new Error(`no stage "${title}"`); await h.step(r.k); };
  const exportJson = async p => { const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#projSave')]); return JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); };

  await T.t('join', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('Join synthetic', 'cloning');
      await cl(p).locator('[data-cl=tpl][data-v=ath]').click(); await h.wait(600);
      const t = (await rows(h)).map(x => x.t);
      T.check('join/no-transfer-row', !t.includes('Transfer to expression'), t.join(' | '));
      T.check('join/cloning-transformation-named', t.includes('Cloning transformation') && !t.includes('Chemical transformation'), t.join(' | '));
      // a verified clone fills the Transformation plasmid and the Construct's plasmid name
      await go(h, 'Selection of a sequence-verified clone');
      await field(p, 'Plasmid name').fill('pSYN-7'); await field(p, 'Plasmid name').dispatchEvent('change'); await h.wait(200);
      await field(p, 'Verification status').selectOption('Sequence verified'); await h.wait(200);
      await cl(p).locator('[data-cst]').first().selectOption('done'); await h.wait(400);
      await h.step('transform');
      T.check('join/verified-clone-fills-transformation', await p.locator('#pr-trPlasmid').inputValue() === 'pSYN-7', await p.locator('#pr-trPlasmid').inputValue());
      await h.step('construct');
      T.check('join/verified-clone-fills-construct', await p.locator('#pr-name').inputValue() === 'pSYN-7', await p.locator('#pr-name').inputValue());
      // the transfer is recorded at Transformation, without a second plasmid field
      await h.step('transform');
      T.check('join/transfer-at-transformation', /Transfer to expression/.test(await cl(p).innerText()) && await cl(p).locator('[data-cst]').count() === 1, await cl(p).innerText());
      T.check('join/no-second-plasmid-field', await cl(p).locator('[data-cf=plasmid], [data-cf=host], [data-cf=marker]').count() === 0, 'the transfer record still asks for its own plasmid, host or marker');
      // something typed at Transformation is never replaced by a later verified clone
      await p.locator('#pr-trPlasmid').fill('pMINE-1'); await p.locator('#pr-trPlasmid').dispatchEvent('change'); await h.wait(250);
      await go(h, 'Selection of a sequence-verified clone');
      await field(p, 'Plasmid name').fill('pSYN-8'); await field(p, 'Plasmid name').dispatchEvent('change'); await h.wait(400);
      await h.step('transform');
      T.check('join/typed-value-kept', await p.locator('#pr-trPlasmid').inputValue() === 'pMINE-1', await p.locator('#pr-trPlasmid').inputValue());
      T.check('join/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('older-projects', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      const proj = (trPlasmid) => ({app: 'HPLC Figure Bench', version: 1, name: 'older synthetic', runs: [], traces: [], gels: [],
        prep: {on: true, name: '', trPlasmid, strain: '', trSel: '', cloning: {type: 'cloning', tpl: '', ext: {src: '', ver: '', note: ''},
          stages: [{id: 's1', kind: 'transfer', name: '', skip: false, at: [{id: 'a1', st: 'done', from: '', ck: {}, f: {plasmid: 'pOLD-1', host: 'BL21(DE3)', marker: 'kanamycin', clone: 'C3', bypass: true}}]}]}}});
      const load = async (name, data) => { await p.click('#homeBtn').catch(() => {}); await h.wait(400); await p.click('#homeQuick'); await h.wait(900);
        await p.setInputFiles('#projFile', {name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data))}); await h.wait(1800); };
      // the old transfer values fill empty Transformation fields
      await load('older_empty.json', proj(''));
      await h.step('transform');
      T.check('older/plasmid-moved', await p.locator('#pr-trPlasmid').inputValue() === 'pOLD-1', await p.locator('#pr-trPlasmid').inputValue());
      T.check('older/strain-moved', await p.locator('#pr-strain2').inputValue() === 'BL21(DE3)', await p.locator('#pr-strain2').inputValue());
      T.check('older/no-transfer-row', !(await rows(h)).some(x => x.t === 'Transfer to expression'), JSON.stringify(await rows(h)));
      let j = await exportJson(p);
      const at = j.prep.cloning.stages.find(s => s.kind === 'transfer').at[0];
      T.check('older/record-kept', at.f.clone === 'C3' && at.f.bypass === true && at.st === 'done', JSON.stringify(at));
      // a value that differs from what Transformation already holds is kept in the attempt's notes
      await load('older_differs.json', proj('pOTHER-2'));
      await h.step('transform');
      T.check('older/typed-plasmid-wins', await p.locator('#pr-trPlasmid').inputValue() === 'pOTHER-2', await p.locator('#pr-trPlasmid').inputValue());
      j = await exportJson(p);
      const n = j.prep.cloning.stages.find(s => s.kind === 'transfer').at[0].f._n || '';
      T.check('older/old-plasmid-in-notes', /pOLD-1/.test(n), n);
      T.check('older/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  T.done();
})();
