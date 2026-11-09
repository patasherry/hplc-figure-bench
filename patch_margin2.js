const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf-8');

html = html.replace(
  "const fs = fontSize(), bandH = fs*5;",
  "const fs = fontSize(); const min_safety_margin = numOr(opt.min_safety_margin, 0) || fs*0.8; let bandH = fs*5; const tmp = composeRuns(pre, Object.assign({}, cfg, {layout: 'row', raw: true})); if (tmp.geo && tmp.geo.pos) { const hs = tmp.geo.pos.map((p, i) => { const c = buildRunPlainSVG(pre[i], {wPt: p.w, hPt: cfg.chromH, nest: true}); return c.geo && c.geo.used ? c.geo.used : 0; }); bandH = Math.max(...hs) + min_safety_margin; }"
);
html = html.replace(
  "const fs = fontSize(), W = Math.max(numOr(opt.w, 3.5), 3.4)*72; return composeRuns([ncObj(r)], {layout: 'row', W, chromH: numOr(opt.wfH, 2.2)*72, titles: true, letters: false, showGels: false, connectors: false, arrows: false, gelMaxH: 0, bandH: fs*5}); }",
  "const fs = fontSize(); const min_safety_margin = numOr(opt.min_safety_margin, 0) || fs*0.8; const W = Math.max(numOr(opt.w, 3.5), 3.4)*72; const o = ncObj(r); let bandH = fs*5; const c = buildRunPlainSVG(o, {wPt: W, hPt: numOr(opt.wfH, 2.2)*72, nest: true}); if (c.geo && c.geo.used) bandH = c.geo.used + min_safety_margin; return composeRuns([o], {layout: 'row', W, chromH: numOr(opt.wfH, 2.2)*72, titles: true, letters: false, showGels: false, connectors: false, arrows: false, gelMaxH: 0, bandH}); }"
);
html = html.replace(
  "const fs = fontSize(), W = Math.max(numOr(opt.w, 3.5), 3.4)*72, base = {layout: 'row', W, chromH: numOr(opt.wfH, 2.2)*72, titles: true, letters: false, showGels: true, connectors: opt.connectors, arrows: true, gelMaxH: numOr(opt.wfGelH, 1.8)*72, bandH: fs*5};",
  "const fs = fontSize(); const min_safety_margin = numOr(opt.min_safety_margin, 0) || fs*0.8; const W = Math.max(numOr(opt.w, 3.5), 3.4)*72; let bandH = fs*5; const o = k === 'transform' ? prepObjFor('construct') : isManId(k) ? manObj(manSteps().find(x => x.id === k)) : prepObjFor(k); const c = buildRunPlainSVG(o, {wPt: W, hPt: numOr(opt.wfH, 2.2)*72, nest: true}); if (c.geo && c.geo.used) bandH = c.geo.used + min_safety_margin; const base = {layout: 'row', W, chromH: numOr(opt.wfH, 2.2)*72, titles: true, letters: false, showGels: true, connectors: opt.connectors, arrows: true, gelMaxH: numOr(opt.wfGelH, 1.8)*72, bandH};"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
