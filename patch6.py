with open("hplc-figure-bench(WF1.13).html", "r") as f:
    text = f.read()

# Let's inspect the `cfg.bandH` issue.
# Is it `(cfg.bandH && !grid) ? cfg.bandH` or maybe `bandH` is a boolean? No, it's a number height.
