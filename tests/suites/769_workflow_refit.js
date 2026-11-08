// 769 eight-step workflow stays live: redrawing the workflow figure after an edit must not refit every Gaussian peak.
// Each Gaussian fit depends only on the trace, its peak regions and the baseline rule, but every workflow update drew each panel twice
// (a sizing pass and the real one) and refit all its peaks both times. Eight steps with crowded peaks then made each edit wait for 16 fits.
// The budget is a ratio, so it holds on a fast or a slow machine: a redraw with Gaussian peak areas may cost little more than one with
// trapezoid areas (which fit nothing). The other checks keep the result honest: the screen, the exported SVG and an edited baseline all agree.
// UI and DOM only. All data is synthetic (tests/data/gen_crowded_workflow.js).
const {open, H, suite, fs} = require('../lib/harness');
const {crowdedRunCsv} = require('../data/gen_crowded_workflow');
const T = suite('769_workflow_refit');
/* twelve overlapping peaks on a noisy baseline, 10k points; every file is its own run */
const crowdedRun = k => ({name: `wf769_step${k + 1}.csv`, mimeType: 'text/csv', buffer: Buffer.from(crowdedRunCsv(k))});
const gaussPaths = svg => (svg.match(/<path d="[^"]*"[^>]*fill-opacity="0\.18"/g) || []).map(x => x.slice(9, x.indexOf('"', 9)));
const paperSvg = p => p.$eval('#paper svg', e => e.outerHTML).catch(() => '');
/* the median time of n synchronous redraws after setting a Peak integration option, in ms */
const redraw = (p, id, v, n) => p.evaluate(([id, v, n]) => { const el = document.getElementById(id); if (!el) return -1; el.value = v; const ts = [];
  for (let i = 0; i <= n; i++) { const t = performance.now(); el.dispatchEvent(new Event('input', {bubbles: true})); if (i) ts.push(performance.now() - t); }
  ts.sort((a, b) => a - b); return Math.round(ts[ts.length >> 1]*10)/10; }, [id, v, n]);

(async () => {
  const {p, errs, close} = await open(), h = H(p);
  const timer = setTimeout(() => { console.log('769_workflow_refit: timed out'); process.exit(1); }, 240000);
  try {
    await T.t('eight-steps', async () => { await h.newProject('Eight crowded steps');
      await p.setInputFiles('#file', Array.from({length: 8}, (_, k) => crowdedRun(k))); await h.wait(3500);
      const steps = (await h.timeline()).filter(x => x.k.startsWith('run:'));
      T.check('setup.eight-runs', steps.length === 8, `${steps.length} runs in the timeline`);
      for (const s of steps) { await h.step(s.k); await p.evaluate(() => { const b = document.getElementById('intAuto'); if (b) b.click(); }); await h.wait(500); }
      await h.step('figure'); await h.wait(800);
      const panels = await p.$$eval('#paper svg [data-wfp]', e => e.length).catch(() => 0);
      T.check('setup.eight-panels', panels === 8, `${panels} workflow panels on screen`);
      const g0 = gaussPaths(await paperSvg(p));
      T.check('setup.peaks-fitted', g0.length >= 8, `${g0.length} fitted peaks drawn (8 runs of 12 peaks)`);

      /* the bound: a redraw with Gaussian areas costs about what one with trapezoid areas does, because the fits are reused */
      const tG = await redraw(p, 'o-intMethod', 'gauss', 5), tT = await redraw(p, 'o-intMethod', 'trap', 5); await redraw(p, 'o-intMethod', 'gauss', 0);
      T.check('perf.workflow-8-steps-redraw-reuses-fits', tG >= 0 && tT >= 0 && tG <= 1.5*tT + 30, `Gaussian ${tG} ms, trapezoid ${tT} ms per redraw (budget 1.5 × trapezoid + 30 ms)`);

      /* correctness: the redrawn screen still shows the same fits, and the exported SVG carries them too */
      const g1 = gaussPaths(await paperSvg(p));
      T.check('screen.same-fits-after-redraw', g1.length === g0.length && g1.every((d, i) => d === g0[i]), `${g0.length} -> ${g1.length} fitted peaks`);
      const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 10000}).catch(() => null), p.evaluate(() => document.getElementById('saveSvg').click())]);
      const ex = dl ? fs.readFileSync(await dl.path(), 'utf8') : '', gx = gaussPaths(ex);
      T.check('export.svg-has-the-fits', gx.length === g1.length && gx.every((d, i) => d === g1[i]), dl ? `${gx.length} fitted peaks in the SVG, ${g1.length} on screen` : 'no download');

      /* an edited value refits: a zero baseline changes the fits, and going back gives the original ones again */
      await redraw(p, 'o-intBase', 'zero', 0); const gz = gaussPaths(await paperSvg(p));
      T.check('edit.baseline-refits', gz.length > 0 && gz.join('|') !== g1.join('|'), `${gz.length} fitted peaks with a zero baseline`);
      const [dz] = await Promise.all([p.waitForEvent('download', {timeout: 10000}).catch(() => null), p.evaluate(() => document.getElementById('saveSvg').click())]);
      const exz = dz ? gaussPaths(fs.readFileSync(await dz.path(), 'utf8')) : [];
      T.check('edit.export-follows-baseline', exz.join('|') === gz.join('|'), dz ? `${exz.length} fitted peaks in the SVG, ${gz.length} on screen` : 'no download');
      await redraw(p, 'o-intBase', 'line', 0); const gl = gaussPaths(await paperSvg(p));
      T.check('edit.baseline-back', gl.join('|') === g1.join('|'), `${gl.length} fitted peaks, same as before: ${gl.join('|') === g1.join('|')}`);
    });
    T.check('no-page-errors', !errs.length, errs.join(' | '));
  } finally { clearTimeout(timer); await close(); }
  T.done(); process.exit(0);
})();
