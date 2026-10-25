const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

code = code.replace(
  'if (samples.length <= 6) { const left = px(q.x) > L + (R - L)*0.3; s.push(`<text x="${r2(px(q.x) + (left ? -1 : 1)*fs*0.5)}" y="${r2(py(q.mw) + fs*1.0)}"${left ? \' text-anchor="end"\' : \'\'} fill="${RUN_COLORS.uv}">${esc(q.name)} ${fmtAuto(q.mw)} kDa</text>`); }',
  'if (samples.length <= 6) { const left = px(q.x) > L + (R - L)*0.3; s.push(`<text x="${r2(px(q.x) + (left ? -1 : 1)*fs*0.5)}" y="${r2(py(q.mw) + fs*1.0)}"${left ? \' text-anchor="end"\' : \'\'} fill="${RUN_COLORS.uv}">${esc(q.name)} ${q.extrap ? \'~\' : \'\'}${fmtAuto(q.mw)} kDa</text>`); }'
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
