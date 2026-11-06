// Synthetic inputs come from tests/data/standins/gen_standins.py and science/gen_science.py.
// Only UI controls, rendered DOM and the public project import/export boundary are used.
const {open, H, suite, src, fs, DATA, path} = require('../lib/harness');
const T = suite('23_transfer_allocation');

(async () => {
  const {p, errs, close} = await open(), h = H(p);
  p.setDefaultTimeout(10000);
  const field = async (key, value) => {
    const loc = p.locator('#btw-' + key);
    if (!await loc.count()) return; // Baseline lacks allocation controls; assertions still run.
    await loc.evaluate(e => { for (let d = e.closest('details'); d; d = d.parentElement.closest('details')) d.open = true; });
    await loc.fill(String(value)); await loc.dispatchEvent('change'); await h.wait(100);
  };
  const allocation = () => p.evaluate(() => document.getElementById('btwAllocation')?.textContent || '');
  const mass = (text, part) => Number((text.match(new RegExp(part + ': [\\d.]+ mL \\(([\\d.]+) mg\\)')) || [])[1]);
  const valid = () => p.locator('#btw-vOut').evaluate(e => e.validity.valid);
  const exported = async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#projSave')]);
    return JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  };
  const report = async () => {
    await h.step('figure'); await p.locator('#methodsBox').evaluate(e => e.open = true); await h.wait(200);
    return {table: await h.sumTable(), methods: await h.methods(), figure: (await h.svgTexts()).map(x => x.t)};
  };
  let transfer, before, saved;
  try {
    await T.t('setup', async () => {
      await h.newProject('Synthetic transfer allocation');
      await h.step('construct'); await p.locator('#protPanel').evaluate(e => e.classList.remove('closed'));
      await p.fill('#o-eps', '1'); await p.dispatchEvent('#o-eps', 'change');
      await h.addRun(src('his')); await h.pool('T1-T6');
      await h.addConc(null, 5); await field('conc', 2);
      transfer = (await h.timeline()).find(x => x.k.startsWith('btw:')).k;
      await h.addRun(path.join(DATA, 'science/sec_inject2.csv')); await h.suggest();
      before = await report(); await h.step(transfer);
      const yi = before.table[0].indexOf('Step yield (%)'), sec = before.table.find(row => /Size exclusion/.test(row[0]));
      T.check('reported_mass_yield_present', yi >= 0 && sec && /^\d+$/.test(sec[yi]), JSON.stringify(before.table));
      const text = await allocation();
      T.check('legacy_full_carryover', /all measured output carries forward \(10\.0 mg\)/.test(text), text);
    });

    await T.t('split', async () => {
      await field('vLoad', 1); await field('vRetain', 4); await field('retainDisposition', 'Stored at 4 °C');
      const text = await allocation(), carry = await p.locator('#btwCarry').textContent();
      T.check('five_ml_one_loaded_mass', T.near(mass(text, 'Loaded next'), 2, 0.001), `5 mL at 2 mg/mL, 1 mL loaded: expected 2.00 mg; allocation: ${text || '(absent)'}; total: ${carry}`);
      T.check('four_ml_retained_mass', T.near(mass(text, 'retained'), 8, 0.001), text);
      T.check('measured_output_unchanged', /^10\.0 mg/.test(carry), carry);
      T.check('valid_split', await valid(), text);
      saved = await exported();
      const b = saved.prep.btw[transfer.slice(4)];
      T.check('canonical_fields_saved', b.vOut === '5' && b.vLoad === '1' && b.vRetain === '4' && b.retainDisposition === 'Stored at 4 °C', JSON.stringify(b));
      const after = await report();
      T.check('reporting_deferred_until_p8', JSON.stringify(before) === JSON.stringify(after), 'Summary, Methods and figure text must stay identical when only allocation changes.');
      await h.step(transfer);
    });

    await T.t('validation', async () => {
      await field('vLoad', 2);
      T.check('overallocated_rejected', !await valid() && /must not exceed/.test(await allocation()) && !/Loaded next:/.test(await allocation()), await allocation());
      await field('vLoad', 1); await field('vOut', 4);
      T.check('output_edit_revalidates', !await valid() && /must not exceed/.test(await allocation()), await allocation());
      await field('vOut', 5); await field('vRetain', -1);
      T.check('negative_rejected', !await valid() && /non-negative/.test(await allocation()), await allocation());
      await field('vRetain', 4); await field('vLoad', '');
      T.check('retention_requires_explicit_load', !await valid() && /Enter the volume loaded next/.test(await allocation()), await allocation());
      await field('vLoad', 0); await field('vRetain', 5);
      T.check('zero_load_is_not_full_carryover', await valid() && mass(await allocation(), 'Loaded next') === 0 && mass(await allocation(), 'retained') === 10, await allocation());
      await field('vRetain', ''); await field('vLoad', 1);
      T.check('unallocated_not_assumed_stored', await valid() && /Unallocated: 4\.0 mL/.test(await allocation()) && /retained: 0\.0 mL/.test(await allocation()), await allocation());
      await field('vOut', '');
      T.check('missing_output_rejected', !await valid() && /Enter the measured output/.test(await allocation()), await allocation());
      await field('vLoad', 0.1); await field('vRetain', 0.2); await field('vOut', 0.3);
      T.check('decimal_balance', await valid() && T.near(mass(await allocation(), 'Loaded next'), 0.2, 0.001), await allocation());
      await field('vOut', 0.4); await field('vRetain', 0.3);
      T.check('no_roundoff_remainder', await valid() && /Loaded next:/.test(await allocation()) && !/Unallocated:/.test(await allocation()), await allocation());
      await field('conc', '');
      T.check('missing_mass_stays_unknown', await valid() && /mass unknown/.test(await allocation()) && !Number.isFinite(mass(await allocation(), 'Loaded next')), await allocation());
      await field('conc', 0);
      T.check('measured_zero_mass', await valid() && mass(await allocation(), 'Loaded next') === 0, await allocation());
      await field('vLoad', 0); await field('vRetain', 0); await field('vOut', 0);
      T.check('zero_output_zero_allocation', await valid() && mass(await allocation(), 'Loaded next') === 0, await allocation());
      await field('vLoad', ''); await field('vRetain', ''); await field('vOut', 5); await field('conc', 2);
      T.check('clearing_restores_full_carryover', await valid() && /all measured output carries forward \(10\.0 mg\)/.test(await allocation()), await allocation());
    });

    await T.t('roundtrip', async () => {
      await p.click('#homeBtn'); await h.wait(400);
      await p.setInputFiles('#projFile', {name: 'synthetic-allocation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved))});
      await h.wait(1500); await h.step(transfer);
      T.check('json_roundtrip', mass(await allocation(), 'Loaded next') === 2 && /Stored at 4 °C/.test(await allocation()), await allocation());
      await p.click('#homeBtn'); await h.wait(500); await p.reload(); await h.wait(600);
      await p.locator('.pcard[data-pid]').first().click(); await h.wait(800); await h.step(transfer);
      T.check('browser_storage_roundtrip', mass(await allocation(), 'Loaded next') === 2 && mass(await allocation(), 'retained') === 8, await allocation());
    });
    await T.t('nanodrop_and_transfer_types', async () => {
      // gen_science.py supplies 1.40, 1.42, 1.44 mg/mL: mean 1.42, total 7.10 mg in 5 mL.
      await p.setInputFiles('#btwNdFile', path.join(DATA, 'science/nd3.csv')); await h.wait(700);
      T.check('nanodrop_allocation', T.near(mass(await allocation(), 'Loaded next'), 1.42, 0.001) && T.near(mass(await allocation(), 'retained'), 5.68, 0.001), await allocation());
      for (const how of ['dil', 'exch', 'filt', 'hold']) {
        await p.locator('#btwMore').evaluate(e => e.open = true); await p.selectOption('#btw-how', how); await h.wait(100);
        T.check('shared_model_' + how, await valid() && T.near(mass(await allocation(), 'Loaded next'), 1.42, 0.001), await allocation());
      }
    });
    await T.t('invalid_import', async () => {
      const invalid = JSON.parse(JSON.stringify(saved));
      Object.assign(invalid.prep.btw[transfer.slice(4)], {vLoad: 'Infinity', vRetain: 4});
      await p.click('#homeBtn'); await h.wait(300);
      await p.setInputFiles('#projFile', {name: 'synthetic-invalid-allocation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid))});
      await h.wait(1200); await h.step(transfer);
      T.check('nonfinite_import_rejected', !await valid() && /finite and non-negative/.test(await allocation()) && !/Loaded next:/.test(await allocation()), await allocation());
    });
    T.check('no_page_errors', !errs.length, errs.join(' | '));
  } finally { await close(); T.done(); }
})();
