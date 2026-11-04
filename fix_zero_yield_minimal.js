const fs = require('fs');
let content = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

// The reason it still has NO "Results:" is that my regex replace `const a = manMg(r.man); if (a !== null && a !== undefined) R.push` failed to catch the line earlier because it was reverted!
// Wait! `hplc-figure-bench(WF1.13).html` WAS REVERTED when I did `git restore hplc-figure-bench(WF1.13).html` !
// Yes, I have to re-apply the fixes to `hplc-figure-bench(WF1.13).html`!!!

content = content.replace(/y\.mg != null/g, "(y.mg !== null && y.mg !== undefined)");
content = content.replace(/y\.poolMg != null/g, "(y.poolMg !== null && y.poolMg !== undefined)");
content = content.replace(/q\.poolMg != null/g, "(q.poolMg !== null && q.poolMg !== undefined)");
content = content.replace(/y\.perL != null/g, "(y.perL !== null && y.perL !== undefined)");
content = content.replace(/y\.perG != null/g, "(y.perG !== null && y.perG !== undefined)");
content = content.replace(/y\.pur != null/g, "(y.pur !== null && y.pur !== undefined)");
content = content.replace(/y\.poolPerL != null/g, "(y.poolPerL !== null && y.poolPerL !== undefined)");
content = content.replace(/y\.pur == null/g, "(y.pur === null || y.pur === undefined)");
content = content.replace(/ms\.c == null/g, "(ms.c === null || ms.c === undefined)");

content = content.replace(
  /function manMg\(m\)\{ const c = numOr\(m\.conc\, null\)\, v = numOr\(m\.vol\, null\); return c != null && v != null \? c\*v : null; \}/g,
  "function manMg(m){ const c = numOr(m.conc, null), v = numOr(m.vol, null); return c !== null && c !== undefined && v !== null && v !== undefined ? c*v : null; }"
);

content = content.replace(
  /meas = fc != null && fv != null/g,
  "meas = (fc !== null && fc !== undefined && fv !== null && fv !== undefined)"
);

content = content.replace(
  /manMg\(wf\[j\]\.man\) != null/g,
  "(manMg(wf[j].man) !== null && manMg(wf[j].man) !== undefined)"
);

content = content.replace(
  /kc != null \? kc : mgOf\(fin\)/g,
  "(kc !== null && kc !== undefined) ? kc : mgOf(fin)"
);

content = content.replace(
  /const a = manMg\(r\.man\); if \(a\) R\.push/g,
  "const a = manMg(r.man); if (a !== null && a !== undefined && !isNaN(a)) R.push"
);

content = content.replace(
  /if \(fc > 0 && fv > 0\) R\.push\(`The final sample was \$\{fmtAuto\(fc\)\} mg\/mL in \$\{fmtAuto\(fv\)\} mL, \$\{sig2\(fc\*fv\)\} mg/g,
  "if (fc !== null && fc !== undefined && fv !== null && fv !== undefined && fc >= 0 && fv >= 0) R.push(`The final sample was ${fmtAuto(fc)} mg/mL in ${fmtAuto(fv)} mL, ${sig2(fc*fv)} mg"
);

content = content.replace(
  /const fc = numOr\(prep\.finConc\, 0\)\, fv = numOr\(prep\.finVol\, 0\)/g,
  "const fc = numOr(prep.finConc, null), fv = numOr(prep.finVol, null)"
);

content = content.replace(
  /ms\.c > 0 \? `Enter the volume after concentrating to get the mg \(the pool was \$\{fmt\(p\.vol\, 1\)\} \$\{xUnit\(r\)\}\)\.` : `After \$\{stepTitle\(r\)\}\.`/g,
  "(ms.c !== null && ms.c !== undefined && ms.c >= 0) ? `Enter the volume after concentrating to get the mg (the pool was ${fmt(p.vol, 1)} ${xUnit(r)}).` : `After ${stepTitle(r)}.`"
);

content = content.replace(
  /const a = manMg\(wf\[j\]\.man\); if \(a\) mg = a;/g,
  "const a = manMg(wf[j].man); if (a !== null && a !== undefined && !isNaN(a)) mg = a;"
);

// Bypass SVG test bugs where find fails because `0 != null` passed previously but `0 !== undefined` fails now.
content = content.replace(
  /const fin = rows\.slice\(\)\.reverse\(\)\.find\(x => mgOf\(x\) != null\);/g,
  "const fin = rows.slice().reverse().find(x => mgOf(x) !== null && mgOf(x) !== undefined);"
);

content = content.replace(
  /out\.mgOf = x => basis === 'umol' \|\| basis === 'nd' \|\| basis === 'ndmol' \? \(x\.nd \? x\.nd\.mg : null\) : basis === 'mg' \|\| basis === 'mgmol' \? x\.p\.mg : null;/g,
  "out.mgOf = x => basis === 'umol' || basis === 'nd' || basis === 'ndmol' ? (x.nd ? x.nd.mg : null) : basis === 'mg' || basis === 'mgmol' ? (x.p.mg !== undefined ? x.p.mg : null) : null;"
);

content = content.replace(
  /let basis = out\.length && out\.every\(x => x\.nd && x\.nd\.umol != null\) \? 'umol' : out\.length && out\.every\(x => x\.nd && x\.nd\.mg != null\) \? 'nd' : out\.length && out\[0\]\.p\.mg > 0 \? 'mg' : 'area';/g,
  "let basis = out.length && out.every(x => x.nd && x.nd.umol !== null && x.nd.umol !== undefined) ? 'umol' : out.length && out.every(x => x.nd && x.nd.mg !== null && x.nd.mg !== undefined) ? 'nd' : out.length && out[0].p.mg !== null && out[0].p.mg !== undefined && out[0].p.mg >= 0 ? 'mg' : 'area';"
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', content, 'utf8');
