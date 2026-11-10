with open("hplc-figure-bench(WF1.13).html", "r") as f:
    text = f.read()

# Update grid definition
old_grid = "const grid = cfg.layout === 'grid' && n > 2, row = (cfg.layout === 'row' || (cfg.layout === 'grid' && n === 2)) && n > 1, side = opt.gelPos === 'right', vgap = fs*2.8;"
new_grid = "const grid = cfg.layout === 'grid' && n >= 2, row = (cfg.layout === 'row' || (cfg.layout === 'grid' && n === 2)) && n > 1, side = opt.gelPos === 'right', vgap = fs*2.8;"
text = text.replace(old_grid, new_grid)

# Update ch ternary
old_ch = "const ch = cfg.bandH ? cfg.bandH : r.prep && !row && chart.geo && chart.geo.used ? Math.min(chromH, chart.geo.used + textPad(fs)) : chromH;"
new_ch = "const ch = (cfg.bandH && !grid) ? cfg.bandH : r.prep && (!row || grid) && chart.geo && chart.geo.used ? Math.min(chromH, chart.geo.used + textPad(fs)) : chromH;"
text = text.replace(old_ch, new_ch)

with open("hplc-figure-bench(WF1.13).html", "w") as f:
    f.write(text)
