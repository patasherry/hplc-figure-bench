const {open, H} = require('./tests/lib/harness.js');
async function run() {
  const {p, errs, close} = await open({cloud: false});
  try {
    const h = H(p);
    await h.newProject('test');
    await h.addRun('./tests/data/chrom/imac_HisTrap_FF_1mL_step_u7.csv');
    await h.pool('T1-T3');
    await h.addConc('./tests/data/nd/nd_one_protein_a280.csv', 0.5);
    await p.waitForTimeout(500);

    const sheet = (await p.evaluate(() => { const ss = document.getElementById('stepSheet'), pn = document.getElementById('panel') || document.body, all = pn.innerText, head = (ss ? ss.innerText : '').trim().slice(0, 40), i = head ? all.indexOf(head) : -1; return i >= 0 ? all.slice(i) : all; })).replace(/\s+/g, ' ');
    console.log("sheet length", sheet.length);
    console.log("0.57 in sheet?", sheet.includes('0.57'));
    console.log("0.58 in sheet?", sheet.includes('0.58'));

    // check project JSON: intercept download link
    const projJSON = await p.evaluate(async () => {
        const link = document.querySelector('a[download]');
        if(link) {
           return fetch(link.href).then(r => r.json());
        }
        return null;
    });
    if(projJSON) {
        console.log("projJSON nanodrop", projJSON.nanodrop[0]);
    }
  } finally {
    await close();
  }
}
run();
