#!/usr/bin/env python3
"""Synthetic NanoDrop exports with known answers. Writes stress/data/nd/* and the "nd" section of expected.json.

Ground truth per file
  n           protein readings the app should keep (nucleic acid readings are not protein)
  mean_abs1   mean mg/mL with "1 Abs = 1 mg/mL" (no coefficient set anywhere): the mean A280 (10 mm)
  mean_eps    mean mg/mL when the A280 of a 1 mg/mL solution is set to EPS: mean A280 / EPS
  sd_abs1     sample SD (n-1) of the readings with 1 Abs = 1 mg/mL
  names       sample names exactly as they should be shown
  r280        A260/A280 of each reading
Fixed values (no randomness), so the means are exact.
"""
import json, os, statistics as st
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'nd'); os.makedirs(OUT, exist_ok=True)
EPS = 0.86
EXP = []
WL = [220 + i for i in range(131)]                     # 220..350 nm, as the NanoDrop One export

def spectrum(a280, r280=0.57):
    """a protein-like spectrum: a peak at 280, a ratio a260/a280 = r280, a steep rise below 240, 0 at 340"""
    w = np.array(WL, float); prot = np.exp(-0.5*((w - 278)/11)**2); nuc = np.exp(-0.5*((w - 260)/13)**2); far = np.exp(-(w - 220)/9)
    p280, n280, p260, n260 = np.interp(280, w, prot), np.interp(280, w, nuc), np.interp(260, w, prot), np.interp(260, w, nuc)
    # solve x*p + y*n so that A280 = a280 and A260 = r280*a280
    A = np.array([[p280, n280], [p260, n260]]); x, y = np.linalg.solve(A, [a280, r280*a280]); s = x*prot + y*nuc + 0.4*a280*far*(w < 250)
    s = s - np.interp(340, w, s)                        # baseline corrected at 340
    s[w == 280] = a280; s[w == 260] = r280*a280
    return [round(float(v), 3) for v in s]

def rec(fn, fmt, readings, note='', nucleic=0, warn_high_ratio=False):
    vals = [r[1] for r in readings]
    EXP.append(dict(file=fn, format=fmt, n=len(readings), names=[r[0] for r in readings], r280=[r[2] for r in readings],
                    mean_abs1=round(st.mean(vals), 4) if vals else None, sd_abs1=round(st.stdev(vals), 4) if len(vals) > 1 else None,
                    mean_eps=round(st.mean(vals)/EPS, 4) if vals else None, eps=EPS, nucleic=nucleic, warn_high_ratio=warn_high_ratio, note=note))

def w(fn, text, enc='utf-8'):
    with open(os.path.join(OUT, fn), 'wb') as f: f.write(b'\xff\xfe' + text.encode('utf-16-le') if enc == 'utf-16-le' else text.encode('utf-8'))

ONE_HEAD = ['Date', 'Sample Name', 'Protein (mg/mL)', 'A280', 'A260/A280', 'Sample Type', 'MW', 'E / 1000', 'Extinction coefficient', 'Baseline Correction (nm)', 'Baseline Absorbance']

# 1. NanoDrop One protein A280, tab separated, UTF-16 LE with BOM (as the instrument writes .csv), no spectra
r1 = [('Pool T2-T6 conc', 2.104, 0.57), ('Pool T2-T6 conc', 2.131, 0.57), ('Pool T2-T6 conc', 2.075, 0.58)]
lines = ['\t'.join(ONE_HEAD)] + ['\t'.join(['10/22/2026 9:41:48 AM', n, f'{a:.3f}', f'{a:.3f}', f'{r:.2f}', '1 Abs = 1 mg / mL', '', '', '', '340', '0.012']) for n, a, r in r1]
w('nd_one_protein_a280.csv', '\r\n'.join(lines) + '\r\n', 'utf-16-le')
rec('nd_one_protein_a280.csv', 'NanoDrop One Protein A280, tab, UTF-16 LE BOM, no spectra', r1, 'three replicates of one tube')

# 2. NanoDrop One with spectra 220..350 (comma, UTF-8), like the lab's conc_spec.csv
r2 = [('Sample 1', 2.939, 0.57), ('Sample 2', 2.959, 0.57), ('Sample 3', 2.909, 0.57)]
head = ['Sample Name', 'Date & Time', 'A280 Conc. (mg/mL)', 'A260/A280', 'A280 (Abs)', 'A260 (Abs)', 'Sample Type', 'Baseline Correction (nm)'] + [str(x) for x in WL]
lines = [','.join(head)] + [','.join([n, '10/22/2026 14:13', f'{a:.3f}', f'{r:.2f}', f'{a:.3f}', f'{a*r:.3f}', '1 Abs = 1 mg/mL', '340'] + [f'{v:.3f}' for v in spectrum(a, r)]) for n, a, r in r2]
w('nd_one_with_spectra.csv', '\r\n'.join(lines) + '\r\n')
rec('nd_one_with_spectra.csv', 'NanoDrop One Protein A280 with spectra 220-350 nm, comma, UTF-8', r2)

# 3. ND-2000 TSV
r3 = [('KPP-MM final', 1.502, 0.56), ('KPP-MM final', 1.488, 0.57), ('KPP-MM final', 1.515, 0.56), ('KPP-MM final', 1.495, 0.57)]
head = ['Sample ID', 'User name', 'Date', 'Time', 'mg/ml', 'A280 10 mm', 'A260 10 mm', '260/280', 'Sample Type', 'Factor']
lines = ['\t'.join(head)] + ['\t'.join([n, 'PS', '10/22/2026', '15:02', f'{a:.3f}', f'{a:.3f}', f'{a*r:.3f}', f'{r:.2f}', '1 Abs = 1 mg/ml', '1.00']) for n, a, r in r3]
w('nd2000_protein.tsv', '\r\n'.join(lines) + '\r\n')
rec('nd2000_protein.tsv', 'ND-2000 protein A280, tab, UTF-8', r3)

# 4. replicate set with a known mean 1.0000 and SD 0.0791
r4 = [(f'Rep {i}', a, 0.57) for i, a in enumerate([1.00, 1.10, 0.90, 1.05, 0.95], 1)]
lines = ['\t'.join(ONE_HEAD)] + ['\t'.join(['10/22/2026 9:50:00 AM', n, f'{a:.3f}', f'{a:.3f}', f'{r:.2f}', '1 Abs = 1 mg / mL', '', '', '', '340', '0.010']) for n, a, r in r4]
w('nd_replicates_sd.csv', '\r\n'.join(lines) + '\r\n', 'utf-16-le')
rec('nd_replicates_sd.csv', 'NanoDrop One, 5 replicates', r4, 'mean 1.000, SD 0.0791')

# 5. nucleic acid file (dsDNA, ng/uL): no protein reading
lines = ['\t'.join(['Date', 'Sample Name', 'Nucleic Acid(ng/uL)', 'A260/A280', 'A260/A230', 'A260', 'A280', 'Sample Type', 'Factor']),
         '\t'.join(['10/22/2026 10:00:00 AM', 'pET28-SUMO-KPP miniprep', '152.3', '1.86', '2.10', '3.046', '1.638', 'dsDNA', '50.00'])]
w('nd_nucleic.csv', '\r\n'.join(lines) + '\r\n', 'utf-16-le')
EXP.append(dict(file='nd_nucleic.csv', format='NanoDrop One dsDNA, ng/uL', n=0, names=[], r280=[], mean_abs1=None, sd_abs1=None, mean_eps=None, eps=EPS, nucleic=1, warn_high_ratio=False,
                note='a nucleic acid reading is never a protein concentration'))

# 6. one protein reading contaminated with nucleic acid (A260/A280 1.25)
r6 = [('IMAC pool unfiltered', 1.500, 1.25)]
lines = ['\t'.join(ONE_HEAD)] + ['\t'.join(['10/22/2026 9:55:00 AM', n, f'{a:.3f}', f'{a:.3f}', f'{r:.2f}', '1 Abs = 1 mg / mL', '', '', '', '340', '0.020']) for n, a, r in r6]
w('nd_high_260_280.csv', '\r\n'.join(lines) + '\r\n', 'utf-16-le')
rec('nd_high_260_280.csv', 'NanoDrop One, A260/A280 1.25', r6, 'should be flagged as nucleic acid contamination', warn_high_ratio=True)

# 7. names with commas, quotes and unicode (comma CSV, quoted fields, UTF-8)
r7 = [('Pool 1.E.7–1.F.6, conc', 3.210, 0.56), ('KPP-MM α/β 4 °C', 3.180, 0.57), ('Ulp1 cut, "final"', 3.240, 0.57)]
q = lambda s: '"' + s.replace('"', '""') + '"'
lines = [','.join(ONE_HEAD)] + [','.join([q('10/22/2026 9:58:00 AM'), q(n), f'{a:.3f}', f'{a:.3f}', f'{r:.2f}', q('1 Abs = 1 mg / mL'), '', '', '', '340', '0.011']) for n, a, r in r7]
w('nd_names_commas_unicode.csv', '\r\n'.join(lines) + '\r\n')
rec('nd_names_commas_unicode.csv', 'NanoDrop One, comma CSV, quoted names with commas, quotes and unicode', r7)

# 8. Acclaro nucleic acid corrected concentration in ug/mL
r8 = [('Nucleic Acid Corrected Sample', 2.500, 0.57)] # a = conc for rec
head = ['Sample Name', 'Date & Time', 'A280 Conc. (\u00b5g/mL)', 'A260/A280', 'A280 (Abs)', 'A260 (Abs)', 'Sample Type', 'Baseline Correction (nm)', 'Corrected Conc. (ug/mL)'] + [str(x) for x in WL]
# Note: for Acclaro, correct concentration by 0.8
lines = [','.join(head)] + [','.join([n, '10/22/2026 14:13', f'{a*1000:.3f}', f'{r:.2f}', f'{a:.3f}', f'{a*r:.3f}', '1 Abs = 1 mg/mL', '340', f'{a*0.8*1000:.3f}'] + [f'{v:.3f}' for v in spectrum(a, r)]) for n, a, r in r8]
w('nd_acclaro_ug_ml.csv', '\r\n'.join(lines) + '\r\n')
rec('nd_acclaro_ug_ml.csv', 'Acclaro nucleic acid corrected concentration in ug/mL', [(r8[0][0], a*0.8, r8[0][2]) for n, a, r in r8])


# 9. NanoDrop multiline preamble (comma, UTF-8)
r9 = [('Sample 1', 2.500, 0.57), ('Sample 2', 2.600, 0.57), ('Sample 3', 2.400, 0.58)]
preamble = [
    'Instrument Information',
    'Model,NanoDrop One',
    'Serial Number,ND-1000',
    'Software Version,1.5.0',
    'Date,2026-10-23',
    'Time,16:00:00',
    '',
    'Experiment Summary',
    'Operator,Patrick',
    'Blank Method,Buffer A',
    'Measurement Type,Protein A280',
    '',
    'Data Table Follows'
]
lines = preamble + [','.join(ONE_HEAD)] + [','.join(['10/23/2026 16:00:00 AM', n, f'{a:.3f}', f'{a:.3f}', f'{r:.2f}', '1 Abs = 1 mg / mL', '', '', '', '340', '0.012']) for n, a, r in r9]
w('nd_multiline_preamble.csv', '\r\n'.join(lines) + '\r\n')
rec('nd_multiline_preamble.csv', 'NanoDrop One with multiline preamble', r9, 'Should skip metadata preamble')

if __name__ == '__main__':
    p = os.path.join(HERE, 'expected.json'); doc = json.load(open(p)) if os.path.exists(p) else {}
    doc['nd'] = EXP; doc['nd_note'] = __doc__.split('Ground truth per file')[1].strip()
    json.dump(doc, open(p, 'w'), indent=1, ensure_ascii=False); print(f'{len(EXP)} NanoDrop files -> {OUT}')
