import os
import sys
import numpy as np
import zipfile

# Add tests/data to sys.path to import gen_chrom
HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.append(HERE)

from gen_chrom import write_unicorn_zip, signal, OUT, plate_labels

def gen_valid_unicorn():
    np.random.seed(42)
    fn = 'valid_unicorn.zip'
    inj = 1.0
    flow = 0.5
    x = np.round(np.arange(0, 30.0001, 0.002), 5).astype(float)
    vs = [(12.0, 0.4, 40.0), (16.0, 0.4, 70.0)]
    comps = [(inj + v, s, h) for v, s, h in vs]
    y = signal(x, comps)
    xs4 = x[::20]
    labels = plate_labels(20)
    fr = [(inj + 0.0, 'Waste')] + [(inj + 6.0 + 0.5*i, l) for i, l in enumerate(labels)] + [(inj + 16.0, 'Waste')]
    log = [(0.0, 'Method Run 10/22/2026 5:00:00 PM -07:00 Method: Valid test Result: /DefaultHome/valid 001')]

    curves = [
        dict(name='UV', type='UV', yu='mAU', xs=x, ys=y, num=1, uvpath=2),
        dict(name='Conductivity', type='Conduction', yu='mS/cm', xs=xs4, ys=np.full(xs4.size, 15.0), num=2),
        dict(name='Conc B', type='Other', yu='%B', xs=xs4, ys=np.zeros(xs4.size), num=3),
        dict(name='Flow', type='Other', yu='ml/min', xs=xs4, ys=np.full(xs4.size, flow), num=4)
    ]

    write_unicorn_zip(os.path.join(OUT, fn), 23.562, curves, {'Fraction': fr, 'Injection': [(inj, 'Inj')], 'Logbook': log}, flow)

def gen_missing_curve_unicorn():
    np.random.seed(42)
    fn = 'missing_curve.zip'
    inj = 1.0
    flow = 0.5
    x = np.round(np.arange(0, 30.0001, 0.002), 5).astype(float)
    y = signal(x, [(inj + 12.0, 0.4, 40.0)])
    xs4 = x[::20]
    fr = [(inj + 0.0, 'Waste'), (inj + 6.0, '1.A.1')]
    log = [(0.0, 'Method Run')]

    curves = [
        dict(name='Conductivity', type='Conduction', yu='mS/cm', xs=xs4, ys=np.full(xs4.size, 15.0), num=2),
        dict(name='UV', type='UV', yu='mAU', xs=x, ys=y, num=1, uvpath=2)
    ]

    path = os.path.join(OUT, fn)
    write_unicorn_zip(path, 23.562, curves, {'Fraction': fr, 'Injection': [(inj, 'Inj')], 'Logbook': log}, flow)

    temp_zip = path + ".tmp"
    with zipfile.ZipFile(path, 'r') as zin, zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename != 'Chrom.1_1_True':
                zout.writestr(item, zin.read(item.filename))
    os.remove(path)
    os.rename(temp_zip, path)

def gen_not_unicorn():
    fn = 'not_unicorn.zip'
    path = os.path.join(OUT, fn)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zout:
        zout.writestr("some_file.txt", "This is not a unicorn archive")
        zout.writestr("another_file.csv", "Time,Value\n1,2\n3,4")

if __name__ == '__main__':
    gen_valid_unicorn()
    gen_missing_curve_unicorn()
    gen_not_unicorn()
    print("Generated 11_unicorn_zip test files.")
