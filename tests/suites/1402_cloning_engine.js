// #1402: the cloning workflow engine. A new project asks whether it includes cloning, a cloning project picks a
// workflow whose stages appear in the step list, each stage keeps every attempt (a failed one included), rules flag
// a record and never fill it in, and the whole record survives an export and import. Older projects open unchanged.
// Everything is driven through the UI. All values are synthetic.
const {open, H, suite, fs, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('1402_cloning_engine');
  const cl = p => p.locator('#clonePanel');
  const rows = async h => (await h.timeline()).filter(x => /^clone:/.test(x.k));
  const row = async (h, title) => (await rows(h)).find(x => x.t === title);
  const go = async (h, title) => { const r = await row(h, title); if (!r) throw new Error(`no stage "${title}" in the step list`); await h.step(r.k); return r.k; };
  const field = (p, label) => cl(p).locator('details[open] label.f', {hasText: label}).locator('input, textarea, select').first();
  const setStatus = async (p, h, n, v) => { await cl(p).locator('[data-cst]').nth(n).selectOption(v); await h.wait(300); };
  const exportJson = async p => { const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#projSave')]); return fs.readFileSync(await dl.path(), 'utf8'); };
  const ATH = ['Construct and mutation design', 'Forward and reverse primer design', 'Primer ordering, resuspension and working stocks', 'Q5 PCR setup', 'Thermocycler program', 'Agarose-gel verification',
    'Selection of successful PCR product', 'KLD treatment', 'Chemical transformation', 'Colony selection', 'Overnight culture', 'Miniprep', 'Sequencing and alignment', 'Selection of a sequence-verified clone', 'Transfer to expression'];

  await T.t('entry', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      // neither answer is preselected, and the project cannot start without one
      T.check('entry/no-preselection', await p.locator('#newProj input[name=npType]:checked').count() === 0, 'an answer was preselected');
      await p.fill('#npName', 'No answer yet'); await p.click('#newProj button[type=submit]'); await h.wait(600);
      T.check('entry/choice-required', await p.locator('#npName').isVisible() && !(await p.locator('#tl').isVisible()), 'a project started without the cloning question being answered');

      await h.newProject('Expression only', 'expression');
      T.check('entry/expression-has-no-cloning-rows', (await rows(h)).length === 0, JSON.stringify(await rows(h)));
      T.check('entry/expression-header', await p.locator('#projType').inputValue() === 'expression', await p.locator('#projType').inputValue());
      await h.step('transform');
      T.check('entry/expression-says-cloning-outside', /outside this workflow/.test(await cl(p).innerText()), await cl(p).innerText());
      // a construct is not recorded as sequence verified without saying how
      await cl(p).locator('[data-cext=ver]').selectOption('yes'); await h.wait(300);
      T.check('entry/verified-needs-evidence', await cl(p).locator('.cl-flag').count() === 1, 'no flag for a verified construct with no evidence');
      await cl(p).locator('[data-cext=note]').fill('Whole-plasmid sequencing, synthetic record'); await cl(p).locator('[data-cext=note]').dispatchEvent('change'); await h.wait(300);
      T.check('entry/verified-with-evidence', await cl(p).locator('.cl-flag').count() === 0, 'the flag stayed after the evidence was entered');
      // cloning can be added later, and nothing is lost
      await p.locator('#projType').selectOption('cloning'); await h.wait(500);
      T.check('entry/cloning-added-later', (await rows(h)).some(x => x.k === 'clone:setup'), JSON.stringify(await rows(h)));
      T.check('entry/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  let saved = '';
  await T.t('ath', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('ATH synthetic', 'cloning');
      T.check('ath/opens-on-cloning', (await rows(h)).length === 1 && /Choose a cloning workflow/.test((await rows(h))[0].s), JSON.stringify(await rows(h)));
      await cl(p).locator('[data-cl=tpl][data-v=ath]').click(); await h.wait(500);
      const got = (await rows(h)).slice(1).map(x => x.t);
      T.check('ath/stages-in-order', JSON.stringify(got) === JSON.stringify(ATH), got.join(' | '));
      T.check('ath/upstream-steps-kept', ['construct', 'transform', 'expr', 'lysis'].every(k => true) && (await h.timeline()).filter(x => ['construct', 'transform', 'expr', 'lysis'].includes(x.k)).length === 4, 'an existing step is missing');

      // a failed PCR stays in the record when the step is repeated
      await go(h, 'Q5 PCR setup');
      await field(p, 'Polymerase or master mix').fill('Q5 synthetic mix'); await field(p, 'Polymerase or master mix').dispatchEvent('change'); await h.wait(250);
      await setStatus(p, h, 0, 'fail');
      T.check('ath/failed-not-done', !(await row(h, 'Q5 PCR setup')).done, 'a failed attempt marked the stage done');
      await cl(p).locator('[data-cl=addat]').click(); await h.wait(300);
      T.check('ath/repeat-keeps-failure', await cl(p).locator('.cl-at').count() === 2 && /Failed/.test(await cl(p).locator('.cl-at').first().locator('summary').innerText()), await cl(p).innerText());
      await setStatus(p, h, 1, 'done');
      const pcr = await row(h, 'Q5 PCR setup');
      T.check('ath/attempt-summary', /2 attempts: 1 completed, 1 failed/.test(pcr.s) && pcr.done, pcr.s);

      // a selected product must come from a gel record and name its lane
      await go(h, 'Agarose-gel verification'); await setStatus(p, h, 0, 'done');
      await go(h, 'Selection of successful PCR product'); await setStatus(p, h, 0, 'done');
      let pick = await row(h, 'Selection of successful PCR product');
      T.check('ath/pick-flagged-without-gel', pick.warn && !pick.done && /gel record/.test(pick.s), pick.s);
      await cl(p).locator('[data-cfrom]').first().selectOption({index: 1}); await h.wait(300);
      pick = await row(h, 'Selection of successful PCR product');
      T.check('ath/pick-flagged-without-lane', pick.warn && /lane/.test(pick.s), pick.s);
      await field(p, 'Gel lane of the selected product').fill('Lane 3'); await field(p, 'Gel lane of the selected product').dispatchEvent('change'); await h.wait(300);
      pick = await row(h, 'Selection of successful PCR product');
      T.check('ath/pick-linked', pick.done && !pick.warn, pick.s);

      // a clone is not sequence verified without a completed sequencing record
      await go(h, 'Selection of a sequence-verified clone'); await setStatus(p, h, 0, 'done');
      const sel = await row(h, 'Selection of a sequence-verified clone');
      T.check('ath/verified-needs-sequencing', sel.warn && !sel.done, sel.s);
      // and moving on without one has to be said out loud
      await go(h, 'Transfer to expression'); await setStatus(p, h, 0, 'done');
      T.check('ath/transfer-flagged', (await row(h, 'Transfer to expression')).warn, (await row(h, 'Transfer to expression')).s);
      await cl(p).locator('[data-cf=bypass]').check(); await h.wait(300);
      T.check('ath/bypass-recorded', !(await row(h, 'Transfer to expression')).warn, (await row(h, 'Transfer to expression')).s);

      // a stage can be skipped, and the miniprep carries its checklist and its recipe note
      await go(h, 'Overnight culture'); await cl(p).locator('[data-cl=skip]').click(); await h.wait(300);
      T.check('ath/skip', /Skipped/.test((await row(h, 'Overnight culture')).s), (await row(h, 'Overnight culture')).s);
      await go(h, 'Miniprep');
      T.check('ath/miniprep-checklist', await cl(p).locator('[data-cck]').count() === 11, String(await cl(p).locator('[data-cck]').count()));
      T.check('ath/n3-requires-review', /N3:.*Requires review/.test(await cl(p).innerText()), 'the N3 recipe is not marked Requires review');

      // the lineage names the failure as a failure and claims no verified clone
      await h.step('clone:setup');
      const lin = await p.locator('#clLineage').innerText();
      T.check('ath/lineage-keeps-failure', /Q5 PCR setup, attempt 1: failed/.test(lin) && /Q5 PCR setup, attempt 2: completed/.test(lin), lin);
      T.check('ath/lineage-not-verified', /No sequence-verified clone is recorded yet/.test(lin), lin);

      saved = await exportJson(p);
      const d = JSON.parse(saved), c = d.prep && d.prep.cloning;
      T.check('ath/export-carries-record', !!c && c.type === 'cloning' && c.tpl === 'ath' && c.stages.length === 15 && c.stages.find(s => s.kind === 'pcr_setup').at.length === 2, JSON.stringify(c).slice(0, 300));
      T.check('ath/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('reload', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      if (!saved) throw new Error('nothing was exported by the ath test');
      await p.setInputFiles('#projFile', {name: 'ath_synthetic.json', mimeType: 'application/json', buffer: Buffer.from(saved)}); await h.wait(1500);
      const got = (await rows(h)).slice(1).map(x => x.t);
      T.check('reload/stages', JSON.stringify(got) === JSON.stringify(ATH), got.join(' | '));
      const pcr = await row(h, 'Q5 PCR setup');
      T.check('reload/attempts', !!pcr && /2 attempts: 1 completed, 1 failed/.test(pcr.s), pcr && pcr.s);
      await go(h, 'Q5 PCR setup');
      await cl(p).locator('.cl-at').first().locator('summary').click(); await h.wait(200);
      T.check('reload/field-value', await cl(p).locator('.cl-at').first().locator('[data-cf=pol]').inputValue() === 'Q5 synthetic mix', 'the typed value did not come back');
      T.check('reload/skip-kept', /Skipped/.test((await row(h, 'Overnight culture')).s), (await row(h, 'Overnight culture')).s);
      T.check('reload/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('other-workflows', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('HiFi synthetic', 'cloning');
      await cl(p).locator('[data-cl=tpl][data-v=hifi]').click(); await h.wait(500);
      const hf = (await rows(h)).slice(1).map(x => x.t);
      T.check('hifi/stages', hf.length === 17 && hf[0] === 'gBlock and final-construct design' && hf.includes('Gradient PCR') && hf.includes('HiFi assembly') && hf.includes('Glycerol-stock creation') && hf.includes('Whole-plasmid sequencing') && hf.includes('Miniprep'), hf.join(' | '));
      // the HiFi reaction must name its input DNA
      await go(h, 'HiFi assembly'); await setStatus(p, h, 0, 'done');
      T.check('hifi/needs-input', /input DNA/.test((await row(h, 'HiFi assembly')).s), (await row(h, 'HiFi assembly')).s);

      // competent cells: a batch is not Qualified without a test, and a transformation can name the batch
      await h.step('clone:setup');
      await cl(p).locator('[data-cadd]').selectOption('cc:all'); await h.wait(500);
      const cc = (await rows(h)).map(x => x.t).filter(t => /^Competent/.test(t));
      T.check('cc/stages', cc.length === 6, cc.join(' | '));
      await go(h, 'Competent-cell batch');
      await field(p, 'Batch ID').fill('CC-SYN-01'); await field(p, 'Batch ID').dispatchEvent('change'); await h.wait(250);
      await field(p, 'Batch state').selectOption('Qualified'); await h.wait(300);
      T.check('cc/qualified-needs-test', /competency/.test((await row(h, 'Competent-cell batch')).s), (await row(h, 'Competent-cell batch')).s);
      await field(p, 'Competency-test result').fill('1e7 cfu per µg pUC19, synthetic'); await field(p, 'Competency-test result').dispatchEvent('change'); await h.wait(300);
      T.check('cc/qualified-with-test', !/competency/.test((await row(h, 'Competent-cell batch')).s), (await row(h, 'Competent-cell batch')).s);
      await go(h, 'Competent cells: growth and harvest');
      await field(p, 'OD600 at harvest').fill('0.9'); await field(p, 'OD600 at harvest').dispatchEvent('change'); await h.wait(300);
      T.check('cc/od-range-flagged', /outside 0\.4 to 0\.6/.test((await row(h, 'Competent cells: growth and harvest')).s), (await row(h, 'Competent cells: growth and harvest')).s);
      await go(h, 'Chemical transformation');
      T.check('cc/batch-offered-to-transformation', await cl(p).locator('#clBatches option[value="CC-SYN-01"]').count() === 1, 'the batch made in this project is not offered as the cell source');
      await setStatus(p, h, 0, 'done');
      T.check('cc/transformation-needs-batch', /competent-cell batch/.test(await cl(p).innerText()), 'a completed transformation with no batch was not flagged');
      T.check('other/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('legacy', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await p.setInputFiles('#projFile', {name: 'legacy_project.json', mimeType: 'application/json', buffer: fs.readFileSync(path.join(DATA, 'legacy_project.json'))}); await h.wait(1500);
      const tl = await h.timeline();
      T.check('legacy/opens', tl.length > 3 && tl.some(x => x.k === 'construct'), JSON.stringify(tl.map(x => x.k)));
      T.check('legacy/no-cloning-rows', !tl.some(x => /^clone:/.test(x.k)), JSON.stringify(tl.map(x => x.k)));
      const inProj = await p.locator('#projType').isVisible();
      if (inProj) T.check('legacy/type-not-specified', await p.locator('#projType').inputValue() === '' && /not specified/.test(await p.locator('#projType option:checked').innerText()), await p.locator('#projType').inputValue());
      T.check('legacy/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  T.done();
})();
