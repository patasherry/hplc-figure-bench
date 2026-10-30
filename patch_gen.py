import re
with open('tests/data/gen_chrom.py', 'r') as f:
    text = f.read()

# Make sure synthetic.csv is generated WITH AU and 1.0 peak height exactly as I fixed earlier!
text = text.replace("write_unicorn_csv(os.path.join(OUT, 'synthetic.csv'), [('UV', 'ml', 'mAU', x, y)])", "write_unicorn_csv(os.path.join(OUT, 'synthetic.csv'), [('UV', 'ml', 'AU', x, y)])")
text = text.replace("y = 100 * np.exp(-0.5 * ((x - 5.0) / 0.2)**2)", "y = 1.0 * np.exp(-0.5 * ((x - 5.0) / 0.2)**2)")

with open('tests/data/gen_chrom.py', 'w') as f:
    f.write(text)
