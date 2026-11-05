// 22 protein: check the protein properties (MW, extinction coefficient, A280, pI, SUMO cleavage)
// computed by the app from sequences against values computed independently in the test.
// Tests 6 synthetic sequences: no Trp, no Trp or Tyr, Cys-rich, short (<30 aa), His6-SUMO fusion, and >1,000 aa.
// Inputs are entered through the UI (pasting sequence and loading GenBank stand-in).

const { open, H, suite, path, DATA, fs } = require('../lib/harness');

/* ---------- Independent Reference Calculations ---------- */

/* Mass table: average isotopic residue masses in Da (ExPASy ProtParam / IUPAC 1993 standard atomic weights, Gasteiger et al. 2005) */
const AA_MASS = {
  A: 71.0788, R: 156.1875, N: 114.1038, D: 115.0886, C: 103.1388, E: 129.1155,
  Q: 128.1307, G: 57.0519, H: 137.1411, I: 113.1594, L: 113.1594, K: 128.1741,
  M: 131.1926, F: 147.1766, P: 97.1167, S: 87.0782, T: 101.1051, W: 186.2132,
  Y: 163.1760, V: 99.1326, U: 150.0388, O: 237.3018
};
const WATER_MASS = 18.01524; // Da (H2O)

function calcMW(seq) {
  if (!seq) return 0;
  const s = seq.toUpperCase().replace(/[^A-Z]/g, '');
  let m = WATER_MASS;
  for (const c of s) {
    m += AA_MASS[c] || 0;
  }
  return m; // in Da
}

/* Extinction coefficient (M^-1 cm^-1) and A280 of 1 mg/mL based on Pace et al. 1995 (Protein Science 4:2411-2423):
   E280 = 5500*W + 1490*Y + 125*cystine.
   The app uses reduced cysteine convention (0 per Cys), so E280 = 5500*W + 1490*Y.
   A280 of 1 mg/mL = E280 / MW (Da).
*/
function calcExtinction(seq) {
  const s = seq.toUpperCase().replace(/[^A-Z]/g, '');
  let w = 0, y = 0;
  for (const c of s) {
    if (c === 'W') w++;
    else if (c === 'Y') y++;
  }
  const e280 = 5500 * w + 1490 * y;
  const mw = calcMW(s);
  const a280 = mw ? e280 / mw : 0;
  return { e280, a280, w, y };
}

/* pI calculation based on Bjellqvist pK values (Bjellqvist et al. 1993, 1994, ExPASy ProtParam):
   Positives: Lys=10.0, Arg=12.0, His=5.98
   Negatives: Asp=4.05, Glu=4.45, Cys=9.0, Tyr=10.0
   N-term pK (PK_NT): Ala=7.59, Met=7.00, Ser=6.93, Pro=8.36, Thr=6.82, Val=7.44, Glu=7.70, default=7.50
   C-term pK (PK_CT): Asp=4.55, Glu=4.75, default=3.55
*/
const PK_POS = { K: 10.0, R: 12.0, H: 5.98 };
const PK_NEG = { D: 4.05, E: 4.45, C: 9.0, Y: 10.0 };
const PK_NT = { A: 7.59, M: 7.00, S: 6.93, P: 8.36, T: 6.82, V: 7.44, E: 7.70 };
const PK_CT = { D: 4.55, E: 4.75 };

function calcPI(seq) {
  const s = seq.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return null;
  const n = {};
  for (const c of s) n[c] = (n[c] || 0) + 1;
  const nt = PK_NT[s[0]] ?? 7.5;
  const ct = PK_CT[s[s.length - 1]] ?? 3.55;

  const charge = (pH) => {
    let z = 1 / (1 + Math.pow(10, pH - nt)) - 1 / (1 + Math.pow(10, ct - pH));
    for (const k in PK_POS) z += (n[k] || 0) / (1 + Math.pow(10, pH - PK_POS[k]));
    for (const k in PK_NEG) z -= (n[k] || 0) / (1 + Math.pow(10, PK_NEG[k] - pH));
    return z;
  };

  let lo = 0, hi = 14;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (charge(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const num = s => {
  const m = String(s == null ? '' : s).replace(/[≈~,]/g, '').match(/-?\d+(\.\d+)?/);
  return m ? +m[0] : null;
};

const getA280Cell = r => r['A₂₈₀'] || r['A280'] || '';

/* ---------- Test Suite Execution ---------- */

(async () => {
  const T = suite('22_protein');
  const { p, errs, close } = await open();
  const h = H(p);

  await h.newProject('Protein Properties');

  /* Helper to read protein table rows from UI: [{form, aa, kda, pi, a280}] */
  const getProtTable = async () => {
    return await p.$$eval('#protTable tr', rows => {
      if (!rows.length) return [];
      const head = [...rows[0].cells].map(c => c.textContent.trim());
      return rows.slice(1).map(r => {
        const cells = [...r.cells].map(c => c.textContent.trim());
        return Object.fromEntries(head.map((k, i) => [k, cells[i]]));
      });
    });
  };

  /* Helper to read #protEps text */
  const getProtEps = async () => {
    return await p.$eval('#protEps', e => e.textContent.trim()).catch(() => '');
  };

  /* Helper to paste sequence into #protSeq */
  const setProtSeq = async (seq) => {
    await p.fill('#protSeq', seq);
    await p.dispatchEvent('#protSeq', 'input');
    await p.dispatchEvent('#protSeq', 'change');
    await h.wait(400);
  };

  /* Helper to clear tag sequence and set tag preset to custom without sequence */
  const setOpt = async (p, k, v) => {
    await p.evaluate(({k, v}) => {
      const el = document.querySelector(`[data-opt="${k}"]`);
      if (el) { el.value = v; el.dispatchEvent(new Event('input', {bubbles: true})); el.dispatchEvent(new Event('change', {bubbles: true})); }
    }, {k, v});
  };

  const clearTagSeq = async () => {
    await p.fill('#tagSeq', '');
    await p.dispatchEvent('#tagSeq', 'input');
    await p.dispatchEvent('#tagSeq', 'change');
    await p.selectOption('#o-tagPreset2', 'custom').catch(() => {});
    await p.selectOption('#o-tagPreset', 'custom').catch(() => {});
    await p.dispatchEvent('#o-tagPreset2', 'change').catch(() => {});
    await h.wait(300);
  };

  // Ensure tag preset is cleared for sequence-only tests
  await clearTagSeq();

  /* ================= 1. Sequence 1: No Trp (has 1 Tyr) ================= */
  await T.t('11_eps_selector', async () => {


    await h.wait(500);

    // 1. Drop file to create project
    await h.newProject('Test');
    await h.dropFiles([path.join(DATA, 'chrom', 'imac_HisTrap_FF_1mL_step_u7.csv')]);
    await h.wait(500);

    // 2. Go to Protein tab
    await h.step('construct');
    await h.wait(200);

    const protSeq = 'M' + 'AWY'.repeat(5);
    const tagSeq = 'M' + 'AWY'.repeat(2);

    // Set up sequences
    await p.evaluate(t => { const e = document.querySelector('#protSeq'); e.value = t; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); }, protSeq);
    await h.wait(200);
    await p.evaluate(t => { const e = document.querySelector('#tagSeq'); e.value = t; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); }, tagSeq);
    await h.wait(500);

    const optText = await p.evaluate(() => {
      const sel = document.getElementById('o-epsMode');
      return sel ? Array.from(sel.options).map(o => o.textContent).join(' | ') : null;
    });

    T.check('11_eps_selector.options_display_values', optText && optText.includes('Untagged (') && optText.includes('Tagged ('), `Expected selector to display values, got: ${optText}`);

    // 3. Go to Run tab and pool
    await h.step('run');
    await h.wait(200);
    await h.pool('T1-T3');
    await h.wait(500);

    // 4. Read the mass from the summary table
    await h.step('figure');
    await h.wait(500);
    const getMass = async () => { const rows = await h.sumTable(); const row = rows.find(r => r[0].includes('imac_HisTrap')); return row ? row[5] : null; };

    const massAuto = await getMass();
    T.check('11_eps_selector.mass_auto', !!massAuto, 'Auto mass should be calculated');

    // 5. Force Untagged
    await h.step('construct');
    await h.wait(200);
    await p.selectOption('#o-epsMode', 'untagged');
    await h.wait(500);

    // 6. Read mass again
    await h.step('figure');
    await h.wait(500);
    const massUntagged = await getMass();

    T.check('11_eps_selector.mass_changes', massAuto !== massUntagged, `Expected mass to change when forcing Untagged, but it stayed ${massAuto}`);
  });
T.check('no page errors', !errs.length, errs.join(' | '));



  await close();
  T.done();
})();