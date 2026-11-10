import re
with open("hplc-figure-bench(WF1.13).html", "r") as f:
    text = f.read()

# Restore the original first so we don't double modify
