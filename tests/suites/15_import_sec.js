// Synthetic regression checks for SEC matching, UNICORN numbers, column names and NanoDrop imports.
// Controls and downloaded project files are the only interface to the app.
const {open, H, suite, fs} = require('../lib/harness');
const F = require('../data/gen_import_sec');
const T = suite('15_import_sec');
const SEL = {quick: '#homeQuick', project: '#projFile', save: '#projSave', file: '#file', nd: '#ndFile',
  read: '#sec-read', volumes: '#secStdList [data-f=ve]', column: '#sec-col', vt: '#sec-vt'};
const click = (p, sel) => p.locator(sel).evaluate(e => e.click());
async function loadProject(p, data){
  await click(p, SEL.quick);
  await p.setInputFiles(SEL.project, F.file('synthetic.json', JSON.stringify(data)));
  await p.waitForTimeout(400);
}
async function saved(p){
  const download = p.waitForEvent('download'); await click(p, SEL.save);
  return JSON.parse(fs.readFileSync(await (await download).path(), 'utf8'));
}
async function fresh(id, fn){
  await T.t(id, async () => { const app = await open();
    try { await fn(app.p, H(app.p)); }
    finally { T.check(id + '/no-page-errors', !app.errs.length, app.errs.join(' | ')); await app.close(); }
  });
}
(async () => {
  await fresh('sec-matching', async p => {
    const fixture = F.project(); await loadProject(p, fixture);
    const volumes = () => p.$$eval(SEL.volumes, es => es.map(e => +e.value));
    const old = await volumes(); let proposal = '', accept = false, dialogs = 0;
    p.on('dialog', async d => { proposal = d.message(); dialogs++; await (accept ? d.accept() : d.dismiss()); });
    await click(p, SEL.read);
    // Guards: cancellation must leave all previous standard volumes untouched.
    T.check('sec/cancel-keeps-volumes', JSON.stringify(await volumes()) === JSON.stringify(old), JSON.stringify(await volumes()));
    // Guards: review includes identities, sizes, units and proposed volumes, excluding the unticked standard.
    T.check('sec/proposed-mapping', dialogs === 1 && /Large \(300 kDa\): 2 mL/.test(proposal) &&
      /Middle \(100 kDa\): 4 mL/.test(proposal) && /Small \(30 kDa\): 6 mL/.test(proposal) && !/Unticked/.test(proposal), proposal);
    accept = true; await click(p, SEL.read);
    const got = await volumes();
    // Guards: elution order wins over area; the huge peaks outside V0/Vt and the late large peak do not shift the standards.
    T.check('sec/elution-order-and-limits', JSON.stringify(got) === JSON.stringify([6, 2, 3.3, 4]), JSON.stringify(got));
    // Guards: unticked standards keep their stored volume and remain unticked after accepting.
    T.check('sec/unticked-unchanged', got[2] === 3.3 && !(await p.locator('#ss-u2').isChecked()));
    const data = await saved(p);
    // Guards: confirmed matches survive an ordinary project export.
    T.check('sec/export-matches', data.opt.secCals.find(c => c.id === 'scTest').stds[1].ve === 2);
  });
  await fresh('sec-unmatched', async p => {
    const fixture = F.project(); fixture.opt.secCals.find(c => c.id === 'scTest').vt = 5; await loadProject(p, fixture);
    let proposal = ''; p.on('dialog', async d => { proposal = d.message(); await d.accept(); });
    await click(p, SEL.read); const stds = (await saved(p)).opt.secCals.find(c => c.id === 'scTest').stds;
    // Guards: with Vt at 5 mL only two standard peaks remain, the dialog names the standard left over, and its old volume is cleared rather than mixed with this run.
    T.check('sec/unmatched-listed', /Small \(30 kDa\)/.test(proposal.split('cleared')[1] || ''), proposal);
    T.check('sec/unmatched-cleared', stds[0].ve === '' && stds[1].ve === 2, JSON.stringify(stds.map(q => q.ve)));
  });
  await fresh('unicorn-comma', async (p, h) => {
    await h.newProject('Synthetic comma numbers');
    await h.addRun(F.unicorn('sec_comma.tsv', true)); const data = await saved(p), r = data.runs[0];
    // Guards: fractional x positions are preserved, rather than truncated at the comma.
    T.check('unicorn/decimal-x', r.uvs[0].xs[1] === 0.25 && r.uvs[0].xs[18] === 4.5, r.uvs[0].xs.slice(0, 5));
    // Guards: decimal UV and conductivity values retain their fractional parts.
    T.check('unicorn/decimal-y', r.uvs[0].ys[0] === 2.5 && r.cond.ys[0] === 12.5, JSON.stringify([r.uvs[0].ys[0], r.cond.ys[0]]));
    // Guards: the other UNICORN separator/number convention still loads.
    await h.addRun(F.unicorn('sec_dot.tsv')); const dot = (await saved(p)).runs.find(x => x.file === 'sec_dot');
    T.check('unicorn/dot-unchanged', dot && dot.uvs[0].xs[1] === 0.25 && dot.uvs[0].ys[0] === 2.5);
  });
  await fresh('unicorn-semicolon', async (p, h) => {
    await h.newProject('Synthetic comma numbers');
    await h.addRun(F.unicorn('sec_semicolon_unicorn7.csv'));
    await p.waitForTimeout(500);
    const data2 = await saved(p), r2 = data2.runs.find(x => x.file === 'sec_semicolon_unicorn7');
    T.check('decimal-comma-sec', r2 && (r2.uvs[0].xs.includes(0.02) || r2.uvs[0].xs.includes(0.25) || r2.uvs[0].xs.includes(14.48)), 'Comma decimal in SEC trace parsed correctly');
  });
  for (const size of [75, 200]) await fresh('column-' + size, async (p, h) => {
    await h.newProject('Synthetic column ' + size);
    await h.addRun(F.unicorn('sec_Superdex ' + size + ' Increase 5-150 GL.tsv'));
    // Guards: both 5/150 columns get their own preset and 3 mL volume.
    T.check('column/' + size + '-5-150', await p.locator(SEL.column).inputValue() === 's' + size + 'i5',
      await p.locator(SEL.column).inputValue());
    T.check('column/' + size + '-volume', +(await p.locator(SEL.vt).inputValue()) === 3);
  });
  await fresh('uv-only-csv', async (p, h) => {
    await h.newProject('Synthetic UV-only export');
    await h.addRun(F.uvOnly('uv_only_u7.csv'));
    const toasts = (await h.toasts()).join(' | '), data = await saved(p), r = data.runs[0];
    // Guards: a UNICORN export of the UV curve alone loads as an ÄKTA run, not as a plain trace outside the workflow.
    T.check('uvonly/loads-as-run', data.runs.length === 1 && /Loaded 1 ÄKTA run/.test(toasts), `runs: ${data.runs.length}, traces: ${data.traces.length}, toasts: ${toasts || 'none'}`);
    // Guards: the mL axis, the mAU unit and all 501 points survive; the apex stays at 12 mL and 81.5 mAU.
    T.check('uvonly/units-and-points', !!r && r.xu === 'ml' && r.uvs[0].yu === 'mAU' && r.uvs[0].xs.length === 501 && r.uvs[0].xs[240] === 12 && r.uvs[0].ys[240] === 81.5,
      r ? JSON.stringify({xu: r.xu, yu: r.uvs[0].yu, n: r.uvs[0].xs.length, x: r.uvs[0].xs[240], y: r.uvs[0].ys[240]}) : 'no run');
  });
  await fresh('zip-curve-without-points', async (p, h) => {
    await h.newProject('Synthetic incomplete archive');
    await h.addRun(F.unicornZip('complete_rebuilt.zip'));
    const whole = (await h.toasts()).join(' | ');
    // Guards: the rebuilt archive with every curve loads as usual and reports nothing left out (no false alarm).
    T.check('zip/complete-no-warning', /Loaded 1 ÄKTA run/.test(whole) && !/left out/.test(whole), whole || 'none');
    await h.addRun(F.unicornZip('cond_points_missing.zip', [2]));
    const toasts = (await h.toasts()).join(' | '), r = (await saved(p)).runs.find(x => x.file === 'cond_points_missing');
    // Guards: the curve whose points are missing is named, rather than dropped without a word.
    T.check('zip/names-lost-curve', /Conductivity in cond_points_missing\.zip/.test(toasts) && /no readable data points/.test(toasts), toasts || 'none');
    // Guards: the UV curve, its units and the other curves still load.
    T.check('zip/uv-kept', !!r && r.xu === 'ml' && r.uvs[0].yu === 'mAU' && r.uvs[0].xs.length > 1000 && !r.cond && !!r.grad,
      r ? JSON.stringify({xu: r.xu, yu: r.uvs[0].yu, n: r.uvs[0].xs.length, cond: !!r.cond, grad: !!r.grad}) : 'no run');
  });
  await fresh('zip-uv-without-points', async (p, h) => {
    await h.newProject('Synthetic archive without UV points');
    await h.addRun(F.unicornZip('uv_points_missing.zip', [1]));
    const toasts = (await h.toasts()).join(' | ');
    // Guards: a UNICORN archive whose UV points are missing says so and what to do, instead of "not a UNICORN result archive".
    T.check('zip/uv-missing-message', /UV curve \(UV\) has no readable data points/.test(toasts) && /export the result from UNICORN again/.test(toasts) && !/not a UNICORN result archive/.test(toasts), toasts || 'none');
  });
  await fresh('nanodrop', async p => {
    const legacy = F.project();
    legacy.nanodrop = [{id: 'ndLegacy', name: 'Legacy reading', a280: 2.5, kind: 'protein', stage: 'pool', dil: 1}];
    await loadProject(p, legacy);
    const add = async f => { await p.setInputFiles(SEL.nd, f); await p.waitForTimeout(150); };
    await add(F.nd('numbers.tsv', [['Thousands', '1,234', '1,234', '2026-01-01', '09:00'],
      ['Decimal', '1,25', '1,25', '2026-01-01', '09:00'],
      ['Mixed', '1,234.5', '1,234.5', '2026-01-01', '09:00'],
      ['Grouped', '1,234,567', '1,234,567', '2026-01-01', '09:00'],
      ['Leading decimal', ',5', ',5', '2026-01-01', '09:00'],
      ['Zero decimal', '0,123', '0,123', '2026-01-01', '09:00']]));
    let data = await saved(p), ns = data.nanodrop;
    // Guards: a three-digit comma group is thousands, while a lone two-digit comma is decimal.
    T.check('nd/thousands', ns.find(s => s.name === 'Thousands').a280 === 1234, ns.find(s => s.name === 'Thousands').a280);
    T.check('nd/decimal', ns.find(s => s.name === 'Decimal').a280 === 1.25);
    // Guards: decimal commas without a leading zero remain supported.
    T.check('nd/leading-decimal', ns.find(s => s.name === 'Leading decimal')?.a280 === 0.5);
    // Guards: a European export's 0,123 is 0.123, never 123 (a thousands group cannot start with 0).
    T.check('nd/zero-decimal', ns.find(s => s.name === 'Zero decimal')?.a280 === 0.123, ns.find(s => s.name === 'Zero decimal')?.a280);
    T.check('nd/mixed-separators', ns.find(s => s.name === 'Mixed').a280 === 1234.5, ns.find(s => s.name === 'Mixed').a280);
    T.check('nd/multiple-groups', ns.find(s => s.name === 'Grouped').a280 === 1234567, ns.find(s => s.name === 'Grouped').a280);
    const first = F.nd('replicate1.tsv', [['Replicate', '2.25', '2.25', '2026-01-01', '09:00']]);
    const second = F.nd('replicate2.tsv', [['Replicate', '2.25', '2.25', '2026-01-01', '09:01']]);
    await add(first); await add(second); data = await saved(p);
    // Guards: equal name and A280 do not discard a later measurement.
    T.check('nd/timestamp-replicates', data.nanodrop.filter(s => s.name === 'Replicate').length === 2);
    const beforeReimport = data.nanodrop.length; await add(second); data = await saved(p);
    // Guards: importing the same dated reading twice still avoids duplicates.
    T.check('nd/reimport-same-reading', data.nanodrop.length === beforeReimport);
    await add(F.nd('row1.tsv', [['Row replicate', '3.5', '3.5']], false));
    await add(F.nd('row2.tsv', [['Row replicate', '3.5', '3.5'], ['Row replicate', '3.5', '3.5']], false));
    data = await saved(p);
    // Guards: row positions distinguish equal measurements even without a timestamp.
    T.check('nd/row-replicates', data.nanodrop.filter(s => s.name === 'Row replicate').length === 2);
    // Guards: old projects without timestamp or row metadata retain their readings.
    T.check('nd/legacy-reading', data.nanodrop.find(s => s.id === 'ndLegacy').a280 === 2.5);
    const n = data.nanodrop.length; await add(F.nd('legacy.tsv', [['Legacy reading', '2.5', '2.5']], false)); data = await saved(p);
    // Guards: re-importing a reading that an older project saved without row or time does not add it twice.
    T.check('nd/legacy-reimport', data.nanodrop.length === n, data.nanodrop.length + ' vs ' + n);
  });
  T.done();
})();
