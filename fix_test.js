const fs = require('fs');
let code = `const {open, H, suite, path, fs: fsys, DATA} = require('../lib/harness');
const T = suite('41_pool_area');

async function run() {
  const {p, errs, close} = await open();
  const h = H(p);
  await T.t('pool_area_bug', async () => {
    await h.newProject('pool_area_bug_test');
    await h.addRun(path.join(DATA, 'chrom/pool_area_bug.csv'));
    await p.waitForSelector('.trace.run.sel');

    // Set pool to F9-F12
    await h.pool('F9-F12');
    await p.waitForTimeout(500);

    // Make sure TRAP method is used
    await p.evaluate(() => {
        const el = document.getElementById('o-intMethod');
        if (el) {
            el.value = "trap";
            el.dispatchEvent(new Event('input', {bubbles: true}));
            el.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });
    await p.waitForTimeout(500);

    await p.evaluate(() => {
        const b = document.getElementById('intAuto');
        if (b) b.click();
    });

    await p.waitForTimeout(900);

    // Check if we have an input
    await p.evaluate(() => {
        if (!document.querySelector('#intTable input[data-rk="a"]')) {
            const prom = document.getElementById('o-intProm');
            if (prom) {
                prom.value = "0";
                prom.dispatchEvent(new Event('input', {bubbles: true}));
                prom.dispatchEvent(new Event('change', {bubbles: true}));
            }
            const b = document.getElementById('intAuto');
            if (b) b.click();
        }
    });

    await p.waitForTimeout(500);

    // Using evaluate to fill inputs to avoid locator index issues
    await p.evaluate(() => {
        const ra = document.querySelector('#intTable input[data-rk="a"]');
        if (ra) {
            ra.value = "18";
            ra.dispatchEvent(new Event('input', {bubbles: true}));
            ra.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });

    await p.waitForTimeout(500);

    await p.evaluate(() => {
        const rb = document.querySelector('#intTable input[data-rk="b"]');
        if (rb) {
            rb.value = "22";
            rb.dispatchEvent(new Event('input', {bubbles: true}));
            rb.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });

    await p.waitForTimeout(500);

    const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\\d+(\\.\\d+)?/); return m ? +m[0] : NaN; };

    let poolArea = 0, regionArea = 0;
    const trs = await p.locator('#intTable tr').allInnerTexts();
    for (const r of trs) {
        const cols = r.split('\\t');
        if (cols[0] && cols[0].includes('Pool')) {
            poolArea = num(cols[4]);
        }
        if (cols[0] && !cols[0].includes('Pool') && cols.length > 4 && cols[0].includes('P1')) {
            regionArea = num(cols[4]);
        }
    }

    T.check('Match -41', poolArea === -41, \`Pool area \${poolArea} vs expected -41\`);
    T.check('Areas match', poolArea !== 0 && Math.abs(poolArea - regionArea) < 0.1, \`Pool area \${poolArea} vs Region area \${regionArea}\`);
  });
  await close();
  T.done();
}
run();
`;
fs.writeFileSync('tests/suites/41_pool_area.js', code);
