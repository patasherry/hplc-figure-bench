const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

code = code.replace(
  'if (x.secMw) { const mono = secMono(); notes.push(`${nm}: main pooled peak at ${fmt(x.secMw.ve, 2)} ${xUnit(x.r)}, apparent ${kdaRound(x.secMw.mw)} kDa${mono > 0 ? ` (${fmt(x.secMw.mw/mono, 1)}× the ${kdaRound(mono)} kDa monomer)` : \'\'}. Apparent size from SEC depends on shape; confirm the oligomer state by SEC-MALS or AUC.`); }',
  'if (x.secMw) { const mono = secMono(); notes.push(`${nm}: main pooled peak at ${fmt(x.secMw.ve, 2)} ${xUnit(x.r)}, apparent ${x.secMw.extrap ? \'~\' : \'\'}${kdaRound(x.secMw.mw)} kDa${mono > 0 ? ` (${fmt(x.secMw.mw/mono, 1)}× the ${kdaRound(mono)} kDa monomer)` : \'\'}. Apparent size from SEC depends on shape; confirm the oligomer state by SEC-MALS or AUC.`); }'
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
