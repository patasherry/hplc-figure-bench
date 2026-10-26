const fs = require('fs');
let code = fs.readFileSync('hplc-figure-bench(WF1.13).html', 'utf8');

const replacement = `    const placedX = [], keep = new Set(), putBox = (x0, w, opts) => opts.reduce((m, k) => m || (!placedX.some(p => Math.abs(p.X - (x0 + k)) < (p.w + w)/2) && {X: x0 + k, w} || null), null);
    const tryPut = (sg, k) => { const c = cOf(sg); if (c < xlo || c > xhi) return; const w = wOfL(sg), X = px(c); if (X - (rot ? pf*0.5 : w/2) < L + pf*0.25) return;
      const b = putBox(X, w, [0]); if (!b && FIG_SCREEN) toast('Some labels were skipped because they overlapped. Hide some to fix the figure.');
      if (b) { placedX.push(b); keep.add(k); } };
    const tryImp = (sg, k) => { const c = cOf(sg); if (c < xlo || c > xhi) return; const w = wOfL(sg), X = px(c); if (X - (rot ? pf*0.5 : w/2) < L + pf*0.25) return;
      const b = putBox(X, rot ? pf*0.7 : w*0.85, [0]); if (!b && FIG_SCREEN) toast('Some labels were skipped because they overlapped. Hide some to fix the figure.');
      if (b) { b.w = w; placedX.push(b); keep.add(k); } };`;

const oldCode = `    const placedX = [], keep = new Set();
    const tryPut = (sg, k) => { const c = cOf(sg); if (c < xlo || c > xhi) return; const X = px(c); if (X - (rot ? pf*0.5 : wOfL(sg)/2) < L + pf*0.25) return;
      if (placedX.some(p => Math.abs(p.X - X) < (p.w + wOfL(sg))/2)) return; placedX.push({X, w: wOfL(sg)}); keep.add(k); };
    const tryImp = (sg, k) => { const c = cOf(sg); if (c < xlo || c > xhi) return; const X = px(c); if (X - (rot ? pf*0.5 : wOfL(sg)/2) < L + pf*0.25) return;
      if (placedX.some(p => Math.abs(p.X - X) < (rot ? pf*0.7 : (p.w + wOfL(sg))/2*0.85))) return; placedX.push({X, w: wOfL(sg)}); keep.add(k); };`;

code = code.replace(oldCode, replacement);
fs.writeFileSync('hplc-figure-bench(WF1.13).html', code);
