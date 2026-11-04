import numpy as np
import os
import json
from gen_chrom import write_unicorn_csv, add, OUT, EXP

def gen_pool_area_dip():
    fn = 'pool_area_bug.csv'
    # peak and a stretch that dips below the baseline inside the pooled span
    x = np.round(np.arange(0, 30.0001, 0.05), 4)
    # Background baseline 10, dipped baseline 5
    # Peak at 15.0
    y = 10 + 100 * np.exp(-0.5 * ((x - 15.0) / 0.5)**2)
    # Add a dip below the baseline
    dip_mask = (x >= 18.0) & (x <= 22.0)
    y[dip_mask] -= 15 * np.sin(np.pi * (x[dip_mask] - 18.0) / 4.0)

    # Fractions from 10 to 25
    ev = []
    for i in range(16):
        ev.append((10.0 + i, f'F{i+1}'))

    write_unicorn_csv(os.path.join(OUT, fn), [
        ('UV', 'ml', 'mAU', x, y),
        ('Fraction', 'ml', 'Fraction', ev, None)
    ])

gen_pool_area_dip()
