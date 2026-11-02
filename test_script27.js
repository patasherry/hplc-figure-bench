const fs = require('fs');

const code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

let regex = /const t = y\.meas \? `\$\{label\}: \$\{sig2\(y\.mg\)\} mg\$.*?\`;/g;
let replace = "const mgTxt = (m) => m != null ? `${sig2(m)} mg` : 'unknown yield';\n    const t = y.meas ? `${label}: ${mgTxt(y.mg)}${(() => { const cm = cleanSeq(opt.protSeq) || prep.gb ? constructModel() : null; return cm && cm.pn !== 'protein' ? ' ' + cm.pn : ''; })()} (${sig2(y.fc)} mg/mL in ${fmtAuto(y.fv)} mL)${y.perL != null ? `, ${sig2(y.perL)} mg per L of culture` : ''}${y.perG != null ? `, ${y.perGTxt}` : ''}${hasTxt(prep.qcPurity) && !y.purTyped ? `, ${String(prep.qcPurity).trim()}` : y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}${y.loaded && y.mg > y.loaded.mg*1.05 ? ` (unverified: the final sample exceeds the amount loaded on ${stepTitle(y.loaded.r).toLowerCase()})` : y.odd ? (o => ` (column amounts unverified: ${o ? `${stepTitle(o.r).toLowerCase()} step yield ${fmt(Math.max(o.yld > 100 ? o.yld : 0, o.stepY || 0), 0)}%` : 'a step yield is above 100%'})`)(sumRows().find(x => x.yld > 100 || x.stepY > 105)) : ''}` : `${label}: ${mgTxt(y.mg)}${pnm && pnm !== 'protein' ? ' ' + pnm : ''}${y.perL != null ? `, ${sig2(y.perL)} mg per L of culture` : ''}${y.perG != null ? `, ${y.perGTxt}` : ''}${y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}${['mg', 'mgmol', 'area'].includes(y.basis) ? ' (from the A280 area' : ' (NanoDrop'}${y.odd ? (o => `, unverified because the ${o ? `${stepTitle(o.r).toLowerCase()} step yield is ${fmt(Math.max(o.yld > 100 ? o.yld : 0, o.stepY || 0), 0)}%` : 'a step yield is above 100%'}`)(sumRows().find(x => x.yld > 100 || x.stepY > 105)) : ''})`;";

let replaced = code.replace(regex, replace);

let sig2_regex = /const sig2 = v => v >= 100 \? fmt\(v, 0\) : v >= 10 \? fmt\(v, 1\) : v >= 1 \? fmt\(v, 2\) : v >= 0\.1 \? fmt\(v, 2\) : fmt\(v, 3\);/;
let sig2_replace = 'const sig2 = v => v === 0 ? "0.00" : v >= 100 ? fmt(v, 0) : v >= 10 ? fmt(v, 1) : v >= 1 ? fmt(v, 2) : v >= 0.1 ? fmt(v, 2) : fmt(v, 3);';
replaced = replaced.replace(sig2_regex, sig2_replace);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', replaced);
