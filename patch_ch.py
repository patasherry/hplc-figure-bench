import re

with open("hplc-figure-bench(WF1.13).html", "r") as f:
    text = f.read()

# Replace the specific line, preserving the prefix
prefix = "    const ch = "
old_part = "cfg.bandH ? cfg.bandH : r.prep && !row && chart.geo && chart.geo.used ? Math.min(chromH, chart.geo.used + textPad(fs)) : chromH;"
new_part = "(cfg.bandH && !grid) ? cfg.bandH : r.prep && (!row || grid) && chart.geo && chart.geo.used ? Math.min(chromH, chart.geo.used + textPad(fs)) : chromH;"

text = text.replace(prefix + old_part, prefix + new_part)

with open("hplc-figure-bench(WF1.13).html", "w") as f:
    f.write(text)
