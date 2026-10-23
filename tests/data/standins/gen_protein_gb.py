#!/usr/bin/env python3
"""Generates a synthetic GenBank stand-in file for protein test suite (22_protein.js)."""
import os

HERE = os.path.dirname(os.path.abspath(__file__))

CODONS = {
    'A': 'GCG', 'C': 'TGC', 'D': 'GAT', 'E': 'GAA', 'F': 'TTT', 'G': 'GGC',
    'H': 'CAT', 'I': 'ATT', 'K': 'AAA', 'L': 'CTG', 'M': 'ATG', 'N': 'AAC',
    'P': 'CCG', 'Q': 'CAG', 'R': 'CGT', 'S': 'AGC', 'T': 'ACC', 'V': 'GTG',
    'W': 'TGG', 'Y': 'TAT', '*': 'TAA'
}

# Tag: His6-SUMO tag ending in QIGG (119 aa)
TAG_SEQ = "MGSSHHHHHHGSGLVPRGSASMSDSEVNQEAKPEVKPEVKPETHINLKVSDGSSEIFFKIKKTTPLRRLMEAFAKRQGKEMDSLRFLYDGIRIQADQTPEDLDMEDNDIIEAHREQIGG"

# Target protein: 150 aa so that cleavage site pos 119 < 0.55 * 269 (147.95)
PROT_SEQ = "MPKSFYVNKL" + "AE" * 70  # 10 + 140 = 150 aa
ORF = TAG_SEQ + PROT_SEQ        # 269 aa

def backtx(seq):
    return ''.join(CODONS[a] for a in seq)

def make_gb():
    up = "ATTTGCCGCCTGACAAGTCAATGCGATCCGTAGGGGCAGCGCAGTATGCCAAGACTATAG"
    prom = "TAATACGACTCACTATAGG"
    lacO = "GGAATTGTGAGCGGATAACAATTCC"
    rbs = "AAGGAGATATACC"
    cds_nt = backtx(ORF) + "TAA"
    term = "CTAGCATAACCCCTTGGGGCCTCTAAACGGGTCTTGAGGGGTTTTTTG"
    tail = "ATGCATGCATGCATGCATGC"

    seq, pos, loc = "", 1, {}
    parts = [
        ('', up),
        ('promoter', prom),
        ('', 'AAGCTT'),
        ('lac', lacO),
        ('', 'ACC'),
        ('RBS', rbs),
        ('', 'ACC'),
        ('CDS', cds_nt),
        ('', 'AAACCC'),
        ('terminator', term),
        ('', tail)
    ]
    for k, s in parts:
        if k:
            loc[k] = (pos, pos + len(s) - 1)
        seq += s
        pos += len(s)

    tx_formatted = '\n'.join(('                     ' + ('/translation="' if i == 0 else '')) + ORF[i:i + 58] for i in range(0, len(ORF), 58)) + '"'

    lines = [
        f'LOCUS       sumo_fusion_test       {len(seq)} bp    DNA     circular SYN 01-OCT-2026',
        'DEFINITION  Synthetic stand-in: His6-SUMO fusion construct with QIGG cleavage site.',
        'FEATURES             Location/Qualifiers',
        f'     source          1..{len(seq)}',
        '                     /organism="synthetic construct"',
        f'     promoter        {loc["promoter"][0]}..{loc["promoter"][1]}',
        '                     /label="T7 promoter"',
        f'     protein_bind    {loc["lac"][0]}..{loc["lac"][1]}',
        '                     /label="lac operator"',
        f'     RBS             {loc["RBS"][0]}..{loc["RBS"][1]}',
        '                     /label="RBS"',
        f'     CDS             {loc["CDS"][0]}..{loc["CDS"][1]}',
        '                     /label="His6-SUMO-target"',
        f'{tx_formatted}',
        f'     misc_feature    {loc["CDS"][0]}..{loc["CDS"][0] + 3*20 - 1}',
        '                     /label="6xHis"',
        f'     misc_feature    {loc["CDS"][0] + 3*20}..{loc["CDS"][0] + 3*119 - 1}',
        '                     /label="SUMO"',
        f'     terminator      {loc["terminator"][0]}..{loc["terminator"][1]}',
        '                     /label="T7 terminator"',
        'ORIGIN'
    ]
    for i in range(0, len(seq), 60):
        lines.append(f'{i + 1:>9} ' + ' '.join(seq[i:i + 60][j:j + 10].lower() for j in range(0, 60, 10)).rstrip())
    lines.append('//')

    out_path = os.path.join(HERE, 'sumo_fusion_test.gb')
    with open(out_path, 'w', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'Wrote {out_path}')

if __name__ == '__main__':
    make_gb()
