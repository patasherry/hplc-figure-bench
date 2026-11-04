const {open, H, suite, fs, path, DATA} = require('./tests/lib/harness');

async function test() {
    const app = await open();
    const p = app.p;
    p.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    const h = H(p);

    const openFolds = loc => loc.evaluate(e => { let d = e.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); } });
    const setField = async (sel, v) => { const l = p.locator(sel).first(); await openFolds(l); await l.fill(String(v)); await l.dispatchEvent('change'); await h.wait(150); };

    await h.newProject('Zero vs unknown yield semantic tests');
    await h.gb(path.join(DATA, 'standins', 'pET28-SUMO-standin.gb'));
    await h.addRun(path.join(DATA, 'chrom', 'sec_semicolon_unicorn7.csv'));
    await h.pool('A2-A6');

    await p.evaluate(() => document.querySelector('#tl [data-addmenu]').click()); await h.wait(100);
    await p.evaluate(() => document.querySelector('#tl [data-addstep="man:other"]').click()); await h.wait(500);
    await setField('#man-name', 'Final buffer exchange');
    await setField('#man-conc', '0');
    await setField('#man-vol', '10');

    await h.step('figure');

    // Check what SVG is returning
    let html2 = await p.evaluate(() => document.querySelector('#paper').innerHTML);
    console.log("zero conc HTML:", html2.match(/Final [^\<]*/));

    await p.evaluate(() => {
      const b = document.querySelector('#pr-qcPurity');
      if (b) { b.value = '0% pure by gel'; b.dispatchEvent(new Event('input', {bubbles: true})); b.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.step('figure');
    await h.wait(500);
    html2 = await p.evaluate(() => document.querySelector('#paper').innerHTML);
    console.log("purity zero HTML:", html2.match(/0% pure/));

    await app.close();
}

test().catch(console.error);
