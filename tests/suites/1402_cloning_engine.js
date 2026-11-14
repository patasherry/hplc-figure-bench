// #1402: the cloning workflow engine. A new project has an Include Cloning switch (#1433), a cloning project picks a
// workflow whose stages appear in the step list, each stage keeps every attempt (a failed one included), rules flag
// a record and never fill it in, and the whole record survives an export and import. Older projects open unchanged.
// Everything is driven through the UI. All values are synthetic.
const {open, H, suite, fs, path, DATA} = require('../lib/harness');

(async () => {
  const T = suite('1402_cloning_engine');
  const cl = p => p.locator('#clonePanel');
  // every stage, unfolded first (#1436 folds a long Cloning group in the step list)
  const rows = async h => { await h.allSteps(); return (await h.timeline()).filter(x => /^clone:/.test(x.k)); };
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
      // #1433 replaced the Yes and No answers with one Include Cloning switch, off by default (Patrick on #222, 2026-11-13).
      // The two checks that required an answer (entry/no-preselection, entry/choice-required) went with them, on his request.
      T.check('entry/switch-off-by-default', await p.locator('#npCloning').getAttribute('aria-checked') === 'false', await p.locator('#npCloning').getAttribute('aria-checked'));

      await h.newProject('Expression only', 'expression');
      T.check('entry/expression-has-no-cloning-rows', (await rows(h)).length === 0, JSON.stringify(await rows(h)));
      T.check('entry/expression-header', await p.locator('#projType').getAttribute('aria-checked') === 'false', await p.locator('#projType').getAttribute('aria-checked'));
      await h.step('transform');
      T.check('entry/expression-says-cloning-outside', /outside this workflow/.test(await cl(p).innerText()), await cl(p).innerText());
      // a construct is not recorded as sequence verified without saying how
      await cl(p).locator('[data-cext=ver]').selectOption('yes'); await h.wait(300);
      T.check('entry/verified-needs-evidence', await cl(p).locator('.cl-flag').count() === 1, 'no flag for a verified construct with no evidence');
      await cl(p).locator('[data-cext=note]').fill('Whole-plasmid sequencing, synthetic record'); await cl(p).locator('[data-cext=note]').dispatchEvent('change'); await h.wait(300);
      T.check('entry/verified-with-evidence', await cl(p).locator('.cl-flag').count() === 0, 'the flag stayed after the evidence was entered');
      // cloning can be added later, and nothing is lost
      await p.locator('#projType').click(); await h.wait(500);
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
      const svg = await h.exportSvg(), bx = await h.svgBoxes(svg);
      T.check('ath/tracker-stage-titles', ATH.every(t => bx.texts.some(x => x.t === t)), 'missing stage title in SVG: ' + ATH.filter(t => !bx.texts.some(x => x.t === t)).join(', '));
      T.check('ath/tracker-not-clipped', bx.clipped.length === 0, bx.clipped.join(' | '));
      T.check('ath/failed-not-completed', bx.texts.some(x => x.t === 'Failed') && !bx.texts.some(x => x.t === 'Completed'), 'failed attempt stage drawn as completed');
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
      await field(p, 'Plasmid used').fill('pET28-ATH-syn'); await field(p, 'Plasmid used').dispatchEvent('change'); await h.wait(200);
      await field(p, 'Clone ID').fill('Clone 4'); await field(p, 'Clone ID').dispatchEvent('change'); await h.wait(200);

      // transformation step and methods text reflect the cloning transfer attempt and bypass
      await h.step('transform');
      const trLine = await cl(p).innerText();
      T.check('ath/transform-names-plasmid', trLine.includes('pET28-ATH-syn'), trLine);
      T.check('ath/transform-bypassed-says-unverified', /verification was not recorded/.test(trLine), trLine);
      await h.step('figure'); await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(300);
      const mText = await h.methods();
      T.check('ath/methods-names-plasmid', mText.includes('pET28-ATH-syn'), mText);
      T.check('ath/methods-bypassed-says-unverified', /verification was not recorded/.test(mText), mText);

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
      // a project saved before #1402 holds no cloning record, so Include Cloning opens off (#1433)
      if (inProj) T.check('legacy/cloning-off', await p.locator('#projType').getAttribute('aria-checked') === 'false', await p.locator('#projType').getAttribute('aria-checked'));
      T.check('legacy/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('stage-rename-dup', async () => {
    let exported = '';
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('Stage dup synthetic', 'cloning');
      await cl(p).locator('[data-cl=tpl][data-v=ath]').click(); await h.wait(400);
      await go(h, 'Q5 PCR setup');

      // two attempts so duplication proves it carries the last attempt's fields
      await field(p, 'Polymerase or master mix').fill('Old synthetic mix'); await field(p, 'Polymerase or master mix').dispatchEvent('change'); await h.wait(200);
      await setStatus(p, h, 0, 'fail');
      await cl(p).locator('[data-cl=addat]').click(); await h.wait(300);
      await field(p, 'Polymerase or master mix').fill('Q5 synthetic mix'); await field(p, 'Polymerase or master mix').dispatchEvent('change'); await h.wait(200);
      await field(p, 'Reaction volume').fill('25'); await field(p, 'Reaction volume').dispatchEvent('change'); await h.wait(200);
      await field(p, 'Date').fill('2026-11-12'); await field(p, 'Date').dispatchEvent('change'); await h.wait(200);
      await field(p, 'Deviations').fill('Synthetic deviation'); await field(p, 'Deviations').dispatchEvent('change'); await h.wait(200);
      await field(p, 'Result and notes').fill('Synthetic note'); await field(p, 'Result and notes').dispatchEvent('change'); await h.wait(200);
      await setStatus(p, h, 1, 'done');

      const nameBox = cl(p).locator('label.f', {hasText: 'Stage name'}).locator('input');
      const dupBtn = cl(p).locator('button', {hasText: 'Duplicate this stage'});
      T.check('dupst/rename-field-present', await nameBox.isVisible(), 'no stage rename field');
      T.check('dupst/button-present', await dupBtn.isVisible(), 'no Duplicate this stage button');
      if (await nameBox.isVisible() && await dupBtn.isVisible()) {
        await nameBox.fill('Q5 PCR, insert 1'); await h.wait(250);
        T.check('dupst/renamed', !!(await row(h, 'Q5 PCR, insert 1')) && !(await row(h, 'Q5 PCR setup')) && /Q5 PCR, insert 1/.test(await cl(p).locator('h2').innerText()), JSON.stringify(await rows(h)));
        await nameBox.fill(''); await h.wait(250);
        T.check('dupst/empty-uses-default', !!(await row(h, 'Q5 PCR setup')) && /Q5 PCR setup/.test(await cl(p).locator('h2').innerText()), await cl(p).locator('h2').innerText());
        await nameBox.fill('Q5 PCR, insert 1'); await h.wait(250);

        await dupBtn.click(); await h.wait(400);
        const list = (await rows(h)).slice(1).map(x => x.t), idx = list.indexOf('Q5 PCR, insert 1');
        T.check('dupst/inserted-after', idx >= 0 && list[idx + 1] === 'Q5 PCR setup', list.join(' | '));
        T.check('dupst/one-not-started-attempt', await cl(p).locator('.cl-at').count() === 1 && await cl(p).locator('[data-cst]').first().inputValue() === 'todo', await cl(p).innerText());
        T.check('dupst/carries-last-fields', await field(p, 'Polymerase or master mix').inputValue() === 'Q5 synthetic mix' && await field(p, 'Reaction volume').inputValue() === '25', await field(p, 'Polymerase or master mix').inputValue());
        T.check('dupst/drops-date-notes-dev', await field(p, 'Date').inputValue() === '' && await field(p, 'Deviations').inputValue() === '' && await field(p, 'Result and notes').inputValue() === '', 'date, deviations or notes were copied');

        await nameBox.fill('Q5 PCR, insert 2'); await h.wait(250);
        exported = await exportJson(p);
      }
      T.check('dupst/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }

    if (exported) {
      const {p: p2, errs: errs2, close: close2} = await open(), h2 = H(p2);
      try {
        p2.setDefaultTimeout(15000);
        await p2.setInputFiles('#projFile', {name: 'stage_dup_synthetic.json', mimeType: 'application/json', buffer: Buffer.from(exported)}); await h2.wait(1500);
        const list = (await rows(h2)).slice(1).map(x => x.t), idx = list.indexOf('Q5 PCR, insert 1');
        T.check('dupst/reload-both-names', idx >= 0 && list[idx + 1] === 'Q5 PCR, insert 2', list.join(' | '));
        await go(h2, 'Q5 PCR, insert 1');
        T.check('dupst/reload-orig-name-box', await cl(p2).locator('label.f', {hasText: 'Stage name'}).locator('input').inputValue() === 'Q5 PCR, insert 1', 'original stage name lost');
        await go(h2, 'Q5 PCR, insert 2');
        T.check('dupst/reload-dup-name-box', await cl(p2).locator('label.f', {hasText: 'Stage name'}).locator('input').inputValue() === 'Q5 PCR, insert 2', 'duplicated stage name lost');
        T.check('dupst/reload-copied-field', await field(p2, 'Polymerase or master mix').inputValue() === 'Q5 synthetic mix' && await field(p2, 'Reaction volume').inputValue() === '25', await field(p2, 'Polymerase or master mix').inputValue());
        T.check('dupst/reload-not-started', await cl(p2).locator('[data-cst]').first().inputValue() === 'todo' && await field(p2, 'Date').inputValue() === '' && await field(p2, 'Deviations').inputValue() === '' && await field(p2, 'Result and notes').inputValue() === '', 'status/date/notes/dev changed after reload');
        T.check('dupst/reload no page errors', errs2.length === 0, errs2.join(' | '));
      } finally { await close2(); }
    }
  });

  await T.t('cloning-methods-and-transform', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      // Expression project: plasmid source record
      await h.newProject('Expr Source Synthetic', 'expression');
      await h.step('transform');
      await cl(p).locator('[data-cext=src]').fill('Addgene #12345'); await cl(p).locator('[data-cext=src]').dispatchEvent('change'); await h.wait(200);
      await cl(p).locator('[data-cext=ver]').selectOption('yes'); await h.wait(200);
      await h.step('figure'); await p.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h.wait(300);
      let m = await h.methods();
      T.check('expr-source/unverified-without-note', m.includes('Addgene #12345') && !m.includes('sequence verified'), m);
      await h.step('transform');
      await cl(p).locator('[data-cext=note]').fill('Whole-plasmid sequencing'); await cl(p).locator('[data-cext=note]').dispatchEvent('change'); await h.wait(200);
      await h.step('figure'); await h.wait(300);
      m = await h.methods();
      T.check('expr-source/verified-with-note', m.includes('Addgene #12345') && m.includes('sequence verified') && m.includes('Whole-plasmid sequencing'), m);
      T.check('expr-source/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }

    const {p: p2, errs: errs2, close: close2} = await open(), h2 = H(p2);
    try {
      p2.setDefaultTimeout(15000);
      // Cloning ATH project: fully verified
      await h2.newProject('ATH Verified Synthetic', 'cloning');
      await cl(p2).locator('[data-cl=tpl][data-v=ath]').click(); await h2.wait(400);
      await go(h2, 'Construct and mutation design');
      await field(p2, 'Parent plasmid').fill('pET28-SUMO'); await field(p2, 'Parent plasmid').dispatchEvent('change'); await h2.wait(200);
      await field(p2, 'Mutation type').selectOption('Substitution'); await h2.wait(200);
      await field(p2, 'Mutation position').fill('K12A'); await field(p2, 'Mutation position').dispatchEvent('change'); await h2.wait(200);
      await setStatus(p2, h2, 0, 'done');

      await go(h2, 'Q5 PCR setup');
      await field(p2, 'Polymerase or master mix').fill('Q5 High-Fidelity DNA Polymerase'); await field(p2, 'Polymerase or master mix').dispatchEvent('change'); await h2.wait(200);
      await setStatus(p2, h2, 0, 'done');

      await go(h2, 'KLD treatment');
      await setStatus(p2, h2, 0, 'done');

      await go(h2, 'Chemical transformation');
      await field(p2, 'Host strain').fill('NEB 5-alpha'); await field(p2, 'Host strain').dispatchEvent('change'); await h2.wait(200);
      await setStatus(p2, h2, 0, 'done');

      await go(h2, 'Sequencing and alignment');
      await field(p2, 'Sequencing provider').fill('Plasmidsaurus'); await field(p2, 'Sequencing provider').dispatchEvent('change'); await h2.wait(200);
      await setStatus(p2, h2, 0, 'done');

      await go(h2, 'Selection of a sequence-verified clone');
      await cl(p2).locator('[data-cfrom]').first().selectOption({index: 1}); await h2.wait(200);
      await field(p2, 'Verification status').selectOption('Sequence verified'); await h2.wait(200);
      await setStatus(p2, h2, 0, 'done');

      await go(h2, 'Transfer to expression');
      await field(p2, 'Plasmid used').fill('pET28-SUMO-K12A'); await field(p2, 'Plasmid used').dispatchEvent('change'); await h2.wait(200);
      await field(p2, 'Clone ID').fill('Clone 1'); await field(p2, 'Clone ID').dispatchEvent('change'); await h2.wait(200);
      await setStatus(p2, h2, 0, 'done');

      await h2.step('transform');
      const trText = await cl(p2).innerText();
      T.check('verified/transform-names-plasmid', trText.includes('pET28-SUMO-K12A'), trText);
      T.check('verified/transform-names-clone', trText.includes('Clone 1'), trText);
      T.check('verified/transform-shows-verified', /sequence-verified clone recorded/.test(trText), trText);

      await h2.step('figure'); await p2.evaluate(() => { const b = document.getElementById('methodsBox'); if (b) b.open = true; }); await h2.wait(300);
      const mVerified = await h2.methods();
      T.check('verified/methods-names-plasmid', mVerified.includes('pET28-SUMO-K12A'), mVerified);
      T.check('verified/methods-names-workflow', mVerified.includes('Around-the-Horn mutagenesis'), mVerified);
      T.check('verified/methods-names-polymerase', mVerified.includes('Q5 High-Fidelity DNA Polymerase'), mVerified);
      T.check('verified/methods-names-kld', /KLD treatment/.test(mVerified), mVerified);
      T.check('verified/methods-names-host', mVerified.includes('NEB 5-alpha'), mVerified);
      T.check('verified/methods-names-sequencing', mVerified.includes('Plasmidsaurus') && /confirmed the sequence/.test(mVerified), mVerified);

      T.check('methods-transform/no page errors', errs2.length === 0, errs2.join(' | '));
    } finally { await close2(); }
  });

  await T.t('picker', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('Picker synthetic', 'cloning');
      T.check('picker/buttons-before-choice', await p.locator('#clonePanel [data-cl=tpl]').count() > 0, 'no template buttons before choice');
      await cl(p).locator('[data-cl=tpl][data-v=ath]').click(); await h.wait(400);

      // no template buttons on a stage panel
      await go(h, 'Construct and mutation design');
      T.check('picker/no-buttons-on-stage', await p.locator('#clonePanel [data-cl=tpl]').count() === 0, 'template buttons found on stage panel');

      // finds "Change workflow" on the workflow step
      await h.step('clone:setup');
      T.check('picker/no-buttons-after-choice', await p.locator('#clonePanel [data-cl=tpl]').count() === 0, 'template buttons still visible on workflow step');
      const chg = p.locator('#clonePanel [data-cl=chgwf]');
      T.check('picker/change-workflow-link', await chg.count() > 0 && /Change workflow/.test(await chg.innerText()), 'Change workflow link not found');
      T.check('picker/shows-workflow-name', (await p.locator('#clonePanel').innerText()).includes('Around-the-Horn mutagenesis'), 'chosen workflow name not found in panel');

      // buttons return after clicking it
      if (await chg.count() > 0) {
        await chg.click(); await h.wait(300);
        T.check('picker/buttons-return', await p.locator('#clonePanel [data-cl=tpl]').count() > 0, 'template buttons did not return after clicking Change workflow');
      } else {
        T.check('picker/buttons-return', false, 'Change workflow link not present to click');
      }
      T.check('picker/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  T.done();
})();
