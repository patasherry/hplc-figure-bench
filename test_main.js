const {open, H, path, DATA} = require('./tests/lib/harness');

(async () => {
  const app = await open();
  try {
    const p = app.p;
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
    await p.evaluate(() => {
      const el = document.getElementById('o-wfYield');
      if (el) { el.checked = true; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    });
    await h.step('figure');
    await h.wait(500);

    let rows = await p.evaluate(() => window.__HFB.sumRows());
    let mgOf = await p.evaluate(() => { const r = window.__HFB.sumRows(); return r.length ? r.mgOf(r[0]) : 'no rows'; });
    console.log("sumRows mgOf:", mgOf);

    let a = await p.evaluate(() => window.__HFB.manMg(window.__HFB.runs.find(r=>r.prep==='manual').man));
    console.log("manMg(r.man):", a);

    let ys = await p.evaluate(() => window.__HFB.finalYields());
    console.log("ys.length:", ys.length);
  } finally {
    await app.close();
  }
})();
