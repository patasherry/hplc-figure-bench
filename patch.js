const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

code = code.replace(
  `    return {type: f.type, a: Math.min(...nums), b: Math.max(...nums), rev: /complement/.test(f.loc), label: lab, tx: (f.q.translation || '').replace(/[^A-Z*]/gi, '').toUpperCase(), wrap: /join/.test(f.loc) && nums[0] > nums[nums.length - 1], loc: f.loc}; }).filter(Boolean);`,
  `    const wrap = /join/.test(f.loc) && nums[0] > nums[nums.length - 1];\n    return {type: f.type, a: wrap ? nums[0] : Math.min(...nums), b: wrap ? nums[nums.length - 1] : Math.max(...nums), rev: /complement/.test(f.loc), label: lab, tx: (f.q.translation || '').replace(/[^A-Z*]/gi, '').toUpperCase(), wrap, loc: f.loc}; }).filter(Boolean);`
);

code = code.replace(
  `  const up = f => main.rev ? f.a - main.b : main.a - f.b, down = f => main.rev ? main.a - f.b : f.a - main.b;
  const near = (re, lo, hi, d) => gb.feats.filter(f => f !== main && re(f) && d(f) >= lo && d(f) <= hi).sort((p, q) => d(p) - d(q))[0] || null;
  const prom = near(f => f.type === 'promoter' || /promoter/i.test(f.label), -30, 500, up), lacO = near(f => /lac ?o|operator/i.test(f.label) || (f.type === 'protein_bind' && /lac/i.test(f.label)), -30, 300, up);
  const rbs = near(f => f.type === 'RBS' || /\\brbs\\b|ribosom|shine/i.test(f.label), -5, 80, up), term = near(f => f.type === 'terminator' || /terminator/i.test(f.label), -30, 600, down);
  const res = gb.feats.filter(f => f.type === 'CDS' && RES_RE.test(f.label)).map(f => resName(f.label)), ori = gb.feats.filter(f => (f.type === 'rep_origin' || /\\bori\\b/i.test(f.label)) && !/f1|m13/i.test(f.label)).map(f => f.label.replace(/\\s*(ori(gin)?( of replication)?)$/i, '').trim());
  const inner = gb.feats.filter(f => f !== main && f.a >= main.a - 3 && f.b <= main.b + 3 && (f.b - f.a) < 0.9*(main.b - main.a)).map(f => ({label: f.label, a: Math.floor(((main.rev ? main.b - f.b : f.a - main.a))/3) + 1, b: Math.ceil(((main.rev ? main.b - f.a : f.b - main.a) + 1)/3)}));`,
  `  const mod = x => main.wrap ? ((x + gb.len/2) % gb.len + gb.len) % gb.len - gb.len/2 : x;
  const up = f => mod(main.rev ? f.a - main.b : main.a - f.b), down = f => mod(main.rev ? main.a - f.b : f.a - main.b);
  const near = (re, lo, hi, d) => gb.feats.filter(f => f !== main && re(f) && d(f) >= lo && d(f) <= hi).sort((p, q) => d(p) - d(q))[0] || null;
  const prom = near(f => f.type === 'promoter' || /promoter/i.test(f.label), -30, 500, up), lacO = near(f => /lac ?o|operator/i.test(f.label) || (f.type === 'protein_bind' && /lac/i.test(f.label)), -30, 300, up);
  const rbs = near(f => f.type === 'RBS' || /\\brbs\\b|ribosom|shine/i.test(f.label), -5, 80, up), term = near(f => f.type === 'terminator' || /terminator/i.test(f.label), -30, 600, down);
  const res = gb.feats.filter(f => f.type === 'CDS' && RES_RE.test(f.label)).map(f => resName(f.label)), ori = gb.feats.filter(f => (f.type === 'rep_origin' || /\\bori\\b/i.test(f.label)) && !/f1|m13/i.test(f.label)).map(f => f.label.replace(/\\s*(ori(gin)?( of replication)?)$/i, '').trim());
  const modP = x => main.wrap ? ((x % gb.len) + gb.len) % gb.len : x;
  const mLen = modP(main.b - main.a);
  const inRange = f => { if (!main.wrap) return f.a >= main.a - 3 && f.b <= main.b + 3; const s = modP(f.a - main.a), e = modP(f.b - main.a); return (s <= mLen + 3 || s >= gb.len - 3) && (e <= mLen + 3 || e >= gb.len - 3); };
  const inner = gb.feats.filter(f => f !== main && inRange(f) && modP(f.b - f.a) < 0.9*mLen).map(f => ({label: f.label, a: Math.floor((main.rev ? modP(main.b - f.b) : modP(f.a - main.a))/3) + 1, b: Math.ceil(((main.rev ? modP(main.b - f.a) : modP(f.b - main.a)) + 1)/3)}));`
);

fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
console.log('patched');
