// Workflow branches: a step can come from an earlier step (Comes from), so one fraction goes to one next step and another fraction to a second.
const {open, H, suite, src} = require('../lib/harness');
(async () => { const T = suite('24_workflow_branches');
  const boxes = p => p.$$eval('#paper svg g[data-wfp]', gs => gs.map(g => { const b = g.getBoundingClientRect(); return {id: g.dataset.wfp, l: b.left, r: b.right, t: b.top, b: b.bottom}; }));
  const edges = p => p.$$eval('#paper svg [data-wfe]', es => es.map(e => { const b = e.getBoundingClientRect(); return {e: e.dataset.wfe, l: b.left, r: b.right, t: b.top, b: b.bottom}; }));
  const openWf = async (p) => { await p.click('#tl [data-step=figure]'); await p.waitForTimeout(700); };
  const setFrom = async (p, h, stepKey, value) => { await h.step(stepKey); await p.selectOption('#ssFrom', value); await p.waitForTimeout(500); };
  const layout = async (p, v) => { await p.evaluate(v => { const r = document.querySelector(`#wf-${v}`); r.click(); }, v); await p.waitForTimeout(600); };
  const build = async (p, h, name) => { await h.newProject(name); await h.addRun(src('his')); await h.addRun(src('ortho')); await h.addRun(src('q'));
    const tl = (await h.timeline()).filter(x => x.k.startsWith('run:')); return tl.map(x => x.k); };

  await T.t('branches-row', async () => { const {p, errs, close} = await open(), h = H(p);
    const ks = await build(p, h, 'Branches'); T.check('three runs', ks.length === 3, ks.join());
    const ids = ks.map(k => k.slice(4)); await openWf(p);
    const before = await boxes(p); T.check('default: three panels in one row, in order', before.length === 3 && before[0].r <= before[1].l + 1 && before[1].r <= before[2].l + 1 && Math.abs(before[0].t - before[2].t) < 3, JSON.stringify(before));
    T.check('default: no extra branch routes', (await edges(p)).length === 2);
    const svg0 = await p.$eval('#paper svg', e => e.outerHTML);
    /* explicitly choosing the step before changes nothing */
    await setFrom(p, h, ks[1], ids[0]); await openWf(p);
    T.check('Comes from the previous step draws as before', (await p.$eval('#paper svg', e => e.outerHTML)) === svg0);
    /* the third run comes from the first: a fork after the first step */
    await setFrom(p, h, ks[2], ids[0]);
    const opts = await p.$$eval('#ssFrom option', o => o.map(x => x.value)); T.check('editor offers the earlier steps', opts.includes(ids[0]) && opts.includes(ids[1]) && !opts.includes(ids[2]), opts.join());
    await p.fill('#ssFromNote', 'Fractions B5-B8'); await p.waitForTimeout(500); await openWf(p);
    const bx = await boxes(p), by = Object.fromEntries(bx.map(b => [b.id, b])), ed = await edges(p);
    T.check('branch: three panels', bx.length === 3);
    T.check('branch: the two branches sit side by side', by[ids[1]] && by[ids[2]] && Math.min(by[ids[1]].b, by[ids[2]].b) > Math.max(by[ids[1]].t, by[ids[2]].t) && (by[ids[1]].r <= by[ids[2]].l + 1 || by[ids[2]].r <= by[ids[1]].l + 1), JSON.stringify(bx));
    const out = ed.filter(e => e.e.startsWith(ids[0] + '>'));
    T.check('branch: the first step has an arrow to each branch', out.length === 2 && out.some(e => e.e.endsWith('>' + ids[1])) && out.some(e => e.e.endsWith('>' + ids[2])), JSON.stringify(ed));
    T.check('branch: both arrows start at the first panel\'s right edge', out.every(e => Math.abs(e.l - by[ids[0]].r) < 40), JSON.stringify(out) + ' ' + by[ids[0]].r);
    T.check('branch: the note is on the arrow', (await h.svgTexts()).some(x => /Fractions B5/.test(x.t)));
    T.check('branch: no overlapping texts', (await h.overlaps()).length === 0, (await h.overlaps()).join('; '));
    const svgW = await p.$eval('#paper svg', e => e.getBoundingClientRect().width), allR = Math.max(...bx.map(b => b.r)), svgL = await p.$eval('#paper svg', e => e.getBoundingClientRect().left);
    T.check('branch: nothing is clipped on the right', allR <= svgL + svgW + 1);
    for (const lay of ['stack', 'grid']) { await layout(p, lay); const b2 = await boxes(p), e2 = await edges(p);
      T.check(`branch ${lay}: three panels, two arrows from the first, no overlap`, b2.length === 3 && e2.filter(e => e.e.startsWith(ids[0] + '>')).length === 2 && b2.every((a, i) => b2.every((c, j) => i >= j || a.r <= c.l + 1 || c.r <= a.l + 1 || a.b <= c.t + 1 || c.b <= a.t + 1)), JSON.stringify(b2));
      if (lay === 'grid') { const c = by[ids[2]] && b2.find(x => x.id === ids[2]), a = b2.find(x => x.id === ids[1]); T.check('branch grid: the second branch starts a new row', c && a && c.t >= a.b - 1, JSON.stringify(b2)); } }
    await layout(p, 'row');
    T.check('methods text names the branch parent', /the pool from /.test(await h.methods()));
    /* the summary table still works */
    T.check('summary table renders', (await h.sumTable()).length >= 1);
    /* back to the default */
    await setFrom(p, h, ks[2], ''); await openWf(p);
    T.check('clearing Comes from returns to one row', (await edges(p)).length === 2 && (await boxes(p)).length === 3);
    T.check('no page errors', !errs.length, errs.join(' | ')); await close(); });

  await T.t('branches-cycle', async () => { const {p, errs, close} = await open(), h = H(p);
    const ks = await build(p, h, 'Cycle'); const ids = ks.map(k => k.slice(4));
    await setFrom(p, h, ks[2], ids[1]);   // third run comes from the second
    await h.step(ks[2]); await p.click('#ssActs [data-move="-1"]'); await p.waitForTimeout(600);   // now the third run sits above the second
    await h.step(ks[1]); const opts = await p.$$eval('#ssFrom option', o => o.map(x => x.value)); T.check('cycle: the moved step is offered', opts.includes(ids[2]), opts.join());
    await p.selectOption('#ssFrom', ids[2]); await p.waitForTimeout(500);
    T.check('cycle: refused with a message', (await h.toasts()).some(t => /cannot come from/.test(t)), (await h.toasts()).join('|'));
    T.check('cycle: the choice is put back', (await p.$eval('#ssFrom', s => s.value)) === '');
    await openWf(p); T.check('cycle: the figure still has three panels', (await boxes(p)).length === 3);
    T.check('no page errors', !errs.length, errs.join(' | ')); await close(); });

  await T.t('branches-save', async () => { const {p, errs, close} = await open(), h = H(p);
    const ks = await build(p, h, 'Saved'); const ids = ks.map(k => k.slice(4)); await setFrom(p, h, ks[2], ids[0]);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]); const d = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
    T.check('save: the link is in the project file', (d.runs || []).some(r => r.id === ids[2] && r.wfFrom === ids[0]));
    await close(); });

  await T.t('branches-legacy', async () => { const {p, errs, close} = await open(), h = H(p);
    await p.locator('#homeQuick').evaluate(e => e.click()); await p.setInputFiles('#projFile', require('path').join(__dirname, '..', 'data', 'legacy_project.json')); await p.waitForTimeout(2500);
    const tab = p.locator('#tl [data-step=figure]');
    if (await tab.count()) { await tab.click(); await p.waitForTimeout(700); const b = await boxes(p);
      T.check('legacy: panels in one row, in order', b.every((x, i) => i === 0 || (b[i - 1].r <= x.l + 1 && Math.abs(b[i - 1].t - x.t) < 3)), JSON.stringify(b)); T.check('legacy: one plain arrow between neighbours, no branch routes', (await edges(p)).length === Math.max(0, b.length - 1)); }
    else T.check('legacy: no workflow figure in this fixture (skipped)', true);
    T.check('no page errors', !errs.length, errs.join(' | ')); await close(); });
  T.done(); })();
