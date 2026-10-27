const {open, H, suite, path, DATA, fs: hfs} = require('../lib/harness');
async function saved(p) { const dl = p.waitForEvent('download'); await p.locator('#projSave').evaluate(e => e.click()); return JSON.parse(hfs.readFileSync(await (await dl).path(), 'utf8')); }
const T = suite('17_cross_format');
const CH = path.join(DATA, 'chrom');

async function testFormat(filename, desc) {
  const {p, errs, close} = await open();
  const h = H(p);
  const card = p => p.locator('.trace.run.sel').first();
  const num = s => { const m = String(s == null ? '' : s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };

  async function peaks(p, h){
    const t = await h.peakTable();
    if (!t.length) return {head: [], rows: []};
    const head = t[0];
    const iv = head.findIndex(c => /^(Ve|Center|Apex|Elution time)\b/.test(c));
    const ia = head.findIndex(c => /^Area/.test(c));
    const ih = head.findIndex(c => /Height/i.test(c));
    const rows = t.slice(1).filter(r => r.length > 3).map(r => ({
        name: r[0], a: num(r[1]), b: num(r[2]),
        ve: iv >= 0 ? num(r[iv]) : NaN,
        area: ia >= 0 ? num(r[ia]) : NaN,
        height: ih >= 0 ? num(r[ih]) : NaN
    }));
    return {head, rows};
  }

  try {
    await h.newProject('cross_format ' + desc);
    const f = require('path').join(__dirname, '..', 'data', 'chrom', filename);
    await h.addRun(f);
    await p.waitForTimeout(1000);

    const hasCard = await card(p).count();
    T.check(`${desc}/loads`, hasCard > 0, 'Run card should be visible');

    if (hasCard) {
        // 1. Navigate to the run step before clicking #intAuto
        const runStep = (await h.timeline()).find(x => x.k.startsWith('run:'));
        if (runStep) {
          await h.step(runStep.k);
          await p.waitForTimeout(500);
        }

        const setOpt = (p, id, v) => p.evaluate(([id, v]) => { const el = document.getElementById(id); if (!el) return false; el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); return true; }, [id, String(v)]);

        await setOpt(p, 'o-eps', 1.0);
        await setOpt(p, 'o-path', 2.0);
        // Use setOpt to set prominence to 0.5 before detect
        await setOpt(p, 'o-intProm', 0.5);

        // Wait for intAuto to be visible and click it
        await p.waitForSelector('#intAuto', { state: 'visible', timeout: 5000 }).catch(() => {});
        await p.locator('#intAuto').evaluate(el => el.click());
        await p.waitForTimeout(600);

        const P = await peaks(p, h);
        const pk = P.rows;

        T.check(`${desc}/peak-table-rows`, pk.length > 0, `Peak table should have rows, got ${pk.length}`);

        if (pk.length > 0) {
          const hit = pk[0];
          T.check(`${desc}/ve`, Math.abs(hit.ve - 5.0) < 0.1, `Apex should be around 5.0, got ${hit.ve}`);

          if (hit.height != null && !isNaN(hit.height)) {
             T.check(`${desc}/height`, Math.abs(hit.height - 100.0) < 1.0, `Height should be around 100.0, got ${hit.height}`);
          }
          // Area = 100 * sqrt(2*pi) * 0.2 ~= 50.1
          T.check(`${desc}/area`, Math.abs(hit.area - 50.1) < 5.0, `Area should be around 50.1, got ${hit.area}`);
        }
    }

    T.check(`${desc}/no-errors`, errs.length === 0, errs.join(' | '));
    return await saved(p);
  } finally {
    await close();
  }
}

(async () => {
  let synth, dot, comma;
  await T.t('cross_format_synthetic', async () => { synth = await testFormat('synthetic.csv', 'synthetic'); });
  await T.t('cross_format_dot', async () => { dot = await testFormat('cross_format_dot.csv', 'dot'); });
  await T.t('cross_format_comma', async () => { comma = await testFormat('cross_format_comma.csv', 'comma'); });

  if (synth && dot && comma) {
      T.check('cross_format_invariant/dot_vs_synth_uv', JSON.stringify(dot.runs[0].uvs) === JSON.stringify(synth.runs[0].uvs), 'Dot and Synthetic UVs identical');
      T.check('cross_format_invariant/comma_vs_synth_uv', JSON.stringify(comma.runs[0].uvs) === JSON.stringify(synth.runs[0].uvs), 'Comma and Synthetic UVs identical');
      T.check('cross_format_invariant/dot_peaks', JSON.stringify(dot.runs[0].peaks) === JSON.stringify(synth.runs[0].peaks), 'Dot and Synth peaks identical');
      T.check('cross_format_invariant/comma_peaks', JSON.stringify(comma.runs[0].peaks) === JSON.stringify(synth.runs[0].peaks), 'Comma and Synth peaks identical');
  }
  T.done();
})();
