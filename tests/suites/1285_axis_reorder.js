// Issue #1285: a generic trace whose X axis goes down is sorted for plotting; the import warning must say so,
// name the axis, count the descending transitions, and tell a wholly reversed export from one that resets.
const {open, H, suite} = require('../lib/harness');

(async () => {
  const T = suite('1285_axis_reorder'), {p, errs, close} = await open(), h = H(p);
  const peak = t => (100 * Math.exp(-((t - 5) ** 2) / 0.5)).toFixed(3);
  const csv = xs => ['Time (min),UV 280 (mAU)', ...xs.map(t => `${t.toFixed(1)},${peak(t)}`)].join('\n');
  const load = async (name, text) => { await p.setInputFiles('#file', {name, mimeType: 'text/csv', buffer: Buffer.from(text)}); await h.wait(700); };
  const diagOf = async nm => { const c = p.locator('.trace:not(.run)').filter({has: p.locator(`input[data-k=name][title="${nm}"]`)}).locator('.source-diag');
    return (await c.count()) ? {s: (await c.first().locator('summary').textContent()) || '', m: (await c.first().locator('.source-diag-msg').textContent()) || ''} : null; };

  await T.t('axis_reorder', async () => {
    await h.newProject('Axis reorder');

    // 1. synthetic reversed-time export: 0..9.9 min written from high to low (100 points, 99 descending transitions)
    const down = Array.from({length: 100}, (_, i) => (99 - i) / 10);
    await load('reversed_time.csv', csv(down));
    const r = await diagOf('reversed_time');
    T.check('reversed.warning_shown', !!r, 'a reversed time axis shows an import warning');
    T.check('reversed.summary', !!r && /Time \(min\)/.test(r.s) && /entirely in descending order/.test(r.s) && /sorted/.test(r.s), `summary names the axis and says it was sorted: ${r && r.s}`);
    T.check('reversed.message', !!r && /each of its 100 points to the next/.test(r.m) && /99 descending transitions/.test(r.m) && /plotted series was sorted by Time \(min\)/.test(r.m) && /source rows are kept/.test(r.m), `message: ${r && r.m}`);

    // 2. reset export: 0..4.9 min, then the clock restarts at 0..4.9 (one descending transition at file line 52)
    const reset = Array.from({length: 50}, (_, i) => i / 10).concat(Array.from({length: 50}, (_, i) => i / 10));
    await load('reset_time.csv', csv(reset));
    const s = await diagOf('reset_time');
    T.check('reset.warning_shown', !!s, 'a time axis that resets shows an import warning');
    T.check('reset.summary', !!s && /Time \(min\) has 1 descending transition \(reset or discontinuous segments\)/.test(s.s) && /sorted/.test(s.s), `summary: ${s && s.s}`);
    T.check('reset.message', !!s && /goes down once \(at line 52\)/.test(s.m) && !/each of its/.test(s.m) && /plotted series was sorted/.test(s.m), `message: ${s && s.m}`);

    // 3. ascending export with a repeated point: nothing was reordered, so no warning
    const up = Array.from({length: 100}, (_, i) => i / 10); up.splice(40, 0, up[40]);
    await load('ascending_time.csv', csv(up));
    T.check('ascending.loaded', (await p.locator('.trace:not(.run) input[data-k=name][title="ascending_time"]').count()) === 1, 'the ascending trace was loaded');
    T.check('ascending.no_warning', !(await diagOf('ascending_time')), 'an ascending axis with a repeated point has no reorder warning');
  });

  T.check('no_page_errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();
