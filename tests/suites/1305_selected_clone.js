// #1305: an optional selected clone in the Transformation step. Failed and unused clones stay as provenance,
// a failed clone cannot be selected, the legacy glycerol stock field changes only when a clone is selected,
// and selectedCloneId is null or names an existing clone that has not failed, also in imported files.
const {open, H, suite, fs, path} = require('../lib/harness');
const os = require('os');

(async () => {
  const T = suite('1305_selected_clone');

  await T.t('selected-clone-handoff', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      const set = async (loc, val) => { await loc.fill(val); await loc.dispatchEvent('change'); await h.wait(350); };
      // closing and reopening the Methods box makes the app write the current text into it
      const readMethods = async () => { const tog = o => p.evaluate(v => { const b = document.getElementById('methodsBox'); if (b) b.open = v; }, o);
        await tog(false); await h.wait(150); await tog(true); await h.wait(350); return h.methods(); };
      const row = i => p.locator('#prClones [data-clone]').nth(i);
      const exportJson = async () => { const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}), p.click('#projSave')]); return JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); };
      const USED = /used for expression/;

      await h.newProject('Clone handoff');
      await h.step('construct');
      await set(p.locator('#pr-name'), 'pSYN-1305');
      await h.step('transform');
      await set(p.locator('#pr-trMethod'), 'heat shock');
      await set(p.locator('#pr-trStock'), 'box 1, B2');

      const canAdd = await p.locator('#prCloneAdd').isVisible().catch(() => false);
      T.check('clone/add-button', canAdd, 'No "Add clone" control in the Transformation step');
      if (!canAdd) return;

      await p.click('#prCloneAdd'); await h.wait(300);
      await p.click('#prCloneAdd'); await h.wait(300);
      T.check('clone/two-rows', await p.locator('#prClones [data-clone]').count() === 2, String(await p.locator('#prClones [data-clone]').count()));
      await set(row(0).locator('[data-cl=name]'), 'A1');
      await set(row(1).locator('[data-cl=name]'), 'A2');
      await set(row(1).locator('[data-cl=stock]'), 'box 3, A4');
      await row(0).locator('[data-cl=status]').selectOption('failed'); await h.wait(350);

      // a failed clone cannot be selected, and nothing is selected by default
      T.check('clone/failed-not-selectable', await row(0).locator('[data-cl=sel]').isDisabled(), 'The failed clone can still be selected');
      T.check('clone/none-selected-default', await p.locator('#prClones [data-cl=none]').isChecked(), 'A clone is selected without the user choosing one');
      T.check('clone/legacy-stock-kept', await p.inputValue('#pr-trStock') === 'box 1, B2', await p.inputValue('#pr-trStock'));
      { const m = await readMethods(); T.check('clone/methods-silent-unselected', !USED.test(m), m); }
      { const d = await exportJson();
        T.check('clone/export-null-selection', d.prep.selectedCloneId === null && d.prep.clones.length === 2 && d.prep.clones[0].status === 'failed' && d.prep.trStock === 'box 1, B2', JSON.stringify({sel: d.prep.selectedCloneId, clones: d.prep.clones, st: d.prep.trStock})); }

      // selecting a verified clone hands it to expression and fills the stock field
      await row(1).locator('[data-cl=status]').selectOption('verified'); await h.wait(350);
      await row(1).locator('[data-cl=sel]').click(); await h.wait(400);
      T.check('clone/selection-fills-stock', await p.inputValue('#pr-trStock') === 'box 3, A4', await p.inputValue('#pr-trStock'));
      { const m = await readMethods(); T.check('clone/methods-names-selected', m.includes('Clone A2, verified, was used for expression (glycerol stock box 3, A4).'), m); }
      const sel = await exportJson();
      T.check('clone/export-selected-id', sel.prep.selectedCloneId === sel.prep.clones[1].id && sel.prep.clones.length === 2, JSON.stringify({sel: sel.prep.selectedCloneId, clones: sel.prep.clones}));

      // marking the selected clone failed drops the selection; the failed clone stays as provenance
      await row(1).locator('[data-cl=status]').selectOption('failed'); await h.wait(400);
      T.check('clone/failed-clears-selection', await p.locator('#prClones [data-cl=none]').isChecked() && await p.locator('#prClones [data-clone]').count() === 2, 'Selection kept on a failed clone');
      { const m = await readMethods(); T.check('clone/methods-drops-failed', !USED.test(m), m); }

      // imported files are made canonical: a selection naming a failed or missing clone becomes null
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hfb1305-'));
      const importFile = async (name, mut) => { const d = JSON.parse(JSON.stringify(sel)); mut(d.prep); const f = path.join(dir, name + '.json'); fs.writeFileSync(f, JSON.stringify(d));
        await p.click('#homeBtn').catch(() => {}); await h.wait(500); await p.click('#homeQuick'); await h.wait(1200); await p.setInputFiles('#projFile', f); await h.wait(2500); };
      await importFile('selected', () => {});
      { const m = await readMethods(); T.check('clone/import-selected', m.includes('Clone A2, verified, was used for expression'), m); }
      await importFile('failed', pr => { pr.clones[1].status = 'failed'; });
      { const m = await readMethods(), d = await exportJson(); T.check('clone/import-failed-selection-null', !USED.test(m) && d.prep.selectedCloneId === null && d.prep.clones.length === 2, `${d.prep.selectedCloneId} | ${m}`); }
      await importFile('missing', pr => { pr.selectedCloneId = 'nope'; });
      { const d = await exportJson(); T.check('clone/import-missing-selection-null', d.prep.selectedCloneId === null, String(d.prep.selectedCloneId)); }
      // a project saved before clones existed: no clones, no selection, and the legacy stock is untouched
      await importFile('legacy', pr => { delete pr.clones; delete pr.selectedCloneId; pr.trStock = 'box 1, B2'; });
      { const m = await readMethods(), d = await exportJson();
        T.check('clone/import-legacy', Array.isArray(d.prep.clones) && !d.prep.clones.length && d.prep.selectedCloneId === null && d.prep.trStock === 'box 1, B2' && !USED.test(m), JSON.stringify({c: d.prep.clones, s: d.prep.selectedCloneId, st: d.prep.trStock})); }

      T.check('clone/no-page-errors', !errs.length, errs.join(' | '));
    } finally { await close(); }
  });

  T.done();
})();
