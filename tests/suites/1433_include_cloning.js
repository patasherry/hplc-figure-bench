// #1433, #1434: one Include Cloning switch replaces the Yes and No answers at project start (Patrick on #222, 2026-11-13).
// It is off for a new project, it shows or hides the cloning steps and their validation, switching it off keeps every
// cloning record, it is saved as the Boolean project property includeCloning, and a project saved before it existed
// opens on when it holds cloning records and off when it does not. Everything is driven through the UI. All values are synthetic.
const {open, H, suite, fs} = require('../lib/harness');

(async () => {
  const T = suite('1433_include_cloning');
  const sw = p => p.locator('#npCloning'), head = p => p.locator('#projType');
  const on = async l => await l.getAttribute('aria-checked') === 'true';
  // every stage, unfolded first (#1436 folds a long Cloning group in the step list)
  const cloneRows = async h => { await h.allSteps(); return (await h.timeline()).filter(x => /^clone:/.test(x.k)); };
  const exportJson = async p => { const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#projSave')]); return JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); };
  const setPrep = async (p, h, sel, val) => { await p.locator(sel).fill(val); await p.locator(sel).dispatchEvent('change'); await h.wait(300); };
  const importJson = async (p, h, name, data) => {
    await p.click('#homeBtn').catch(() => {}); await h.wait(400); await p.click('#homeQuick'); await h.wait(900);
    await p.setInputFiles('#projFile', {name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data))}); await h.wait(1800); };
  const legacy = (cloning, extra) => Object.assign({app: 'HPLC Figure Bench', version: 1, name: 'legacy synthetic', runs: [], traces: [], gels: [],
    prep: Object.assign({on: true, name: 'pSYN-1'}, cloning === undefined ? {} : {cloning})}, extra || {});

  await T.t('switch', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      T.check('switch/one-control', await sw(p).count() === 1 && await p.locator('#newProj input[type=radio]').count() === 0, 'the Yes and No answers are still there');
      T.check('switch/labelled', (await sw(p).innerText()).trim() === 'Include Cloning' && await sw(p).getAttribute('role') === 'switch', await sw(p).innerText());
      T.check('switch/off-by-default', !(await on(sw(p))), 'on before anyone touched it');
      await sw(p).click(); await h.wait(150);
      T.check('switch/click-turns-on', await on(sw(p)), 'still off after a click');
      await sw(p).focus(); await p.keyboard.press('Space'); await h.wait(150);
      T.check('switch/space-toggles', !(await on(sw(p))), 'Space did not switch it off');
      await p.fill('#npName', ''); await sw(p).focus(); await p.keyboard.press('Enter'); await h.wait(300);
      T.check('switch/enter-toggles', await on(sw(p)), 'Enter did not switch it on');
      T.check('switch/enter-does-not-start-a-project', await p.locator('#npName').isVisible(), 'Enter on the switch submitted the form');
      T.check('switch/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('visibility', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      // off: the project starts at construct and expression, with no cloning step anywhere
      await h.newProject('Off synthetic', 'expression');
      T.check('off/no-cloning-steps', (await cloneRows(h)).length === 0, JSON.stringify(await cloneRows(h)));
      T.check('off/starts-at-construct', await p.locator('#tl [data-step="construct"]').evaluate(e => !!e.closest('.cur, [aria-current]')), 'the construct step is not the current one');
      T.check('off/header-off', !(await on(head(p))), 'the header switch reads on');
      await h.step('transform');
      T.check('off/no-template-selector', await p.locator('#clonePanel [data-cl=tpl]').count() === 0, 'the cloning templates show with cloning off');
      // switching on in the project reveals the template selector
      await head(p).click(); await h.wait(500);
      T.check('on/setup-step', (await cloneRows(h)).some(x => x.k === 'clone:setup'), JSON.stringify(await cloneRows(h)));
      T.check('on/template-selector', await p.locator('#clonePanel [data-cl=tpl]').count() > 0, 'no template buttons with cloning on');
      T.check('visibility/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('preserve-and-persist', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      await h.newProject('Keep synthetic', 'cloning');
      T.check('keep/starts-on', await on(head(p)) && (await cloneRows(h)).length === 1, JSON.stringify(await cloneRows(h)));
      await p.locator('#clonePanel [data-cl=tpl][data-v=ath]').click(); await h.wait(500);
      const n = (await cloneRows(h)).length;
      T.check('keep/stages-added', n > 5, String(n));
      await head(p).click(); await h.wait(500);
      T.check('keep/off-hides-steps', (await cloneRows(h)).length === 0, JSON.stringify(await cloneRows(h)));
      let j = await exportJson(p);
      T.check('keep/records-kept-when-off', j.prep.includeCloning === false && j.prep.cloning.stages.length === n - 1, `includeCloning ${j.prep.includeCloning}, ${j.prep.cloning.stages.length} stages`);
      await head(p).click(); await h.wait(500);
      T.check('keep/on-brings-them-back', (await cloneRows(h)).length === n, `${(await cloneRows(h)).length} of ${n}`);
      j = await exportJson(p);
      T.check('persist/boolean-in-export', j.prep.includeCloning === true, String(j.prep.includeCloning));
      // reopen from the project list: the saved state comes back
      await head(p).click(); await h.wait(500); await h.wait(2500);
      await p.click('#homeBtn'); await h.wait(700);
      await p.locator('#projList [data-pid]', {hasText: 'Keep synthetic'}).first().click(); await h.wait(2500);
      T.check('persist/reopened-off', !(await on(head(p))) && (await cloneRows(h)).length === 0, JSON.stringify(await cloneRows(h)));
      // an exported file opens with the state it was saved in
      await importJson(p, h, 'on_synthetic.json', j);
      T.check('persist/import-restores-on', await on(head(p)) && (await cloneRows(h)).length === n, `${(await cloneRows(h)).length} rows`);
      T.check('preserve/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('validation', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      const expr = async () => (await h.timeline()).find(x => x.k === 'expr');
      // on: expression without a connected clone is flagged
      await h.newProject('Validate on synthetic', 'cloning');
      await h.step('expr'); await setPrep(p, h, '#pr-medium', 'TB');
      let e = await expr();
      T.check('validate/on-needs-clone', e.warn && /Connect the clone/.test(e.s), JSON.stringify(e));
      // selecting a clone at Transformation connects it
      await h.step('transform'); await p.click('#prCloneAdd'); await h.wait(300);
      const row = p.locator('#prClones [data-clone]').first();
      await row.locator('input[type=text]').first().fill('C7 synthetic'); await row.locator('input[type=text]').first().dispatchEvent('change'); await h.wait(200);
      await row.locator('input[type=radio]').first().check(); await h.wait(400);
      e = await expr();
      T.check('validate/selected-clone-connects', !e.warn && !/Connect the clone/.test(e.s), JSON.stringify(e));
      // off: the same expression record is not asked for a clone
      await p.click('#homeBtn'); await h.wait(600);
      await h.newProject('Validate off synthetic', 'expression');
      await h.step('expr'); await setPrep(p, h, '#pr-medium', 'TB');
      e = await expr();
      T.check('validate/off-no-clone-needed', !e.warn && !/Connect the clone/.test(e.s), JSON.stringify(e));
      T.check('validation/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  await T.t('migration', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      const st = [{id: 's1', kind: 'design', name: '', skip: false, at: [{id: 'a1', st: 'done', from: '', f: {}, ck: {}}]}];
      const ext = {src: '', ver: '', note: ''};
      await importJson(p, h, 'old_cloning.json', legacy({type: 'cloning', tpl: 'ath', stages: st, ext}));
      T.check('migrate/cloning-project-on', await on(head(p)) && (await cloneRows(h)).length === 2, JSON.stringify(await cloneRows(h)));
      await importJson(p, h, 'old_unspecified_with_stages.json', legacy({type: '', tpl: '', stages: [{id: 's1', kind: 'design', name: '', skip: false, at: []}], ext}));
      T.check('migrate/records-without-type-on', await on(head(p)), 'a project holding a cloning stage opened with cloning off');
      await importJson(p, h, 'old_expression.json', legacy({type: '', tpl: '', stages: [], ext}));
      T.check('migrate/empty-record-off', !(await on(head(p))) && (await cloneRows(h)).length === 0, JSON.stringify(await cloneRows(h)));
      await importJson(p, h, 'old_before_cloning.json', legacy(undefined));
      T.check('migrate/no-record-off', !(await on(head(p))) && (await cloneRows(h)).length === 0, JSON.stringify(await cloneRows(h)));
      const j = await exportJson(p);
      T.check('migrate/saved-as-boolean', j.prep.includeCloning === false, String(j.prep.includeCloning));
      T.check('migration/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });

  T.done();
})();
