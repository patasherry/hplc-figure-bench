import numpy as np
import json
import os

OUT = os.path.dirname(os.path.abspath(__file__))
CHROM = os.path.join(OUT, 'chrom')
os.makedirs(CHROM, exist_ok=True)
RNG = np.random.default_rng(20261025)

def gauss(x, c, s, h): return h*np.exp(-0.5*((x - c)/s)**2)
def signal(x, comps): return sum((gauss(x, *c) for c in comps), np.zeros_like(x))

def frac_events(start, size, labels): return [(round(start + i*size, 4), l) for i, l in enumerate(labels)] + [(round(start + len(labels)*size, 4), 'Waste')]

def write_unicorn_csv(path, x, y, fr, y260=None):
    if y260 is not None:
        lines = ['Chrom.1,,Chrom.1,,Chrom.1,', 'UV 280,,UV 260,,Fraction,', 'ml,mAU,ml,mAU,ml,Fraction']
        for i in range(len(x)):
            f_val = ''
            if i < len(fr):
                f_val = f'{fr[i][0]:.4f},{fr[i][1]}'
            else:
                f_val = ','
            lines.append(f'{x[i]:.4f},{y[i]:.4f},{x[i]:.4f},{y260[i]:.4f},{f_val}')
    else:
        lines = ['Chrom.1,,Chrom.1,', 'UV 280,,Fraction,', 'ml,mAU,ml,Fraction']
        for i in range(len(x)):
            f_val = ''
            if i < len(fr):
                f_val = f'{fr[i][0]:.4f},{fr[i][1]}'
            else:
                f_val = ','
            lines.append(f'{x[i]:.4f},{y[i]:.4f},{f_val}')
    with open(path, 'w') as f:
        f.write('\n'.join(lines))

def gen_peaks():
    EXPECT = []
    labels = [f'F{i}' for i in range(1, 31)]
    ev = frac_events(0.0, 1.0, labels)

    # 1. Single peak on flat baseline
    x = np.round(np.arange(0, 30.0001, 0.05), 4)
    s1 = 0.5; h1 = 100.0; c1 = 15.0
    area1 = h1 * s1 * np.sqrt(2 * np.pi)
    y1 = signal(x, [(c1, s1, h1)])
    write_unicorn_csv(os.path.join(CHROM, 'peak_isolated.csv'), x, y1, ev)
    EXPECT.append(dict(file='peak_isolated.csv', type='isolated', pool='F12-F18', true_area=area1, true_ve=c1))

    # 2. Two well separated peaks
    c2 = 10.0; s2 = 0.5; h2 = 80.0
    c3 = 20.0; s3 = 0.6; h3 = 60.0
    area2 = h2 * s2 * np.sqrt(2 * np.pi)
    area3 = h3 * s3 * np.sqrt(2 * np.pi)
    y2 = signal(x, [(c2, s2, h2), (c3, s3, h3)])
    write_unicorn_csv(os.path.join(CHROM, 'peak_separated.csv'), x, y2, ev)
    EXPECT.append(dict(file='peak_separated.csv', type='separated', pool='F7-F23',
                       peaks=[dict(ve=c2, area=area2), dict(ve=c3, area=area3)]))

    # 3. Two overlapping peaks
    c4 = 15.0; s4 = 0.5; h4 = 100.0
    c5 = 16.5; s5 = 0.6; h5 = 80.0
    area4 = h4 * s4 * np.sqrt(2 * np.pi)
    area5 = h5 * s5 * np.sqrt(2 * np.pi)
    y3 = signal(x, [(c4, s4, h4), (c5, s5, h5)])
    write_unicorn_csv(os.path.join(CHROM, 'peak_overlapping.csv'), x, y3, ev)
    EXPECT.append(dict(file='peak_overlapping.csv', type='overlapping', pool='F12-F20',
                       total_area=area4 + area5))

    # 4. Peak on a sloped baseline
    slope = 2.0; intercept = 10.0
    y_base = slope * x + intercept
    y4 = signal(x, [(c1, s1, h1)]) + y_base
    write_unicorn_csv(os.path.join(CHROM, 'peak_sloped.csv'), x, y4, ev)
    EXPECT.append(dict(file='peak_sloped.csv', type='sloped', pool='F12-F18', true_area=area1, true_ve=c1))

    # 5. Peak on a sloped baseline with UV260
    # Protein peak at c1 (A280 = h1). Protein A260 = h1 * 0.57.
    # Buffer A280 baseline = 10 (flat). Buffer A260 baseline = 100 (flat).
    # True ratio of the peak should be 0.57.
    y5_280 = signal(x, [(c1, s1, h1)]) + 10.0
    y5_260 = signal(x, [(c1, s1, h1 * 0.57)]) + 100.0
    write_unicorn_csv(os.path.join(CHROM, 'peak_ratio.csv'), x, y5_280, ev, y260=y5_260)
    EXPECT.append(dict(file='peak_ratio.csv', type='ratio', pool='F12-F18', expected_ratio=0.57))

    json.dump(EXPECT, open(os.path.join(OUT, 'expected_peaks.json'), 'w'), indent=1)

if __name__ == '__main__':
    gen_peaks()
