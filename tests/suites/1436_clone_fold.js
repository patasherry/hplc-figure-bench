// #1436: a long cloning template no longer takes over the step list. Folded, the Cloning group shows its workflow row, the
// stage being worked on, the next stage not done, and one "N done" row for the finished ones. "Show all stages" shows all,
// and the choice holds while moving between steps. Driven through the UI only. All values are synthetic.
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('1436_clone_fold');
  await T.t('fold', async () => {
    const {p, errs, close} = await open(), h = H(p);
    try {
      p.setDefaultTimeout(15000);
      const vis = async () => (await h.timeline()).filter(x => /^clone:/.test(x.k));
      const cl = () => p.locator('#clonePanel');
      await h.newProject('Fold synthetic', 'cloning');
      await cl().locator('[data-cl=tpl][data-v=ath]').click(); await h.wait(600);
      let v = await vis();
      T.check('fold/at-most-4-rows', v.length <= 4 && v[0].k === 'clone:setup', JSON.stringify(v.map(x => x.t)));
      T.check('fold/upstream-in-view', (await h.timeline()).some(x => x.k === 'construct') && (await h.timeline()).some(x => x.k === 'expr'), 'Construct or Expression missing');
      const all = p.locator('#tl [data-clall="1"]');
      T.check('fold/show-all-link', /Show all stages \(14\)/.test(await all.innerText()), await all.innerText());
      await all.click(); await h.wait(300);
      v = await vis();
      T.check('fold/show-all-shows-14', v.length === 15, String(v.length));
      // the choice holds while moving to another step and back
      await h.step('expr'); await h.step('clone:setup');
      T.check('fold/show-all-holds', (await vis()).length === 15, String((await vis()).length));
      await p.locator('#tl [data-clall="0"]').click(); await h.wait(300);
      T.check('fold/fold-again', (await vis()).length <= 4, String((await vis()).length));
      // finish the first two stages: they fold into "2 done", and the next stage is the one in view
      const first = (await (async () => { await h.allSteps(); return vis(); })()).slice(1, 4);
      for (const s of first.slice(0, 2)) {
        await h.step(s.k);
        await cl().locator('[data-cst]').first().selectOption('done'); await h.wait(300);
      }
      await p.locator('#tl [data-clall="0"]').click().catch(() => {}); await h.wait(200);
      await h.step('construct');
      v = await vis();
      const done = p.locator('#tl [data-cldone]');
      T.check('fold/done-row', (await done.count()) === 1 && /2 done/.test(await done.innerText()), (await done.count()) ? await done.innerText() : 'no done row');
      T.check('fold/next-stage-in-view', v.some(x => x.k === first[2].k) && !v.some(x => x.k === first[0].k), JSON.stringify(v.map(x => x.t)));
      await done.click(); await h.wait(300);
      v = await vis();
      T.check('fold/done-row-lists-finished', v.some(x => x.k === first[0].k) && v.some(x => x.k === first[1].k), JSON.stringify(v.map(x => x.t)));
      T.check('fold/no page errors', errs.length === 0, errs.join(' | '));
    } finally { await close(); }
  });
  T.done();
})();
