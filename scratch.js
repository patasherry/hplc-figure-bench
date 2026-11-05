const fs = require('fs');
let content = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const t = `const sig_val = g.invert ? gray : 255 - gray; dk[i/4] = sig_val; const trans = Math.max(1, 255 - sig_val) / 255; dq[i/4] = Math.max(0, -Math.log10(trans));`;
const r = `const sig_val = g.invert ? gray : 255 - gray; dk[i/4] = sig_val; dq[i/4] = Math.max(0, -Math.log10(Math.max(1, 255 - sig_val) / 255));`;
content = content.replace(t, r);

const t2 = `      /* total redefined as sum of areas, rather than sum of signal, because bands only capture their bounds */
      bands.forEach(b => total += b.area); bands.forEach(b => { b.pct = total > 0 ? 100*b.area/total : 0; });`;
const r2 = `      /* total redefined as sum of areas, rather than sum of signal, because bands only capture their bounds */
      total = 0; bands.forEach(b => total += b.area); bands.forEach(b => { b.pct = total > 0 ? 100*b.area/total : 0; });`;
content = content.replace(t2, r2);

const t3 = `  const c = g.crop; bands.forEach(b => { b.yRot = c.t + (b.row + 0.5)/h*(c.b - c.t); b.pct = total > 0 ? 100*b.area/total : 0; });`;
const r3 = `  const c = g.crop; total = 0; bands.forEach(b => total += b.area); bands.forEach(b => { b.yRot = c.t + (b.row + 0.5)/h*(c.b - c.t); b.pct = total > 0 ? 100*b.area/total : 0; });`;
content = content.replace(t3, r3);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', content);
