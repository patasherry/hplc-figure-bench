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
  await T.t('1_no_trp', async () => {
    const seq = 'MSDSEVNQEAKPEVKPEVKPETHINLKVSDGSSEIFFKIKKTTPLRRLMEAFAKRQGKEMDSLRFLYDGIRIQADQTPEDLDMEDNDIIEAHREQIGG';
    await setProtSeq(seq);

    const expMW = calcMW(seq); // 11048.24 Da -> 11.0 kDa
    const expKDa = expMW / 1000;
    const expPI = calcPI(seq); // ~4.67
    const expExt = calcExtinction(seq); // E280 = 1490 (1 Y, 0 W), A280 = 0.1348

    const tbl = await getProtTable();
    T.check('1_no_trp.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      const gotAa = num(r.aa);
      const gotKDa = num(r.kDa);
      const gotPI = num(r.pI);
      const gotA280 = num(getA280Cell(r));

      T.check('1_no_trp.aa_count', gotAa === seq.length, `expected ${seq.length}, got ${gotAa}`);
      T.check('1_no_trp.mw', gotKDa != null && T.near(gotKDa, expKDa, 0.15), `expected ~${expKDa.toFixed(1)} kDa, got ${gotKDa}`);
      T.check('1_no_trp.pi', gotPI != null && Math.abs(gotPI - expPI) <= 0.05, `expected pI ${expPI.toFixed(2)} ±0.05 (Bjellqvist), got ${gotPI}`);
      T.check('1_no_trp.a280', gotA280 != null && T.near(gotA280, expExt.a280, 0.02), `expected A280 ${expExt.a280.toFixed(2)} (Pace 1995), got ${gotA280}`);
    }

    const epsText = await getProtEps();
    T.check('1_no_trp.eps_text', epsText.includes('1,490') || epsText.includes('1490'), `expected 1,490 M^-1 cm^-1 in "${epsText}"`);
  });

  /* ================= 2. Sequence 2: No Trp or Tyr ================= */
  await T.t('2_no_trp_or_tyr', async () => {
    const seq = 'MAAAAAKKKKEEEEDDDDKGGG';
    await clearTagSeq();
    await setProtSeq(seq);

    const expMW = calcMW(seq); // 2234.36 Da -> 2.2 kDa
    const expKDa = expMW / 1000;
    const expPI = calcPI(seq); // ~4.89
    const expExt = calcExtinction(seq); // E280 = 0, A280 = 0

    const tbl = await getProtTable();
    T.check('2_no_trp_or_tyr.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      const gotAa = num(r.aa);
      const gotKDa = num(r.kDa);
      const gotPI = num(r.pI);

      T.check('2_no_trp_or_tyr.aa_count', gotAa === seq.length, `expected ${seq.length}, got ${gotAa}`);
      T.check('2_no_trp_or_tyr.mw', gotKDa != null && T.near(gotKDa, expKDa, 0.15), `expected ~${expKDa.toFixed(1)} kDa, got ${gotKDa}`);
      T.check('2_no_trp_or_tyr.pi', gotPI != null && Math.abs(gotPI - expPI) <= 0.05, `expected pI ${expPI.toFixed(2)} ±0.05, got ${gotPI}`);
      T.check('2_no_trp_or_tyr.a280_none', getA280Cell(r).toLowerCase().includes('none'), `expected 'none' for 0 absorber protein, got '${getA280Cell(r)}'`);
    }

    const epsText = await getProtEps();
    T.check('2_no_trp_or_tyr.eps_empty', !epsText || !epsText.includes('M⁻¹cm⁻¹'), `expected no extinction text for sequence without W or Y, got "${epsText}"`);
  });

  /* ================= 3. Sequence 3: Cys-rich (reduced Cys convention) ================= */
  await T.t('3_cys_rich', async () => {
    const seq = 'MCCCCCCWYYAKREDC'; // 16 aa, 7 Cys, 1 W, 2 Y
    await clearTagSeq();
    await setProtSeq(seq);

    const expMW = calcMW(seq); // 1939.26 Da -> 1.9 kDa
    const expKDa = expMW / 1000;
    const expPI = calcPI(seq); // ~5.52
    const expExt = calcExtinction(seq); // E280 = 5500*1 + 1490*2 = 8480, A280 = 8480 / 1939.26 = 4.3728

    const tbl = await getProtTable();
    T.check('3_cys_rich.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      const gotAa = num(r.aa);
      const gotKDa = num(r.kDa);
      const gotPI = num(r.pI);
      const gotA280 = num(getA280Cell(r));

      T.check('3_cys_rich.aa_count', gotAa === seq.length, `expected ${seq.length}, got ${gotAa}`);
      T.check('3_cys_rich.mw', gotKDa != null && T.near(gotKDa, expKDa, 0.15), `expected ~${expKDa.toFixed(1)} kDa, got ${gotKDa}`);
      T.check('3_cys_rich.pi', gotPI != null && Math.abs(gotPI - expPI) <= 0.05, `expected pI ${expPI.toFixed(2)} ±0.05, got ${gotPI}`);
      T.check('3_cys_rich.a280_reduced_convention', gotA280 != null && T.near(gotA280, expExt.a280, 0.05), `expected A280 ${expExt.a280.toFixed(2)} (reduced Cys), got ${gotA280}`);
    }

    const epsText = await getProtEps();
    T.check('3_cys_rich.eps_text_8480', epsText.includes('8,480') || epsText.includes('8480'), `expected ε280 = 8,480 (reduced Cys: 5500*W + 1490*Y + 0*Cys), got "${epsText}"`);
  });

  /* ================= 4. Sequence 4: Very short (< 30 aa) ================= */
  await T.t('4_short_seq', async () => {
    const seq = 'MWYAKREDC'; // 9 aa
    await clearTagSeq();
    await setProtSeq(seq);

    const expMW = calcMW(seq); // 1201.38 Da -> 1.2 kDa
    const expKDa = expMW / 1000;
    const expPI = calcPI(seq); // ~6.00
    const expExt = calcExtinction(seq); // E280 = 6990, A280 = 5.818

    const tbl = await getProtTable();
    T.check('4_short_seq.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      const gotAa = num(r.aa);
      const gotKDa = num(r.kDa);
      const gotPI = num(r.pI);
      const gotA280 = num(getA280Cell(r));

      T.check('4_short_seq.aa_count', gotAa === seq.length, `expected ${seq.length}, got ${gotAa}`);
      T.check('4_short_seq.mw', gotKDa != null && T.near(gotKDa, expKDa, 0.15), `expected ~${expKDa.toFixed(1)} kDa, got ${gotKDa}`);
      T.check('4_short_seq.pi', gotPI != null && Math.abs(gotPI - expPI) <= 0.05, `expected pI ${expPI.toFixed(2)} ±0.05, got ${gotPI}`);
      T.check('4_short_seq.a280', gotA280 != null && T.near(gotA280, expExt.a280, 0.05), `expected A280 ${expExt.a280.toFixed(2)}, got ${gotA280}`);
    }
  });

  /* ================= 5. Sequence 5: His6-SUMO fusion with QIGG site ================= */
  await T.t('5_sumo_fusion_genbank', async () => {
    const gbFile = path.join(DATA, 'standins/sumo_fusion_test.gb');
    await h.gb(gbFile);
    await h.wait(1500);

    const tagSeq = 'MGSSHHHHHHGSGLVPRGSASMSDSEVNQEAKPEVKPEVKPETHINLKVSDGSSEIFFKIKKTTPLRRLMEAFAKRQGKEMDSLRFLYDGIRIQADQTPEDLDMEDNDIIEAHREQIGG'; // 119 aa
    const protSeq = 'MPKSFYVNKL' + 'AE'.repeat(70); // 150 aa
    const fullOrf = tagSeq + protSeq; // 269 aa

    const expTagMW = calcMW(tagSeq); // 13000.96 Da -> 13.0 kDa
    const expProtMW = calcMW(protSeq); // 15221.89 Da -> 15.2 kDa
    const expFullMW = calcMW(fullOrf); // 28204.83 Da -> 28.2 kDa

    const expTagPI = calcPI(tagSeq);
    const expProtPI = calcPI(protSeq);
    const expFullPI = calcPI(fullOrf);

    const tbl = await getProtTable();
    T.check('5_sumo_fusion.table_has_forms', tbl.length >= 2, JSON.stringify(tbl));

    const untaggedRow = tbl.find(r => /^untagged$/i.test(r.Form || r.form || ''));
    const taggedRow = tbl.find(r => /^tagged$/i.test(r.Form || r.form || ''));
    const tagOnlyRow = tbl.find(r => /^tag only$/i.test(r.Form || r.form || ''));

    T.check('5_sumo_fusion.untagged_row_found', !!untaggedRow, 'Untagged row in table');
    if (untaggedRow) {
      const gotKDa = num(untaggedRow.kDa);
      const gotPI = num(untaggedRow.pI);
      T.check('5_sumo_fusion.cleaved_protein_mw', gotKDa != null && T.near(gotKDa, expProtMW / 1000, 0.2), `expected cleaved protein ~${(expProtMW / 1000).toFixed(1)} kDa, got ${gotKDa}`);
      T.check('5_sumo_fusion.cleaved_protein_pi', gotPI != null && Math.abs(gotPI - expProtPI) <= 0.05, `expected cleaved protein pI ${expProtPI.toFixed(2)} ±0.05, got ${gotPI}`);
    }

    if (taggedRow) {
      const gotKDa = num(taggedRow.kDa);
      const gotPI = num(taggedRow.pI);
      T.check('5_sumo_fusion.tagged_fusion_mw', gotKDa != null && T.near(gotKDa, expFullMW / 1000, 0.2), `expected tagged fusion ~${(expFullMW / 1000).toFixed(1)} kDa, got ${gotKDa}`);
      T.check('5_sumo_fusion.tagged_fusion_pi', gotPI != null && Math.abs(gotPI - expFullPI) <= 0.05, `expected tagged fusion pI ${expFullPI.toFixed(2)} ±0.05, got ${gotPI}`);
    }

    if (tagOnlyRow) {
      const gotKDa = num(tagOnlyRow.kDa);
      const gotPI = num(tagOnlyRow.pI);
      T.check('5_sumo_fusion.free_tag_mw', gotKDa != null && T.near(gotKDa, expTagMW / 1000, 0.2), `expected free tag ~${(expTagMW / 1000).toFixed(1)} kDa, got ${gotKDa}`);
      T.check('5_sumo_fusion.free_tag_pi', gotPI != null && Math.abs(gotPI - expTagPI) <= 0.05, `expected free tag pI ${expTagPI.toFixed(2)} ±0.05, got ${gotPI}`);
    }
  });


  /* ================= 7. GenBank Table 11 + Partial CDS ================= */
  await T.t('7_transl.table11_partial', async () => {
    // 1. Partial CDS where first codon is non-M initiator (GTG).
    // GTG + 10x AWY + TAA (96 nt total) -> <1..96
    const ntSeq = 'GTG' + 'GCTTGGTAT'.repeat(10) + 'TAA';
    const gbPartial = `LOCUS       test_plasmid          96 bp    DNA
FEATURES             Location/Qualifiers
     CDS             <1..96
                     /transl_table=11
ORIGIN
        1 ${ntSeq}
//`;
    const partialFile = path.join(DATA, 'standins/partial_test.gb');
    fs.writeFileSync(partialFile, gbPartial);

    await clearTagSeq();
    await h.gb(partialFile);
    await h.wait(1500);

    const partialSeq = await p.$eval('#protSeq', e => e.value);
    const expPartial = 'V' + 'AWY'.repeat(10); // Not M, because partial5 disables initiation override
    T.check('7_transl.table11_partial', partialSeq === expPartial, `expected ${expPartial}, got ${partialSeq}`);
    T.check('7_transl.table11_partial_len', partialSeq.length === expPartial.length, `seq length mismatch ${partialSeq.length}`);

    // 2. Complete CDS with GTG start -> translates to M
    const gbComplete = `LOCUS       test_plasmid          96 bp    DNA
FEATURES             Location/Qualifiers
     CDS             1..96
                     /transl_table=11
ORIGIN
        1 ${ntSeq}
//`;
    const completeFile = path.join(DATA, 'standins/complete_test.gb');
    fs.writeFileSync(completeFile, gbComplete);

    await h.gb(completeFile);
    await h.wait(1500);

    const compSeq = await p.$eval('#protSeq', e => e.value);
    const expComplete = 'M' + 'AWY'.repeat(10);
    T.check('7_transl.table11_complete', compSeq === expComplete, `expected M start (table 11), got ${compSeq}`);

    // 3. Unsupported table test (transl_table=4) - should be filtered out
    const gbUnsupported = `LOCUS       test_plasmid          96 bp    DNA
FEATURES             Location/Qualifiers
     CDS             1..96
                     /transl_table=4
ORIGIN
        1 ${ntSeq}
//`;
    const unsupportedFile = path.join(DATA, 'standins/unsupported_test.gb');
    fs.writeFileSync(unsupportedFile, gbUnsupported);

    // reset sequence first so we can see if it loads nothing
    await setProtSeq('MAAAAA');
    await h.gb(unsupportedFile);
    await h.wait(1500);

    const unsuppSeq = await p.$eval('#protSeq', e => e.value);
    // If it's filtered, it should not load into the UI and 'MAAAAA' will remain, or it will be cleared.
    // The previous test will have cleared it to empty maybe, but let's check it doesn't translate it incorrectly.
    // When gbCassette returns null, the file parsing doesn't load a sequence.
    T.check('7_transl.unsupported_filtered', !unsuppSeq.includes('VAWY') && !unsuppSeq.includes('MAWY'), `unsupported table should not fallback translate, got ${unsuppSeq}`);

    // 4. Explicit /translation control on unsupported table
    const gbExplicit = `LOCUS       test_plasmid          96 bp    DNA
FEATURES             Location/Qualifiers
     CDS             1..96
                     /transl_table=4
                     /translation="EXPLICITEXPLICITEXPLICITEXPLICIT"
ORIGIN
        1 ${ntSeq}
//`;
    const explicitFile = path.join(DATA, 'standins/explicit_test.gb');
    fs.writeFileSync(explicitFile, gbExplicit);

    await h.gb(explicitFile);
    await h.wait(1500);
    const expSeq = await p.$eval('#protSeq', e => e.value);
    T.check('7_transl.explicit_translation', expSeq === 'EXPLICITEXPLICITEXPLICITEXPLICIT', `expected EXPLICITEXPLICITEXPLICITEXPLICIT, got ${expSeq}`);

    // Clean up
    fs.unlinkSync(partialFile);
    fs.unlinkSync(completeFile);
    fs.unlinkSync(unsupportedFile);
    fs.unlinkSync(explicitFile);
  });

  /* ================= 6. Sequence 6: Over 1,000 aa ================= */
  await T.t('6_large_protein', async () => {
    const block = 'MSDSEVNQEAKPEVKPEVKPETHINLKVSDGSSEIFFKIKKTTPLRRLMEAFAKRQGKEMDSLRFLYDGIRIQADQTPEDLDMEDNDIIEAHREQIGGMWYACD'; // 105 aa (1 W, 2 Y)
    const seq = block.repeat(10); // 1050 aa (10 W, 20 Y)
    await clearTagSeq();
    await setProtSeq(seq);

    const expMW = calcMW(seq); // 120443.92 Da -> 120.4 kDa
    const expKDa = expMW / 1000;
    const expPI = calcPI(seq); // ~4.89
    const expExt = calcExtinction(seq); // E280 = 5500*10 + 1490*20 = 84,800, A280 = 0.704

    const tbl = await getProtTable();
    T.check('6_large_protein.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      const gotAa = num(r.aa);
      const gotKDa = num(r.kDa);
      const gotPI = num(r.pI);
      const gotA280 = num(getA280Cell(r));

      T.check('6_large_protein.aa_count', gotAa === seq.length, `expected ${seq.length}, got ${gotAa}`);
      T.check('6_large_protein.mw', gotKDa != null && T.near(gotKDa, expKDa, 0.5), `expected ~${expKDa.toFixed(1)} kDa, got ${gotKDa}`);
      T.check('6_large_protein.pi', gotPI != null && Math.abs(gotPI - expPI) <= 0.05, `expected pI ${expPI.toFixed(2)} ±0.05, got ${gotPI}`);
      T.check('6_large_protein.a280', gotA280 != null && T.near(gotA280, expExt.a280, 0.02), `expected A280 ${expExt.a280.toFixed(2)}, got ${gotA280}`);
    }

    const epsText = await getProtEps();
    T.check('6_large_protein.eps_text_84800', epsText.includes('84,800') || epsText.includes('84800'), `expected ε280 = 84,800, got "${epsText}"`);
  });

  /* ================= 7. Sequence with no Trp or Tyr ================= */
  await T.t('7_no_trp_tyr', async () => {
    const seq = 'MAGSKLLPEDGHHGSS';
    await clearTagSeq();
    await setProtSeq(seq);

    const tbl = await getProtTable();
    T.check('7_no_trp_tyr.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      T.check('7_no_trp_tyr.a280_none', getA280Cell(r).toLowerCase().includes('none'), `expected 'none' for 0 absorber protein, got '${getA280Cell(r)}'`);
    }

    const epsText = await getProtEps();
    T.check('7_no_trp_tyr.no_eps', !epsText || !epsText.includes('M⁻¹cm⁻¹'), `expected no extinction text for sequence without W or Y, got "${epsText}"`);
  });

  /* ================= 7. Thrombin cleavage product ================= */
  await T.t('7_thrombin_cleavage', async () => {
    const seq = 'M' + 'AWY'.repeat(10); // 31 aa
    await clearTagSeq();
    await setProtSeq(seq);
    // wait for a bit
    await h.wait(500);

    // we need to set the tag preset to His
    await setOpt(p, 'tagPreset', 'his');
    await p.waitForTimeout(500);

    // Compare the table
    const tbl = await getProtTable();
    T.check('7_thrombin_cleavage.table_has_forms', tbl.length >= 2, JSON.stringify(tbl));

    const untaggedRow = tbl.find(r => /^untagged$/i.test(r.Form || r.form || ''));
    if (untaggedRow) {
      const gotAa = num(untaggedRow.aa);
      const gotKDa = num(untaggedRow.kDa);
      T.check('7_thrombin_cleavage.cleaved_protein_aa', gotAa === 34, `expected 34 aa (GSH + M + AWYx10), got ${gotAa}`);
      // expected Da is 4635.15904 -> ~4.6 kDa
      T.check('7_thrombin_cleavage.cleaved_protein_mw', gotKDa != null && T.near(gotKDa, 4.635, 0.05), `expected cleaved protein ~4.6 kDa, got ${gotKDa}`);
    }

    // Compare the construct figure and post-cleavage NanoDrop conversion?
    const epsText = await getProtEps();
    // E280 for 10 W, 10 Y = 5500*10 + 1490*10 = 69900.
    // MW = 4635.159. 69900 / 4635.159 = 15.0803887
    T.check('7_thrombin_cleavage.eps_text', epsText.includes('15.08'), `expected 15.08, got "${epsText}"`);
  });







  /* ================= 7. Sequence 7: Unknown Residues ================= */
  await T.t('7_unknown_residues', async () => {
    // A sequence with unknown residues (30 X's) and W to trigger A280 computation.
    const unkSeq = 'M' + 'X'.repeat(30) + 'W';
    await clearTagSeq();
    await setProtSeq(unkSeq);

    let tbl = await getProtTable();
    T.check('7_unknown_residues.table_has_row', tbl.length >= 1, JSON.stringify(tbl));
    if (tbl.length) {
      const r = tbl[0];
      T.check('7_unknown_residues.mw_approx', r.kDa && r.kDa.includes('≈'), `expected kDa to be prefixed with '≈', got ${r.kDa}`);
      T.check('7_unknown_residues.pi_approx', r.pI && r.pI.includes('≈'), `expected pI to be prefixed with '≈', got ${r.pI}`);
      T.check('7_unknown_residues.a280_approx', getA280Cell(r).includes('≈'), `expected A280 to be prefixed with '≈', got ${getA280Cell(r)}`);

      const formText = r.Form || r.form || '';
      T.check('7_unknown_residues.approx_label', formText.includes('approximate: 30 unknown residues counted as average'), `expected approximation label in form cell, got ${formText}`);
    }

    let epsText = await getProtEps();
    T.check('7_unknown_residues.eps_approx_label', epsText.includes('approximate: 30 unknown residues counted as average'), `expected approximation label in eps text, got "${epsText}"`);

    // Control: Resolved sequence without X's
    const resolvedSeq = 'MW';
    await setProtSeq(resolvedSeq);

    tbl = await getProtTable();
    if (tbl.length) {
      const r = tbl[0];
      T.check('7_unknown_residues.control_mw_exact', r.kDa && !r.kDa.includes('≈'), `expected resolved kDa to not be prefixed with '≈', got ${r.kDa}`);
      T.check('7_unknown_residues.control_pi_exact', r.pI && !r.pI.includes('≈'), `expected resolved pI to not be prefixed with '≈', got ${r.pI}`);
      T.check('7_unknown_residues.control_a280_exact', !getA280Cell(r).includes('≈'), `expected resolved A280 to not be prefixed with '≈', got ${getA280Cell(r)}`);

      const formText = r.Form || r.form || '';
      T.check('7_unknown_residues.control_no_approx_label', !formText.includes('approximate'), `expected no approximation label in resolved form cell, got ${formText}`);
    }

    epsText = await getProtEps();
    T.check('7_unknown_residues.control_eps_no_approx_label', !epsText.includes('approximate'), `expected no approximation label in resolved eps text, got "${epsText}"`);
  });

  /* ================= 8. Cleared sequence ================= */
  await T.t('8_cleared_seq', async () => {
    await clearTagSeq();
    await setProtSeq('MAWYKLLPEDG');

    const tbl = await getProtTable();
    T.check('8_cleared_seq.has_rows_first', tbl.length >= 1, `expected at least 1 row before clearing, got ${tbl.length}`);

    await setProtSeq('');

    const tbl2 = await getProtTable();
    T.check('8_cleared_seq.no_rows', tbl2.length === 0, `expected no rows after clearing, got ${tbl2.length}`);

    const epsText = await getProtEps();
    T.check('8_cleared_seq.eps_empty', epsText === '', `expected eps text to be empty after clearing, got "${epsText}"`);
  });

  T.check('no page errors', !errs.length, errs.join(' | '));
  await close();
  T.done();
})();