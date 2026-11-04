const fs = require('fs');
let html = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

html = html.replace(
  "function manMg(m){ const c = numOr(m.conc, null), v = numOr(m.vol, null); return c != null && v != null ? c*v : null; }",
  "function manMg(m){ const c = m.conc != null && m.conc !== '' ? +m.conc : null, v = m.vol != null && m.vol !== '' ? +m.vol : null; return c != null && isFinite(c) && v != null && isFinite(v) ? c*v : null; }"
);
html = html.replace(
  "for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a) mg = a; }",
  "for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a != null) mg = a; }"
);
html = html.replace(
  "wf.forEach(r => { if (r.prep === 'manual') { const a = manMg(r.man); if (a) R.push(`After the ${r.name} step, the sample held ${sig2(a)} mg (${fmtAuto(+r.man.conc)} mg/mL in ${fmtAuto(+r.man.vol)} mL).`); return; }",
  "wf.forEach(r => { if (r.prep === 'manual') { const a = manMg(r.man); if (a != null) R.push(`After the ${r.name} step, the sample held ${sig2(a)} mg (${fmtAuto(+r.man.conc)} mg/mL in ${fmtAuto(+r.man.vol)} mL).`); return; }"
);
html = html.replace(
  "if (out.length && prep.on) { const wf = wfList(), i = wf.indexOf(out[0].r); let mg = null; for (let j = 0; j < i; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a) mg = a; }",
  "if (out.length && prep.on) { const wf = wfList(), i = wf.indexOf(out[0].r); let mg = null; for (let j = 0; j < i; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a != null) mg = a; }"
);
html = html.replace(
  "let fc = (!path || wfBranches().length <= 1) && prep.on ? numOr(prep.finConc, null) : null, fv = (!path || wfBranches().length <= 1) && prep.on ? numOr(prep.finVol, null) : null, meas = fc != null && fv != null, manLoad = null;",
  "let fc = (!path || wfBranches().length <= 1) && prep.on && prep.finConc != null && prep.finConc !== '' ? +prep.finConc : null, fv = (!path || wfBranches().length <= 1) && prep.on && prep.finVol != null && prep.finVol !== '' ? +prep.finVol : null, meas = fc != null && isFinite(fc) && fv != null && isFinite(fv), manLoad = null;"
);
html = html.replace(
  "if (!meas && prep.on) { const wf = path || wfList(); for (let j = wf.indexOf(fin.r) + 1; j > 0 && j < wf.length; j++) if (wf[j].prep === 'manual' && manMg(wf[j].man) != null) { const m = wf[j].man; fc = numOr(m.conc, null); fv = numOr(m.vol, null); meas = true; manLoad = mgOf(fin); } }",
  "if (!meas && prep.on) { const wf = path || wfList(); for (let j = wf.indexOf(fin.r) + 1; j > 0 && j < wf.length; j++) if (wf[j].prep === 'manual' && manMg(wf[j].man) != null) { const m = wf[j].man; fc = m.conc != null && m.conc !== '' ? +m.conc : null; fv = m.vol != null && m.vol !== '' ? +m.vol : null; meas = fc != null && isFinite(fc) && fv != null && isFinite(fv); manLoad = mgOf(fin); } }"
);
html = html.replace(
  "if (prep.on) { const fc = numOr(prep.finConc, 0), fv = numOr(prep.finVol, 0), ra = v(prep.finRatio), cL = numOr(prep.cultureL, 0), cG = numOr(prep.pellet, 0);\n    if (fc > 0 && fv > 0) R.push(`The final sample was ${fmtAuto(fc)} mg/mL in ${fmtAuto(fv)} mL, ${sig2(fc*fv)} mg${cL > 0 ? ` or ${sig2(fc*fv/cL)} mg per L of culture` : ''}${cG > 0 ? (cL > 0 ? ` (${sig2(fc*fv/cG)} mg per g of wet cell pellet)` : ` or ${sig2(fc*fv/cG)} mg per g of wet cell pellet`) : ''}${ra ? `, with an A260/A280 of ${ra}` : ''}.`);",
  "if (prep.on) { const fc = prep.finConc != null && prep.finConc !== '' ? +prep.finConc : null, fv = prep.finVol != null && prep.finVol !== '' ? +prep.finVol : null, ra = v(prep.finRatio), cL = numOr(prep.cultureL, 0), cG = numOr(prep.pellet, 0);\n    if (fc != null && fc >= 0 && fv != null && fv >= 0) R.push(`The final sample was ${fmtAuto(fc)} mg/mL in ${fmtAuto(fv)} mL, ${sig2(fc*fv)} mg${cL > 0 ? ` or ${sig2(fc*fv/cL)} mg per L of culture` : ''}${cG > 0 ? (cL > 0 ? ` (${sig2(fc*fv/cG)} mg per g of wet cell pellet)` : ` or ${sig2(fc*fv/cG)} mg per g of wet cell pellet`) : ''}${ra ? `, with an A260/A280 of ${ra}` : ''}.`);"
);
html = html.replace(
  "const fin = rows.slice().reverse().find(x => mgOf(x) != null); if (!fin) return null;",
  "const fin = rows.slice().reverse().find(x => mgOf(x) != null) || (rows.length ? rows[rows.length - 1] : null); if (!fin) return null;"
);
html = html.replace(
  "if (ys.length) {\n    wf.forEach(r => {",
  "wf.forEach(r => {"
);
html = html.replace(
  "ys.forEach(y => {",
  "if (ys.length) {\n    ys.forEach(y => {"
);
html = html.replace(
  "${y.perG != null ? `, ${y.perGTxt}` : ''}${y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}${['mg', 'mgmol', 'area'].includes(y.basis)",
  "${y.perG != null ? `, ${y.perGTxt}` : ''}${hasTxt(prep.qcPurity) ? `, ${String(prep.qcPurity).trim()}` : y.pur != null && !(y.purEst && y.pur < 15) ? `, ${y.purEst ? '≈' : ''}${fmt(y.pur, 0)}% pure by gel` : ', purity not measured by gel'}${['mg', 'mgmol', 'area'].includes(y.basis)"
);
html = html.replace(
  "${hasTxt(prep.qcPurity) && !y.purTyped ? `, ${String(prep.qcPurity).trim()}`",
  "${hasTxt(prep.qcPurity) ? `, ${String(prep.qcPurity).trim()}`"
);
html = html.replace(
  "${hasTxt(prep.qcPurity) && !y.purTyped ? `, ${String(prep.qcPurity).trim()}`",
  "${hasTxt(prep.qcPurity) ? `, ${String(prep.qcPurity).trim()}`"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', html);
