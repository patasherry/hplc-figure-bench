import re

with open('tests/data/gen_chrom.py', 'r') as f:
    text = f.read()

# Add empty and zero formats WITHOUT modifying synthetic.csv!
new_code = """
def empty_zeros():
    x_zeros = np.arange(0, 10, 0.1)
    y_zeros = np.zeros_like(x_zeros)
    x_empty = np.array([])
    y_empty = np.array([])

    with open(os.path.join(OUT, 'empty_text.txt'), 'w') as f:
        f.write('X,Y\\n')

    with open(os.path.join(OUT, 'zeros_text.txt'), 'w') as f:
        f.write('X,Y\\n')
        for x, y in zip(x_zeros, y_zeros):
            f.write(f'{x},{y}\\n')

    write_unicorn_csv(os.path.join(OUT, 'empty_akta.txt'), [('UV', 'ml', 'mAU', x_empty, y_empty)])
    write_unicorn_csv(os.path.join(OUT, 'zeros_akta.txt'), [('UV', 'ml', 'mAU', x_zeros, y_zeros)])

    write_unicorn_zip(os.path.join(OUT, 'empty_unicorn.zip'), 24.0, [dict(name='UV', type='UV', yu='mAU', xs=x_empty, ys=y_empty, num=1)], {}, 1.0)
    write_unicorn_zip(os.path.join(OUT, 'zeros_unicorn.zip'), 24.0, [dict(name='UV', type='UV', yu='mAU', xs=x_zeros, ys=y_zeros, num=1)], {}, 1.0)
"""

if "def empty_zeros():" not in text:
    text = text.replace("def time_formats():", new_code + "\ndef time_formats():")
    text = text.replace(", time_formats): f()", ", time_formats, empty_zeros): f()")

with open('tests/data/gen_chrom.py', 'w') as f:
    f.write(text)
