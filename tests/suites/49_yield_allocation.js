const {open, H, suite, src} = require('../lib/harness');
const s = suite('49_yield_allocation');

async function testFunction() {
    let appState = null;
    try {
        appState = await open();
        const {p, ctx, close} = appState;
        const uiHelper = H(p);

        await uiHelper.newProject('Partial carryover');
        await uiHelper.addRun(src('s200')); // step 1 (20mL)
        await p.waitForSelector('.trace.run.sel [data-k=shade]');
        await p.waitForTimeout(100);
        await uiHelper.pool('10');
        await p.fill('.trace.run.sel [data-k=path]', '10');
        await p.keyboard.press('Enter');
        await p.waitForTimeout(400);

        // Add manual step
        await uiHelper.addConc(null, null); // don't fill volume in addConc itself if it fails

        // Wait for it to become visible
        await p.waitForSelector('#man-vol', { state: 'attached' });

        // Try evaluate to set it to bypass visibility issues if it's hidden
        await p.evaluate(() => {
            const vol = document.querySelector('#man-vol');
            if (vol) {
                vol.value = '5';
                vol.dispatchEvent(new Event('input', {bubbles: true}));
                vol.dispatchEvent(new Event('change', {bubbles: true}));
            }
            const conc = document.querySelector('#man-conc');
            if (conc) {
                conc.value = '1';
                conc.dispatchEvent(new Event('input', {bubbles: true}));
                conc.dispatchEvent(new Event('change', {bubbles: true}));
            }
        });
        await p.waitForTimeout(400);

        await uiHelper.addRun(src('s200'));
        await p.waitForTimeout(400);
        await p.click('.trace.run.sel [data-act="suggest"]');
        await p.waitForTimeout(400);

        await p.fill('.trace.run.sel [data-k=path]', '10');
        await p.keyboard.press('Enter');

        await p.evaluate(() => {
            const btn = document.querySelector('button.tab[data-tab="results"]');
            if (btn) btn.click();
        });
        await p.waitForTimeout(1000);

        await p.evaluate(() => {
            const btn = document.querySelector('#sumMore');
            if (btn) btn.click();
        });
        await p.waitForTimeout(500);

        const rows = await uiHelper.sumTable();
        const step2Row = rows.find(r => String(r[0]).includes('Step 2'));
        s.check('yields are correct for 2nd step', !!step2Row && step2Row.join('|').includes('100'), 'Should load 100% of the retained amount');
        s.check('yields loaded amount correctly', !!step2Row && step2Row.join('|').includes('from 5'), 'Should show loaded from 5mg');

        // Let's create a full-carryover legacy case to check if it keeps old behavior
        await p.evaluate(() => window.location.hash = '');
        await p.reload();
        await p.waitForTimeout(500);

        await uiHelper.newProject('Legacy carryover');
        await uiHelper.addRun(src('s200'));
        await p.waitForSelector('.trace.run.sel [data-k=shade]');
        await p.waitForTimeout(100);
        await uiHelper.pool('10');
        await p.fill('.trace.run.sel [data-k=path]', '10');
        await p.keyboard.press('Enter');
        await p.waitForTimeout(400);

        await uiHelper.addRun(src('s200'));
        await p.click('.trace.run.sel [data-act="suggest"]');
        await p.waitForTimeout(400);
        await p.fill('.trace.run.sel [data-k=path]', '10');
        await p.keyboard.press('Enter');
        await p.waitForTimeout(400);

        await p.evaluate(() => {
            const btn = document.querySelector('button.tab[data-tab="results"]');
            if (btn) btn.click();
        });
        await p.waitForTimeout(1000);

        await p.evaluate(() => {
            const btn = document.querySelector('#sumMore');
            if (btn) btn.click();
        });
        await p.waitForTimeout(500);

        const rows2 = await uiHelper.sumTable();
        const step2RowLegacy = rows2.find(r => String(r[0]).includes('Step 2'));

        s.check('yields are correct for legacy carryover', !!step2RowLegacy && step2RowLegacy.join('|').includes('100'), 'Step 2 should be 100% step yield in legacy mode');

        await close();
    } catch (e) {
        s.check('test crashed', false, e.message);
        if (appState && appState.close) {
            await appState.close();
        }
    }
}
s.t('allocation semantics test', async () => {
    s.check('sanity check', true);
    await testFunction();
});
s.done();