const {open, H, path, DATA} = require('./lib/harness');

(async () => {
  const app = await open();
  try {
    const p = app.p;
    const h = H(p);

    await h.newProject('Zero vs unknown yield semantic tests');
    await h.gb(path.join(DATA, 'standins', 'pET28-SUMO-standin.gb'));
    await h.addRun(path.join(DATA, 'chrom', 'sec_semicolon_unicorn7.csv'));

    await p.evaluate(() => { const sf = document.getElementById('selftest'); if(sf) sf.click(); });
    await h.wait(100);
    await p.evaluate(() => { if (window.__HFB) { window.__HFB.prep.trPlasmid = 'pET28'; window.__HFB.prep.trMethod = 'heat shock'; window.__HFB.prep.trSel = 'Kan'; window.__HFB.prep.strain = 'BL21'; window.__HFB.prep.medium = 'LB'; const r = window.__HFB.runs.find(x => x.file === 'sec_semicolon_unicorn7.csv') || window.__HFB.runs[0]; r.colLog = 'Superdex'; r.mFlow = '1'; r.mBufA = 'Buffer'; window.__HFB.render(); } });
    await h.wait(100);

    let mm = await p.evaluate(() => { const r = window.__HFB.runs[0]; return window.__HFB.runCond(r); });
    console.log("Run conditions:", mm);

  } finally {
    await app.close();
  }
})();
