const {open, H, suite} = require('../lib/harness');
const T = suite('19_zero_measurement_import');

async function test_import() {
  await T.t('zero-measurement-import', async () => {
    const app = await open();
    const p = app.p, h = H(p);

    await h.newProject('Zero measurement import test');

    // 1. Generic parsing
    // a. generic_zeros.csv
    await p.setInputFiles('#file', 'data/chrom/generic_zeros.csv');
    await p.waitForTimeout(1000);
    const tl1_after = await h.timeline();
    const tst = await p.locator('.toast').textContent().catch(() => '');
    T.check('generic-zeros-imported', tst.includes('Loaded 1 trace'), 'Generic zero trace should be imported');

    // b. generic_empty.csv
    await p.setInputFiles('#file', 'data/chrom/generic_empty.csv');
    await p.waitForTimeout(400);
    const tl2 = await h.timeline(); T.check('generic-empty-rejected', tl2.length === tl1_after.length, 'Should show error for empty generic data');

    // c. generic_malformed.csv
    await p.setInputFiles('#file', 'data/chrom/generic_malformed.csv');
    await p.waitForTimeout(400);
    const tl3 = await h.timeline(); T.check('generic-malformed-rejected', tl3.length === tl1_after.length, 'Should show error for malformed generic data');

    // Add a valid run so we can move to final stage for NanoDrop
    await h.addRun('data/chrom/valid_unicorn.zip');
    await p.waitForTimeout(500);
    await h.step('final');
    await p.waitForTimeout(200);

    // 2. NanoDrop parsing
    // a. nd_zeros.tsv
    await p.setInputFiles('#ndFile', 'data/nd/nd_zeros.tsv');
    await p.waitForFunction(() => document.querySelectorAll('.ndr').length > 0 || document.querySelector('.toast'));
    const rowsZeros = await p.locator('.ndr').count();
    T.check('nd-zeros-imported', rowsZeros > 0, 'Zero values should be imported');
    const valZeros = await p.$$eval('.nd-v', els => els.map(e => e.textContent));
    T.check('nd-zeros-value', valZeros.some(v => v.includes('0.00') || v.includes('0.0') || v.includes('0 mg/mL')), `Should display 0 concentration, got ${valZeros}`);

    // clear the project or remove the nd items to test empty properly
    // It's easier to create a new project
    await app.close();
  });
}

async function test_nd_empty() {
  await T.t('zero-measurement-empty-malformed', async () => {
    const app = await open();
    const p = app.p, h = H(p);

    await h.newProject('Zero measurement empty malformed');
    await h.addRun('data/chrom/valid_unicorn.zip');
    await p.waitForTimeout(500);
    await h.step('final');
    await p.waitForTimeout(200);

    // b. nd_empty.tsv
    await p.setInputFiles('#ndFile', 'data/nd/nd_empty.tsv');
    await p.waitForTimeout(600);
    const rowsEmpty = await p.locator('.ndr').count();
    T.check('nd-empty-skipped', rowsEmpty === 0, 'Empty data should not be imported');

    // c. nd_malformed.tsv
    await p.setInputFiles('#ndFile', 'data/nd/nd_malformed.tsv');
    await p.waitForTimeout(600);
    const rowsMalformed = await p.locator('.ndr').count();
    T.check('nd-malformed-skipped', rowsMalformed === 0, 'Malformed data should not be imported');

    await app.close();
  });
}

function click(p, sel) { return p.locator(sel).evaluate(e => e.click()).catch(() => {}); }

(async () => {
  await test_import();
  await test_nd_empty();
  T.done();
})();
