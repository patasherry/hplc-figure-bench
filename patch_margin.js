const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');

// in composeRuns
html = html.replace(
  "if (cfg.bandH) cfg = Object.assign({}, cfg, {bandH: Math.max(cfg.bandH, ...list.map((r, i) => { const c = buildRunSVG(r, {wPt: pw[i], hPt: chromH, nest: true}); return c.geo && c.geo.used ? c.geo.used + fs*0.8 : 0; }))});",
  "if (cfg.bandH) cfg = Object.assign({}, cfg, {bandH: Math.max(cfg.bandH, ...list.map((r, i) => { const c = buildRunSVG(r, {wPt: pw[i], hPt: chromH, nest: true}); return c.geo && c.geo.used ? c.geo.used + (numOr(opt.min_safety_margin, 0) || fs*0.8) : 0; }))});"
);

// in composeRuns - replacing hardcoded gap logic where gap is set
// or let's find `let gap = fs*1.4;`
// actually, let gap = fs*1.4 + min_safety_margin? No, the instructions say:
// 1. Add `min_safety_margin` to `cfg` in `buildWorkflow`.
// 2. In `buildWorkflow`, calculate `bandH` as `max(c.geo.used) + min_safety_margin` for the `pre` steps.
// 3. In `composeRuns` and `buildRunSVG`, replace hardcoded offsets with `min_safety_margin`.
// 4. Ensure `min_safety_margin` is passed via `cfg`.

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
