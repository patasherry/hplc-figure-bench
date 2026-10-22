#!/usr/bin/env python3
"""Synthetic stand-ins for the owner's private lab files, so every suite runs from a public checkout.

The suites were first written against real runs, a real plasmid map and real gel photos. Those stay private
(they are unpublished data). The harness uses a real file when HFB_PRIVATE_DATA points at the folder that
holds it, and otherwise uses the stand-in made here. Stand-ins keep what the suites rely on: the same file
format, fraction labels (T1..T30), column names in the run log, and a His6-SUMO construct.

Also writes the QA fixtures that used to be copies of real files: bom_crlf_Q.csv, the long unicode file
name, corrupt_unicorn.zip, images_only.zip and picture.jpg.

Run: python3 -I tests/data/standins/gen_standins.py   (fixed seed: reruns give identical files)
Needs numpy and Pillow.
"""
import io, os, random, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.dirname(HERE); QA = os.path.join(DATA, 'qa')
sys.path.insert(0, DATA)
from gen_chrom import write_unicorn_csv, frac_events, signal  # noqa: E402

RNG = np.random.default_rng(7); random.seed(7)
out = lambda n: os.path.join(HERE, n)


# ---------------------------------------------------------------- runs (UNICORN 7 CSV, comma, UTF-8, CRLF)
def run(fn, method, cv_line, x_end, comps, pb, cond, frac_start, nfrac, noise=0.6):
    x = np.round(np.arange(0, x_end + 0.0001, 0.02), 4)
    y = signal(x, comps) + RNG.normal(0, noise, x.size)
    ev = frac_events(frac_start, 1.0, [f'T{i}' for i in range(1, nfrac + 1)])
    log = [(0.0, f'Method Run 10/01/2026 9:00:00 AM -07:00 Method: {method} Result: /DefaultHome/standin 001'), (0.0, cv_line),
           (0.0, 'Phase Equilibration'), (2.0, 'Phase Sample Application'), (frac_start, 'Phase Elution')]
    write_unicorn_csv(out(fn), [('UV', 'ml', 'mAU', x, y), ('Conductivity', 'ml', 'mS/cm', x, cond(x)), ('Gradient Concentration', 'ml', '%B', x, pb(x)),
                                ('Fraction', 'ml', 'Fraction', ev, None), ('Injection', 'ml', 'Injection', [(0.0, '')], None), ('Run Log', 'ml', 'Logbook', log, None)])


step = lambda at: (lambda x: np.where(x >= at, 100.0, 0.0))
# IMAC step elution: flow-through hump, elution peak inside T1-T6 (20-26 mL)
run('imac_histrap_1ml_step.csv', 'HisTrap 1 mL FF step', 'Base CV, 0.962 {ml}, HisTrap FF, 1 ml', 40.0,
    [(8.0, 2.5, 1400.0), (22.2, 0.6, 1100.0)], step(20.0), lambda x: np.where(x >= 20, 22.0, 30.0), 20.0, 20)
# a second IMAC run with a smaller, later peak
run('imac_histrap_1ml_ortho.csv', 'HisTrap 1 mL FF step Loop Load', 'Base CV, 0.962 {ml}, HisTrap FF, 1 ml', 40.0,
    [(7.0, 2.0, 900.0), (23.0, 0.7, 450.0)], step(20.0), lambda x: np.where(x >= 20, 22.0, 30.0), 20.0, 20)
# anion exchange on a 6 mL column, linear gradient, main peak inside T11-T16 (30-36 mL)
run('iex_q_6ml.csv', 'Q 6 mL anion exchange', 'Base CV, 6.000 {ml}, Any', 60.0,
    [(33.0, 0.8, 380.0), (39.5, 0.6, 60.0)], lambda x: np.clip((x - 20)/30*100, 0, 100), lambda x: 5 + 0.9*np.clip((x - 20)/30*100, 0, 100), 20.0, 30, 0.8)


# ---------------------------------------------------------------- plasmid: pET-28 style His6-SUMO fusion, GenBank
AA = 'ACDEFGHIKLMNPQRSTVWY'
CODONS = {'A': 'GCG', 'C': 'TGC', 'D': 'GAT', 'E': 'GAA', 'F': 'TTT', 'G': 'GGC', 'H': 'CAT', 'I': 'ATT', 'K': 'AAA', 'L': 'CTG', 'M': 'ATG', 'N': 'AAC',
          'P': 'CCG', 'Q': 'CAG', 'R': 'CGT', 'S': 'AGC', 'T': 'ACC', 'V': 'GTG', 'W': 'TGG', 'Y': 'TAT', '*': 'TAA'}
def protein(n):
    while True:
        s = 'M' + ''.join(random.choice(AA) for _ in range(n - 1))
        if not any(m in s for m in ('IEGR', 'DDDDK', 'QIGG', 'QTGG', 'HHHHHH', 'ENLYFQ', 'LEVLFQ', 'LVPRGS')): return s
TAG = 'MGSSHHHHHHGSGLVPRGSHM'                          # His6 with a linker
SUMO = protein(76)[1:] + 'NDLKTEAREQIGG'                # an invented SUMO-like domain ending in the SUMO protease site
TARGET = 'S' + protein(430)[1:]                         # an invented target protein
ORF = TAG + SUMO + TARGET
backtx = lambda p: ''.join(CODONS[a] for a in p)
def gb():
    bb = lambda n: ''.join(random.choice('ACGT') for _ in range(n))
    up = bb(200); prom = 'TAATACGACTCACTATAGG'; lacO = 'GGAATTGTGAGCGGATAACAATTCC'; rbs = 'AAGGAGATATACC'; cds = backtx(ORF) + 'TAA'
    term = 'CTAGCATAACCCCTTGGGGCCTCTAAACGGGTCTTGAGGGGTTTTTTG'; mid = bb(400); kan = backtx(protein(264)) + 'TAA'; ori = bb(589); tail = bb(300)
    parts = [('', up), ('promoter', prom), ('', bb(6)), ('lac', lacO), ('', bb(20)), ('RBS', rbs), ('', bb(6)), ('CDS', cds), ('', bb(60)), ('terminator', term),
             ('', mid), ('kan', kan), ('', bb(200)), ('ori', ori), ('', tail)]
    seq, pos, loc = '', 1, {}
    for k, s in parts:
        if k: loc[k] = (pos, pos + len(s) - 1)
        seq += s; pos += len(s)
    kanrc = seq[loc['kan'][0] - 1:loc['kan'][1]][::-1].translate(str.maketrans('ACGT', 'TGCA'))
    seq = seq[:loc['kan'][0] - 1] + kanrc + seq[loc['kan'][1]:]
    tx = lambda t: '\n'.join(('                     ' + ('/translation="' if i == 0 else '')) + t[i:i + 58] for i in range(0, len(t), 58)) + '"'
    f = lambda typ, a, b, label, extra='': f'     {typ:<16}{a}..{b}\n                     /label="{label}"\n' + extra
    L = [f'LOCUS       pET28-SUMO-standin       {len(seq)} bp    DNA     circular SYN 01-OCT-2026',
         'DEFINITION  Synthetic stand-in: pET-28 style His6-SUMO fusion of an invented protein.', 'FEATURES             Location/Qualifiers',
         f'     source          1..{len(seq)}\n                     /organism="synthetic construct"',
         f('promoter', *loc['promoter'], 'T7 promoter').rstrip('\n'), f('protein_bind', *loc['lac'], 'lac operator').rstrip('\n'), f('RBS', *loc['RBS'], 'RBS').rstrip('\n'),
         f('CDS', *loc['CDS'], 'His6-SUMO-standin', tx(ORF)).rstrip('\n'),
         f('misc_feature', loc['CDS'][0], loc['CDS'][0] + 3*len(TAG) - 1, '6xHis').rstrip('\n'),
         f('misc_feature', loc['CDS'][0] + 3*len(TAG), loc['CDS'][0] + 3*(len(TAG) + len(SUMO)) - 1, 'SUMO').rstrip('\n'),
         f('terminator', *loc['terminator'], 'T7 terminator').rstrip('\n'),
         f'     CDS             complement({loc["kan"][0]}..{loc["kan"][1]})\n                     /label="KanR"',
         f('rep_origin', *loc['ori'], 'ori').rstrip('\n'), 'ORIGIN']
    for i in range(0, len(seq), 60):
        L.append(f'{i + 1:>9} ' + ' '.join(seq[i:i + 60][j:j + 10].lower() for j in range(0, 60, 10)).rstrip())
    L.append('//')
    open(out('pET28-SUMO-standin.gb'), 'w', newline='\n').write('\n'.join(L) + '\n')


# ---------------------------------------------------------------- gel photo: SDS-PAGE, Coomassie, grayscale
def gel(seed, w=1225, h=740):
    r = random.Random(seed); im = Image.new('L', (w, h), 214); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 150, h], fill=245); d.rectangle([w - 30, 0, w, h], fill=240)
    lanes = 12; x0, lw = 220, 70; ladder = [40, 70, 100, 135, 205, 290, 360, 455, 485, 575, 630]
    for i in range(lanes):
        x = x0 + i*80; d.rectangle([x + 8, 0, x + lw - 8, 22], fill=250)           # wells
        ys = ladder if i == 0 else sorted(r.sample(range(60, 640), r.randint(1, 8)))
        for y in ys:
            dark = r.randint(60, 170) if i else 110
            d.rectangle([x, y, x + lw - 10, y + r.randint(4, 9)], fill=dark)
        if i in (1, 2): d.rectangle([x, 30, x + lw - 10, 620], fill=150)           # crude lysate smear
    im = im.filter(ImageFilter.GaussianBlur(2.2))
    px = np.asarray(im, dtype=np.float32) + np.random.default_rng(seed).normal(0, 3, (h, w))
    return Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    gb()
    gel(1).save(out('gel_photo.jpg'), quality=88)
    # QA fixtures that used to be copies of real files
    q = open(out('iex_q_6ml.csv'), 'rb').read().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n')
    open(os.path.join(QA, 'bom_crlf_Q.csv'), 'wb').write(b'\xef\xbb\xbf' + q)
    open(os.path.join(QA, 'Prøtein_αβ_ÄKTA_µ' + 'x'*180 + '.csv'), 'wb').write(q)
    z = open(os.path.join(DATA, 'chrom', 'sec_Sup6_basic_unicorn7.zip'), 'rb').read()
    open(os.path.join(QA, 'corrupt_unicorn.zip'), 'wb').write(z[:len(z)//3])
    buf = io.BytesIO(); gel(2, 600, 400).save(buf, 'PNG'); png = buf.getvalue()
    with zipfile.ZipFile(os.path.join(QA, 'images_only.zip'), 'w') as f:
        info = lambda n: zipfile.ZipInfo(n, (2026, 10, 1, 0, 0, 0))
        f.writestr(info('gel1.png'), png); f.writestr(info('gel2.png'), png)
    gel(3).save(os.path.join(QA, 'picture.jpg'), quality=88)
    print('stand-ins and QA fixtures written')
