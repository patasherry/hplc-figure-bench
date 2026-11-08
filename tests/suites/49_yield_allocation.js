const {open, H, suite, fs, path, DATA, src} = require('../lib/harness');
const T = suite('49_yield_allocation');

async function fresh(id, fn){
  await T.t(id, async () => { const app = await open();
    try { await fn(app.p, H(app.p)); }
    finally { T.check(id + '/no-page-errors', !app.errs.length, app.errs.join(' | ')); await app.close(); }
  });
}

(async () => {
  await fresh('legacy_full_carryover', async (p, h) => {
    // legacy full-carryover case
    await h.newProject('Legacy Project');
    await h.addRun(path.join(DATA, 'chrom', 'imac_HisTrap_FF_1mL_step_u7.csv'));
    await h.pool('T1-T6');
    await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv'));
    await h.pool('F1-F6');
    await h.step('figure');

    const sumTable = await h.sumTable();

    // Check that there is a 'Yield semantics' column
    const headerRow = sumTable[0];
    T.check('legacy/has_semantics_column', headerRow.includes('Yield semantics'), `Header has semantics: ${headerRow}`);

    // In legacy case without intentional partial retention, it should say "Total" everywhere
    const imacRow = sumTable.find(r => r[0] && r[0].includes('IMAC'));
    const secRow = sumTable.find(r => r[0] && r[0].includes('Size exclusion'));

    if (imacRow && secRow) {
       T.check('legacy/sec_semantics', secRow.includes('Total'), `SEC semantics should be Total: ${secRow}`);
    } else {
       T.check('legacy/rows_found', false, `Could not find expected run rows`);
    }
  });

  await fresh('partial_carryover', async (p, h) => {
    // 20 mL → 5 mL → 1 mL SEC / 4 mL retained case
    const setField = async (sel, v) => { const l = p.locator(sel).first(); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(150); };

    await h.newProject('Partial Carryover');
    await h.addRun(path.join(DATA, 'chrom', 'imac_HisTrap_FF_1mL_step_u7.csv'));
    await h.pool('T1-T6');

    // Add concentration step to divide material (5 mL) and set a concentration so mass is known!
    await p.click('#tl [data-addmenu]'); await p.click('#tl [data-addstep=conc]'); await h.wait(400);
    await p.evaluate(() => { const v = document.getElementById('btw-vOut'); if(v) { v.value = '5'; v.dispatchEvent(new Event('change', {bubbles: true})); } });
    await p.evaluate(() => { const c = document.getElementById('btw-cOut'); if(c) { c.value = '10'; c.dispatchEvent(new Event('change', {bubbles: true})); } });
    await h.wait(600);

    await h.addRun(path.join(DATA, 'chrom', 'sec_S200_Increase_minutes_u7.csv'));
    await h.pool('F1-F6');

    // Check summary table semantics
    await h.step('figure');
    await h.wait(500);

    const sumTable = await h.sumTable();
    const secRow = sumTable.find(r => r[0] && r[0].includes('Size exclusion'));

    if (secRow) {
       T.check('partial/sec_semantics', secRow.includes('Loaded'), `SEC semantics should be Loaded due to partial retention: ${secRow}`);
       const vol = secRow[2];
       T.check('partial/vol_check', vol === '', `Volume should be empty: ${vol}`);
    } else {
       T.check('partial/rows_found', false, `Could not find expected run rows`);
    }
  });

  T.done();
})();
