// Transfer allocation uses the UI, exported project files and DOM only.
// Chromatograms are generated synthetic stand-ins (tests/data/standins/gen_standins.py).
const {open, H, suite, DATA, path, fs} = require('../lib/harness');
(async () => {
  const T = suite('29_transfer_allocation'), {p, errs, close} = await open(), h = H(p);
  p.setDefaultTimeout(10000); p.on('dialog', d => d.accept());
  const set = async (id, value) => { const loc = p.locator(id); if (!await loc.count()) return;
    await loc.evaluate(e => { for (let d = e.closest('details'); d; d = d.parentElement.closest('details')) d.open = true; });
    await loc.fill(String(value)); await loc.dispatchEvent('change'); await h.wait(100); };
  const status = async () => await p.locator('#btwAllocationStatus').count() ? p.locator('#btwAllocationStatus').textContent() : p.locator('#btwCarry').textContent();
  // On main the transfer only displays all 10 mg; on the branch it explicitly displays the allocated 2 mg.
  const mass = text => { const hit = text.match(/Loaded next:.*?, ([\d.]+) mg/) || text.match(/([\d.]+) mg/); return hit ? +hit[1] : null; };
  const value = async id => await p.locator(id).count() ? p.locator(id).inputValue() : null;
  const save = async () => { const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]); return JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); };
  const importProject = async data => { await p.setInputFiles('#projFile', {name: 'synthetic-allocation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data))}); await h.wait(800);
    await h.step((await h.timeline()).find(x => x.k.startsWith('btw:')).k); };
  await T.t('allocation', async () => {
    await h.newProject('Synthetic transfer allocation'); await h.addRun(path.join(DATA, 'standins/imac_histrap_1ml_step.csv')); await h.pool('T1-T6');
    await h.addConc(null, 5); await set('#btw-conc', 2);
    const transfer = (await h.timeline()).find(x => x.k.startsWith('btw:')).k;
    await h.addRun(path.join(DATA, 'chrom/sec_S200_Increase_minutes_u7.csv')); await h.suggest();
    await h.step('figure'); const oldTable = await h.sumTable(), oldMethods = await h.methods();
    await h.step(transfer);
    T.check('legacy_full_carryover', mass(await status()) === 10, `2 mg/mL × 5 mL = 10 mg: ${await status()}`);
    const legacyProject = await save();
    await set('#btw-vLoad', 1); await set('#btw-vRetain', 4); await set('#btw-retainDisposition', 'Stored at -80 C');
    const split = await status();
    T.check('one_ml_load_is_two_mg', mass(split) === 2, `Expected 10 × 1/5 = 2 mg loaded, not 10 mg; got ${mass(split)}: ${split}`);
    T.check('four_ml_retained', /Retained: 4(?:\.0+)? mL/.test(split), split);
    T.check('no_unallocated_volume', /Unallocated: 0(?:\.0+)? mL/.test(split), split);
    T.check('total_output_not_reduced', /10\.0 mg/.test(await p.locator('#btwCarry').textContent()), await p.locator('#btwCarry').textContent());
    const allocatedProject = await save(), b = allocatedProject.prep.btw[transfer.slice(4)];
    T.check('canonical_saved_fields', +b.vOut === 5 && +b.vLoad === 1 && +b.vRetain === 4 && b.retainDisposition === 'Stored at -80 C', JSON.stringify(b));
    await h.step('figure');
    T.check('reporting_deferred_table', JSON.stringify(await h.sumTable()) === JSON.stringify(oldTable), 'Summary yields and amounts retain the P8 reporting basis.');
    T.check('reporting_deferred_methods', await h.methods() === oldMethods, 'No allocation reporting is introduced in Methods before P8.');
    await h.step(transfer);
    // Edits that would exceed the measured output are rejected, including edits to output itself.
    for (const [id, bad, original] of [['#btw-vLoad', 2, '1'], ['#btw-vRetain', 5, '4'], ['#btw-vOut', 4, '5'], ['#btw-vLoad', -1, '1']]) {
      await set(id, bad); T.check('reject_' + id.slice(5) + '_' + bad, await value(id) === original && mass(await status()) === 2, `After invalid ${id}=${bad}, saved field ${await value(id)}; ${await status()}`);
    }
    await set('#btw-vRetain', 3);
    T.check('partial_balance', /Unallocated: 1(?:\.0+)? mL/.test(await status()) && mass(await status()) === 2, await status());
    await set('#btw-vLoad', 0); await set('#btw-vRetain', 5);
    T.check('explicit_zero_load', mass(await status()) === 0 && /Retained: 5(?:\.0+)? mL/.test(await status()), await status());
    await set('#btw-vRetain', ''); await set('#btw-vLoad', '');
    T.check('clear_restores_full_carryover', mass(await status()) === 10, await status());
    await importProject(allocatedProject);
    T.check('json_roundtrip', mass(await status()) === 2 && await value('#btw-vRetain') === '4' && await value('#btw-retainDisposition') === 'Stored at -80 C', await status());
    await h.step('figure'); await h.wait(3000); await p.reload(); await h.wait(1200);
    if (await p.locator('#home').isVisible()) { await p.locator('.pcard[data-pid]').first().click(); await h.wait(1000); }
    await h.step((await h.timeline()).find(x => x.k.startsWith('btw:')).k);
    T.check('browser_save_roundtrip', mass(await status()) === 2 && await value('#btw-retainDisposition') === 'Stored at -80 C', await status());
    // Import old projects without inventing allocation fields or changing full carryover.
    await importProject(legacyProject);
    T.check('legacy_import_full_carryover', mass(await status()) === 10 && (!await value('#btw-vLoad')), await status());
    // Malformed imported allocations must be flagged rather than silently interpreted as all output.
    const invalid = JSON.parse(JSON.stringify(allocatedProject)); invalid.prep.btw[transfer.slice(4)].vLoad = '2';
    await importProject(invalid);
    T.check('invalid_import_withholds_mass', /must not exceed/.test(await status()) && mass(await status()) === null, await status());
    await set('#btw-vLoad', 1);
    T.check('invalid_import_repair', mass(await status()) === 2, await status());
    await set('#btw-conc', '');
    T.check('unknown_concentration_not_zero', /mass needs a measured concentration/.test(await status()) && mass(await status()) === null, await status());
    await set('#btw-conc', 0);
    T.check('zero_concentration_is_zero_mass', mass(await status()) === 0, await status());
    for (const [name, change, message] of [
      ['missing_output', {vOut: ''}, /measured output volume first/],
      ['retained_only', {vLoad: ''}, /non-negative loaded volume/],
      ['nonfinite_import', {vLoad: 'Infinity'}, /non-negative loaded volume/],
      ['negative_retained', {vRetain: '-1'}, /non-negative loaded volume/],
      ['zero_output_positive_load', {vOut: '0', vLoad: '0.0000000001', vRetain: '0'}, /must not exceed/]
    ]) { const data = JSON.parse(JSON.stringify(allocatedProject)); Object.assign(data.prep.btw[transfer.slice(4)], change); await importProject(data);
      T.check(name, message.test(await status()) && mass(await status()) === null, await status()); }
    const empty = JSON.parse(JSON.stringify(allocatedProject)); Object.assign(empty.prep.btw[transfer.slice(4)], {vOut: '0', vLoad: '0', vRetain: '0'});
    await importProject(empty);
    T.check('empty_output_zero_load', mass(await status()) === 0, await status());
    const decimal = JSON.parse(JSON.stringify(allocatedProject)); Object.assign(decimal.prep.btw[transfer.slice(4)], {vOut: '0.3', vLoad: '0.1', vRetain: '0.2'});
    await importProject(decimal);
    T.check('decimal_balance', mass(await status()) === 0.2, await status());
  });
  T.check('no_page_errors', errs.length === 0, errs.join('; '));
  await close(); T.done();
})();
