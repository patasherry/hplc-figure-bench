with open("hplc-figure-bench(WF1.13).html", "r") as f:
    text = f.read()

# Let's inspect where cfg.bandH is being set.
# There's a line:
# if (cfg.bandH) cfg = Object.assign({}, cfg, {bandH: Math.max(cfg.bandH, ...list.map((r, i) => { const c = buildRunSVG(r, {wPt: pw[i], hPt: chromH, nest: true}); return c.geo && c.geo.used ? c.geo.used + textPad(fs) : 0; }))});
# Could it be setting cfg.bandH for ALL panels to the height of the tallest? Yes, "bandH" applies to a band of panels.
