const fs = require('fs');
let text = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');
// Fix missing zero yield
text = text.replace(/for \(let j = i \+ 1; i >= 0 && j < wf\.length && wf\[j\]\.prep; j\+\+\) if \(wf\[j\]\.prep === 'manual'\) \{ const a = manMg\(wf\[j\]\.man\); if \(a\) mg = a; \}/g, "for (let j = i + 1; i >= 0 && j < wf.length && wf[j].prep; j++) if (wf[j].prep === 'manual') { const a = manMg(wf[j].man); if (a != null) mg = a; }");
text = text.replace(/const a = manMg\(wf\[j\]\.man\); if \(a\) mg = a;/g, "const a = manMg(wf[j].man); if (a != null) mg = a;");
text = text.replace(/const a = manMg\(r\.man\); if \(a\) R\.push/g, "const a = manMg(r.man); if (a != null) R.push");

text = text.replace(/if \(y\.pur\)/g, "if (y.pur != null)");
text = text.replace(/y\.pur \? /g, "y.pur != null ? ");

text = text.replace(/y\.mg \? sig2\(y\.mg\)/g, "y.mg != null ? sig2(y.mg)");
text = text.replace(/y\.mg > 0 \? /g, "y.mg != null && y.mg >= 0 ? ");
text = text.replace(/\{y\.mg \? sig2\(y\.mg\) \+ ' mg' \: 'unknown yield'\}/g, "{y.mg != null ? sig2(y.mg) + ' mg' : 'unknown yield'}");

text = text.replace(/if \(mg > 0\)/g, "if (mg != null && mg >= 0)");
text = text.replace(/if \(v > 0\)/g, "if (v != null && v >= 0)");
text = text.replace(/\!\(mg > 0\)/g, "!(mg != null && mg >= 0)");

fs.writeFileSync('hplc-figure-bench(WF1.13).html', text);
